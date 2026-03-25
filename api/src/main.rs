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
    CreditManager, DistributedQueue, EventFilter, IpfsStorage, Job, JobConfig, JobParams,
    JobQueue, JobStatus, MarketplaceClient, TimestampClient,
    Worker as DistributedWorker, WorkerConfig as DistributedWorkerConfig,
};
use std::collections::HashMap;
use sqlx::postgres::PgPoolOptions;
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
        .route("/graphql", axum::routing::post(graphql_handler))
        .route_layer(axum::middleware::from_fn_with_state(
            pool.clone(),
            middleware::credits::check_credits,
        ))
        .route_layer(per_user_limiter)
        .route_layer(axum::middleware::from_fn(middleware::require_auth))
        .merge(routes::create_public_routes(pool.clone()))
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

    tracing::info!("Worker started");

    loop {
        if *shutdown.borrow() {
            tracing::info!("Worker shutting down");
            break;
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
                            }
                            Ok(Err(e)) => {
                                tracing::error!("Job {} failed: {:?}", job.id, e);
                                queue
                                    .update_status(job.id, JobStatus::Failed, Some(e.to_string()))
                                    .await?;
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
                                        if let Err(e) = credit_manager
                                            .spend_credits(addr, cost, "http_crawl".to_string())
                                            .await
                                        {
                                            tracing::error!(
                                                "Failed to spend on-chain credits for job {}: {:?}",
                                                job.id,
                                                e
                                            );
                                        }
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

                                tracing::info!("Job {} completed successfully", job.id);
                            }
                        }
                    }
                    JobParams::BlockchainIndex(_) => {
                        match process_blockchain_index(
                            &chain_clients,
                            &ipfs_storage,
                            timestamp_client.as_ref(),
                            &credit_manager,
                            ai.as_ref(),
                            &pool,
                            &job,
                            ai_timeout,
                        )
                        .await
                        {
                            Ok(_) => {
                                queue
                                    .update_status(job.id, JobStatus::Completed, None)
                                    .await?;
                                tracing::info!("Blockchain job {} completed successfully", job.id);
                            }
                            Err(e) => {
                                tracing::error!("Blockchain job {} failed: {:?}", job.id, e);
                                queue
                                    .update_status(job.id, JobStatus::Failed, Some(e.to_string()))
                                    .await?;
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

async fn process_blockchain_index(
    chain_clients: &HashMap<String, BlockchainClient>,
    ipfs: &IpfsStorage,
    timestamp_client: Option<&TimestampClient>,
    credit_manager: &CreditManager,
    ai: Option<&AIExtractor>,
    pool: &sqlx::PgPool,
    job: &Job,
    ai_timeout: Duration,
) -> Result<()> {
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
            if let Err(e) = credit_manager
                .spend_credits(addr, cost, "blockchain_index".to_string())
                .await
            {
                tracing::error!(
                    "Failed to spend on-chain credits for job {}: {:?}",
                    job.id,
                    e
                );
            }
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

    let contract_address: Address = params
        .contract_address
        .parse()
        .context("Invalid contract address")?;
    let to_block = params
        .to_block
        .unwrap_or(client.get_latest_block().await?);

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

    let enable_ai: bool =
        sqlx::query_scalar::<_, bool>("SELECT enable_ai_extraction FROM jobs WHERE id = $1")
            .bind(job.id)
            .fetch_one(pool)
            .await
            .unwrap_or(false);

    let extraction_schema: Option<serde_json::Value> = if enable_ai {
        sqlx::query_scalar::<_, Option<serde_json::Value>>(
            "SELECT extraction_schema FROM jobs WHERE id = $1",
        )
        .bind(job.id)
        .fetch_one(pool)
        .await
        .unwrap_or(None)
    } else {
        None
    };

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

        if enable_ai {
            if let (Some(schema), Some(ai)) = (&extraction_schema, ai) {
                let schema_str = serde_json::to_string(schema)?;
                let event_str = serde_json::to_string(&event.event_data)?;

                let extracted = tokio::time::timeout(
                    ai_timeout,
                    ai.extract_structured_data(&event_str, &schema_str),
                )
                .await
                .map_err(|_| anyhow::anyhow!("AI extraction timed out after {:?}", ai_timeout))??;

                crate::metrics::record_ai_extraction();

                sqlx::query(
                    "INSERT INTO ai_extractions (blockchain_event_id, extraction_type, schema_definition, extracted_data)
                     VALUES ($1, 'structured', $2, $3)",
                )
                .bind(event_id)
                .bind(schema)
                .bind(extracted)
                .execute(pool)
                .await?;
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
                    // Log but don't fail the job — indexing succeeded.
                    tracing::error!(
                        "Job {}: on-chain Merkle commitment failed (events are indexed): {:?}",
                        job.id,
                        e
                    );
                }
            },
            None => {
                tracing::warn!(
                    "Job {}: TimestampClient not configured — Merkle root {} not committed on-chain",
                    job.id,
                    merkle_root
                );
            }
        }
    }

    Ok(())
}
