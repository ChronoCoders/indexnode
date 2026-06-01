import type { BlogPost } from "@/types";

export const post: BlogPost = {
  slug: "blockchain-proof",
  title: "Why Blockchain Data Needs Cryptographic Proof",
  excerpt:
    "Storing blockchain events in a database is easy. Proving that data hasn't been altered since indexing is a different problem entirely.",
  date: "2026-05-21",
  readTime: "4 min read",
  content: [
    {
      type: "p",
      text: "Every blockchain indexer faces the same quiet problem. You pull events from an RPC node, decode them, store them in a database, and serve them through an API. Fast, cheap, works fine — until someone asks: how do I know this data is accurate?",
    },
    {
      type: "p",
      text: "The honest answer, for most indexers, is: you don't. You trust the operator.",
    },
    { type: "h2", text: "The gap between indexing and proof" },
    {
      type: "p",
      text: "An indexed dataset is a copy. The original lives on-chain — immutable, verifiable, replicated across thousands of nodes. Your copy lives in a Postgres table on someone's server. The moment data leaves the chain and lands in a database, it enters a space where it can be modified, selectively omitted, or quietly corrected after the fact.",
    },
    {
      type: "p",
      text: "This matters more than most teams realize. A DeFi protocol's risk model depends on complete event history. A compliance audit requires proof that the data shown to regulators matches what actually happened on-chain. An NFT marketplace's ownership records are only as trustworthy as the indexer serving them.",
    },
    { type: "h2", text: "What cryptographic proof actually means" },
    {
      type: "p",
      text: "IndexNode solves this by anchoring every batch of indexed events to the blockchain itself. Here's what happens after your events are indexed:",
    },
    {
      type: "ol",
      items: [
        "Each event is hashed and stored with a content identifier.",
        "Events are batched and arranged into a Merkle tree. The root hash represents the entire batch — change any single event and the root changes.",
        "The Merkle root is committed to an on-chain smart contract (`TimestampRegistry`) via a transaction. This creates an immutable, timestamped record.",
        "Any event can later be verified by reconstructing its Merkle path and checking it against the on-chain root.",
      ],
    },
    {
      type: "p",
      text: "The result: anyone with the content hash of an event and access to the blockchain can independently verify that the data was indexed at a specific time and has not been altered since.",
    },
    { type: "h2", text: "Why this matters for your use case" },
    {
      type: "p",
      text: "If you're building a compliance dashboard, your auditors can verify the data themselves without trusting you. If you're running a data marketplace, your buyers know exactly what they're getting. If you're operating a DeFi protocol, your historical event data carries the same trust guarantees as the chain it came from.",
    },
    {
      type: "p",
      text: "**Trustless blockchain intelligence isn't a feature. It's the baseline that everything else should be built on.**",
    },
  ],
};
