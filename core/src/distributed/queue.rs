use anyhow::{Context, Result}; 
use deadpool_redis::{Config, Pool, Runtime}; 
use redis::AsyncCommands; 
use serde::{Deserialize, Serialize}; 
use uuid::Uuid; 
 
#[derive(Debug, Clone, Serialize, Deserialize)] 
pub struct DistributedJob { 
    pub id: Uuid, 
    pub job_type: String, 
    pub payload: serde_json::Value, 
    pub priority: i32, 
    pub max_retries: u32, 
    pub retry_count: u32, 
    pub created_at: chrono::DateTime<chrono::Utc>, 
} 
 
pub struct DistributedQueue { 
    pool: Pool, 
} 
 
impl DistributedQueue { 
    pub async fn new(redis_url: &str) -> Result<Self> { 
        let cfg = Config::from_url(redis_url); 
        let pool = cfg.create_pool(Some(Runtime::Tokio1)) 
            .context("Failed to create Redis pool")?; 
        Ok(Self { pool }) 
    } 
 
    pub async fn enqueue(&self, job: DistributedJob) -> Result<()> { 
        let mut conn = self.pool.get().await 
            .context("Failed to get Redis connection")?; 
         
        let job_json = serde_json::to_string(&job) 
            .context("Failed to serialize job")?; 
         
        let queue_key = format!("queue:priority:{}", job.priority); 
         
        conn.zadd::<_, _, _, ()>(queue_key, job_json, job.created_at.timestamp()) 
            .await 
            .context("Failed to add job to Redis queue")?; 
         
        Ok(()) 
    } 
 
    pub async fn dequeue(&self, worker_id: &str) -> Result<Option<DistributedJob>> { 
        let mut conn = self.pool.get().await 
            .context("Failed to get Redis connection")?; 
         
        // Try high priority first 
        for priority in (0..=100).rev() { 
            let queue_key = format!("queue:priority:{}", priority); 
             
            let result: Option<String> = conn.zpopmin(&queue_key, 1) 
                .await 
                .context("Failed to dequeue job")?; 
             
            if let Some(job_json) = result { 
                let job: DistributedJob = serde_json::from_str(&job_json) 
                    .context("Failed to deserialize job")?; 
                 
                // Mark as processing 
                let processing_key = format!("processing:{}", job.id); 
                conn.set_ex::<_, _, ()>(&processing_key, worker_id, 300) 
                    .await 
                    .context("Failed to mark job as processing")?; 
                 
                return Ok(Some(job)); 
            } 
        } 
         
        Ok(None) 
    } 
 
    pub async fn complete(&self, job_id: Uuid) -> Result<()> { 
        let mut conn = self.pool.get().await?; 
        let processing_key = format!("processing:{}", job_id); 
        conn.del::<_, ()>(&processing_key).await?; 
        Ok(()) 
    } 
 
    pub async fn retry(&self, mut job: DistributedJob) -> Result<()> { 
        job.retry_count += 1; 
         
        if job.retry_count >= job.max_retries { 
            self.dead_letter(job).await?; 
        } else { 
            self.enqueue(job).await?; 
        } 
         
        Ok(()) 
    } 
 
    async fn dead_letter(&self, job: DistributedJob) -> Result<()> { 
        let mut conn = self.pool.get().await?; 
        let job_json = serde_json::to_string(&job)?; 
        conn.lpush::<_, _, ()>("queue:dead_letter", job_json).await?; 
        Ok(()) 
    } 
} 
