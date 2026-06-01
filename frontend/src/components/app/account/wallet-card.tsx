"use client";

import * as React from "react";
import { AlertCircle, ExternalLink, Wallet } from "lucide-react";
import { gql } from "@/lib/api";

export interface WalletInfo {
  walletAddress: string | null;
  creditBalance: number;
}

interface EthereumProvider {
  isMetaMask?: boolean;
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

const REGISTER_WALLET_MUTATION = `mutation RegisterWallet($walletAddress: String!) {
  registerWallet(walletAddress: $walletAddress) {
    walletAddress
    creditBalance
  }
}`;

interface RegisterWalletResponse {
  registerWallet: WalletInfo;
}

function shortAddress(addr: string): string {
  if (addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function WalletCard({ wallet }: { wallet: WalletInfo | null }) {
  const [current, setCurrent] = React.useState<WalletInfo | null>(wallet);
  const [connecting, setConnecting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const hasMetaMask = React.useSyncExternalStore(
    () => () => {},
    () => Boolean(window.ethereum?.isMetaMask),
    () => null,
  );

  async function connect() {
    if (connecting) return;
    setError(null);
    const provider = window.ethereum;
    if (!provider) {
      setError("MetaMask not detected.");
      return;
    }
    setConnecting(true);
    try {
      const accounts = (await provider.request({
        method: "eth_requestAccounts",
      })) as string[];
      const address = accounts[0];
      if (!address) {
        throw new Error("No account returned from MetaMask.");
      }
      const data = await gql<RegisterWalletResponse>(REGISTER_WALLET_MUTATION, {
        walletAddress: address,
      });
      setCurrent(data.registerWallet);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to connect wallet.";
      setError(message);
    } finally {
      setConnecting(false);
    }
  }

  return (
    <section className="rounded-xl border border-gray-800 bg-gray-900">
      <header className="flex items-center gap-3 border-b border-gray-800 px-5 py-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-400">
          <Wallet className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-gray-100">Wallet</h2>
          <p className="text-xs text-gray-500">
            Connect an EVM wallet to spend INC credits on-chain
          </p>
        </div>
      </header>

      <div className="space-y-4 px-5 py-5">
        {error ? (
          <div className="flex items-start gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2.5 text-xs text-red-300">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        {current?.walletAddress ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Connected address
              </p>
              <p
                className="mt-1 font-mono text-sm text-gray-100"
                title={current.walletAddress}
              >
                {shortAddress(current.walletAddress)}
              </p>
              <p className="mt-1 font-mono text-[11px] text-gray-500 break-all">
                {current.walletAddress}
              </p>
            </div>
            <button
              type="button"
              onClick={connect}
              disabled={connecting}
              className="self-start rounded-md border border-gray-800 px-3 py-1.5 text-xs text-gray-200 transition hover:border-gray-700 hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {connecting ? "Connecting…" : "Reconnect"}
            </button>
          </div>
        ) : hasMetaMask === false ? (
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-300">
              MetaMask isn&apos;t installed in this browser.
            </p>
            <a
              href="https://metamask.io/download"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md bg-amber-500 px-3 py-1.5 text-sm font-semibold text-gray-950 transition hover:bg-amber-400"
            >
              Install MetaMask
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-300">
              No wallet connected yet. Connect with MetaMask to associate an
              address with your account.
            </p>
            <button
              type="button"
              onClick={connect}
              disabled={connecting || hasMetaMask === null}
              className="rounded-md bg-amber-500 px-3 py-1.5 text-sm font-semibold text-gray-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {connecting ? "Connecting…" : "Connect wallet"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
