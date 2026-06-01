"use client";

import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
} as const;

export default function AboutStory() {
  return (
    <section className="py-20 sm:py-28">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.15 } },
        }}
        className="mx-auto grid max-w-6xl gap-12 px-6 lg:grid-cols-2 lg:gap-16"
      >
        <motion.div variants={fadeUp}>
          <h2 className="text-2xl font-bold tracking-tight text-gray-100 sm:text-3xl">
            The problem we kept hitting
          </h2>
          <p className="mt-5 text-base leading-relaxed text-gray-400 sm:text-lg">
            Every time we needed to prove something happened on a blockchain —
            a transaction, a payment, a smart contract event — we hit the
            same wall. The data existed somewhere in a database. But a
            database entry proves nothing. Anyone can edit a database. Anyone
            can delete a row. We needed proof that couldn&apos;t be altered.
          </p>
        </motion.div>
        <motion.div variants={fadeUp}>
          <h2 className="text-2xl font-bold tracking-tight text-gray-100 sm:text-3xl">
            What we built
          </h2>
          <p className="mt-5 text-base leading-relaxed text-gray-400 sm:text-lg">
            IndexNode watches your smart contracts and records every event
            that happens. Then it creates a mathematical fingerprint of that
            data and writes it permanently to the blockchain itself. From that
            moment on, the proof exists independently of us, of you, of
            anyone. It cannot be changed. It cannot be deleted. It simply is.
          </p>
        </motion.div>
      </motion.div>
    </section>
  );
}
