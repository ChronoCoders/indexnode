"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
} as const;

export default function PricingEnterprise() {
  return (
    <section className="border-y border-gray-800 bg-gray-900 py-20 sm:py-28">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.1 } },
        }}
        className="mx-auto max-w-3xl px-6 text-center"
      >
        <motion.h2
          variants={fadeUp}
          className="text-3xl font-bold tracking-tight text-gray-100 sm:text-4xl"
        >
          Need more? Talk to us.
        </motion.h2>
        <motion.p
          variants={fadeUp}
          className="mt-4 text-base leading-relaxed text-gray-400 sm:text-lg"
        >
          Custom indexing pipelines, dedicated infrastructure, SLA-backed
          uptime, and white-label marketplace listings. Pricing based on your
          usage.
        </motion.p>
        <motion.div variants={fadeUp} className="mt-8">
          <a
            href="mailto:sales@indexnode.io"
            className="inline-flex items-center gap-2 rounded-md bg-amber-500 px-6 py-3 text-sm font-semibold text-gray-950 transition hover:bg-amber-400"
          >
            Contact sales
            <ArrowRight className="h-4 w-4" />
          </a>
        </motion.div>
      </motion.div>
    </section>
  );
}
