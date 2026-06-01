"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Boxes,
  Database,
  Globe,
  HardDrive,
  Link as LinkIcon,
  Network,
  Radio,
  Server,
  Terminal,
  Webhook,
  Workflow,
} from "lucide-react";

interface StageItem {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  detail: string;
}

interface Stage {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  title: string;
  items: StageItem[];
}

const stages: Stage[] = [
  {
    icon: Globe,
    label: "Client",
    title: "Any HTTP client",
    items: [
      {
        icon: Globe,
        title: "Browser",
        detail: "Cookie-authenticated UI calls",
      },
      {
        icon: Terminal,
        title: "cURL / scripts",
        detail: "Bearer-token API keys",
      },
      {
        icon: Radio,
        title: "WebSocket clients",
        detail: "GraphQL subscriptions",
      },
    ],
  },
  {
    icon: Server,
    label: "IndexNode API",
    title: "Single Rust binary",
    items: [
      {
        icon: Webhook,
        title: "REST · /api/v1/*",
        detail: "Auth, jobs, keys, webhooks",
      },
      {
        icon: Network,
        title: "GraphQL · /graphql",
        detail: "Queries + mutations",
      },
      {
        icon: Radio,
        title: "Subscriptions · /graphql/ws",
        detail: "Live event streaming",
      },
      {
        icon: Workflow,
        title: "Embedded worker",
        detail: "Same process, shared pool",
      },
    ],
  },
  {
    icon: Database,
    label: "Backends",
    title: "External systems",
    items: [
      {
        icon: Database,
        title: "PostgreSQL",
        detail: "Source of truth · LISTEN/NOTIFY",
      },
      {
        icon: HardDrive,
        title: "IPFS / Pinata",
        detail: "Content-addressed storage",
      },
      {
        icon: LinkIcon,
        title: "EVM RPC",
        detail: "Ethereum + Polygon · TimestampRegistry",
      },
      {
        icon: Boxes,
        title: "Anthropic",
        detail: "AI extraction (optional)",
      },
    ],
  },
];

const connectorLabels: { label: string; detail: string }[] = [
  {
    label: "HTTPS · WebSocket",
    detail: "JSON in, JSON out · HttpOnly cookie or Bearer key",
  },
  {
    label: "sqlx · ipfs-api · ethers",
    detail: "Worker and server share a single Postgres pool",
  },
];

const stageVariant = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" },
  },
} as const;

const connectorVariant = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
} as const;

function StageCard({ stage }: { stage: Stage }) {
  const Icon = stage.icon;
  return (
    <motion.div
      variants={stageVariant}
      className="flex w-full flex-1 flex-col rounded-xl border border-gray-800 bg-gray-900 p-5"
    >
      <div className="flex items-center gap-3 border-b border-gray-800 pb-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-400">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-500">
            {stage.label}
          </p>
          <p className="text-sm font-semibold text-gray-100">{stage.title}</p>
        </div>
      </div>
      <ul className="mt-4 space-y-3">
        {stage.items.map((item) => {
          const ItemIcon = item.icon;
          return (
            <li key={item.title} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gray-800 text-gray-400">
                <ItemIcon className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-gray-100">
                  {item.title}
                </span>
                <span className="mt-0.5 block text-xs text-gray-500">
                  {item.detail}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </motion.div>
  );
}

function Connector({ label, detail }: { label: string; detail: string }) {
  return (
    <motion.div
      variants={connectorVariant}
      aria-hidden="true"
      className="relative flex shrink-0 flex-col items-center justify-center gap-2 py-2 lg:flex-1 lg:py-0"
    >
      {}
      <div className="hidden w-full lg:block">
        <p className="text-center text-[10px] font-semibold uppercase tracking-widest text-amber-500">
          {label}
        </p>
        <div className="relative mt-2 h-px w-full overflow-hidden bg-[linear-gradient(to_right,transparent,rgba(217,119,6,0.4)_50%,transparent)]">
          <motion.span
            animate={{ x: ["-20%", "120%"] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="absolute top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(217,119,6,0.7)]"
          />
        </div>
        <p className="mt-2 text-center text-[10px] text-gray-500">{detail}</p>
      </div>

      {}
      <div className="flex flex-col items-center gap-1 lg:hidden">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-500">
          {label}
        </p>
        <div className="relative h-12 w-px overflow-hidden bg-[linear-gradient(to_bottom,transparent,rgba(217,119,6,0.4)_50%,transparent)]">
          <motion.span
            animate={{ y: ["-20%", "120%"] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="absolute left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(217,119,6,0.7)]"
          />
        </div>
        <p className="text-[10px] text-gray-500">{detail}</p>
      </div>
    </motion.div>
  );
}

export default function ArchitectureDiagram() {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.15 } },
      }}
      className="flex flex-col items-stretch gap-2 lg:flex-row lg:items-stretch"
    >
      <StageCard stage={stages[0]} />
      <Connector
        label={connectorLabels[0].label}
        detail={connectorLabels[0].detail}
      />
      <StageCard stage={stages[1]} />
      <Connector
        label={connectorLabels[1].label}
        detail={connectorLabels[1].detail}
      />
      <StageCard stage={stages[2]} />
    </motion.div>
  );
}
