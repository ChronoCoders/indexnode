"use client";

import { motion } from "framer-motion";
import EventFeed from "@/components/marketing/visuals/event-feed";
import MerkleVisual from "@/components/marketing/visuals/merkle-visual";
import ExtractVisual from "@/components/marketing/visuals/extract-visual";
import IpfsVisual from "@/components/marketing/visuals/ipfs-visual";
import MarketplaceCard from "@/components/marketing/visuals/marketplace-card";
import OutcomesCard from "@/components/marketing/visuals/outcomes-card";

interface Feature {
  tag: string;
  anchor: string;
  title: string;
  body: string;
  details: string[];
  visual: React.ReactNode;
}

const features: Feature[] = [
  {
    tag: "Core",
    anchor: "indexing",
    title: "Real-time event indexing from any EVM contract",
    body: "Connect a contract address and IndexNode subscribes to every event — Transfer, Swap, Mint, Approval, or any custom event your contract emits. Events are structured, stored in PostgreSQL, and immediately queryable via GraphQL. No polling. No missed events. No data gaps.",
    details: [
      "Real-time WebSocket subscription",
      "Multi-chain support (Ethereum + Polygon)",
      "Custom event signatures",
      "GraphQL + REST API access",
      "AI-powered data extraction per event",
    ],
    visual: <EventFeed compact />,
  },
  {
    tag: "Unique",
    anchor: "proof",
    title: "Cryptographic proof that your data existed",
    body: "Every batch of indexed events is hashed into a Merkle tree. The root is committed on-chain via our TimestampRegistry smart contract. The proof is immutable, public, and verifiable by anyone — including regulators, auditors, and counterparties.",
    details: [
      "Merkle root committed per event batch",
      "TimestampRegistry on Ethereum + Polygon",
      "Verify any event hash via API",
      "Proof survives even if IndexNode shuts down",
      "Admissible in legal and regulatory contexts",
    ],
    visual: <MerkleVisual />,
  },
  {
    tag: "Storage",
    anchor: "ipfs",
    title: "Decentralized, permanent data storage",
    body: "Every indexed event is stored on IPFS via Pinata — content-addressed, permanent, and not dependent on our servers. The IPFS CID is stored alongside every event record so you can always retrieve the original data independently.",
    details: [
      "Pinata pinning for guaranteed availability",
      "Content-addressed — data cannot be silently altered",
      "CID stored with every event record",
      "Retrieve data independently of IndexNode",
      "No vendor lock-in",
    ],
    visual: <IpfsVisual />,
  },
  {
    tag: "Intelligence",
    anchor: "ai",
    title: "Turn raw events into structured intelligence",
    body: "Raw blockchain events are encoded bytes. IndexNode uses Claude AI to extract structured data according to a schema you define — token amounts, wallet addresses, transaction intent, protocol-specific fields. The extracted data is queryable, exportable, and sellable.",
    details: [
      "Schema-defined extraction per job",
      "Powered by Claude (Anthropic)",
      "Confidence scores per extraction",
      "Extracted data queryable via GraphQL",
      "Token budget control per job",
    ],
    visual: <ExtractVisual />,
  },
  {
    tag: "Monetize",
    anchor: "marketplace",
    title: "Sell your indexed data. Buy verified datasets.",
    body: "Every dataset on the IndexNode marketplace comes with its on-chain proof included. Buyers know exactly what they're getting — verified, timestamped, AI-extracted blockchain data. Sellers earn INC tokens per purchase.",
    details: [
      "List datasets in INC tokens",
      "Every listing includes on-chain proof",
      "AI-extracted structured data included",
      "Instant access on purchase",
      "Seller reputation system",
    ],
    visual: (
      <div className="space-y-3">
        <MarketplaceCard
          name="Uniswap v3 — USDC/ETH swaps (90d)"
          eventCount="2.4M events"
          price="1,250 INC"
          chain="Ethereum"
        />
        <MarketplaceCard
          name="Aave v3 — borrow & liquidation feed"
          eventCount="812K events"
          price="950 INC"
          chain="Ethereum"
        />
      </div>
    ),
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
} as const;

function FeatureRow({
  feature,
  reverse,
}: {
  feature: Feature;
  reverse: boolean;
}) {
  return (
    <motion.div
      id={feature.anchor}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.12 } },
      }}
      className="grid scroll-mt-24 items-start gap-10 lg:grid-cols-2 lg:gap-16"
    >
      <motion.div
        variants={fadeUp}
        className={reverse ? "order-1 lg:order-2" : ""}
      >
        <span className="inline-block rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-amber-400">
          {feature.tag}
        </span>
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-gray-100 sm:text-3xl">
          {feature.title}
        </h2>
        <p className="mt-4 text-base leading-relaxed text-gray-400 sm:text-lg">
          {feature.body}
        </p>
      </motion.div>
      <motion.div
        variants={fadeUp}
        className={`space-y-6 ${reverse ? "order-2 lg:order-1" : ""}`}
      >
        {feature.visual}
        <OutcomesCard items={feature.details} />
      </motion.div>
    </motion.div>
  );
}

export default function FeaturesDeepDives() {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto flex max-w-7xl flex-col gap-24 px-6 sm:gap-32">
        {features.map((feature, idx) => (
          <FeatureRow
            key={feature.anchor}
            feature={feature}
            reverse={idx % 2 === 1}
          />
        ))}
      </div>
    </section>
  );
}
