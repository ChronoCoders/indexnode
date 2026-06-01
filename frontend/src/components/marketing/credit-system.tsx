"use client";

import { motion } from "framer-motion";
import { Boxes, Globe } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
} as const;

const costs = [
  {
    icon: Globe,
    label: "Crawl job",
    cost: "100",
    sub: "credits per HTTP crawl",
  },
  {
    icon: Boxes,
    label: "Event indexing",
    cost: "50",
    sub: "credits per blockchain index job",
  },
];

export default function CreditSystem() {
  return (
    <section className="border-y border-gray-800 bg-gray-900/40 py-24 sm:py-32">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.12 } },
        }}
        className="mx-auto grid max-w-7xl items-center gap-12 px-6 lg:grid-cols-2 lg:gap-20"
      >
        <motion.div variants={fadeUp}>
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-500">
            Pricing
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-100 sm:text-4xl">
            Simple, transparent pricing.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-gray-400 sm:text-lg">
            IndexNode runs on INC credits. Buy credits, spend them on jobs.
            No subscriptions, no per-seat pricing, no surprises.
          </p>
        </motion.div>
        <motion.div variants={fadeUp} className="grid gap-4 sm:grid-cols-2">
          {costs.map((cost) => {
            const Icon = cost.icon;
            return (
              <div
                key={cost.label}
                className="rounded-xl border border-gray-800 bg-gray-950/60 p-6"
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-amber-500/10 text-amber-500">
                  <Icon className="h-4 w-4" />
                </span>
                <p className="mt-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
                  {cost.label}
                </p>
                <p className="mt-2 font-mono text-3xl font-bold text-amber-500">
                  {cost.cost}
                </p>
                <p className="mt-1 text-xs text-gray-500">{cost.sub}</p>
              </div>
            );
          })}
        </motion.div>
      </motion.div>
    </section>
  );
}
