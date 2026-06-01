export type JobStatus = "queued" | "processing" | "completed" | "failed";

export type JobType = "http_crawl" | "blockchain_index";

export interface UserJob {
  id: string;
  jobType: JobType | string;
  status: JobStatus | string;
  target: string | null;
  chain: string | null;
  createdAt: string;
  completedAt: string | null;
  error: string | null;
}

export interface BlockchainEventRecord {
  id: string;
  contractAddress: string;
  eventName: string;
  blockNumber: number;
  transactionHash: string;
  contentHash: string | null;
  ipfsCid: string | null;
}

export interface WalletInfo {
  walletAddress: string | null;
  creditBalance: number;
}

export type ContentBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "code"; lang: string; code: string };

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  content: ContentBlock[];
}
