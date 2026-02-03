use anyhow::{Context, Result}; 
use super::queue::{DistributedQueue, DistributedJob}; 
use std::time::Duration; 
use tokio::time::sleep; 
use uuid::Uuid; 
 
#[derive(Debug, Clone)] 
pub struct WorkerConfig { 
    pub worker_id: String, 
    pub poll_interval: Duration, 
    pub max_concurrent_jobs: usize, 
} 
 
impl Default for WorkerConfig { 
    fn default() -> Self { 
        Self { 
            worker_id: format!("worker-{}", Uuid::new_v4()), 
            poll_interval: Duration::from_secs(1), 
            max_concurrent_jobs: 10, 
        } 
    } 
} 
 
pub struct Worker { 
    config: WorkerConfig, 
    queue: DistributedQueue, 
} 
 
impl Worker { 
    pub async fn new(queue: DistributedQueue, config: WorkerConfig) -> Result<Self> { 
        Ok(Self { config, queue }) 
    } 
 
    pub async fn run<F, Fut>(&self, handler: F) -> Result<()> 
    where 
        F: Fn(DistributedJob) -> Fut + Send + Sync + 'static, 
        Fut: std::future::Future<Output = Result<()>> + Send, 
    { 
        tracing::info!("Worker {} starting", self.config.worker_id); 
         
        loop { 
            match self.queue.dequeue(&self.config.worker_id).await { 
                Ok(Some(job)) => { 
                    let job_id = job.id; 
                     
                    match handler(job.clone()).await { 
                        Ok(_) => { 
                            self.queue.complete(job_id).await 
                                .context("Failed to mark job as complete")?; 
                            tracing::info!("Job {} completed by {}", job_id, self.config.worker_id); 
                        } 
                        Err(e) => { 
                            tracing::error!("Job {} failed: {}", job_id, e); 
                            self.queue.retry(job).await 
                                .context("Failed to retry job")?; 
                        } 
                    } 
                } 
                Ok(None) => { 
                    sleep(self.config.poll_interval).await; 
                } 
                Err(e) => { 
                    tracing::error!("Dequeue error: {}", e); 
                    sleep(Duration::from_secs(5)).await; 
                } 
            } 
        } 
    } 
} 
