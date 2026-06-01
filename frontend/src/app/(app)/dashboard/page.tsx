import DashboardView from "@/components/app/dashboard-view";
import { type JobRow } from "@/components/app/jobs-table";
import { serverGql } from "@/lib/api-server";

export const metadata = { title: "Dashboard" };

interface DashboardData {
  myJobs: JobRow[];
  walletInfo: {
    creditBalance: number;
    walletAddress: string | null;
  } | null;
}

const DASHBOARD_QUERY = `query Dashboard {
  myJobs(limit: 20) {
    id
    jobType
    status
    target
    chain
    createdAt
    completedAt
    error
  }
  walletInfo {
    creditBalance
    walletAddress
  }
}`;

async function fetchDashboard(): Promise<DashboardData | null> {
  try {
    return await serverGql<DashboardData>(DASHBOARD_QUERY);
  } catch {
    return null;
  }
}

export default async function DashboardPage() {
  const data = await fetchDashboard();
  return (
    <DashboardView
      jobs={data?.myJobs ?? []}
      creditBalance={data?.walletInfo?.creditBalance ?? null}
      reachable={data !== null}
    />
  );
}
