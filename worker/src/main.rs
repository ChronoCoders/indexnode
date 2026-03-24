use indexnode_core::{hash_content, JobConfig, JobParams, JobQueue, Crawler, JobStatus};
use sqlx::postgres::PgPoolOptions;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use anyhow::{Context, Result};
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
        .context("DATABASE_URL must be set")?;

    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await?;

    let queue = JobQueue::new(pool.clone());
    let crawler = Crawler::new()?;

    tracing::info!("Worker started, waiting for jobs...");

    loop {
        match queue.dequeue().await {
            Ok(Some(job)) => {
                tracing::info!("Processing job: {}", job.id);

                let config: JobConfig = match serde_json::from_value(job.config.clone()) {
                    Ok(c) => c,
                    Err(e) => {
                        tracing::error!("Job {} has malformed config, skipping: {:?}", job.id, e);
                        queue.update_status(job.id, JobStatus::Failed, Some(format!("Malformed job config: {}", e))).await?;
                        continue;
                    }
                };

                let params = match config.params {
                    JobParams::HttpCrawl(p) => p,
                    _ => {
                        tracing::error!("Job {} is not an HttpCrawl job, skipping", job.id);
                        queue.update_status(job.id, JobStatus::Failed, Some("Wrong job type for this worker".to_string())).await?;
                        continue;
                    }
                };

                let url = params.url.as_str();
                let max_pages = params.max_pages;

                match crawler.crawl(url, max_pages).await {
                    Ok(links) => {
                        tracing::info!("Crawled {} links for job {}", links.len(), job.id);

                        for link in &links {
                            let content_hash = hash_content(link.as_bytes());
                            let result = sqlx::query(
                                "INSERT INTO crawl_results (id, job_id, url, status_code, content_hash, links, created_at)
                                 VALUES ($1, $2, $3, $4, $5, $6, $7)"
                            )
                            .bind(uuid::Uuid::new_v4())
                            .bind(job.id)
                            .bind(link)
                            .bind(200i32)
                            .bind(&content_hash)
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
