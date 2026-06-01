"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

interface Tier {
  name: string;
  price: string;
  cadence: string;
  credits: string;
  cta: string;
  highlight: boolean;
  badge?: string;
  baseline: string[];
  additions?: string[];
  additionsHeading?: string;
}

const baseline = [
  "Real-time blockchain event indexing",
  "On-chain Merkle proof per batch",
  "IPFS storage via Pinata",
  "AI-powered data extraction",
  "GraphQL + REST API access",
  "Webhook notifications",
];

const tiers: Tier[] = [
  {
    name: "Free",
    price: "$0",
    cadence: "",
    credits: "1,000 credits / month",
    cta: "Start free",
    highlight: false,
    baseline,
  },
  {
    name: "Growth",
    price: "$29",
    cadence: "/ month",
    credits: "10,000 credits / month",
    cta: "Get started",
    highlight: false,
    baseline,
    additionsHeading: "Growth adds",
    additions: ["Priority indexing queue", "Multi-chain support"],
  },
  {
    name: "Scale",
    price: "$99",
    cadence: "/ month",
    credits: "50,000 credits / month",
    cta: "Start scaling",
    highlight: true,
    badge: "Most popular",
    baseline,
    additionsHeading: "Scale adds",
    additions: [
      "Everything in Growth",
      "Dedicated support",
      "Custom event schemas",
      "Data marketplace listings",
    ],
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
} as const;

export default function PricingTiers() {
  return (
    <section className="pb-12 sm:pb-20">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.12 } },
        }}
        className="mx-auto grid max-w-7xl gap-6 px-6 lg:grid-cols-3"
      >
        {tiers.map((tier) => (
          <motion.div
            key={tier.name}
            variants={fadeUp}
            className={`relative flex flex-col rounded-2xl border p-8 ${
              tier.highlight
                ? "border-amber-500/60 bg-amber-500/5"
                : "border-gray-800 bg-gray-900/60"
            }`}
          >
            {tier.badge ? (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-gray-950">
                {tier.badge}
              </span>
            ) : null}
            <h2 className="text-lg font-semibold text-gray-100">{tier.name}</h2>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-5xl font-bold text-gray-100">
                {tier.price}
              </span>
              {tier.cadence ? (
                <span className="text-sm text-gray-500">{tier.cadence}</span>
              ) : null}
            </div>
            <p className="mt-2 text-sm text-amber-400">{tier.credits}</p>

            <ul className="mt-6 space-y-2.5 text-sm text-gray-300">
              {tier.baseline.map((line) => (
                <li key={line} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-400">
                    <Check className="h-3 w-3" />
                  </span>
                  {line}
                </li>
              ))}
            </ul>

            {tier.additions ? (
              <div className="mt-6 border-t border-gray-800 pt-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  {tier.additionsHeading}
                </p>
                <ul className="mt-3 space-y-2.5 text-sm text-gray-300">
                  {tier.additions.map((line) => (
                    <li key={line} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-400">
                        <Check className="h-3 w-3" />
                      </span>
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <Link
              href="/signup"
              className={`mt-8 inline-flex items-center justify-center rounded-md px-4 py-3 text-sm font-semibold transition ${
                tier.highlight
                  ? "bg-amber-500 text-gray-950 hover:bg-amber-400"
                  : "border border-gray-700 text-gray-100 hover:border-amber-500 hover:text-amber-400"
              }`}
            >
              {tier.cta}
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
