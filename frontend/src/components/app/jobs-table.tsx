"use client";

import { Activity, AlertCircle, Clock, ShieldCheck } from "lucide-react";

export type JobStatus = "queued" | "processing" | "completed" | "failed";

export interface JobRow {
  id: string;
  jobType: string;
  status: JobStatus | string;
  target: string | null;
  chain: string | null;
  createdAt: string;
  cost?: string;
}

const demoJobs: JobRow[] = [
  {
    id: "demo-1",
    jobType: "blockchain_index",
    status: "processing",
    target: "0x6b175474e89094c44da98b954eedeac495271d0f",
    chain: "ethereum",
    createdAt: new Date(Date.now() - 2 * 60_000).toISOString(),
    cost: "50 INC",
  },
  {
    id: "demo-2",
    jobType: "blockchain_index",
    status: "completed",
    target: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    chain: "ethereum",
    createdAt: new Date(Date.now() - 60 * 60_000).toISOString(),
    cost: "50 INC",
  },
  {
    id: "demo-3",
    jobType: "blockchain_index",
    status: "completed",
    target: "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599",
    chain: "polygon",
    createdAt: new Date(Date.now() - 3 * 60 * 60_000).toISOString(),
    cost: "50 INC",
  },
];

function shortTarget(target: string | null): string {
  if (!target) return "—";
  if (target.startsWith("0x") && target.length >= 12) {
    return `${target.slice(0, 6)}…${target.slice(-4)}`;
  }
  if (target.length > 28) {
    return `${target.slice(0, 24)}…`;
  }
  return target;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff)) return "—";
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} d ago`;
  return new Date(iso).toLocaleDateString();
}

function capitalize(value: string | null): string {
  if (!value) return "—";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function StatusBadge({ status }: { status: string }) {
  if (status === "processing") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-blue-400">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-blue-400" />
        </span>
        Indexing
      </span>
    );
  }
  if (status === "queued") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-amber-400">
        <Clock className="h-3 w-3" />
        Queued
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-red-400">
        <AlertCircle className="h-3 w-3" />
        Failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-green-400">
      <ShieldCheck className="h-3 w-3" />
      Completed
    </span>
  );
}

export interface JobsTableProps {
  jobs?: JobRow[];
  onSelect?: (job: JobRow) => void;
  selectedId?: string | null;
}

export default function JobsTable({
  jobs,
  onSelect,
  selectedId,
}: JobsTableProps = {}) {
  const rows: JobRow[] = jobs ?? demoJobs;
  const active = rows.filter(
    (job) => job.status === "queued" || job.status === "processing",
  ).length;
  const selectable = typeof onSelect === "function";

  function handleSelect(job: JobRow) {
    if (!selectable) return;
    onSelect?.(job);
  }

  function rowClass(jobId: string): string {
    if (!selectable) return "hover:bg-gray-900/60";
    const isSelected = jobId === selectedId;
    const base = "cursor-pointer transition hover:bg-amber-500/5";
    return isSelected
      ? `${base} bg-amber-500/10 outline outline-1 -outline-offset-1 outline-amber-500/30`
      : base;
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900">
      <div className="flex items-center justify-between border-b border-gray-800 px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-gray-100">My jobs</h2>
          <p className="text-xs text-gray-500">
            {rows.length === 0
              ? "No jobs yet"
              : `${active} active · ${rows.length} shown${selectable ? " · click to view live events" : ""}`}
          </p>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-gray-500">
          <Activity className="h-3.5 w-3.5 text-blue-400" />
          Live
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="px-5 py-12 text-center">
          <p className="text-sm text-gray-400">
            No jobs yet. Click <span className="text-amber-400">New job</span>{" "}
            above to start indexing your first contract.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-[11px] uppercase tracking-wider text-gray-500">
                <th className="px-5 py-3 font-medium">Target</th>
                <th className="px-5 py-3 font-medium">Chain</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Cost</th>
                <th className="px-5 py-3 font-medium">Started</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {rows.map((job) => {
                const interactive = selectable
                  ? {
                      role: "button" as const,
                      tabIndex: 0,
                      "aria-pressed": job.id === selectedId,
                      onClick: () => handleSelect(job),
                      onKeyDown: (e: React.KeyboardEvent<HTMLTableRowElement>) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleSelect(job);
                        }
                      },
                    }
                  : {};
                return (
                  <tr key={job.id} className={rowClass(job.id)} {...interactive}>
                    <td
                      className="px-5 py-3 font-mono text-xs text-gray-200"
                      title={job.target ?? undefined}
                    >
                      {shortTarget(job.target)}
                    </td>
                    <td className="px-5 py-3 text-gray-300">
                      {capitalize(job.chain)}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={job.status} />
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-400">
                      {job.jobType === "blockchain_index"
                        ? "Blockchain"
                        : job.jobType === "http_crawl"
                          ? "HTTP crawl"
                          : job.jobType}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-amber-400">
                      {job.cost ?? "50 INC"}
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500">
                      {relativeTime(job.createdAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
