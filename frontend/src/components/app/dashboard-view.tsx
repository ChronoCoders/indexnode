"use client";

import * as React from "react";
import { Activity, Boxes, Coins, ShieldCheck } from "lucide-react";
import PageHeader from "@/components/app/page-header";
import StatCard from "@/components/app/stat-card";
import JobsTable, { type JobRow } from "@/components/app/jobs-table";
import NewJobButton from "@/components/app/new-job-button";
import LiveEventsPanel from "@/components/app/live-events-panel";

export interface DashboardViewProps {
  jobs: JobRow[];
  creditBalance: number | null;
  reachable: boolean;
}

export default function DashboardView({
  jobs,
  creditBalance,
  reachable,
}: DashboardViewProps) {
  const [selectedJob, setSelectedJob] = React.useState<JobRow | null>(null);

  const activeJobs = jobs.filter(
    (job) => job.status === "queued" || job.status === "processing",
  ).length;
  const completedJobs = jobs.filter(
    (job) => job.status === "completed",
  ).length;

  const fmt = (value: number | null, fallback: string = "—"): string =>
    value === null ? fallback : value.toLocaleString();

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Monitor your blockchain indexing activity"
        action={<NewJobButton />}
      />

      <div className="space-y-6 px-6 py-6 sm:space-y-8 sm:px-8 sm:py-8">
        {!reachable ? (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
            Couldn&apos;t reach the API. Showing static placeholders below.
          </div>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Active jobs"
            value={fmt(activeJobs, "0")}
            tone="blue"
            icon={Activity}
            sub="Queued or processing"
          />
          <StatCard
            label="Completed jobs"
            value={fmt(completedJobs, "0")}
            tone="amber"
            icon={Boxes}
            sub="Across all chains"
          />
          <StatCard
            label="Credit balance"
            value={fmt(creditBalance)}
            tone="green"
            icon={Coins}
            sub="INC available"
          />
          <StatCard
            label="Proofs committed"
            value={fmt(completedJobs, "0")}
            tone="purple"
            icon={ShieldCheck}
            sub="One per completed job"
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <JobsTable
              jobs={jobs}
              onSelect={setSelectedJob}
              selectedId={selectedJob?.id ?? null}
            />
          </div>
          <div>
            <LiveEventsPanel
              key={selectedJob?.id ?? "none"}
              job={selectedJob}
            />
          </div>
        </section>
      </div>
    </>
  );
}
