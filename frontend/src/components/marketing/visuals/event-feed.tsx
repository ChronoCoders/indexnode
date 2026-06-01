"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";

interface FeedEvent {
  type: string;
  hash: string;
  block: string;
}

const events: FeedEvent[] = [
  { type: "Transfer", hash: "0x1a2b...c3d4", block: "19,847,234" },
  { type: "Swap", hash: "0x3c4d...e5f6", block: "19,847,235" },
  { type: "Mint", hash: "0x5e6f...a7b8", block: "19,847,236" },
  { type: "Approval", hash: "0x7a8b...c9d0", block: "19,847,237" },
];

export interface EventFeedProps {
  compact?: boolean;
}

export default function EventFeed({ compact = false }: EventFeedProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.18, delayChildren: 0.1 } },
      }}
      className={`rounded-xl border border-gray-800 bg-gray-900/60 backdrop-blur-sm ${
        compact ? "space-y-2 p-3" : "space-y-3 p-4"
      }`}
    >
      <div
        className={`flex items-center justify-between border-b border-gray-800 ${
          compact ? "pb-2" : "pb-3"
        }`}
      >
        <span
          className={`font-semibold uppercase tracking-wider text-gray-400 ${
            compact ? "text-[10px]" : "text-xs"
          }`}
        >
          Live event feed
        </span>
        <span
          className={`flex items-center gap-2 text-gray-500 ${
            compact ? "text-[10px]" : "text-xs"
          }`}
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
          </span>
          Ethereum mainnet
        </span>
      </div>

      {events.map((event) => (
        <motion.div
          key={event.hash}
          variants={{
            hidden: { opacity: 0, y: 16 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
          }}
          className={`flex items-center justify-between gap-3 rounded-lg border border-gray-800 bg-gray-900 ${
            compact ? "px-2.5 py-2" : "px-3 py-2.5"
          }`}
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="h-2 w-2 shrink-0 rounded-full bg-green-500" />
            <span className="min-w-0">
              <span
                className={`block font-semibold text-gray-100 ${
                  compact ? "text-xs" : "text-sm"
                }`}
              >
                {event.type}
              </span>
              <span
                className={`block font-mono text-gray-500 ${
                  compact ? "text-[10px]" : "text-xs"
                }`}
              >
                {event.hash} · Block {event.block}
              </span>
            </span>
          </span>
          <motion.span
            initial={{ opacity: 0.6 }}
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{
              duration: 2.4,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1.4,
            }}
            className={`flex shrink-0 items-center gap-1 rounded-full bg-amber-500/10 font-medium text-amber-400 ${
              compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs"
            }`}
          >
            <Check className="h-3 w-3" />
            Proven
          </motion.span>
        </motion.div>
      ))}
    </motion.div>
  );
}
