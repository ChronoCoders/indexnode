import Link from "next/link";
import PageHeader from "@/components/app/page-header";
import JobsTable, { type JobRow } from "@/components/app/jobs-table";
import NewJobButton from "@/components/app/new-job-button";
import { requireAuth } from "@/lib/auth";
import { serverGql } from "@/lib/api-server";

export const metadata = { title: "Jobs" };

interface JobsData {
  myJobs: JobRow[];
}

const JOBS_QUERY = `query Jobs {
  myJobs(limit: 100) {
    id
    jobType
    status
    target
    chain
    createdAt
    completedAt
    error
  }
}`;

async function fetchJobs(): Promise<JobsData | null> {
  try {
    return await serverGql<JobsData>(JOBS_QUERY);
  } catch {
    return null;
  }
}

export default async function JobsPage() {
  await requireAuth();
  const data = await fetchJobs();
  const jobs = data?.myJobs ?? [];

  return (
    <>
      <PageHeader
        title="Jobs"
        subtitle="All your indexing jobs"
        action={<NewJobButton />}
      />

      <div className="space-y-6 px-6 py-6 sm:space-y-8 sm:px-8 sm:py-8">
        {data === null ? (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
            Couldn&apos;t reach the API. Try again in a moment.
          </div>
        ) : jobs.length === 0 ? (
          <div className="rounded-xl border border-gray-800 bg-gray-900 px-6 py-16 text-center">
            <p className="text-sm text-gray-300">
              No jobs yet.{" "}
              <Link
                href="/dashboard"
                className="text-amber-400 transition hover:text-amber-300"
              >
                Create one from the dashboard.
              </Link>
            </p>
          </div>
        ) : (
          <JobsTable jobs={jobs} />
        )}
      </div>
    </>
  );
}
