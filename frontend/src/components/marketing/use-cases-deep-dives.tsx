"use client";

import { motion } from "framer-motion";
import OutcomesCard from "@/components/marketing/visuals/outcomes-card";

interface UseCase {
  anchor: string;
  label: string;
  title: string;
  body: string;
  outcomes: string[];
}

const cases: UseCase[] = [
  {
    anchor: "defi",
    label: "DeFi protocols",
    title: "Audit-ready event history, from day one",
    body: "Every swap, liquidity event, fee distribution, and governance vote on your protocol needs to be recorded — and provable. When an auditor asks for your transaction history, give them cryptographic proof, not a CSV export. IndexNode indexes every event from your contracts in real time and commits a Merkle proof on-chain. Your audit trail is immutable.",
    outcomes: [
      "Regulatory audits completed in hours, not weeks",
      "On-chain proof accepted by top-4 audit firms",
      "Zero data gaps even during high-volume periods",
      "GraphQL API for direct integration into dashboards",
    ],
  },
  {
    anchor: "compliance",
    label: "Compliance & legal teams",
    title: "When regulators ask, you answer with proof",
    body: "Regulatory inquiries don't wait. When a regulator, court, or counterparty demands evidence that a transaction occurred at a specific time, a database printout isn't enough. IndexNode's on-chain TimestampRegistry provides cryptographic proof that your data existed — immutable, timestamped, and independently verifiable.",
    outcomes: [
      "Cryptographic proof admissible in legal proceedings",
      "Timestamp verified on public blockchain",
      "No dependence on IndexNode's continued operation",
      "Audit log of every data access and modification",
    ],
  },
  {
    anchor: "nft",
    label: "NFT platforms",
    title: "Provenance that can't be disputed",
    body: "NFT ownership history, mint events, royalty distributions — every event that defines an asset's provenance needs to be verifiable. IndexNode tracks every on-chain event related to your collections and stores the proof permanently on IPFS with an on-chain timestamp. Buyers and sellers can verify the complete history independently.",
    outcomes: [
      "Complete mint and transfer history per token",
      "IPFS-stored event data with content hash",
      "On-chain proof of every ownership change",
      "AI-extracted metadata for marketplace integration",
    ],
  },
  {
    anchor: "data-providers",
    label: "Data providers",
    title: "Your data has a receipt. Sell it.",
    body: "If you're already indexing blockchain data, IndexNode turns that work into revenue. List your verified datasets on the marketplace and earn INC tokens per purchase. Every listing comes with its on-chain proof — buyers know exactly what they're getting. Verified, timestamped, AI-extracted data commands a premium.",
    outcomes: [
      "Earn INC tokens per dataset purchase",
      "Every listing includes on-chain proof",
      "AI extraction increases dataset value",
      "Seller reputation system builds trust over time",
    ],
  },
  {
    anchor: "enterprise",
    label: "Enterprise",
    title: "Custom indexing pipelines at scale",
    body: "Enterprise teams need more than a shared platform. IndexNode's API-first architecture supports custom event schemas, dedicated indexing pipelines, and SLA-backed uptime. Your data stays yours — we provide the infrastructure, the proof, and the guarantees.",
    outcomes: [
      "Custom event schemas and extraction pipelines",
      "Dedicated infrastructure, no shared resources",
      "SLA-backed uptime and support",
      "White-label data marketplace listings",
      "Direct integration with existing data warehouses",
    ],
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
} as const;

function CaseRow({
  useCase,
  reverse,
}: {
  useCase: UseCase;
  reverse: boolean;
}) {
  return (
    <motion.div
      id={useCase.anchor}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.12 } },
      }}
      className="grid items-start gap-10 lg:grid-cols-2 lg:gap-20"
    >
      <motion.div
        variants={fadeUp}
        className={reverse ? "order-1 lg:order-2" : ""}
      >
        <span className="inline-block rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-amber-400">
          {useCase.label}
        </span>
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-gray-100 sm:text-3xl">
          {useCase.title}
        </h2>
        <p className="mt-4 text-base leading-relaxed text-gray-400 sm:text-lg">
          {useCase.body}
        </p>
      </motion.div>
      <motion.div
        variants={fadeUp}
        className={reverse ? "order-2 lg:order-1" : ""}
      >
        <OutcomesCard eyebrow="Outcomes" items={useCase.outcomes} />
      </motion.div>
    </motion.div>
  );
}

export default function UseCasesDeepDives() {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto flex max-w-7xl flex-col gap-24 px-6 sm:gap-32">
        {cases.map((useCase, idx) => (
          <CaseRow
            key={useCase.anchor}
            useCase={useCase}
            reverse={idx % 2 === 1}
          />
        ))}
      </div>
    </section>
  );
}
