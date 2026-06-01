"use client";

import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
} as const;

export default function AboutHero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-16 sm:pt-40 sm:pb-20">
      <div className="absolute inset-x-0 top-0 h-[40vh] bg-gradient-to-b from-amber-900/10 via-transparent to-transparent" />
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.1 } },
        }}
        className="relative mx-auto max-w-3xl px-6 text-center"
      >
        <motion.p
          variants={fadeUp}
          className="text-xs font-semibold uppercase tracking-widest text-amber-500"
        >
          About
        </motion.p>
        <motion.h1
          variants={fadeUp}
          className="mt-4 text-4xl font-bold tracking-tight text-gray-100 sm:text-5xl lg:text-6xl"
        >
          We built IndexNode because we needed it ourselves.
        </motion.h1>
        <motion.p
          variants={fadeUp}
          className="mt-6 text-lg text-gray-400 sm:text-xl"
        >
          Every blockchain project we worked on had the same problem — data
          was stored, but never provable. We decided to fix that.
        </motion.p>
      </motion.div>
    </section>
  );
}
