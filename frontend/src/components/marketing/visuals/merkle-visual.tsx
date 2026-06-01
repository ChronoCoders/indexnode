"use client";

import { motion } from "framer-motion";

export default function MerkleVisual() {
  return (
    <div className="relative rounded-xl border border-gray-800 bg-gray-900 p-6">
      <svg
        viewBox="0 0 320 200"
        className="h-auto w-full"
        aria-label="Merkle tree committed on-chain"
      >
        <motion.g
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.18 } },
          }}
        >
          {[40, 120, 200, 280].map((x) => (
            <motion.circle
              key={x}
              cx={x}
              cy={170}
              r={10}
              fill="#171717"
              stroke="#525252"
              strokeWidth={1.5}
              variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1, transition: { duration: 0.3 } },
              }}
            />
          ))}
          {[
            { x1: 40, x2: 80 },
            { x1: 120, x2: 80 },
            { x1: 200, x2: 240 },
            { x1: 280, x2: 240 },
          ].map((line, i) => (
            <motion.line
              key={i}
              x1={line.x1}
              y1={160}
              x2={line.x2}
              y2={110}
              stroke="#404040"
              strokeWidth={1.5}
              variants={{
                hidden: { pathLength: 0, opacity: 0 },
                visible: {
                  pathLength: 1,
                  opacity: 1,
                  transition: { duration: 0.4 },
                },
              }}
            />
          ))}
          <motion.circle
            cx={80}
            cy={100}
            r={10}
            fill="#171717"
            stroke="#525252"
            strokeWidth={1.5}
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { duration: 0.3 } },
            }}
          />
          <motion.circle
            cx={240}
            cy={100}
            r={10}
            fill="#171717"
            stroke="#525252"
            strokeWidth={1.5}
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { duration: 0.3 } },
            }}
          />
          <motion.line
            x1={80}
            y1={90}
            x2={160}
            y2={50}
            stroke="#404040"
            strokeWidth={1.5}
            variants={{
              hidden: { pathLength: 0, opacity: 0 },
              visible: {
                pathLength: 1,
                opacity: 1,
                transition: { duration: 0.4 },
              },
            }}
          />
          <motion.line
            x1={240}
            y1={90}
            x2={160}
            y2={50}
            stroke="#404040"
            strokeWidth={1.5}
            variants={{
              hidden: { pathLength: 0, opacity: 0 },
              visible: {
                pathLength: 1,
                opacity: 1,
                transition: { duration: 0.4 },
              },
            }}
          />
          <motion.circle
            cx={160}
            cy={40}
            r={14}
            fill="#d97706"
            variants={{
              hidden: { opacity: 0, scale: 0.6 },
              visible: {
                opacity: 1,
                scale: 1,
                transition: { duration: 0.4 },
              },
            }}
          />
        </motion.g>
      </svg>
      <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
        <span>4 event hashes</span>
        <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-amber-400">
          On-chain root
        </span>
      </div>
    </div>
  );
}
