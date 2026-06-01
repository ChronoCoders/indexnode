"use client";

import { motion } from "framer-motion";
import { ArrowRight, Check, X } from "lucide-react";

interface Row {
  tone: "ok" | "tamper";
  label: string;
  bytes: string;
  cid: string;
  status: string;
}

const rows: Row[] = [
  {
    tone: "ok",
    label: "Original bytes",
    bytes: "0xa9059cbb…0064",
    cid: "Qm1a2b3c4d5e6f7g8h",
    status: "Same content · same CID",
  },
  {
    tone: "tamper",
    label: "Altered bytes",
    bytes: "0xa9059cbb…00c8",
    cid: "Qm9x8y7z6w5v4u3t2s",
    status: "One byte changed · entirely new CID",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
} as const;

export default function IpfsVisual() {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.18 } },
      }}
      className="rounded-xl border border-gray-800 bg-gray-900 p-5"
    >
      {rows.map((row) => {
        const tinted =
          row.tone === "ok"
            ? "border-green-500/30 bg-green-500/5"
            : "border-red-500/30 bg-red-500/5";
        const text = row.tone === "ok" ? "text-green-400" : "text-red-400";
        const Icon = row.tone === "ok" ? Check : X;
        return (
          <motion.div
            key={row.label}
            variants={fadeUp}
            className={`mt-3 rounded-lg border p-3 first:mt-0 ${tinted}`}
          >
            <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[1fr_auto_1fr_auto]">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  {row.label}
                </p>
                <p className="mt-1 font-mono text-xs text-gray-200">
                  {row.bytes}
                </p>
              </div>
              <ArrowRight className="hidden h-4 w-4 text-amber-500 sm:block" />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  SHA-256 / CID
                </p>
                <p className="mt-1 font-mono text-xs text-gray-200">
                  {row.cid}
                </p>
              </div>
              <span
                className={`inline-flex items-center gap-1 self-start rounded-full bg-gray-950/60 px-2 py-0.5 text-xs font-medium sm:self-center ${text}`}
              >
                <Icon className="h-3 w-3" />
                {row.tone === "ok" ? "Match" : "Tampered"}
              </span>
            </div>
            <p className={`mt-2 text-xs ${text}`}>{row.status}</p>
          </motion.div>
        );
      })}
      <p className="mt-4 text-xs leading-relaxed text-gray-500">
        Content-addressed: identical content always produces identical CIDs.
        Any change to the bytes — even a single one — produces a different
        CID, and the change is immediately visible.
      </p>
    </motion.div>
  );
}
