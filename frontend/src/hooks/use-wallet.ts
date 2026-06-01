"use client";

import { useCallback, useEffect, useState } from "react";
import { BrowserProvider, type Eip1193Provider } from "ethers";

interface EthereumWindow {
  ethereum?: Eip1193Provider & {
    on?: (event: string, listener: (...args: unknown[]) => void) => void;
    removeListener?: (
      event: string,
      listener: (...args: unknown[]) => void,
    ) => void;
  };
}

export interface WalletState {
  address: string | null;
  chainId: number | null;
  connecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
}

export function useWallet(): WalletState {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    const eth = (window as unknown as EthereumWindow).ethereum;
    if (!eth) {
      setError("No wallet detected. Install MetaMask or Coinbase Wallet.");
      return;
    }
    setConnecting(true);
    setError(null);
    try {
      const provider = new BrowserProvider(eth);
      const accounts = (await provider.send("eth_requestAccounts", [])) as
        | string[]
        | undefined;
      const signer = await provider.getSigner();
      const network = await provider.getNetwork();
      setAddress(accounts?.[0] ?? (await signer.getAddress()));
      setChainId(Number(network.chainId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wallet connection failed");
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setChainId(null);
  }, []);

  useEffect(() => {
    const eth = (window as unknown as EthereumWindow).ethereum;
    if (!eth?.on) return;
    const onAccounts = (...args: unknown[]) => {
      const accounts = args[0] as string[] | undefined;
      setAddress(accounts && accounts.length > 0 ? accounts[0] : null);
    };
    const onChain = (...args: unknown[]) => {
      const hex = args[0] as string | undefined;
      if (typeof hex === "string") setChainId(parseInt(hex, 16));
    };
    eth.on("accountsChanged", onAccounts);
    eth.on("chainChanged", onChain);
    return () => {
      eth.removeListener?.("accountsChanged", onAccounts);
      eth.removeListener?.("chainChanged", onChain);
    };
  }, []);

  return { address, chainId, connecting, error, connect, disconnect };
}
