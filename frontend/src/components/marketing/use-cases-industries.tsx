"use client";

import { motion } from "framer-motion";

const industries = [
  "DeFi",
  "NFTs",
  "DAOs",
  "Gaming",
  "Supply Chain",
  "Insurance",
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
} as const;

export default function UseCasesIndustries() {
  return (
    <section className="border-y border-gray-800 bg-gray-900 py-24 sm:py-32">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.08 } },
        }}
        className="mx-auto max-w-3xl px-6 text-center"
      >
        <motion.h2
          variants={fadeUp}
          className="text-3xl font-bold tracking-tight text-gray-100 sm:text-4xl"
        >
          Any team that indexes blockchain data needs proof.
        </motion.h2>
        <motion.div
          variants={fadeUp}
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
        >
          {industries.map((industry) => (
            <span
              key={industry}
              className="rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-sm font-medium text-amber-400"
            >
              {industry}
            </span>
          ))}
        </motion.div>
        <motion.p variants={fadeUp} className="mt-8 text-base text-gray-400">
          If your business depends on blockchain event data, it depends on
          IndexNode.
        </motion.p>
      </motion.div>
    </section>
  );
}
