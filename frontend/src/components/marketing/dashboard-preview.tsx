"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Activity,
  Boxes,
  Briefcase,
  Check,
  Coins,
  HardDrive,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  User,
  Zap,
} from "lucide-react";
import StatCard from "@/components/app/stat-card";
import JobsTable from "@/components/app/jobs-table";
import EventFeed from "@/components/marketing/visuals/event-feed";

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active?: boolean;
}

const previewNav: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, active: true },
  { label: "Jobs", icon: Briefcase },
  { label: "Events", icon: Zap },
  { label: "Account", icon: User },
];

function DashboardPreviewSidebar() {
  return (
    <aside className="flex w-44 shrink-0 flex-col border-r border-gray-800 bg-gray-950">
      <div className="flex h-14 items-center border-b border-gray-800 px-4">
        <span className="text-base font-bold tracking-tight">
          <span className="text-gray-100">Index</span>
          <span className="text-amber-500">Node</span>
        </span>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {previewNav.map((item) => {
          const Icon = item.icon;
          return (
            <span
              key={item.label}
              className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs ${
                item.active
                  ? "bg-amber-500/10 text-amber-400"
                  : "text-gray-400"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
            </span>
          );
        })}
      </nav>
      <div className="border-t border-gray-800 p-3">
        <div className="rounded-md border border-gray-800 bg-gray-900/60 px-2.5 py-2">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-500">
            Credit balance
          </p>
          <p className="mt-0.5 font-mono text-sm font-bold text-amber-400">
            1,250 INC
          </p>
        </div>
        <span className="mt-2 flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-gray-400">
          <LogOut className="h-3.5 w-3.5" />
          Log out
        </span>
      </div>
    </aside>
  );
}

function BrowserChrome() {
  return (
    <div className="flex items-center gap-3 border-b border-gray-800 bg-gray-950/60 px-4 py-3">
      <div className="flex gap-1.5">
        <span className="h-3 w-3 rounded-full bg-red-500/70" />
        <span className="h-3 w-3 rounded-full bg-amber-500/70" />
        <span className="h-3 w-3 rounded-full bg-green-500/70" />
      </div>
      <div className="flex-1 truncate rounded-md bg-gray-900 px-3 py-1 text-center font-mono text-[11px] text-gray-500">
        indexnode.io/dashboard
      </div>
      <div className="hidden w-12 sm:block" />
    </div>
  );
}

export default function DashboardPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.4 }}
      className="relative mx-auto mt-16 max-w-5xl px-4"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-8 -z-10 rounded-3xl"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(217,119,6,0.18), transparent 70%)",
        }}
      />

      <div className="origin-top scale-[0.65] sm:scale-75 lg:scale-[0.85]">
        <div className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900/80 shadow-[0_0_120px_rgba(217,119,6,0.15)] backdrop-blur-sm">
          <BrowserChrome />

          <div className="flex">
            <DashboardPreviewSidebar />

            <main className="flex-1 space-y-4 p-5">
              <div>
                <p className="text-xs font-semibold text-gray-100">Dashboard</p>
                <p className="text-[11px] text-gray-500">
                  Monitor your blockchain indexing activity
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard
                  label="Active jobs"
                  value="3"
                  tone="blue"
                  icon={Activity}
                />
                <StatCard
                  label="Events indexed"
                  value="24,847"
                  tone="amber"
                  icon={Boxes}
                />
                <StatCard
                  label="Credits"
                  value="1,250"
                  tone="green"
                  icon={Coins}
                />
                <StatCard
                  label="Proofs"
                  value="98"
                  tone="purple"
                  icon={ShieldCheck}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-3 lg:col-span-2">
                  <JobsTable />
                </div>
                <div className="col-span-3 lg:col-span-1">
                  <div className="rounded-xl border border-gray-800 bg-gray-900 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-xs font-semibold text-gray-100">
                        Live events
                      </h3>
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
                      </span>
                    </div>
                    <EventFeed compact />
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>

      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute right-2 top-12 hidden rounded-xl border border-green-500/40 bg-gray-950/95 px-4 py-3 shadow-[0_0_40px_rgba(34,197,94,0.2)] sm:block md:-right-4"
      >
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
          <Check className="h-3.5 w-3.5 text-green-400" />
          On-chain proof
        </p>
        <p className="mt-1 font-mono text-xs text-gray-200">
          Block 19,847,234
        </p>
        <p className="font-mono text-[10px] text-gray-500">
          0x9f3c…verified
        </p>
      </motion.div>

      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1,
        }}
        className="absolute -bottom-6 left-2 hidden rounded-xl border border-amber-500/40 bg-gray-950/95 px-4 py-3 shadow-[0_0_40px_rgba(217,119,6,0.2)] sm:block md:-left-4"
      >
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
          <HardDrive className="h-3.5 w-3.5 text-amber-400" />
          IPFS pinned
        </p>
        <p className="mt-1 font-mono text-xs text-gray-200">Qm1a2b…3c4d</p>
        <p className="font-mono text-[10px] text-gray-500">12,840 events</p>
      </motion.div>
    </motion.div>
  );
}
