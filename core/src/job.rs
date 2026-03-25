use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::str::FromStr;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Job {
    pub id: Uuid,
    pub user_id: Uuid,
    pub status: JobStatus,
    pub priority: i32,
    pub config: serde_json::Value,
    pub created_at: DateTime<Utc>,
    pub scheduled_at: Option<DateTime<Utc>>,
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub retry_count: i32,
    pub error: Option<String>,
    pub result_summary: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum JobStatus {
    Pending,
    Queued,
    Processing,
    Completed,
    Failed,
    /// Events indexed successfully but the on-chain Merkle commitment is pending
    /// retry. Job will transition to Completed or Failed by the retry worker.
    PendingCommit,
}

impl FromStr for JobStatus {
    type Err = anyhow::Error;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "pending" => Ok(Self::Pending),
            "queued" => Ok(Self::Queued),
            "processing" => Ok(Self::Processing),
            "completed" => Ok(Self::Completed),
            "failed" => Ok(Self::Failed),
            "pending_commit" => Ok(Self::PendingCommit),
            _ => Err(anyhow::anyhow!("Invalid status")),
        }
    }
}

impl std::fmt::Display for JobStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        match self {
            Self::Pending => write!(f, "pending"),
            Self::Queued => write!(f, "queued"),
            Self::Processing => write!(f, "processing"),
            Self::Completed => write!(f, "completed"),
            Self::Failed => write!(f, "failed"),
            Self::PendingCommit => write!(f, "pending_commit"),
        }
    }
}

/// Typed job configuration stored in the database as JSON.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JobConfig {
    pub job_type: JobType,
    pub params: JobParams,
}

/// Typed union of all supported job parameter shapes.
/// Uses untagged serde so the existing JSON stored in the database is compatible:
/// HttpCrawl params contain `url`, BlockchainIndex params contain `contract_address`.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum JobParams {
    HttpCrawl(HttpCrawlParams),
    BlockchainIndex(BlockchainIndexParams),
}

impl JobParams {
    pub fn as_http_crawl(&self) -> Option<&HttpCrawlParams> {
        match self {
            Self::HttpCrawl(p) => Some(p),
            _ => None,
        }
    }

    pub fn as_blockchain_index(&self) -> Option<&BlockchainIndexParams> {
        match self {
            Self::BlockchainIndex(p) => Some(p),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum JobType {
    HttpCrawl,
    BlockchainIndex,
}

/// Parameters for an HTTP crawl job.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HttpCrawlParams {
    /// The seed URL to start crawling from.
    pub url: String,
    /// Maximum number of pages to crawl. Defaults to 100.
    #[serde(default = "default_max_pages")]
    pub max_pages: usize,
}

fn default_max_pages() -> usize {
    100
}

/// Parameters for a blockchain event indexing job.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlockchainIndexParams {
    pub chain: String,
    pub contract_address: String,
    pub events: Vec<String>,
    pub from_block: u64,
    pub to_block: Option<u64>,
    /// Whether to run AI extraction on each indexed event.
    #[serde(default)]
    pub enable_ai: bool,
    /// JSON schema passed to the AI extractor. Required when enable_ai is true.
    #[serde(default)]
    pub extraction_schema: Option<serde_json::Value>,
    /// Maximum total tokens (input + output) the AI extractor may consume
    /// across all events in this job. Extraction stops when budget is exhausted.
    /// Defaults to 100,000 when enable_ai is true and no budget is specified.
    #[serde(default)]
    pub ai_token_budget: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CrawlResult {
    pub url: String,
    pub status_code: u16,
    pub content_hash: String,
    pub links: Vec<String>,
    pub timestamp: DateTime<Utc>,
}
