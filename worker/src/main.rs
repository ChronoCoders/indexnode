use indexnode_core::{JobQueue, Crawler, JobStatus};
use sqlx::postgres::PgPoolOptions;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use anyhow::Result;
use std::time::Duration;
use chrono::Utc;

#[tokio::main]
async fn main() -> Result<()> {
    dotenvy::dotenv().ok();

    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "info".into())
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let database_url = std::env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set");

    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await?;

    let queue = JobQueue::new(pool.clone());
    let crawler = Crawler::new();

    tracing::info!("Worker started, waiting for jobs...");

    loop {
        match queue.dequeue().await {
            Ok(Some(job)) => {
                tracing::info!("Processing job: {}", job.id);

                let url = job.config["url"].as_str().unwrap_or("https://example.com");
                let max_pages = job.config["max_pages"].as_u64().unwrap_or(100) as usize;

                match crawler.crawl(url, max_pages).await {
                    Ok(links) => {
                        tracing::info!("Crawled {} links for job {}", links.len(), job.id);

                        for link in &links {
                            let result = sqlx::query(
                                "INSERT INTO crawl_results (id, job_id, url, status_code, content_hash, links, created_at) 
                                 VALUES ($1, $2, $3, $4, $5, $6, $7)"
                            )
                            .bind(uuid::Uuid::new_v4())
                            .bind(job.id)
                            .bind(link)
                            .bind(200)
                            .bind("hash")
                            .bind(serde_json::json!([]))
                            .bind(Utc::now())
                            .execute(&pool)
                            .await;

                            if let Err(e) = result {
                                tracing::error!("Failed to save result: {:?}", e);
                            }
                        }

                        let result_summary = serde_json::json!({
                            "total_links": links.len(),
                            "completed_at": Utc::now().to_rfc3339()
                        });

                        sqlx::query(
                            "UPDATE jobs SET status = $1, completed_at = NOW(), result_summary = $2 WHERE id = $3"
                        )
                        .bind("completed")
                        .bind(result_summary)
                        .bind(job.id)
                        .execute(&pool)
                        .await?;

                        tracing::info!("Job {} completed successfully", job.id);
                    }
                    Err(e) => {
                        tracing::error!("Crawl failed for job {}: {:?}", job.id, e);

                        queue.update_status(job.id, JobStatus::Failed, Some(e.to_string())).await?;
                    }
                }
            }
            Ok(None) => {
                tokio::time::sleep(Duration::from_secs(5)).await;
            }
            Err(e) => {
                tracing::error!("Failed to dequeue job: {:?}", e);
                tokio::time::sleep(Duration::from_secs(5)).await;
            }
        }
    }
}
