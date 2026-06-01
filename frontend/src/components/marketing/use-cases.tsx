"use client";

import { motion } from "framer-motion";
import { Coins, Layers, Scale } from "lucide-react";

const cases = [
  {
    icon: Coins,
    title: "DeFi protocols",
    body: "Prove every liquidity event, swap, and fee distribution happened exactly as recorded. Audit-ready from day one.",
  },
  {
    icon: Scale,
    title: "Compliance & legal",
    body: "When regulators ask for evidence, give them cryptographic proof — not a screenshot. IndexNode data is admissible.",
  },
  {
    icon: Layers,
    title: "Data providers",
    body: "Index blockchain data, verify it with on-chain proof, and sell it on the marketplace. Your data has a receipt.",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
} as const;

export default function UseCases() {
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={fadeUp}
          className="mx-auto max-w-2xl text-center"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-500">
            Who it&apos;s for
          </p>
          <div
            aria-hidden="true"
            className="mx-auto mt-3 h-0.5 w-12 bg-gradient-to-r from-amber-500/0 via-amber-500 to-amber-500/0"
          />
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-gray-100 sm:text-4xl">
            Built for teams that need certainty.
          </h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.12 } },
          }}
          className="mt-14 grid gap-6 md:grid-cols-3"
        >
          {cases.map((useCase) => {
            const Icon = useCase.icon;
            return (
              <motion.div
                key={useCase.title}
                variants={fadeUp}
                className="group relative rounded-xl border border-gray-800 bg-gray-900/60 p-6 transition hover:border-t-amber-500"
              >
                <span className="absolute inset-x-0 top-0 h-px bg-transparent transition group-hover:bg-amber-500" />
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-amber-500/10 text-amber-500">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-lg font-semibold text-gray-100">
                  {useCase.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-400">
                  {useCase.body}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
