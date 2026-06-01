"use client";

import { motion } from "framer-motion";
import { Eye, Infinity as InfinityIcon, ShieldCheck } from "lucide-react";

const beliefs = [
  {
    icon: InfinityIcon,
    title: "Your data should outlast us",
    body: "If IndexNode shuts down tomorrow, your proofs still exist. They live on the blockchain, not on our servers. That's not a feature — it's a principle.",
  },
  {
    icon: ShieldCheck,
    title: "Proof over promises",
    body: "We don't ask you to trust us. We give you something better than trust — mathematical certainty. Every piece of data we store comes with a receipt that anyone can verify.",
  },
  {
    icon: Eye,
    title: "Transparency is non-negotiable",
    body: "Our pricing is public. Our contracts are open source. Our API is documented. We don't believe in black boxes, fine print, or vendor lock-in.",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
} as const;

export default function AboutBeliefs() {
  return (
    <section className="border-y border-gray-800 bg-gray-900/40 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <motion.h2
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={fadeUp}
          className="text-center text-3xl font-bold tracking-tight text-gray-100 sm:text-4xl"
        >
          What we believe
        </motion.h2>

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
          {beliefs.map((belief) => {
            const Icon = belief.icon;
            return (
              <motion.div
                key={belief.title}
                variants={fadeUp}
                className="rounded-xl border border-gray-800 bg-gray-950/60 p-6"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-amber-500/10 text-amber-500">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-5 text-lg font-semibold text-gray-100">
                  {belief.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-400">
                  {belief.body}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
