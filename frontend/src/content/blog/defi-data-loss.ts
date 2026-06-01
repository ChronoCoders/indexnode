import type { BlogPost } from "@/types";

export const post: BlogPost = {
  slug: "defi-data-loss",
  title: "When DeFi Protocols Lose Their Event History",
  excerpt:
    "Event history loss is rare, recoverable in most cases, and catastrophic in the cases where it isn't.",
  date: "2026-05-21",
  readTime: "5 min read",
  content: [
    {
      type: "p",
      text: "Blockchain events are permanent. The chain keeps them forever. What's not permanent is your indexed copy — the queryable, structured, application-ready version that your frontend, analytics pipeline, and risk model actually use.",
    },
    { type: "h2", text: "How event history gets lost" },
    {
      type: "p",
      text: "**Indexer infrastructure failure.** A managed indexer service shuts down, changes its data retention policy, or simply goes offline for long enough that the reconnection logic gives up. The gap in coverage is real; replaying it from scratch requires re-indexing from the missed block range, which takes time and may surface RPC rate limits.",
    },
    {
      type: "p",
      text: "**Database migrations without a rollback.** Destructive schema changes that drop columns or tables, run without a verified backup, have ended more than one protocol's historical dataset. The chain still has the data. Your database doesn't.",
    },
    {
      type: "p",
      text: "**Subgraph deprecation.** Teams using The Graph's hosted service have experienced forced migrations when endpoints were deprecated. The new subgraph starts from the current block. Historical data requires a full re-sync, which can take days for high-volume contracts.",
    },
    {
      type: "p",
      text: "**Reorg handling bugs.** Reorganizations are normal on most chains. If your indexer doesn't handle reorgs correctly, events from orphaned blocks can persist in your database while their replacements are never indexed. The result is a mix of canonical and non-canonical data with no way to tell which is which.",
    },
    { type: "h2", text: "What's actually at risk" },
    {
      type: "p",
      text: "For a DeFi protocol, event history isn't just analytics. It's the audit trail for every swap, deposit, liquidation, and fee accrual. Lose it and you lose the ability to reconstruct user balances, verify historical APY calculations, or respond to a regulatory inquiry with complete records.",
    },
    {
      type: "p",
      text: "The protocols that handle this well treat their indexed data as infrastructure — with the same redundancy, monitoring, and integrity guarantees they'd apply to their smart contracts. The ones that don't tend to find out the hard way.",
    },
    { type: "h2", text: "The practical answer" },
    {
      type: "p",
      text: "Index early, anchor often. Every event batch that gets a Merkle root committed on-chain can be independently reconstructed and verified even if your primary database is lost. The chain is the backup. IndexNode's proof pipeline makes this automatic — you don't have to think about it separately from your indexing workflow.",
    },
  ],
};
