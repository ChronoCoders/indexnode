import type { BlogPost } from "@/types";

export const post: BlogPost = {
  slug: "customer-trust",
  title: "Earning Customer Trust With Verifiable Analytics",
  excerpt:
    "Telling customers their data is accurate isn't the same as showing them proof. The gap between those two things is where trust is built or lost.",
  date: "2026-05-21",
  readTime: "4 min read",
  content: [
    {
      type: "p",
      text: "Every analytics product makes the same implicit promise: the numbers you see reflect reality. Most of them have no mechanism to back that promise up.",
    },
    { type: "h2", text: "The trust problem in B2B data products" },
    {
      type: "p",
      text: "When you sell access to indexed blockchain data, your customers are making decisions based on what you show them. A fund manager using your event data to track protocol TVL is trusting that your indexer didn't miss blocks, didn't mishandle reorgs, and hasn't had any quiet database corrections that altered historical figures.",
    },
    {
      type: "p",
      text: "That trust is invisible when everything is working. It becomes very visible when something goes wrong — when a customer's own on-chain query returns a number that doesn't match your dashboard, or when an auditor flags a discrepancy between your data export and the chain state.",
    },
    {
      type: "p",
      text: 'At that point, "we\'re confident in our data quality" is not a useful answer. Proof is.',
    },
    { type: "h2", text: "What verifiable analytics looks like" },
    {
      type: "p",
      text: "Verifiable analytics means your customers can check your data against an independent source — without asking you to do it for them.",
    },
    { type: "p", text: "In practice this means:" },
    {
      type: "ul",
      items: [
        "Every data point traces back to a specific on-chain transaction or event log.",
        "Every batch of data has a cryptographic fingerprint anchored on-chain at the time of indexing.",
        "Any customer with the content hash of a record can verify it independently using only public blockchain infrastructure.",
      ],
    },
    {
      type: "p",
      text: "This isn't a new concept. It's how blockchains work. The value of extending that model to indexed data is that it makes your analytics product as trustworthy as the chain itself — not as trustworthy as your word.",
    },
    { type: "h2", text: "The commercial case" },
    {
      type: "p",
      text: "Enterprise buyers ask two questions about data products: is it accurate, and can you prove it. Most vendors can answer the first question with confidence intervals and methodology docs. Very few can answer the second with anything other than an audit clause in the contract.",
    },
    {
      type: "p",
      text: "Verifiable-by-default data is a differentiated position. It shortens sales cycles with compliance-sensitive buyers, reduces the scope of due diligence, and gives your customers something they can show their own auditors.",
    },
    {
      type: "p",
      text: "**Trust you can demonstrate is worth more than trust you have to ask for.**",
    },
  ],
};
