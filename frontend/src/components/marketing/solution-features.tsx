"use client";

import * as React from "react";
import { motion } from "framer-motion";
import MerkleVisual from "@/components/marketing/visuals/merkle-visual";
import ExtractVisual from "@/components/marketing/visuals/extract-visual";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
} as const;

interface FeatureProps {
  eyebrow: string;
  title: string;
  body: string;
  visual: React.ReactNode;
  reverse?: boolean;
  glow?: string;
}

function FeatureRow({
  eyebrow,
  title,
  body,
  visual,
  reverse,
  glow,
}: FeatureProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.15 } },
      }}
      className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20"
    >
      <motion.div
        variants={fadeUp}
        className={reverse ? "order-1 lg:order-2" : ""}
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-500">
          {eyebrow}
        </p>
        <h3 className="mt-3 text-2xl font-bold tracking-tight text-gray-100 sm:text-3xl">
          {title}
        </h3>
        <p className="mt-4 text-base leading-relaxed text-gray-400 sm:text-lg">
          {body}
        </p>
      </motion.div>
      <motion.div
        variants={fadeUp}
        className={`${reverse ? "order-2 lg:order-1" : ""} ${glow ?? ""}`}
      >
        {visual}
      </motion.div>
    </motion.div>
  );
}

function IndexVisual() {
  return (
    <pre className="overflow-x-auto rounded-xl border border-gray-800 bg-gray-900 p-5 font-mono text-xs leading-relaxed text-gray-300 sm:text-sm">
      <code>
        <span className="text-amber-400">query</span>{" "}
        <span className="text-gray-100">Events</span> {"{"}
        {"\n"}
        {"  "}
        <span className="text-amber-300">blockchainEvents</span>(contract:{" "}
        <span className="text-green-400">&quot;0x6b17...&quot;</span>) {"{"}
        {"\n"}
        {"    id"}
        {"\n"}
        {"    eventName"}
        {"\n"}
        {"    blockNumber"}
        {"\n"}
        {"    transactionHash"}
        {"\n"}
        {"    contentHash"}
        {"\n"}
        {"    ipfsCid"}
        {"\n"}
        {"  "}
        {"}"}
        {"\n"}
        {"}"}
        {"\n"}
        {"\n"}
        <span className="text-gray-500"># →</span>
        {"\n"}
        {"{ "}
        {"\n"}
        {"  "}
        <span className="text-amber-300">&quot;data&quot;</span>: {"{"} ...{" "}
        {"}"},
        {"\n"}
        {"  "}
        <span className="text-amber-300">&quot;proof&quot;</span>:{" "}
        <span className="text-green-400">&quot;0x9f3c…verified&quot;</span>
        {"\n"}
        {"}"}
      </code>
    </pre>
  );
}

export default function SolutionFeatures() {
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto flex max-w-7xl flex-col gap-24 px-6 sm:gap-32">
        <FeatureRow
          eyebrow="Index"
          title="Index every event, automatically."
          body="Connect your smart contract address and IndexNode subscribes to every event in real time. Transfers, swaps, mints, approvals — nothing is missed. Data is structured, stored in PostgreSQL, and immediately queryable via GraphQL."
          visual={<IndexVisual />}
          glow="shadow-[0_0_60px_rgba(217,119,6,0.1)]"
        />
        <FeatureRow
          eyebrow="Prove"
          title="Prove it happened. On-chain."
          body="Every batch of indexed events gets hashed into a Merkle tree. The root is committed directly to the blockchain via our TimestampRegistry contract. The proof lives on-chain forever — no one can alter it, no one can delete it, not even us."
          visual={<MerkleVisual />}
          reverse
          glow="shadow-[0_0_60px_rgba(34,197,94,0.1)]"
        />
        <FeatureRow
          eyebrow="Extract"
          title="Turn raw events into structured intelligence."
          body="Raw blockchain events are bytes. IndexNode uses AI to extract structured data — token amounts, addresses, transaction intent — according to a schema you define. The result is queryable, sellable, and verifiable."
          visual={<ExtractVisual />}
          glow="shadow-[0_0_60px_rgba(59,130,246,0.1)]"
        />
      </div>
    </section>
  );
}
