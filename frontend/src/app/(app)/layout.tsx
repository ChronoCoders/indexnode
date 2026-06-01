import Sidebar from "@/components/app/sidebar";
import { requireAuth } from "@/lib/auth";
import { serverGql } from "@/lib/api-server";

interface WalletInfo {
  creditBalance: number;
  walletAddress: string | null;
}

async function fetchCreditBalance(): Promise<number | null> {
  try {
    const data = await serverGql<{ walletInfo: WalletInfo | null }>(
      `query Layout { walletInfo { creditBalance walletAddress } }`,
    );
    return data.walletInfo?.creditBalance ?? null;
  } catch {
    return null;
  }
}

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireAuth();
  const creditBalance = await fetchCreditBalance();
  return (
    <div className="min-h-screen bg-gray-950">
      <Sidebar creditBalance={creditBalance} />
      <div className="min-h-screen pb-16 md:ml-64 md:pb-0">{children}</div>
    </div>
  );
}
