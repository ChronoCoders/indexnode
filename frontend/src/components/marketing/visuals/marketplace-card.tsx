"use client";

import { Check } from "lucide-react";

export interface MarketplaceCardProps {
  name: string;
  eventCount: string;
  price: string;
  chain: string;
}

export default function MarketplaceCard({
  name,
  eventCount,
  price,
  chain,
}: MarketplaceCardProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-800 bg-gray-950/60 p-4">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-gray-100">{name}</p>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
          <span>{eventCount}</span>
          <span className="rounded-full bg-gray-800 px-2 py-0.5 text-gray-300">
            {chain}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-amber-400">
            <Check className="h-3 w-3" />
            Verified
          </span>
        </p>
      </div>
      <span className="shrink-0 font-mono text-sm font-semibold text-amber-400">
        {price}
      </span>
    </div>
  );
}
