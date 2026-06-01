import Link from "next/link";
import { Briefcase, Zap } from "lucide-react";
import PageHeader from "@/components/app/page-header";
import { requireAuth } from "@/lib/auth";

export const metadata = { title: "Events" };

export default async function EventsPage() {
  await requireAuth();

  return (
    <>
      <PageHeader
        title="Events"
        subtitle="Indexed blockchain events"
      />

      <div className="space-y-6 px-6 py-6 sm:space-y-8 sm:px-8 sm:py-8">
        <div className="rounded-xl border border-gray-800 bg-gray-900 px-6 py-16 text-center">
          <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-400">
            <Zap className="h-5 w-5" />
          </span>
          <p className="mt-4 text-sm text-gray-200">
            Select a job to view its events.
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Events are scoped to a contract address — open a job to see the
            events it has indexed.
          </p>
          <Link
            href="/jobs"
            className="mt-5 inline-flex items-center gap-2 rounded-md border border-gray-800 px-4 py-2 text-sm text-gray-200 transition hover:border-gray-700 hover:bg-gray-900"
          >
            <Briefcase className="h-4 w-4" />
            Browse jobs
          </Link>
        </div>
      </div>
    </>
  );
}
