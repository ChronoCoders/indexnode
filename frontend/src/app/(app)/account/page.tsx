import PageHeader from "@/components/app/page-header";
import ProfileCard, {
  type Profile,
} from "@/components/app/account/profile-card";
import ApiKeysCard, {
  type ApiKey,
} from "@/components/app/account/api-keys-card";
import WebhooksCard, {
  type Webhook,
} from "@/components/app/account/webhooks-card";
import WalletCard, {
  type WalletInfo,
} from "@/components/app/account/wallet-card";
import { requireAuth } from "@/lib/auth";
import { serverFetch, serverGql } from "@/lib/api-server";

export const metadata = { title: "Account" };

interface MeResponse {
  user_id: string;
  email: string;
  role: string;
  created_at: string;
}

interface WalletInfoResponse {
  walletInfo: WalletInfo | null;
}

async function fetchProfile(): Promise<Profile | null> {
  try {
    const me = await serverFetch<MeResponse>("/api/v1/me");
    if (!me) return null;
    return {
      id: me.user_id,
      email: me.email,
      role: me.role,
      createdAt: me.created_at,
    };
  } catch {
    return null;
  }
}

async function fetchWallet(): Promise<WalletInfo | null> {
  try {
    const data = await serverGql<WalletInfoResponse>(
      `query AccountWallet { walletInfo { creditBalance walletAddress } }`,
    );
    return data.walletInfo;
  } catch {
    return null;
  }
}

async function fetchApiKeys(): Promise<ApiKey[] | null> {
  try {
    const keys = await serverFetch<ApiKey[]>("/api/v1/api-keys");
    return keys ?? [];
  } catch {
    return null;
  }
}

async function fetchWebhooks(): Promise<Webhook[] | null> {
  try {
    const hooks = await serverFetch<Webhook[]>("/api/v1/webhooks");
    return hooks ?? [];
  } catch {
    return null;
  }
}

export default async function AccountPage() {
  await requireAuth();

  const [profile, wallet, apiKeys, webhooks] = await Promise.all([
    fetchProfile(),
    fetchWallet(),
    fetchApiKeys(),
    fetchWebhooks(),
  ]);

  return (
    <>
      <PageHeader
        title="Account"
        subtitle="Manage your profile, keys, webhooks, and wallet"
      />

      <div className="space-y-6 px-6 py-6 sm:space-y-8 sm:px-8 sm:py-8">
        <ProfileCard profile={profile} />
        <WalletCard wallet={wallet} />
        <ApiKeysCard initialKeys={apiKeys} />
        <WebhooksCard initialWebhooks={webhooks} />
      </div>
    </>
  );
}
