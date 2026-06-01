import type { BlogPost } from "@/types";

export const post: BlogPost = {
  slug: "data-manipulation",
  title: "How Indexed Blockchain Data Gets Quietly Manipulated",
  excerpt:
    "Most blockchain data manipulation isn't malicious. It's accidental, undocumented, and impossible to detect after the fact.",
  date: "2026-05-21",
  readTime: "5 min read",
  content: [
    {
      type: "p",
      text: "When developers talk about data integrity, they usually picture an attacker. In practice, the more common threat is subtler: routine database operations that alter historical records without anyone noticing.",
    },
    { type: "h2", text: "The three most common failure modes" },
    {
      type: "p",
      text: "**Silent backfills.** An indexer misses a block range due to an RPC outage. Later, someone runs a script to fill the gap. The data looks complete. But the backfilled events were indexed weeks after the fact, from a different RPC endpoint, possibly against a chain that had already undergone a minor reorg. The gap is gone; the discrepancy is invisible.",
    },
    {
      type: "p",
      text: "**Schema migrations that drop data.** A team decides to normalize their event storage schema. The migration script transforms existing rows. Some edge-case event formats don't survive the transformation cleanly and get dropped or truncated. The migration runs, the deploy goes out, nobody checks historical accuracy. Six months later, a discrepancy shows up in an audit.",
    },
    {
      type: "p",
      text: "**Manual corrections.** An event was decoded incorrectly due to a bug in the ABI parser. Someone writes a one-off SQL update to fix the affected rows. The fix is correct. But there's no record of what changed, when, or why. The corrected data looks identical to data that was correct from the start.",
    },
    { type: "h2", text: "Why you can't detect this after the fact" },
    {
      type: "p",
      text: "If your indexed data has no external anchor, there's no way to distinguish a legitimate correction from a malicious edit. The database shows what it shows. Logs, if they exist, show queries — not intent. Git history shows application code changes, not data changes.",
    },
    {
      type: "p",
      text: "This isn't a hypothetical. It's the normal operational history of any database-backed system that runs long enough.",
    },
    { type: "h2", text: "The anchor approach" },
    {
      type: "p",
      text: "IndexNode commits a cryptographic fingerprint of every event batch to an on-chain smart contract at the time of indexing. This fingerprint — a Merkle root — can't be retroactively altered. If the underlying data changes, the fingerprint no longer matches.",
    },
    {
      type: "p",
      text: "This doesn't prevent teams from correcting genuine errors. It makes corrections visible. Any divergence between current data and the on-chain fingerprint is detectable, auditable, and explainable — or it isn't, in which case you have a real problem worth knowing about.",
    },
    {
      type: "p",
      text: "Data you can't verify is data you have to trust. At scale, that's a risk most teams haven't priced in.",
    },
  ],
};
