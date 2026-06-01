import type { BlogPost } from "@/types";

export const post: BlogPost = {
  slug: "getting-started",
  title: "Getting Started With IndexNode",
  excerpt: "From API key to your first indexed event in under ten minutes.",
  date: "2026-05-21",
  readTime: "6 min read",
  content: [
    {
      type: "p",
      text: "This guide walks through creating your first indexing job — from account setup to querying your first events via GraphQL.",
    },
    { type: "h2", text: "Step 1: Create an account" },
    {
      type: "p",
      text: "Sign up at `indexnode.io/signup`. No credit card required. Free accounts start with 1,000 credits — enough for 20 indexing jobs.",
    },
    { type: "h2", text: "Step 2: Get your API key" },
    {
      type: "p",
      text: "Go to **Account → API Keys** and create a key. Give it a name you'll recognize (e.g. `development`). Copy the key value — it won't be shown again.",
    },
    { type: "h2", text: "Step 3: Create your first job" },
    {
      type: "p",
      text: "A job tells IndexNode which contract to watch, which chain it's on, and which events to capture.",
    },
    {
      type: "code",
      lang: "bash",
      code: `curl -X POST https://api.indexnode.io/api/v1/jobs \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "contract_address": "0x6b175474e89094c44da98b954eedeac495271d0f",
    "chain": "ethereum",
    "event_signatures": ["Transfer(address,address,uint256)"],
    "from_block": 18000000
  }'`,
    },
    {
      type: "p",
      text: "This creates a job that indexes `Transfer` events from the DAI stablecoin contract starting at block 18,000,000. Each job costs 50 credits.",
    },
    { type: "h2", text: "Step 4: Check job status" },
    {
      type: "code",
      lang: "bash",
      code: `curl https://api.indexnode.io/api/v1/jobs/JOB_ID \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
    },
    {
      type: "p",
      text: "Status moves from `queued` → `processing` → `completed`. For large block ranges, processing may take a few minutes.",
    },
    { type: "h2", text: "Step 5: Query your events" },
    {
      type: "p",
      text: "Once the job is complete, query your events via GraphQL:",
    },
    {
      type: "code",
      lang: "graphql",
      code: `query {
  blockchainEvents(contractAddress: "0x6b175474e89094c44da98b954eedeac495271d0f") {
    eventName
    blockNumber
    transactionHash
    eventData
    contentHash
  }
}`,
    },
    {
      type: "p",
      text: "Send this to `https://api.indexnode.io/graphql` with your API key as a Bearer token.",
    },
    { type: "h2", text: "Step 6: Verify a record" },
    {
      type: "p",
      text: "Every event has a `contentHash`. Use it to verify the record against the on-chain proof:",
    },
    {
      type: "code",
      lang: "bash",
      code: `curl -X POST https://api.indexnode.io/api/v1/verify \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"content_hash": "YOUR_CONTENT_HASH"}'`,
    },
    {
      type: "p",
      text: "The response includes the Merkle proof, the on-chain transaction hash, and the block where the commitment was recorded. Any independent party can verify this using only the public blockchain.",
    },
    { type: "h2", text: "What's next" },
    {
      type: "ul",
      items: [
        "Set up a webhook to get notified when a job completes: **Account → Webhooks**.",
        "Subscribe to live events via WebSocket: `/graphql/ws` with a GraphQL subscription.",
        "Browse the data marketplace for pre-indexed datasets (coming soon).",
        "Read the full API reference under **Docs**.",
      ],
    },
  ],
};
