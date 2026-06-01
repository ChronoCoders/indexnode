import type { BlogPost } from "@/types";

export const post: BlogPost = {
  slug: "data-marketplace",
  title: "A Marketplace for Indexed Blockchain Datasets",
  excerpt:
    "The most valuable blockchain datasets are the ones someone else already paid to index. Here's how buying and selling them works.",
  date: "2026-05-21",
  readTime: "4 min read",
  content: [
    {
      type: "p",
      text: "Indexing is expensive. RPC calls cost money. Storage costs money. Running a reliable indexer that handles reorgs, backfills missed blocks, and decodes events correctly takes engineering time.",
    },
    {
      type: "p",
      text: "Most teams index the same contracts independently. Uniswap v3, Aave, Compound, major NFT collections — the event history for these contracts has been re-indexed thousands of times by thousands of teams who each paid the same cost to produce roughly the same dataset.",
    },
    { type: "h2", text: "The case for a data marketplace" },
    {
      type: "p",
      text: "A marketplace for indexed blockchain data changes the economics. Instead of every team re-indexing from genesis, they buy the dataset from a team that already did it — verified, structured, and ready to query.",
    },
    {
      type: "p",
      text: "The challenge has always been trust. How do you know the dataset you're buying is accurate? How do you know the seller hasn't omitted events, modified values, or cherry-picked block ranges?",
    },
    { type: "h2", text: "How proof makes it work" },
    {
      type: "p",
      text: "IndexNode's marketplace is built on the same proof infrastructure as its indexing pipeline. Every dataset listed for sale has a Merkle root committed on-chain at the time of indexing. Buyers can verify the dataset's integrity before purchasing and independently after.",
    },
    {
      type: "p",
      text: "This means the marketplace isn't just a data exchange — it's a **verified** data exchange. Sellers who produce high-quality, well-documented datasets with complete coverage build a verifiable track record. Buyers know exactly what they're getting.",
    },
    { type: "h2", text: "What's available" },
    {
      type: "p",
      text: "The marketplace lists indexed datasets by contract, chain, event type, and block range. Pricing is set by the seller in INC credits. A dataset covering Uniswap v3 Transfer events from genesis on Ethereum mainnet is a different product from a rolling 90-day window — both have their buyers.",
    },
    {
      type: "p",
      text: "For teams producing data as a byproduct of their own operations, the marketplace is a way to recover indexing costs. For teams that need data without the infrastructure investment, it's a faster path to production.",
    },
    {
      type: "p",
      text: "The data already exists. The question is whether you index it yourself or buy it from someone who already did.",
    },
  ],
};
