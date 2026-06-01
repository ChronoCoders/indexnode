"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Check, X } from "lucide-react";

type Cell = "yes" | "no" | "contact";

interface Row {
  feature: string;
  values: [Cell, Cell, Cell, Cell];
}

const rows: Row[] = [
  { feature: "Event indexing", values: ["yes", "yes", "yes", "yes"] },
  { feature: "On-chain proof", values: ["yes", "yes", "yes", "yes"] },
  { feature: "IPFS storage", values: ["yes", "yes", "yes", "yes"] },
  { feature: "AI extraction", values: ["yes", "yes", "yes", "yes"] },
  { feature: "GraphQL API", values: ["yes", "yes", "yes", "yes"] },
  { feature: "Webhooks", values: ["yes", "yes", "yes", "yes"] },
  { feature: "Multi-chain", values: ["no", "yes", "yes", "yes"] },
  { feature: "Priority queue", values: ["no", "yes", "yes", "yes"] },
  { feature: "Custom schemas", values: ["no", "no", "yes", "yes"] },
  { feature: "Marketplace listings", values: ["no", "no", "yes", "yes"] },
  { feature: "Dedicated support", values: ["no", "no", "yes", "yes"] },
  { feature: "Enterprise SLA", values: ["no", "no", "no", "contact"] },
];

const plans = ["Free", "Growth", "Scale", "Enterprise"] as const;

function CellMark({ value }: { value: Cell }) {
  if (value === "yes") {
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/15 text-amber-400">
        <Check className="h-3.5 w-3.5" />
      </span>
    );
  }
  if (value === "no") {
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-800 text-gray-600">
        <X className="h-3.5 w-3.5" />
      </span>
    );
  }
  return (
    <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium uppercase tracking-wider text-amber-400">
      Contact
    </span>
  );
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
} as const;

export default function PricingComparison() {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <motion.h2
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={fadeUp}
          className="text-center text-3xl font-bold tracking-tight text-gray-100 sm:text-4xl"
        >
          What&apos;s included in each plan
        </motion.h2>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={fadeUp}
          className="mt-10 overflow-x-auto rounded-xl border border-gray-800"
        >
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="bg-gray-900/60">
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Feature
                </th>
                {plans.map((plan) => (
                  <th
                    key={plan}
                    className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-gray-400"
                  >
                    {plan}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr
                  key={row.feature}
                  className={`border-t border-gray-800 ${
                    idx % 2 === 1 ? "bg-gray-900/30" : ""
                  }`}
                >
                  <td className="px-6 py-4 font-medium text-gray-200">
                    {row.feature}
                  </td>
                  {row.values.map((value, vIdx) => (
                    <td
                      key={`${row.feature}-${plans[vIdx]}`}
                      className="px-6 py-4 text-center"
                    >
                      <CellMark value={value} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      </div>
    </section>
  );
}
