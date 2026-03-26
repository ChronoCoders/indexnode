use anyhow::{Context, Result};
use async_graphql::http::{playground_source, GraphQLPlaygroundConfig};
use async_graphql_axum::{GraphQLRequest, GraphQLResponse, GraphQLSubscription};
use axum::response::{Html, IntoResponse};
use axum::Extension;
use axum::{serve, Router as AxumRouter};
use chrono::Utc;
use ethers::types::Address;
use indexnode_core::{
    compute_merkle_root, hash_content, AIExtractor, BlockchainClient, Coordinator, Crawler,
    CreditManager, DistributedQueue, EventFilter, IpfsStorage, Job, JobConfig, JobParams, JobQueue,
    JobStatus, MarketplaceClient, TimestampClient, Worker as DistributedWorker,
    WorkerConfig as DistributedWorkerConfig,
};
use sqlx::postgres::PgPoolOptions;
use std::collections::HashMap;
use std::env;
use std::net::SocketAddr;
use std::time::Duration;
use tower_http::cors::{AllowHeaders, AllowMethods, CorsLayer};
use tower_http::services::{ServeDir, ServeFile};
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use uuid::Uuid;
use zeroize::Zeroizing;

mod auth;
mod db;
mod graphql;
mod handlers;
mod metrics;
mod middleware;
mod models;
mod routes;
mod security;

use crate::auth::UserRole;
use crate::graphql::AppSchema;

#[tokio::main]
async fn main() -> Result<()> {
    dotenvy::dotenv().ok();

    let metrics_handle = metrics::init_metrics()?;

    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "info".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let database_url = std::env::var("DATABASE_URL").context("DATABASE_URL must be set")?;

    let pool = PgPoolOptions::new()
        .max_connections(5)
        .min_connections(2)
        .acquire_timeout(Duration::from_secs(3))
        .idle_timeout(Duration::from_secs(300))
        .connect(&database_url)
        .await?;

    sqlx::migrate!("../migrations").run(&pool).await?;

    tracing::info!("Migrations complete");

    let rpc_url = env::var("ETHEREUM_RPC_URL").context("ETHEREUM_RPC_URL must be set")?;
    let credit_contract_addr = env::var("CREDIT_CONTRACT_ADDRESS")
        .context("CREDIT_CONTRACT_ADDRESS must be set")?
        .parse::<Address>()
        .context("CREDIT_CONTRACT_ADDRESS is not a valid Ethereum address")?;
    // Wrap the private key in Zeroizing so the heap memory is zeroed when the
    // String is dropped (i.e., after the CreditManager/Marketplace clients are built).
    let credit_private_key =
        Zeroizing::new(env::var("CREDIT_PRIVATE_KEY").context("CREDIT_PRIVATE_KEY must be set")?);

    let credit_manager =
        CreditManager::new(&rpc_url, credit_contract_addr, &credit_private_key).await?;
    let credit_manager_worker =
        CreditManager::new(&rpc_url, credit_contract_addr, &credit_private_key).await?;

    let marketplace_contract_addr = env::var("MARKETPLACE_CONTRACT_ADDRESS")
        .context("MARKETPLACE_CONTRACT_ADDRESS must be set")?
        .parse::<Address>()
        .context("MARKETPLACE_CONTRACT_ADDRESS is not a valid Ethereum address")?;
    let marketplace =
        MarketplaceClient::new(&rpc_url, marketplace_contract_addr, &credit_private_key).await?;

    // credit_private_key goes out of scope here (dropped and zeroed).

    let ai_extractor_worker = env::var("ANTHROPIC_API_KEY")
        .ok()
        .map(AIExtractor::new)
        .transpose()?;

    if ai_extractor_worker.is_none() {
        tracing::warn!("ANTHROPIC_API_KEY not set — AI extraction disabled");
    }

    let timestamp_registry_addr = env::var("TIMESTAMP_REGISTRY_ADDRESS")
        .ok()
        .and_then(|s| s.parse::<Address>().ok());
    let timestamp_client_worker = match timestamp_registry_addr {
        Some(addr) => {
            match TimestampClient::new(&rpc_url, addr, &credit_private_key).await {
                Ok(client) => {
                    tracing::info!("TimestampRegistry client initialized — on-chain Merkle commitments enabled");
                    Some(client)
                }
                Err(e) => {
                    tracing::warn!("Failed to init TimestampClient: {:?}", e);
                    None
                }
            }
        }
        None => {
            tracing::warn!(
                "TIMESTAMP_REGISTRY_ADDRESS not set — on-chain Merkle commitments disabled"
            );
            None
        }
    };

    // Shutdown signal shared between the server and the worker thread.
    let (shutdown_tx, shutdown_rx) = tokio::sync::watch::channel(false);

    let worker_pool = pool.clone();
    let worker_shutdown_rx = shutdown_rx.clone();

    std::thread::spawn(move || {
        let rt = tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build();

        match rt {
            Ok(rt) => {
                rt.block_on(async {
                    let local = tokio::task::LocalSet::new();
                    local
                        .run_until(async {
                            if let Err(e) = run_worker(
                                worker_pool,
                                credit_manager_worker,
                                timestamp_client_worker,
                                ai_extractor_worker,
                                worker_shutdown_rx,
                            )
                            .await
                            {
                                tracing::error!("Worker failed: {:?}", e);
                            }
                        })
                        .await;
                });
            }
            Err(e) => {
                tracing::error!("Failed to build worker runtime: {:?}", e);
            }
        }
    });

    let schema = graphql::build_schema(pool.clone(), credit_manager, marketplace);

    let allowed_origin =
        env::var("ALLOWED_ORIGIN").unwrap_or_else(|_| "http://localhost:3000".to_string());
    let cors = CorsLayer::new()
        .allow_origin(
            allowed_origin
                .parse::<axum::http::HeaderValue>()
                .context("ALLOWED_ORIGIN is not a valid header value")?,
        )
        .allow_methods(AllowMethods::list([
            axum::http::Method::GET,
            axum::http::Method::POST,
        ]))
        .allow_headers(AllowHeaders::list([
            axum::http::header::CONTENT_TYPE,
            axum::http::header::AUTHORIZATION,
        ]));

    let per_user_limiter = middleware::create_per_user_rate_limiter()?;

    let mut app = AxumRouter::new()
        .merge(routes::create_routes(pool.clone()))
        .route("/metrics", axum::routing::get(metrics_handler))
        .route_layer(per_user_limiter)
        .route_layer(axum::middleware::from_fn(middleware::require_auth))
        .merge(routes::create_public_routes(pool.clone()))
        .route("/graphql", axum::routing::post(graphql_handler))
        .route(
            "/graphql/ws",
            axum::routing::any_service(GraphQLSubscription::new(schema.clone())),
        )
        .route(
            "/graphql/playground",
            axum::routing::get(graphql_playground),
        )
        .layer(axum::middleware::from_fn(middleware::track_metrics))
        .layer(axum::middleware::from_fn(
            middleware::validate_request_security,
        ))
        .layer(middleware::create_global_rate_limiter()?)
        .layer(cors)
        .layer(Extension(schema))
        .layer(Extension(pool.clone()))
        .layer(Extension(metrics_handle))
        .layer(TraceLayer::new_for_http());

    // Optionally serve the frontend from the same process. In production,
    // prefer serving static assets from a CDN or dedicated static file server.
    if env::var("SERVE_FRONTEND").as_deref() == Ok("true") {
        let serve_dir =
            ServeDir::new("./frontend").not_found_service(ServeFile::new("./frontend/index.html"));
        app = app.fallback_service(serve_dir);
        tracing::info!("Serving frontend from ./frontend");
    }

    // Metrics update task
    let metrics_pool = pool.clone();
    tokio::spawn(async move {
        loop {
            if let Ok(active) = get_active_worker_count(&metrics_pool).await {
                metrics::update_active_workers(active);
            }
            if let Ok(depth) = get_queue_depth(&metrics_pool).await {
                metrics::update_queue_depth(depth);
            }
            tokio::time::sleep(Duration::from_secs(15)).await;
        }
    });

    let port = std::env::var("PORT")
        .unwrap_or_else(|_| "3000".to_string())
        .parse::<u16>()
        .unwrap_or(3000);

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("API listening on {}", addr);
    tracing::info!("Worker running in background");

    let listener = tokio::net::TcpListener::bind(addr).await?;
    serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .with_graceful_shutdown(async move {
        tokio::signal::ctrl_c()
            .await
            .expect("Failed to install CTRL+C handler");
        tracing::info!("Shutdown signal received, stopping server and worker");
        let _ = shutdown_tx.send(true);
    })
    .await?;

    Ok(())
}

#[allow(dead_code)]
async fn run_distributed_worker(redis_url: String, _pool: sqlx::PgPool) -> Result<()> {
    let queue = DistributedQueue::new(&redis_url).await?;
    let coordinator = Coordinator::new(&redis_url).await?;

    let config = DistributedWorkerConfig {
        worker_id: format!("indexnode-{}", uuid::Uuid::new_v4()),
        ..Default::default()
    };

    let worker = DistributedWorker::new(queue, config.clone()).await?;

    let coord_clone = coordinator.clone();
    let worker_id_clone = config.worker_id.clone();
    tokio::spawn(async move {
        loop {
            if let Err(e) = coord_clone.heartbeat(&worker_id_clone).await {
                tracing::error!("Heartbeat failed: {}", e);
            }
            tokio::time::sleep(Duration::from_secs(30)).await;
        }
    });

    worker.run(|_job| async move { Ok(()) }).await?;

    Ok(())
}

/// Handles GraphQL queries and mutations.
/// Injects the authenticated user ID and role into the schema context so resolvers
/// can access them via `ctx.data_opt::<Uuid>()` and `ctx.data_opt::<UserRole>()`.
async fn graphql_handler(
    schema: Extension<AppSchema>,
    user_id: Option<Extension<Uuid>>,
    user_role: Option<Extension<UserRole>>,
    req: GraphQLRequest,
) -> GraphQLResponse {
    let mut request = req.into_inner();
    if let Some(Extension(uid)) = user_id {
        request = request.data(uid);
    }
    if let Some(Extension(role)) = user_role {
        request = request.data(role);
    }
    schema.execute(request).await.into()
}

/// Serves the GraphQL Playground UI.
async fn graphql_playground() -> impl IntoResponse {
    Html(playground_source(
        GraphQLPlaygroundConfig::new("/graphql").subscription_endpoint("/graphql/ws"),
    ))
}

async fn metrics_handler(
    Extension(handle): Extension<metrics_exporter_prometheus::PrometheusHandle>,
) -> String {
    handle.render()
}

async fn get_active_worker_count(pool: &sqlx::PgPool) -> Result<i64> {
    let count = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM worker_nodes WHERE status = 'active' AND last_heartbeat > NOW() - INTERVAL '2 minutes'"
    )
    .fetch_one(pool)
    .await?;
    Ok(count)
}

async fn get_queue_depth(pool: &sqlx::PgPool) -> Result<i64> {
    let count = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM distributed_jobs WHERE status = 'queued'",
    )
    .fetch_one(pool)
    .await?;
    Ok(count)
}

/// Stateful service handles passed into `process_blockchain_index`.
/// Grouping them avoids exceeding Clippy's `too_many_arguments` limit (7).
struct IndexerServices<'a> {
    chain_clients: &'a HashMap<String, BlockchainClient>,
    ipfs: &'a IpfsStorage,
    timestamp_client: Option<&'a TimestampClient>,
    credit_manager: &'a CreditManager,
    ai: Option<&'a AIExtractor>,
    ai_timeout: Duration,
}

async fn run_worker(
    pool: sqlx::PgPool,
    credit_manager: CreditManager,
    timestamp_client: Option<TimestampClient>,
    ai: Option<AIExtractor>,
    mut shutdown: tokio::sync::watch::Receiver<bool>,
) -> Result<()> {
    let queue = JobQueue::new(pool.clone());
    let crawler = Crawler::new()?;

    let mut chain_clients: HashMap<String, BlockchainClient> = HashMap::new();
    let eth_rpc_url = env::var("ETHEREUM_RPC_URL").context("ETHEREUM_RPC_URL must be set")?;
    chain_clients.insert(
        "ethereum".to_string(),
        BlockchainClient::new(&eth_rpc_url).await?,
    );
    if let Ok(polygon_rpc_url) = env::var("POLYGON_RPC_URL") {
        if !polygon_rpc_url.is_empty() {
            match BlockchainClient::new(&polygon_rpc_url).await {
                Ok(client) => {
                    chain_clients.insert("polygon".to_string(), client);
                    tracing::info!("Polygon RPC connected");
                }
                Err(e) => tracing::warn!("Failed to connect to Polygon RPC: {:?}", e),
            }
        }
    }

    let ipfs_api_url =
        env::var("IPFS_API_URL").unwrap_or_else(|_| "http://127.0.0.1:5001".to_string());
    let pinata_jwt = env::var("PINATA_JWT").ok();
    let ipfs_storage = IpfsStorage::new(&ipfs_api_url, pinata_jwt)?;

    let crawl_timeout = Duration::from_secs(
        env::var("CRAWL_TIMEOUT_SECS")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(120),
    );
    let ai_timeout = Duration::from_secs(
        env::var("AI_TIMEOUT_SECS")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(30),
    );

    let svc = IndexerServices {
        chain_clients: &chain_clients,
        ipfs: &ipfs_storage,
        timestamp_client: timestamp_client.as_ref(),
        credit_manager: &credit_manager,
        ai: ai.as_ref(),
        ai_timeout,
    };

    tracing::info!("Worker started");

    loop {
        if *shutdown.borrow() {
            tracing::info!("Worker shutting down");
            break;
        }

        // Retry any pending on-chain Merkle commits before processing new jobs.
        if let Err(e) = retry_pending_commits(timestamp_client.as_ref(), &pool).await {
            tracing::error!("retry_pending_commits error: {:?}", e);
        }

        match queue.dequeue().await {
            Ok(Some(job)) => {
                let _timer = crate::metrics::TimedOperation::new("job_processing_duration_seconds");
                tracing::info!("Processing job: {}", job.id);

                let config: JobConfig = serde_json::from_value(job.config.clone())
                    .context("Failed to parse job config")?;

                match config.params {
                    JobParams::HttpCrawl(ref p) => {
                        let url = p.url.as_str();
                        let max_pages = p.max_pages;

                        let crawl_result =
                            tokio::time::timeout(crawl_timeout, crawler.crawl(url, max_pages))
                                .await;

                        match crawl_result {
                            Err(_) => {
                                tracing::error!(
                                    "Job {} timed out after {:?}",
                                    job.id,
                                    crawl_timeout
                                );
                                queue
                                    .update_status(
                                        job.id,
                                        JobStatus::Failed,
                                        Some("crawl timed out".to_string()),
                                    )
                                    .await?;
                                crate::metrics::record_job_failed();
                                fire_webhooks(&pool, job.id, job.user_id, "job.failed").await;
                            }
                            Ok(Err(e)) => {
                                tracing::error!("Job {} failed: {:?}", job.id, e);
                                queue
                                    .update_status(job.id, JobStatus::Failed, Some(e.to_string()))
                                    .await?;
                                crate::metrics::record_job_failed();
                                fire_webhooks(&pool, job.id, job.user_id, "job.failed").await;
                            }
                            Ok(Ok(links)) => {
                                tracing::info!("Crawled {} links for job {}", links.len(), job.id);

                                let cost = CreditManager::crawl_job_cost();
                                if let Ok(Some(addr_str)) = sqlx::query_scalar::<_, String>(
                                    "SELECT on_chain_address FROM user_credits WHERE user_id = $1",
                                )
                                .bind(job.user_id)
                                .fetch_optional(&pool)
                                .await
                                {
                                    if let Ok(addr) = addr_str.parse::<Address>() {
                                        match credit_manager
                                            .spend_credits(addr, cost, "http_crawl".to_string())
                                            .await
                                        {
                                            Err(e) => {
                                                tracing::error!(
                                                    "Failed to spend on-chain credits for job {}: {:?}",
                                                    job.id,
                                                    e
                                                );
                                            }
                                            Ok(_) => {
                                                if let Err(e) = sqlx::query(
                                                    "UPDATE user_credits SET credit_balance = credit_balance - $1, total_spent = total_spent + $1 WHERE user_id = $2"
                                                )
                                                .bind(cost.as_u64() as i64)
                                                .bind(job.user_id)
                                                .execute(&pool)
                                                .await
                                                {
                                                    tracing::error!(
                                                        "Failed to update credit balance for job {}: {:?}",
                                                        job.id, e
                                                    );
                                                }
                                            }
                                        }
                                        crate::metrics::record_http_request("GET", url, 200, 0.0);
                                    }
                                }

                                if !links.is_empty() {
                                    let mut query_builder = sqlx::QueryBuilder::new(
                                        "INSERT INTO crawl_results (id, job_id, url, status_code, content_hash, links, created_at) "
                                    );
                                    query_builder.push_values(
                                        links.iter().take(500),
                                        |mut b, link| {
                                            b.push_bind(uuid::Uuid::new_v4())
                                                .push_bind(job.id)
                                                .push_bind(link)
                                                .push_bind(200)
                                                .push_bind("hash")
                                                .push_bind(serde_json::json!([]))
                                                .push_bind(Utc::now());
                                        },
                                    );
                                    if let Err(e) = query_builder.build().execute(&pool).await {
                                        tracing::error!(
                                            "Failed to insert crawl results for job {}: {:?}",
                                            job.id,
                                            e
                                        );
                                    }
                                }

                                let result_summary = serde_json::json!({
                                    "total_links": links.len(),
                                    "completed_at": Utc::now().to_rfc3339()
                                });

                                queue
                                    .update_status(job.id, JobStatus::Completed, None)
                                    .await?;
                                sqlx::query("UPDATE jobs SET result_summary = $1 WHERE id = $2")
                                    .bind(result_summary)
                                    .bind(job.id)
                                    .execute(&pool)
                                    .await?;
                                crate::metrics::record_job_completed();
                                fire_webhooks(&pool, job.id, job.user_id, "job.completed").await;
                                tracing::info!("Job {} completed successfully", job.id);
                            }
                        }
                    }
                    JobParams::BlockchainIndex(_) => {
                        match process_blockchain_index(&svc, &pool, &job).await {
                            Ok(IndexResult::Completed) => {
                                queue
                                    .update_status(job.id, JobStatus::Completed, None)
                                    .await?;
                                crate::metrics::record_job_completed();
                                fire_webhooks(&pool, job.id, job.user_id, "job.completed").await;
                                tracing::info!("Blockchain job {} completed", job.id);
                            }
                            Ok(IndexResult::PendingCommit) => {
                                queue
                                    .update_status(job.id, JobStatus::PendingCommit, None)
                                    .await?;
                                tracing::info!(
                                    "Blockchain job {} indexed; on-chain commit queued for retry",
                                    job.id
                                );
                            }
                            Err(e) => {
                                tracing::error!("Blockchain job {} failed: {:?}", job.id, e);
                                queue
                                    .update_status(job.id, JobStatus::Failed, Some(e.to_string()))
                                    .await?;
                                crate::metrics::record_job_failed();
                                fire_webhooks(&pool, job.id, job.user_id, "job.failed").await;
                            }
                        }
                    }
                }
            }
            Ok(None) => {
                tokio::select! {
                    _ = tokio::time::sleep(Duration::from_secs(5)) => {}
                    _ = shutdown.changed() => {
                        tracing::info!("Worker shutting down");
                        break;
                    }
                }
            }
            Err(e) => {
                tracing::error!("Dequeue failed: {:?}", e);
                tokio::select! {
                    _ = tokio::time::sleep(Duration::from_secs(5)) => {}
                    _ = shutdown.changed() => {
                        tracing::info!("Worker shutting down");
                        break;
                    }
                }
            }
        }
    }

    Ok(())
}

/// Outcome of a blockchain indexing run.
enum IndexResult {
    /// All events indexed and Merkle root committed on-chain.
    Completed,
    /// Events indexed but the on-chain commit failed; queued for retry.
    PendingCommit,
}

const MAX_COMMIT_RETRIES: i32 = 5;

/// Retries any pending on-chain Merkle commits that are due (next_retry_at <= now()).
/// Uses exponential backoff: 30s * 2^attempt (30s, 60s, 120s, 240s, 480s).
async fn retry_pending_commits(
    timestamp_client: Option<&TimestampClient>,
    pool: &sqlx::PgPool,
) -> anyhow::Result<()> {
    use sqlx::Row;

    let rows = sqlx::query(
        "SELECT pmc.id, pmc.job_id, pmc.merkle_root, pmc.event_chain, pmc.attempt_count,
                j.user_id
         FROM pending_merkle_commits pmc
         JOIN jobs j ON j.id = pmc.job_id
         WHERE pmc.status = 'pending' AND pmc.next_retry_at <= now() AND pmc.attempt_count < $1",
    )
    .bind(MAX_COMMIT_RETRIES)
    .fetch_all(pool)
    .await?;

    for row in rows {
        let commit_id: Uuid = row.get("id");
        let job_id: Uuid = row.get("job_id");
        let user_id: Uuid = row.get("user_id");
        let merkle_root: String = row.get("merkle_root");
        let event_chain: String = row.get("event_chain");
        let attempt_count: i32 = row.get("attempt_count");
        let next_attempt = attempt_count + 1;

        match timestamp_client {
            Some(ts) => match ts.commit_hash(&merkle_root).await {
                Ok((tx_hash, block_number)) => {
                    let tx_hash_str = format!("{:?}", tx_hash);

                    if let Err(e) = sqlx::query(
                        "INSERT INTO timestamp_commits (content_hash, transaction_hash, block_number, chain, job_id)
                         VALUES ($1, $2, $3, $4, $5)
                         ON CONFLICT (content_hash) DO NOTHING",
                    )
                    .bind(&merkle_root)
                    .bind(&tx_hash_str)
                    .bind(block_number as i64)
                    .bind(&event_chain)
                    .bind(job_id)
                    .execute(pool)
                    .await
                    {
                        tracing::error!("retry: failed to store timestamp_commit for job {}: {:?}", job_id, e);
                        continue;
                    }

                    // Stamp the batch Merkle root onto all events in this job.
                    if let Err(e) = sqlx::query(
                        "UPDATE blockchain_events SET merkle_root = $1 WHERE job_id = $2 AND merkle_root IS NULL",
                    )
                    .bind(&merkle_root)
                    .bind(job_id)
                    .execute(pool)
                    .await
                    {
                        tracing::error!("retry: failed to stamp merkle_root on events for job {}: {:?}", job_id, e);
                    }

                    let _ = sqlx::query(
                        "UPDATE pending_merkle_commits SET status = 'committed' WHERE id = $1",
                    )
                    .bind(commit_id)
                    .execute(pool)
                    .await;

                    let _ = sqlx::query(
                        "UPDATE jobs SET status = 'completed', completed_at = now()
                         WHERE id = $1 AND status = 'pending_commit'",
                    )
                    .bind(job_id)
                    .execute(pool)
                    .await;

                    crate::metrics::record_job_completed();
                    fire_webhooks(pool, job_id, user_id, "job.completed").await;
                    tracing::info!(
                        "Pending commit {} for job {} committed on attempt {}",
                        commit_id,
                        job_id,
                        next_attempt
                    );
                }
                Err(e) => {
                    if next_attempt >= MAX_COMMIT_RETRIES {
                        let err_msg = format!(
                            "On-chain Merkle commitment failed after {} retries: {}",
                            MAX_COMMIT_RETRIES, e
                        );
                        let _ = sqlx::query(
                            "UPDATE pending_merkle_commits
                             SET status = 'failed', attempt_count = $1, last_error = $2
                             WHERE id = $3",
                        )
                        .bind(next_attempt)
                        .bind(e.to_string())
                        .bind(commit_id)
                        .execute(pool)
                        .await;

                        let _ = sqlx::query(
                            "UPDATE jobs SET status = 'failed', error = $1
                             WHERE id = $2 AND status = 'pending_commit'",
                        )
                        .bind(&err_msg)
                        .bind(job_id)
                        .execute(pool)
                        .await;

                        crate::metrics::record_job_failed();
                        fire_webhooks(pool, job_id, user_id, "job.failed").await;
                        tracing::error!(
                            "Commit {} for job {} permanently failed after {} retries",
                            commit_id,
                            job_id,
                            MAX_COMMIT_RETRIES
                        );
                    } else {
                        let backoff_secs = 30i64 * 2i64.pow(next_attempt as u32);
                        let next_retry_at =
                            chrono::Utc::now() + chrono::Duration::seconds(backoff_secs);

                        let _ = sqlx::query(
                            "UPDATE pending_merkle_commits
                             SET attempt_count = $1, next_retry_at = $2, last_error = $3
                             WHERE id = $4",
                        )
                        .bind(next_attempt)
                        .bind(next_retry_at)
                        .bind(e.to_string())
                        .bind(commit_id)
                        .execute(pool)
                        .await;

                        tracing::warn!(
                            "Commit {} for job {} failed (attempt {}/{}), next retry at {}",
                            commit_id,
                            job_id,
                            next_attempt,
                            MAX_COMMIT_RETRIES,
                            next_retry_at
                        );
                    }
                }
            },
            None => {
                // No timestamp client — cannot commit. Fail immediately rather than spinning.
                let _ = sqlx::query(
                    "UPDATE pending_merkle_commits
                     SET status = 'failed', last_error = 'TimestampRegistry not configured'
                     WHERE id = $1",
                )
                .bind(commit_id)
                .execute(pool)
                .await;

                let _ = sqlx::query(
                    "UPDATE jobs SET status = 'failed',
                     error = 'On-chain Merkle commitment failed: TIMESTAMP_REGISTRY_ADDRESS is not configured'
                     WHERE id = $1 AND status = 'pending_commit'",
                )
                .bind(job_id)
                .execute(pool)
                .await;
            }
        }
    }

    Ok(())
}

async fn process_blockchain_index(
    svc: &IndexerServices<'_>,
    pool: &sqlx::PgPool,
    job: &Job,
) -> Result<IndexResult> {
    let chain_clients = svc.chain_clients;
    let ipfs = svc.ipfs;
    let timestamp_client = svc.timestamp_client;
    let credit_manager = svc.credit_manager;
    let ai = svc.ai;
    let ai_timeout = svc.ai_timeout;

    let config: JobConfig =
        serde_json::from_value(job.config.clone()).context("Failed to parse job config")?;
    let params = match config.params {
        JobParams::BlockchainIndex(p) => p,
        _ => anyhow::bail!("Expected BlockchainIndex params for this job"),
    };

    if params.events.is_empty() {
        anyhow::bail!("No event signatures specified in job config");
    }

    let client = chain_clients.get(&params.chain).ok_or_else(|| {
        anyhow::anyhow!(
            "Chain '{}' is not configured. Set {}_RPC_URL to enable it.",
            params.chain,
            params.chain.to_uppercase()
        )
    })?;

    let cost = CreditManager::event_index_cost();
    if let Ok(Some(addr_str)) = sqlx::query_scalar::<_, String>(
        "SELECT on_chain_address FROM user_credits WHERE user_id = $1",
    )
    .bind(job.user_id)
    .fetch_optional(pool)
    .await
    {
        if let Ok(addr) = addr_str.parse::<Address>() {
            match credit_manager
                .spend_credits(addr, cost, "blockchain_index".to_string())
                .await
            {
                Err(e) => {
                    tracing::error!(
                        "Failed to spend on-chain credits for job {}: {:?}",
                        job.id,
                        e
                    );
                }
                Ok(_) => {
                    if let Err(e) = sqlx::query(
                        "UPDATE user_credits SET credit_balance = credit_balance - $1, total_spent = total_spent + $1 WHERE user_id = $2"
                    )
                    .bind(cost.as_u64() as i64)
                    .bind(job.user_id)
                    .execute(pool)
                    .await
                    {
                        tracing::error!(
                            "Failed to update credit balance for job {}: {:?}",
                            job.id, e
                        );
                    }
                }
            }
        }
    }

    let contract_address: Address = params
        .contract_address
        .parse()
        .context("Invalid contract address")?;
    let to_block = params.to_block.unwrap_or(client.get_latest_block().await?);

    // Fetch events for every requested event signature.
    let mut all_events = Vec::new();
    for event_sig in &params.events {
        let filter = EventFilter {
            chain: params.chain.clone(),
            contract_address,
            event_signature: event_sig.clone(),
            from_block: params.from_block,
            to_block,
        };
        match client.get_events(filter).await {
            Ok(events) => all_events.extend(events),
            Err(e) => tracing::warn!(
                "Job {}: failed to fetch events for '{}': {:?}",
                job.id,
                event_sig,
                e
            ),
        }
    }

    let mut all_content_hashes: Vec<String> = Vec::new();
    let mut indexed_event_ids: Vec<uuid::Uuid> = Vec::new();

    let enable_ai = params.enable_ai;
    let extraction_schema = params.extraction_schema.clone();
    // Default budget: 100,000 tokens per job when AI is enabled.
    let mut tokens_remaining: u32 = params.ai_token_budget.unwrap_or(100_000);

    for mut event in all_events {
        let event_id = uuid::Uuid::new_v4();
        event.content_hash = hash_content(format!("{:?}", event.event_data).as_bytes());
        let event_json = serde_json::to_vec(&event).context("Failed to serialize event")?;
        let ipfs_cid = ipfs.store_content(&event_json).await?;

        crate::metrics::record_ipfs_upload(event_json.len() as u64);
        crate::metrics::record_blockchain_event();

        ipfs.pin_content(&ipfs_cid).await?;

        sqlx::query(
            "INSERT INTO blockchain_events (id, job_id, chain, contract_address, event_name, block_number, transaction_hash, event_data, content_hash, ipfs_cid)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
        )
        .bind(event_id)
        .bind(job.id)
        .bind(&event.chain)
        .bind(&event.contract_address)
        .bind(&event.event_name)
        .bind(event.block_number as i64)
        .bind(&event.transaction_hash)
        .bind(&event.event_data)
        .bind(&event.content_hash)
        .bind(&ipfs_cid)
        .execute(pool)
        .await?;

        sqlx::query(
            "INSERT INTO ipfs_content (cid, content_hash, size_bytes, pinned, blockchain_event_id)
             VALUES ($1, $2, $3, true, $4)
             ON CONFLICT (cid) DO NOTHING",
        )
        .bind(&ipfs_cid)
        .bind(&event.content_hash)
        .bind(event_json.len() as i64)
        .bind(event_id)
        .execute(pool)
        .await?;

        if enable_ai && tokens_remaining > 0 {
            if let (Some(schema), Some(ai)) = (&extraction_schema, ai) {
                let schema_str = serde_json::to_string(schema)?;
                let event_str = serde_json::to_string(&event.event_data)?;

                match tokio::time::timeout(
                    ai_timeout,
                    ai.extract_structured_data(&event_str, &schema_str),
                )
                .await
                {
                    Err(_) => {
                        tracing::warn!(
                            "Job {}: AI extraction timed out for event {}",
                            job.id,
                            event_id
                        );
                    }
                    Ok(Err(e)) => {
                        tracing::warn!(
                            "Job {}: AI extraction failed for event {}: {:?}",
                            job.id,
                            event_id,
                            e
                        );
                    }
                    Ok(Ok(result)) => {
                        tokens_remaining = tokens_remaining.saturating_sub(result.tokens_used);

                        crate::metrics::record_ai_extraction();

                        if let Err(e) = sqlx::query(
                            "INSERT INTO ai_extractions (blockchain_event_id, extraction_type, schema_definition, extracted_data)
                             VALUES ($1, 'structured', $2, $3)",
                        )
                        .bind(event_id)
                        .bind(schema)
                        .bind(result.data)
                        .execute(pool)
                        .await
                        {
                            tracing::error!(
                                "Job {}: failed to store AI extraction for event {}: {:?}",
                                job.id, event_id, e
                            );
                        }

                        if tokens_remaining == 0 {
                            tracing::warn!(
                                "Job {}: AI token budget exhausted after event {}; skipping remaining extractions",
                                job.id, event_id
                            );
                        }
                    }
                }
            }
        }

        all_content_hashes.push(event.content_hash.clone());
        indexed_event_ids.push(event_id);
    }

    // Compute and commit the batch Merkle root on-chain.
    if !all_content_hashes.is_empty() {
        let merkle_root = compute_merkle_root(&all_content_hashes);

        match timestamp_client {
            Some(ts) => match ts.commit_hash(&merkle_root).await {
                Ok((tx_hash, block_number)) => {
                    let tx_hash_str = format!("{:?}", tx_hash);

                    if let Err(e) = sqlx::query(
                        "INSERT INTO timestamp_commits (content_hash, transaction_hash, block_number, chain, job_id)
                         VALUES ($1, $2, $3, $4, $5)
                         ON CONFLICT (content_hash) DO NOTHING",
                    )
                    .bind(&merkle_root)
                    .bind(&tx_hash_str)
                    .bind(block_number as i64)
                    .bind(&params.chain)
                    .bind(job.id)
                    .execute(pool)
                    .await
                    {
                        tracing::error!(
                            "Job {}: failed to store timestamp commit: {:?}",
                            job.id,
                            e
                        );
                    }

                    for event_id in &indexed_event_ids {
                        if let Err(e) = sqlx::query(
                            "UPDATE blockchain_events SET merkle_root = $1 WHERE id = $2",
                        )
                        .bind(&merkle_root)
                        .bind(event_id)
                        .execute(pool)
                        .await
                        {
                            tracing::error!(
                                "Job {}: failed to set merkle_root on event {}: {:?}",
                                job.id,
                                event_id,
                                e
                            );
                        }
                    }

                    tracing::info!(
                        "Job {}: committed Merkle root {} in tx {} at block {}",
                        job.id,
                        merkle_root,
                        tx_hash_str,
                        block_number
                    );
                }
                Err(e) => {
                    // Indexing succeeded but commit failed. Queue for retry.
                    tracing::error!(
                        "Job {}: on-chain Merkle commitment failed; queuing for retry: {:?}",
                        job.id,
                        e
                    );
                    if let Err(db_err) = sqlx::query(
                        "INSERT INTO pending_merkle_commits (job_id, merkle_root, event_chain, last_error)
                         VALUES ($1, $2, $3, $4)",
                    )
                    .bind(job.id)
                    .bind(&merkle_root)
                    .bind(&params.chain)
                    .bind(e.to_string())
                    .execute(pool)
                    .await
                    {
                        tracing::error!(
                            "Job {}: failed to insert pending_merkle_commit: {:?}",
                            job.id,
                            db_err
                        );
                    }
                    return Ok(IndexResult::PendingCommit);
                }
            },
            None => {
                tracing::warn!(
                    "Job {}: TIMESTAMP_REGISTRY_ADDRESS not configured — Merkle root {} not committed on-chain",
                    job.id,
                    merkle_root
                );
                // No client means no retries are possible. Return Completed so the
                // job isn't stuck; the data is indexed and available.
            }
        }
    }

    Ok(IndexResult::Completed)
}

// ── Webhook dispatch ──────────────────────────────────────────────────────────

/// Fires HMAC-SHA256-signed webhook callbacks for all active subscriptions
/// matching `event` for `user_id`. Errors are logged and never propagated —
/// delivery is best-effort. The request body is the same JSON payload for
/// all subscribers; only the signature differs (per-secret).
async fn fire_webhooks(pool: &sqlx::PgPool, job_id: Uuid, user_id: Uuid, event: &str) {
    use sqlx::Row;

    let rows = match sqlx::query(
        "SELECT url, secret FROM webhook_subscriptions
         WHERE user_id = $1 AND is_active = true AND $2 = ANY(events)",
    )
    .bind(user_id)
    .bind(event)
    .fetch_all(pool)
    .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("fire_webhooks: DB error: {:?}", e);
            return;
        }
    };

    if rows.is_empty() {
        return;
    }

    let payload = serde_json::json!({
        "id": format!("evt_{}", Uuid::new_v4().simple()),
        "created": Utc::now().timestamp(),
        "type": event,
        "data": {
            "job_id": job_id,
            "user_id": user_id,
            "status": event.strip_prefix("job.").unwrap_or(event),
        }
    });

    let payload_bytes = match serde_json::to_vec(&payload) {
        Ok(b) => b,
        Err(e) => {
            tracing::error!("fire_webhooks: serialization error: {:?}", e);
            return;
        }
    };

    let timeout_secs = env::var("WEBHOOK_TIMEOUT_SECS")
        .ok()
        .and_then(|v| v.parse::<u64>().ok())
        .unwrap_or(10);

    let client = match reqwest::Client::builder()
        .timeout(Duration::from_secs(timeout_secs))
        .build()
    {
        Ok(c) => c,
        Err(e) => {
            tracing::error!("fire_webhooks: failed to build HTTP client: {:?}", e);
            return;
        }
    };

    for row in &rows {
        let url: String = row.get("url");
        let secret: String = row.get("secret");

        let sig = format!(
            "sha256={}",
            hex::encode(hmac_sha256(secret.as_bytes(), &payload_bytes))
        );

        match client
            .post(&url)
            .header("Content-Type", "application/json")
            .header("X-IndexNode-Signature", &sig)
            .header("X-IndexNode-Event", event)
            .body(payload_bytes.clone())
            .send()
            .await
        {
            Ok(resp) if resp.status().is_success() => {
                tracing::info!(
                    "Webhook delivered to {} for job {} ({})",
                    url,
                    job_id,
                    event
                );
            }
            Ok(resp) => {
                tracing::warn!(
                    "Webhook to {} returned {} for job {}",
                    url,
                    resp.status(),
                    job_id
                );
            }
            Err(e) => {
                tracing::warn!("Webhook to {} failed for job {}: {:?}", url, job_id, e);
            }
        }
    }
}

/// HMAC-SHA256 computed in-house to avoid an extra crate dependency.
/// Follows RFC 2104: HMAC(K, m) = H((K' ⊕ opad) ∥ H((K' ⊕ ipad) ∥ m))
/// where K' is the key zero-padded to the hash block size (64 bytes for SHA-256).
fn hmac_sha256(key: &[u8], message: &[u8]) -> Vec<u8> {
    use sha2::{Digest, Sha256};
    const BLOCK: usize = 64;

    let mut k = [0u8; BLOCK];
    if key.len() > BLOCK {
        let h = Sha256::digest(key);
        k[..32].copy_from_slice(&h);
    } else {
        k[..key.len()].copy_from_slice(key);
    }

    let mut ipad = k;
    let mut opad = k;
    for b in &mut ipad {
        *b ^= 0x36;
    }
    for b in &mut opad {
        *b ^= 0x5c;
    }

    let mut inner = Sha256::new();
    inner.update(ipad);
    inner.update(message);
    let inner_hash = inner.finalize();

    let mut outer = Sha256::new();
    outer.update(opad);
    outer.update(inner_hash);
    outer.finalize().to_vec()
}
