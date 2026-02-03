use anyhow::{Context, Result}; 
use redis::AsyncCommands; 
use deadpool_redis::Pool; 
use std::collections::HashMap; 
use chrono::{Utc}; 
 
#[derive(Clone)]
pub struct Coordinator { 
    pool: Pool, 
} 
 
impl Coordinator { 
    pub async fn new(redis_url: &str) -> Result<Self> { 
        let cfg = deadpool_redis::Config::from_url(redis_url); 
        let pool = cfg.create_pool(Some(deadpool_redis::Runtime::Tokio1))
            .context("Failed to create Redis pool for coordinator")?; 
        Ok(Self { pool }) 
    } 
 
    pub async fn register_worker(&self, worker_id: &str) -> Result<()> { 
        let mut conn = self.pool.get().await?; 
        let key = format!("worker:{}:heartbeat", worker_id); 
        conn.set_ex::<_, _, ()>(&key, Utc::now().to_rfc3339(), 60).await?; 
        Ok(()) 
    } 
 
    pub async fn heartbeat(&self, worker_id: &str) -> Result<()> { 
        self.register_worker(worker_id).await 
    } 
 
    pub async fn get_active_workers(&self) -> Result<Vec<String>> { 
        let mut conn = self.pool.get().await?; 
        let keys: Vec<String> = conn.keys("worker:*:heartbeat").await?; 
         
        let workers = keys.iter() 
            .filter_map(|k| { 
                k.strip_prefix("worker:") 
                    .and_then(|s| s.strip_suffix(":heartbeat")) 
                    .map(String::from) 
            }) 
            .collect(); 
         
        Ok(workers) 
    } 
 
    pub async fn get_queue_stats(&self) -> Result<HashMap<String, i64>> { 
        let mut conn = self.pool.get().await?; 
        let mut stats = HashMap::new(); 
         
        for priority in 0..=100 { 
            let queue_key = format!("queue:priority:{}", priority); 
            let count: i64 = conn.zcard(&queue_key).await.unwrap_or(0); 
            if count > 0 { 
                stats.insert(queue_key, count); 
            } 
        } 
         
        let dead_letter_count: i64 = conn.llen("queue:dead_letter").await.unwrap_or(0); 
        stats.insert("dead_letter".to_string(), dead_letter_count); 
         
        Ok(stats) 
    } 
} 
