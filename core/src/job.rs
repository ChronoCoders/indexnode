use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};
use std::str::FromStr;

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
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JobConfig {
    pub url: String,
    pub max_pages: usize,
    pub max_depth: Option<usize>,
    pub respect_robots_txt: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CrawlResult {
    pub url: String,
    pub status_code: u16,
    pub content_hash: String,
    pub links: Vec<String>,
    pub timestamp: DateTime<Utc>,
}
