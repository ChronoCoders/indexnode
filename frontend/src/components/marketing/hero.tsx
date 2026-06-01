"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Play } from "lucide-react";
import DashboardPreview from "@/components/marketing/dashboard-preview";

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-40 pb-32 sm:pt-44">
      <BackgroundGlow />

      <div className="relative mx-auto max-w-5xl px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-amber-400"
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-400" />
          </span>
          Live · Trustless blockchain intelligence
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-6 text-5xl font-bold tracking-tight text-gray-100 sm:text-6xl md:text-7xl lg:text-8xl"
        >
          <span className="block">Blockchain data.</span>
          <span className="block bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
            Proven on-chain.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mx-auto mt-6 max-w-2xl text-lg text-gray-400 sm:text-xl"
        >
          IndexNode indexes every event from your smart contracts, stores them
          on IPFS, and commits a cryptographic proof on-chain. Your data is
          not just stored — it&apos;s provable.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <Link
            href="/signup"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-amber-500 px-8 py-4 text-sm font-semibold text-gray-950 transition hover:bg-amber-400"
          >
            Start indexing free
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="#how-it-works"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-700 px-8 py-4 text-sm font-semibold text-gray-100 transition hover:border-amber-500 hover:text-amber-400"
          >
            <Play className="h-4 w-4" />
            See how it works
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-500"
        >
          <span>
            <span className="font-mono font-semibold text-gray-200">
              1.2M+
            </span>{" "}
            Events indexed
          </span>
          <span aria-hidden="true" className="text-gray-700">
            ·
          </span>
          <span>
            <span className="font-mono font-semibold text-gray-200">98K+</span>{" "}
            Proofs committed
          </span>
          <span aria-hidden="true" className="text-gray-700">
            ·
          </span>
          <span>
            <span className="font-mono font-semibold text-gray-200">
              99.9%
            </span>{" "}
            Uptime
          </span>
        </motion.div>
      </div>

      <DashboardPreview />
    </section>
  );
}

function BackgroundGlow() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div
        className="absolute inset-x-0 top-0 h-[60vh]"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(217,119,6,0.15), transparent 70%)",
        }}
      />
      <div
        className="absolute -left-32 top-1/4 h-[40vh] w-[40vw]"
        style={{
          background:
            "radial-gradient(circle, rgba(217,119,6,0.08), transparent 70%)",
        }}
      />
      <div
        className="absolute -right-32 top-1/3 h-[40vh] w-[40vw]"
        style={{
          background:
            "radial-gradient(circle, rgba(217,119,6,0.05), transparent 70%)",
        }}
      />
    </div>
  );
}
