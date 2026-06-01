"use client";

import * as React from "react";
import { Radio, Zap } from "lucide-react";
import type { JobRow } from "@/components/app/jobs-table";

interface LiveEvent {
  key: string;
  eventName: string;
  blockNumber: number;
  transactionHash: string;
  contentHash: string | null;
  receivedAt: number;
}

type ConnectionState = "idle" | "connecting" | "connected" | "closed";

const MAX_EVENTS = 50;

interface GraphQLEventPayload {
  data?: {
    blockchainEvents?: {
      eventName: string;
      blockNumber: number;
      transactionHash: string;
      contentHash: string | null;
    };
  };
}

interface InboundMessage {
  type: string;
  id?: string;
  payload?: GraphQLEventPayload;
}

const SUBSCRIPTION_QUERY = `subscription LiveEvents($contractAddress: String!) {
  blockchainEvents(contractAddress: $contractAddress) {
    eventName
    blockNumber
    transactionHash
    contentHash
  }
}`;

function shortHash(hash: string): string {
  if (hash.length < 12) return hash;
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
}

function buildWsUrl(): string {
  if (typeof window === "undefined") return "";
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/graphql/ws`;
}

export interface LiveEventsPanelProps {
  job: JobRow | null;
}

export default function LiveEventsPanel({ job }: LiveEventsPanelProps) {
  const [events, setEvents] = React.useState<LiveEvent[]>([]);
  const [state, setState] = React.useState<ConnectionState>(
    job && job.target ? "connecting" : "idle",
  );

  React.useEffect(() => {
    if (!job || !job.target) return;
    const contractAddress = job.target;
    const url = buildWsUrl();
    if (!url) return;

    const ws = new WebSocket(url, "graphql-transport-ws");
    const subId = `sub-${Math.random().toString(36).slice(2)}`;
    let counter = 0;
    let cancelled = false;

    ws.addEventListener("open", () => {
      ws.send(JSON.stringify({ type: "connection_init" }));
    });

    ws.addEventListener("message", (msg) => {
      if (cancelled) return;
      let parsed: InboundMessage;
      try {
        parsed = JSON.parse(msg.data as string) as InboundMessage;
      } catch {
        return;
      }
      if (parsed.type === "connection_ack") {
        setState("connected");
        ws.send(
          JSON.stringify({
            id: subId,
            type: "subscribe",
            payload: {
              query: SUBSCRIPTION_QUERY,
              variables: { contractAddress },
            },
          }),
        );
        return;
      }
      if (parsed.type === "ping") {
        ws.send(JSON.stringify({ type: "pong" }));
        return;
      }
      if (parsed.type === "next" && parsed.id === subId) {
        const evt = parsed.payload?.data?.blockchainEvents;
        if (!evt) return;
        counter += 1;
        const next: LiveEvent = {
          key: `${Date.now()}-${counter}`,
          eventName: evt.eventName,
          blockNumber: evt.blockNumber,
          transactionHash: evt.transactionHash,
          contentHash: evt.contentHash,
          receivedAt: Date.now(),
        };
        setEvents((prev) => [next, ...prev].slice(0, MAX_EVENTS));
      }
    });

    ws.addEventListener("close", () => {
      if (cancelled) return;
      setState("closed");
    });

    ws.addEventListener("error", () => {
      if (cancelled) return;
      setState("closed");
    });

    return () => {
      cancelled = true;
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify({ id: subId, type: "complete" }));
        } catch {
        }
      }
      ws.close();
    };
  }, [job]);

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-100">Live events</h2>
        <StatusPill state={state} />
      </div>

      {!job ? (
        <EmptyState
          icon={<Zap className="h-4 w-4" />}
          title="Select a job to view live events"
          detail="Click a row in the jobs table to subscribe to its contract."
        />
      ) : !job.target ? (
        <EmptyState
          icon={<Zap className="h-4 w-4" />}
          title="No contract address"
          detail="This job has no target address — nothing to subscribe to."
        />
      ) : events.length === 0 ? (
        <EmptyState
          icon={<Radio className="h-4 w-4" />}
          title={
            state === "connected"
              ? "Waiting for the next event…"
              : state === "connecting"
                ? "Connecting…"
                : "Stream closed"
          }
          detail={
            state === "connected"
              ? "Events appear here as soon as the chain emits them."
              : state === "closed"
                ? "The subscription was closed. Pick the job again to retry."
                : ""
          }
        />
      ) : (
        <ul className="max-h-80 space-y-2 overflow-y-auto pr-1">
          {events.map((evt) => (
            <li
              key={evt.key}
              className="rounded-md border border-gray-800 bg-gray-950/60 px-3 py-2"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate font-mono text-xs font-semibold text-amber-400">
                  {evt.eventName}
                </span>
                <span className="shrink-0 font-mono text-[10px] text-gray-500">
                  #{evt.blockNumber.toLocaleString()}
                </span>
              </div>
              <p
                className="mt-1 font-mono text-[11px] text-gray-400"
                title={evt.transactionHash}
              >
                {shortHash(evt.transactionHash)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatusPill({ state }: { state: ConnectionState }) {
  if (state === "connected") {
    return (
      <span className="flex items-center gap-1.5 text-[11px] text-gray-500">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
        </span>
        Live
      </span>
    );
  }
  if (state === "connecting") {
    return (
      <span className="flex items-center gap-1.5 text-[11px] text-gray-500">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
        Connecting
      </span>
    );
  }
  if (state === "closed") {
    return (
      <span className="flex items-center gap-1.5 text-[11px] text-gray-500">
        <span className="h-1.5 w-1.5 rounded-full bg-gray-600" />
        Disconnected
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-[11px] text-gray-500">
      <span className="h-1.5 w-1.5 rounded-full bg-gray-600" />
      Idle
    </span>
  );
}

function EmptyState({
  icon,
  title,
  detail,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-gray-800 px-4 py-10 text-center">
      <span className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-800 bg-gray-950 text-gray-500">
        {icon}
      </span>
      <p className="mt-3 text-sm text-gray-200">{title}</p>
      {detail ? <p className="mt-1 text-xs text-gray-500">{detail}</p> : null}
    </div>
  );
}
