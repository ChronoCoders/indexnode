"use client";

import { motion } from "framer-motion";
import { AlertCircle, FileX, ServerCrash } from "lucide-react";

const problems = [
  {
    icon: AlertCircle,
    title: "No proof of existence",
    body: "Standard indexers store data. None of them can prove the data existed at a specific time.",
  },
  {
    icon: ServerCrash,
    title: "Centralized risk",
    body: "A single database is a single point of failure. One breach, one error, one company decision — your data is gone.",
  },
  {
    icon: FileX,
    title: "No audit trail",
    body: "Without cryptographic verification, your blockchain data is as trustworthy as a spreadsheet.",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
} as const;

export default function ProblemSection() {
  return (
    <section id="how-it-works" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={fadeUp}
          className="mx-auto max-w-3xl text-center"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-500">
            The problem
          </p>
          <div
            aria-hidden="true"
            className="mx-auto mt-3 h-0.5 w-12 bg-gradient-to-r from-amber-500/0 via-amber-500 to-amber-500/0"
          />
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-gray-100 sm:text-4xl">
            Your data exists. But can you prove it?
          </h2>
          <p className="mt-4 text-lg text-gray-400">
            Every day, billions of blockchain events are indexed by platforms
            that give you data — but no proof. When a dispute arises, when a
            regulator asks, when a client questions your numbers, you need
            more than a database entry.
          </p>
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
          {problems.map((problem) => {
            const Icon = problem.icon;
            return (
              <motion.div
                key={problem.title}
                variants={fadeUp}
                className="relative overflow-hidden rounded-xl border border-gray-800 bg-gray-900/60 p-6 transition hover:shadow-[0_0_30px_rgba(239,68,68,0.1)]"
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-red-500/50 to-transparent"
                />
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-red-900/50 bg-red-950/50 text-red-400">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-lg font-semibold text-gray-100">
                  {problem.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-400">
                  {problem.body}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
