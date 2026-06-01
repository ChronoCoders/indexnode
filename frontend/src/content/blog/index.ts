import type { BlogPost } from "@/types";
import { post as blockchainProof } from "./blockchain-proof";
import { post as dataManipulation } from "./data-manipulation";
import { post as defiDataLoss } from "./defi-data-loss";
import { post as customerTrust } from "./customer-trust";
import { post as dataMarketplace } from "./data-marketplace";
import { post as gettingStarted } from "./getting-started";

export const blogPosts: BlogPost[] = [
  gettingStarted,
  dataMarketplace,
  customerTrust,
  defiDataLoss,
  dataManipulation,
  blockchainProof,
];
