"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import MarketplaceCard from "@/components/marketing/visuals/marketplace-card";

interface Listing {
  name: string;
  eventCount: string;
  price: string;
  chain: string;
}

const listings: Listing[] = [
  {
    name: "Uniswap v3 — USDC/ETH swaps (90d)",
    eventCount: "2.4M events",
    price: "1,250 INC",
    chain: "Ethereum",
  },
  {
    name: "Aave v3 — borrow & liquidation feed",
    eventCount: "812K events",
    price: "950 INC",
    chain: "Ethereum",
  },
  {
    name: "Blur — NFT trade history",
    eventCount: "1.1M events",
    price: "1,400 INC",
    chain: "Polygon",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
} as const;

export default function MarketplaceTeaser() {
  return (
    <section className="border-y border-gray-800 bg-gray-900 py-24 sm:py-32">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 lg:grid-cols-2 lg:gap-20">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={fadeUp}
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-500">
            Marketplace
          </p>
          <div
            aria-hidden="true"
            className="mt-3 h-0.5 w-12 bg-gradient-to-r from-amber-500 to-amber-500/0"
          />
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-gray-100 sm:text-4xl">
            Your indexed data has value.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-gray-400 sm:text-lg">
            The IndexNode Data Marketplace lets you sell verified, AI-extracted
            blockchain datasets directly to buyers who need reliable data —
            without the indexing overhead. Every dataset comes with its
            on-chain proof included.
          </p>
          <Link
            href="/pricing"
            className="mt-6 inline-flex items-center gap-2 rounded-md border border-amber-500/60 px-5 py-2.5 text-sm font-semibold text-amber-400 transition hover:bg-amber-500/10"
          >
            Explore the marketplace
            <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.12 } },
          }}
          className="space-y-3"
        >
          {listings.map((listing) => (
            <motion.div key={listing.name} variants={fadeUp}>
              <MarketplaceCard
                name={listing.name}
                eventCount={listing.eventCount}
                price={listing.price}
                chain={listing.chain}
              />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
