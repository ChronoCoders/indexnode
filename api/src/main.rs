use indexnode_core::{JobQueue, Crawler, JobStatus};
use axum::{Router, serve};
use sqlx::postgres::PgPoolOptions;
use std::net::SocketAddr;
use std::time::Duration;
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use anyhow::Result;
use chrono::Utc;

mod routes;
mod handlers;
mod auth;
mod models;
mod db;

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
        .max_connections(10)
        .connect(&database_url)
        .await?;

    sqlx::migrate!("../migrations").run(&pool).await?;

    tracing::info!("Migrations complete");

    let worker_pool = pool.clone();
    tokio::spawn(async move {
        if let Err(e) = run_worker(worker_pool).await {
            tracing::error!("Worker failed: {:?}", e);
        }
    });

    let app = Router::new()
        .merge(routes::create_routes(pool))
        .layer(TraceLayer::new_for_http());

    let port = std::env::var("PORT")
        .unwrap_or_else(|_| "3000".to_string())
        .parse::<u16>()
        .unwrap_or(3000);

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("API listening on {}", addr);
    tracing::info!("Worker running in background");

    let listener = tokio::net::TcpListener::bind(addr).await?;
    serve(listener, app).await?;

    Ok(())
}

async fn run_worker(pool: sqlx::PgPool) -> Result<()> {
    let queue = JobQueue::new(pool.clone());
    let crawler = Crawler::new();

    tracing::info!("Worker started");

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
                            let _ = sqlx::query(
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

                        tracing::info!("Job {} completed", job.id);
                    }
                    Err(e) => {
                        tracing::error!("Job {} failed: {:?}", job.id, e);
                        queue.update_status(job.id, JobStatus::Failed, Some(e.to_string())).await?;
                    }
                }
            }
            Ok(None) => {
                tokio::time::sleep(Duration::from_secs(5)).await;
            }
            Err(e) => {
                tracing::error!("Dequeue failed: {:?}", e);
                tokio::time::sleep(Duration::from_secs(5)).await;
            }
        }
    }
}
