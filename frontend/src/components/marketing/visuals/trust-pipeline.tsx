"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Database,
  GitMerge,
  HardDrive,
  Link as LinkIcon,
  ShieldCheck,
  X,
  Zap,
} from "lucide-react";

interface StepDetail {
  what: string;
  code: string;
  language: string;
}

interface PipelineNode {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  detail: StepDetail;
  final?: boolean;
}

const nodes: PipelineNode[] = [
  {
    icon: Zap,
    title: "Contract event",
    description: "Fires on your contract",
    detail: {
      what: "Your contract emits an event log when a watched transaction lands on chain. The log contains the indexed topics, raw data bytes, the block number, and the transaction hash — exactly as the EVM produces them.",
      language: "json",
      code: `{
  "address": "0x6b17…1d0f",
  "topics": [
    "0xddf252ad…b3ef",
    "0x000…a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    "0x000…d8da6bf26964af9d7eed9e03e53415d37aa96045"
  ],
  "data": "0x0000…0186a0",
  "blockNumber": 19847234,
  "transactionHash": "0x7b3f…c0a1"
}`,
    },
  },
  {
    icon: Database,
    title: "Indexed",
    description: "Captured in real time",
    detail: {
      what: "The worker decodes the event with your contract ABI, structures it according to its signature, computes a SHA-256 content hash, and inserts a row into the blockchain_events table within milliseconds of the block being sealed.",
      language: "json",
      code: `{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "chain": "ethereum",
  "contract_address": "0x6b17…1d0f",
  "event_name": "Transfer",
  "block_number": 19847234,
  "transaction_hash": "0x7b3f…c0a1",
  "event_data": { "from": "0xa0b8…", "to": "0xd8da…", "value": "100000" },
  "content_hash": "a1b2c3d4e5f6…9012"
}`,
    },
  },
  {
    icon: HardDrive,
    title: "IPFS stored",
    description: "Content-addressed, permanent",
    detail: {
      what: "The serialized event payload is uploaded to IPFS via Pinata. The returned CID is content-addressed, so it changes if a single byte is altered. The CID is written back to the event row so anyone can retrieve the original bytes independently of our infrastructure.",
      language: "bash",
      code: `# Upload returns the CID
curl -s https://api.pinata.cloud/pinning/pinFileToIPFS \\
  -H "Authorization: Bearer \${PINATA_JWT}" \\
  -F file=@event.json

# Retrieve from any public gateway
GET https://gateway.pinata.cloud/ipfs/Qm1a2b3c4d…

ipfs_cid: Qm1a2b3c4d5e6f7g8h
size_bytes: 412
pinned: true`,
    },
  },
  {
    icon: GitMerge,
    title: "Merkle root",
    description: "Hashed into a batch root",
    detail: {
      what: "Once a batch of events accumulates (or a time window closes), the worker computes a Merkle tree over the per-event content hashes. The root is a single 32-byte commitment that proves every member event is included — and no extra ones snuck in.",
      language: "text",
      code: `leaf 0: a1b2c3d4…9012    leaf 1: 5f6e7d8c…3a2b
leaf 2: 7c8d9e0f…4b5a    leaf 3: 3a2b1c0d…ef98

       ┌─ hash(leaf 0, leaf 1) ─┐
                                ├─→ root
       └─ hash(leaf 2, leaf 3) ─┘

merkle_root: 0x9f3c8e1d…4f7a
batch_size:  4 events
batch_id:    8f2e1d3c-…-1a2b`,
    },
  },
  {
    icon: LinkIcon,
    title: "On-chain",
    description: "Committed forever",
    detail: {
      what: "The Merkle root is committed to the TimestampRegistry UUPS contract via commitHash(bytes32). After confirmation the proof is immutable, public, and survives even if IndexNode disappears. The transaction hash is stored alongside the batch.",
      language: "solidity",
      code: `// TimestampRegistry.sol
function commitHash(bytes32 contentHash) external {
  require(timestamps[contentHash] == 0,
          "Hash already committed");
  timestamps[contentHash] = block.number;
  emit HashCommitted(contentHash, block.number);
}

// Recorded by the worker after confirmation
tx_hash:     0xabc123…f00
block:       19,847,289
contract:    TimestampRegistry  (0x5FC8…5707)
gas_used:    47,213`,
    },
  },
  {
    icon: ShieldCheck,
    title: "Verified",
    description: "Provable by anyone",
    detail: {
      what: "Anyone — an auditor, a regulator, a counterparty — can verify any event hash by querying /api/v1/verify or by reading the TimestampRegistry directly on chain. No IndexNode account required.",
      language: "json",
      code: `POST /api/v1/verify
{ "content_hash": "a1b2c3d4e5f6…9012" }

# →
{
  "verified": true,
  "block_number": 19847289,
  "transaction_hash": "0xabc123…f00",
  "committed_at": "2026-01-15T10:30:00Z",
  "merkle_proof": ["5f6e7d8c…3a2b", "9f3c8e1d…4f7a"]
}`,
    },
    final: true,
  },
];

const nodeVariant = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.4, ease: "easeOut" },
  },
} as const;

const connectorVariant = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
} as const;

interface NodeProps {
  node: PipelineNode;
  index: number;
  selected: number | null;
  onSelect: (idx: number) => void;
}

function Node({ node, index, selected, onSelect }: NodeProps) {
  const Icon = node.icon;
  const isSelected = selected === index;
  const isDimmed = selected !== null && !isSelected;

  return (
    <motion.button
      type="button"
      onClick={() => onSelect(index)}
      variants={nodeVariant}
      aria-pressed={isSelected}
      aria-label={`${node.title}: ${node.description}. Click to see details.`}
      className={`group relative flex w-full cursor-pointer flex-col items-center text-center transition-opacity duration-200 lg:w-32 ${
        isDimmed ? "opacity-30" : "opacity-100"
      }`}
    >
      <span
        className={`relative flex h-12 w-12 items-center justify-center rounded-full border transition ${
          isSelected
            ? "border-amber-400 bg-amber-500/25 text-amber-300 shadow-[0_0_30px_rgba(217,119,6,0.45)]"
            : "border-amber-500/40 bg-amber-500/10 text-amber-400 group-hover:border-amber-400 group-hover:bg-amber-500/20"
        } ${node.final && !isSelected ? "shadow-[0_0_24px_rgba(34,197,94,0.25)]" : ""}`}
      >
        <Icon className="h-5 w-5" />
        {node.final && !isSelected ? (
          <motion.span
            aria-hidden="true"
            animate={{ opacity: [0.3, 0.9, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 rounded-full ring-2 ring-green-500/60"
          />
        ) : null}
      </span>
      <p
        className={`mt-3 text-sm font-semibold transition-colors ${
          isSelected ? "text-amber-300" : "text-gray-100"
        }`}
      >
        {node.title}
      </p>
      <p className="mt-0.5 text-xs text-gray-400">{node.description}</p>
    </motion.button>
  );
}

function Connector({ dimmed }: { dimmed: boolean }) {
  return (
    <motion.div
      variants={connectorVariant}
      aria-hidden="true"
      className={`relative flex shrink-0 items-center justify-center transition-opacity duration-200 lg:flex-1 ${
        dimmed ? "opacity-30" : "opacity-100"
      }`}
    >
      <div className="relative hidden h-px w-full overflow-hidden bg-[linear-gradient(to_right,transparent,rgba(217,119,6,0.35)_50%,transparent)] lg:block">
        <motion.span
          animate={{ x: ["-20%", "120%"] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(217,119,6,0.7)]"
        />
      </div>
      <div className="relative my-2 h-8 w-px overflow-hidden bg-[linear-gradient(to_bottom,transparent,rgba(217,119,6,0.35)_50%,transparent)] lg:hidden">
        <motion.span
          animate={{ y: ["-20%", "120%"] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
          className="absolute left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(217,119,6,0.7)]"
        />
      </div>
    </motion.div>
  );
}

interface DetailPanelProps {
  node: PipelineNode;
  index: number;
  total: number;
  onClose: () => void;
}

function DetailPanel({ node, index, total, onClose }: DetailPanelProps) {
  const Icon = node.icon;
  return (
    <motion.div
      key={index}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      role="region"
      aria-label={`Details for ${node.title}`}
      className="overflow-hidden rounded-xl border border-amber-500/30 bg-gray-900 shadow-[0_0_60px_rgba(217,119,6,0.12)]"
    >
      <div className="flex items-start justify-between gap-4 border-b border-gray-800 px-5 py-4">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-amber-500/15 text-amber-400">
            <Icon className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-500">
              Step {index + 1} of {total}
            </p>
            <h3 className="mt-0.5 text-base font-semibold text-gray-100">
              {node.title}
            </h3>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close details"
          className="rounded-md p-1 text-gray-500 transition hover:bg-gray-800 hover:text-gray-200"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-5 px-5 py-5 lg:grid-cols-2 lg:gap-6">
        <p className="text-sm leading-relaxed text-gray-300">
          {node.detail.what}
        </p>
        <div className="overflow-hidden rounded-lg border border-gray-800 bg-gray-950">
          <div className="border-b border-gray-800 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-gray-500">
            {node.detail.language}
          </div>
          <pre className="overflow-x-auto p-4 font-mono text-[11px] leading-relaxed text-gray-200 sm:text-xs">
            <code>{node.detail.code}</code>
          </pre>
        </div>
      </div>
    </motion.div>
  );
}

export default function TrustPipeline() {
  const [selected, setSelected] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (selected === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  const handleSelect = (idx: number) => {
    setSelected((prev) => (prev === idx ? null : idx));
  };

  return (
    <div className="space-y-8">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.2 } },
        }}
        className="flex flex-col items-center gap-2 lg:flex-row lg:items-center lg:justify-between"
      >
        {nodes.map((node, idx) => (
          <React.Fragment key={node.title}>
            <Node
              node={node}
              index={idx}
              selected={selected}
              onSelect={handleSelect}
            />
            {idx < nodes.length - 1 ? (
              <Connector dimmed={selected !== null} />
            ) : null}
          </React.Fragment>
        ))}
      </motion.div>

      <p
        className={`text-center text-xs text-gray-500 transition-opacity ${
          selected === null ? "opacity-100" : "opacity-0"
        }`}
      >
        Click any step to see exactly what happens.
      </p>

      <AnimatePresence mode="wait">
        {selected !== null ? (
          <DetailPanel
            node={nodes[selected]}
            index={selected}
            total={nodes.length}
            onClose={() => setSelected(null)}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}
