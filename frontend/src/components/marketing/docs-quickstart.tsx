"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Key, PlayCircle, Terminal } from "lucide-react";

interface Card {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  href: string;
  step: string;
}

const cards: Card[] = [
  {
    icon: Key,
    step: "01",
    title: "Get your API key",
    body: "Create a session cookie via login, or generate a Bearer key from your account.",
    href: "#authentication",
  },
  {
    icon: PlayCircle,
    step: "02",
    title: "Create your first job",
    body: "Submit a contract address and event signatures to start indexing in real time.",
    href: "#jobs",
  },
  {
    icon: Terminal,
    step: "03",
    title: "Query with GraphQL",
    body: "Read indexed events, verify proofs, and subscribe to live updates.",
    href: "#graphql",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
} as const;

export default function DocsQuickstart() {
  return (
    <section className="pb-20 sm:pb-28">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.12 } },
        }}
        className="mx-auto grid max-w-7xl gap-6 px-6 md:grid-cols-3"
      >
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <motion.div key={card.href} variants={fadeUp}>
              <Link
                href={card.href}
                className="group flex h-full flex-col rounded-xl border border-gray-800 bg-gray-900/60 p-6 transition hover:border-amber-500/60"
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-amber-500/10 text-amber-500">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="font-mono text-xs text-gray-500">
                    {card.step}
                  </span>
                </div>
                <h3 className="mt-5 text-lg font-semibold text-gray-100 group-hover:text-amber-400">
                  {card.title}
                </h3>
                <p className="mt-2 flex-1 text-sm text-gray-400">{card.body}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-amber-400">
                  Read section
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}
