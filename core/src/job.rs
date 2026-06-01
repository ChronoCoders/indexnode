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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JobConfig {
    pub job_type: JobType,
    pub params: JobParams,
}

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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HttpCrawlParams {
    pub url: String,
    #[serde(default = "default_max_pages")]
    pub max_pages: usize,
}

fn default_max_pages() -> usize {
    100
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlockchainIndexParams {
    pub chain: String,
    pub contract_address: String,
    pub events: Vec<String>,
    pub from_block: u64,
    pub to_block: Option<u64>,
    #[serde(default)]
    pub enable_ai: bool,
    #[serde(default)]
    pub extraction_schema: Option<serde_json::Value>,
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
