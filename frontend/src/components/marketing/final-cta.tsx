"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
} as const;

interface Particle {
  left: string;
  top: string;
  duration: number;
  delay: number;
  yRange: number;
  xRange: number;
}

const particles: Particle[] = [
  { left: "12%", top: "18%", duration: 5.2, delay: 0, yRange: -32, xRange: 12 },
  {
    left: "28%",
    top: "72%",
    duration: 6.8,
    delay: 0.6,
    yRange: -42,
    xRange: -16,
  },
  {
    left: "45%",
    top: "30%",
    duration: 7.4,
    delay: 1.1,
    yRange: -28,
    xRange: 18,
  },
  {
    left: "62%",
    top: "65%",
    duration: 6.1,
    delay: 0.3,
    yRange: -38,
    xRange: -10,
  },
  {
    left: "78%",
    top: "22%",
    duration: 5.6,
    delay: 1.4,
    yRange: -34,
    xRange: 14,
  },
  {
    left: "88%",
    top: "55%",
    duration: 7.0,
    delay: 0.9,
    yRange: -30,
    xRange: -12,
  },
];

export default function FinalCta() {
  return (
    <section className="relative overflow-hidden border-y border-amber-600/30 bg-gradient-to-br from-amber-600/20 to-amber-900/10 py-24 sm:py-32">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 80% at 50% 50%, rgba(217,119,6,0.2), transparent 70%)",
        }}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
      >
        {particles.map((p, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0 }}
            animate={{
              opacity: [0, 0.8, 0],
              y: [0, p.yRange, 0],
              x: [0, p.xRange, 0],
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{ left: p.left, top: p.top }}
            className="absolute h-1 w-1 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(217,119,6,0.7)]"
          />
        ))}
      </div>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={fadeUp}
        className="relative mx-auto max-w-3xl px-6 text-center"
      >
        <h2 className="text-3xl font-bold tracking-tight text-gray-100 sm:text-4xl">
          Start proving your blockchain data today.
        </h2>
        <p className="mt-4 text-lg text-gray-300">
          Free to start. No credit card required. Connect your contract in
          under 2 minutes.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-amber-500 px-6 py-3 text-sm font-semibold text-gray-950 transition hover:bg-amber-400"
          >
            Create free account
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/docs"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-700 px-6 py-3 text-sm font-semibold text-gray-100 transition hover:border-amber-500 hover:text-amber-400"
          >
            <BookOpen className="h-4 w-4" />
            Read the docs
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
