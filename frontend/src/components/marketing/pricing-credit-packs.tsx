"use client";

import { motion } from "framer-motion";

interface Pack {
  credits: string;
  price: string;
  bestValue?: boolean;
}

const packs: Pack[] = [
  { credits: "5,000 credits", price: "$9" },
  { credits: "20,000 credits", price: "$29" },
  { credits: "100,000 credits", price: "$99", bestValue: true },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
} as const;

export default function PricingCreditPacks() {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={fadeUp}
          className="mx-auto max-w-2xl text-center"
        >
          <h2 className="text-3xl font-bold tracking-tight text-gray-100 sm:text-4xl">
            Need more credits? Buy as you go.
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
          className="mt-10 grid gap-6 sm:grid-cols-3"
        >
          {packs.map((pack) => (
            <motion.div
              key={pack.credits}
              variants={fadeUp}
              className={`relative flex flex-col items-center rounded-xl border p-8 text-center ${
                pack.bestValue
                  ? "border-amber-500/60 bg-amber-500/5"
                  : "border-gray-800 bg-gray-900/60"
              }`}
            >
              {pack.bestValue ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-gray-950">
                  Best value
                </span>
              ) : null}
              <p className="text-sm font-semibold text-gray-400">
                {pack.credits}
              </p>
              <p className="mt-3 text-4xl font-bold text-gray-100">
                {pack.price}
              </p>
            </motion.div>
          ))}
        </motion.div>
        <p className="mt-6 text-center text-sm text-gray-500">
          1 crawl job = 100 credits &nbsp;·&nbsp; 1 event indexing job = 50
          credits
        </p>
      </div>
    </section>
  );
}
