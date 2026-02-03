use anyhow::{Context, Result};
use async_graphql::http::{playground_source, GraphQLPlaygroundConfig};
use async_graphql_axum::{GraphQLRequest, GraphQLResponse, GraphQLSubscription};
use axum::response::{Html, IntoResponse};
use axum::Extension;
use axum::{serve, Router as AxumRouter};
use chrono::Utc;
use indexnode_core::{
    hash_content, BlockchainClient, BlockchainIndexParams, Crawler, EventFilter, IpfsStorage,
    Job, JobConfig, JobQueue, JobStatus, JobType, CreditManager, AIExtractor,
    DistributedQueue, Worker as DistributedWorker, WorkerConfig as DistributedWorkerConfig, Coordinator,
    MarketplaceClient,
};
use sqlx::postgres::PgPoolOptions;
use std::env;
use std::net::SocketAddr;
use std::time::Duration;
use ethers::types::Address;
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod auth;
mod db;
mod graphql;
mod handlers;
mod metrics;
mod middleware;
mod models;
mod routes;
mod security;

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

    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");

    let pool = PgPoolOptions::new()
        .max_connections(5)
        .min_connections(2)
        .acquire_timeout(Duration::from_secs(3))
        .idle_timeout(Duration::from_secs(300))
        .connect(&database_url)
        .await?;

    sqlx::migrate!("../migrations").run(&pool).await?;

    tracing::info!("Migrations complete");

    let rpc_url = env::var("ETHEREUM_RPC_URL").unwrap_or_else(|_| "wss://ethereum-sepolia-rpc.publicnode.com".to_string());
    let credit_contract_addr = env::var("CREDIT_CONTRACT_ADDRESS")
        .unwrap_or_else(|_| "0x0000000000000000000000000000000000000000".to_string())
        .parse::<Address>()?;
    let credit_private_key = env::var("CREDIT_PRIVATE_KEY")
        .unwrap_or_else(|_| "0x0000000000000000000000000000000000000000000000000000000000000000".to_string());
    
    let credit_manager = CreditManager::new(&rpc_url, credit_contract_addr, &credit_private_key).await?;
    let credit_manager_worker = CreditManager::new(&rpc_url, credit_contract_addr, &credit_private_key).await?;

    let marketplace_contract_addr = env::var("MARKETPLACE_CONTRACT_ADDRESS")
        .unwrap_or_else(|_| "0x0000000000000000000000000000000000000000".to_string())
        .parse::<Address>()?;
    let marketplace = MarketplaceClient::new(&rpc_url, marketplace_contract_addr, &credit_private_key).await?;

    let anthropic_api_key = env::var("ANTHROPIC_API_KEY").unwrap_or_else(|_| "sk-ant-api03-test".to_string());
    let _ai_extractor = AIExtractor::new(anthropic_api_key)?;

    // Run worker in a separate thread with a LocalSet to handle non-Send IPFS futures
    let worker_pool = pool.clone();
    let ai_extractor_worker = AIExtractor::new(env::var("ANTHROPIC_API_KEY").unwrap_or_else(|_| "sk-ant-api03-test".to_string()))?;
    
    std::thread::spawn(move || {
        let rt = tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .expect("Failed to build worker runtime");
        rt.block_on(async {
            let local = tokio::task::LocalSet::new();
            local
                .run_until(async {
                    if let Err(e) = run_worker(worker_pool, credit_manager_worker, ai_extractor_worker).await {
                        tracing::error!("Worker failed: {:?}", e);
                    }
                })
                .await;
        });
    });

    let schema = graphql::build_schema(pool.clone(), credit_manager, marketplace);

    let app = AxumRouter::new()
        .merge(routes::create_routes(pool.clone()))
        .route("/metrics", axum::routing::get(metrics_handler))
        .route("/graphql", axum::routing::post(graphql_handler))
        .route_layer(axum::middleware::from_fn_with_state(pool.clone(), middleware::credits::check_credits))
        .route(
            "/graphql/ws",
            axum::routing::any_service(GraphQLSubscription::new(schema.clone())),
        )
        .route(
            "/graphql/playground",
            axum::routing::get(graphql_playground),
        )
        .layer(axum::middleware::from_fn(middleware::track_metrics))
        .layer(axum::middleware::from_fn(middleware::validate_request_security))
        .layer(middleware::create_global_rate_limiter())
        .layer(Extension(schema))
        .layer(Extension(pool.clone()))
        .layer(Extension(metrics_handle))
        .layer(TraceLayer::new_for_http());

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
    serve(listener, app).await?;

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
    
    // Heartbeat task 
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
    
    // Process jobs 
    worker.run(|_job| async move { 
        // Process distributed job 
        Ok(()) 
    }).await?; 
    
    Ok(()) 
}

/// Handles GraphQL queries and mutations.
async fn graphql_handler(schema: Extension<AppSchema>, req: GraphQLRequest) -> GraphQLResponse {
    schema.execute(req.into_inner()).await.into()
}

/// Serves the GraphQL Playground UI.
async fn graphql_playground() -> impl IntoResponse {
    Html(playground_source(GraphQLPlaygroundConfig::new("/graphql").subscription_endpoint("/graphql/ws")))
}

async fn metrics_handler(Extension(handle): Extension<metrics_exporter_prometheus::PrometheusHandle>) -> String { 
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
        "SELECT COUNT(*) FROM distributed_jobs WHERE status = 'queued'"
    )
    .fetch_one(pool)
    .await?;
    Ok(count)
}

async fn run_worker(pool: sqlx::PgPool, credit_manager: CreditManager, ai: AIExtractor) -> Result<()> {
    let queue = JobQueue::new(pool.clone());
    let crawler = Crawler::new();
    let rpc_url = env::var("ETHEREUM_RPC_URL").unwrap_or_else(|_| "wss://ethereum-sepolia-rpc.publicnode.com".to_string());
    let blockchain_client = BlockchainClient::new(&rpc_url).await?;
    
    let ipfs_api_url = env::var("IPFS_API_URL").unwrap_or_else(|_| "http://127.0.0.1:5001".to_string());
    let pinata_jwt = env::var("PINATA_JWT").ok();
    let ipfs_storage = IpfsStorage::new(&ipfs_api_url, pinata_jwt)?;

    tracing::info!("Worker started");

    loop {
        match queue.dequeue().await {
            Ok(Some(job)) => {
                let _timer = crate::metrics::TimedOperation::new("job_processing_duration_seconds");
                tracing::info!("Processing job: {}", job.id);

                let config: JobConfig = serde_json::from_value(job.config.clone())
                    .context("Failed to parse job config")?;

                match config.job_type {
                    JobType::HttpCrawl => {
                        let url = config.params["url"].as_str().unwrap_or("https://example.com");
                        let max_pages = config.params["max_pages"].as_u64().unwrap_or(100) as usize;

                        match crawler.crawl(url, max_pages).await {
                            Ok(links) => {
                                tracing::info!("Crawled {} links for job {}", links.len(), job.id);

                                // Spend credits
                                let cost = CreditManager::crawl_job_cost();
                                if let Ok(Some(addr_str)) = sqlx::query_scalar::<_, String>("SELECT on_chain_address FROM user_credits WHERE user_id = $1")
                                    .bind(job.user_id)
                                    .fetch_optional(&pool)
                                    .await 
                                {
                                    if let Ok(addr) = addr_str.parse::<Address>() {
                                        let _ = credit_manager.spend_credits(addr, cost, "http_crawl".to_string()).await;
                                        let _ = sqlx::query("UPDATE user_credits SET credit_balance = credit_balance - $1, total_spent = total_spent + $1 WHERE user_id = $2")
                                            .bind(cost.as_u64() as i64)
                                            .bind(job.user_id)
                                            .execute(&pool)
                                            .await;
                                        crate::metrics::record_http_request("GET", url, 200, 0.0); // Simplified for now
                                    }
                                }

                                if !links.is_empty() {
                                    let mut query_builder = sqlx::QueryBuilder::new(
                                        "INSERT INTO crawl_results (id, job_id, url, status_code, content_hash, links, created_at) "
                                    );

                                    query_builder.push_values(links.iter().take(500), |mut b, link| {
                                        b.push_bind(uuid::Uuid::new_v4())
                                            .push_bind(job.id)
                                            .push_bind(link)
                                            .push_bind(200)
                                            .push_bind("hash")
                                            .push_bind(serde_json::json!([]))
                                            .push_bind(Utc::now());
                                    });

                                    let result = query_builder.build().execute(&pool).await;

                                    if let Err(e) = result {
                                        tracing::error!("Failed to insert crawl results: {:?}", e);
                                    }
                                }

                                let result_summary = serde_json::json!({
                                    "total_links": links.len(),
                                    "completed_at": Utc::now().to_rfc3339()
                                });

                                queue.update_status(job.id, JobStatus::Completed, None).await?;
                                
                                sqlx::query("UPDATE jobs SET result_summary = $1 WHERE id = $2")
                                    .bind(result_summary)
                                    .bind(job.id)
                                    .execute(&pool)
                                    .await?;

                                tracing::info!("Job {} completed successfully", job.id);
                            }
                            Err(e) => {
                                tracing::error!("Job {} failed: {:?}", job.id, e);
                                queue
                                    .update_status(job.id, JobStatus::Failed, Some(e.to_string()))
                                    .await?;
                            }
                        }
                    }
                    JobType::BlockchainIndex => {
                        match process_blockchain_index(&blockchain_client, &ipfs_storage, &credit_manager, &ai, &pool, &job).await {
                            Ok(_) => {
                                queue.update_status(job.id, JobStatus::Completed, None).await?;
                                tracing::info!("Blockchain job {} completed successfully", job.id);
                            }
                            Err(e) => {
                                tracing::error!("Blockchain job {} failed: {:?}", job.id, e);
                                queue.update_status(job.id, JobStatus::Failed, Some(e.to_string())).await?;
                            }
                        }
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

async fn process_blockchain_index(
    client: &BlockchainClient,
    ipfs: &IpfsStorage,
    credit_manager: &CreditManager,
    ai: &AIExtractor,
    pool: &sqlx::PgPool,
    job: &Job,
) -> Result<()> {
    let params: BlockchainIndexParams = serde_json::from_value(job.config.get("params").cloned().unwrap_or_default())
        .context("Invalid blockchain index parameters")?;
    
    // Spend credits
    let cost = CreditManager::event_index_cost();
    if let Ok(Some(addr_str)) = sqlx::query_scalar::<_, String>("SELECT on_chain_address FROM user_credits WHERE user_id = $1")
        .bind(job.user_id)
        .fetch_optional(pool)
        .await 
    {
        if let Ok(addr) = addr_str.parse::<Address>() {
            let _ = credit_manager.spend_credits(addr, cost, "blockchain_index".to_string()).await;
            let _ = sqlx::query("UPDATE user_credits SET credit_balance = credit_balance - $1, total_spent = total_spent + $1 WHERE user_id = $2")
                .bind(cost.as_u64() as i64)
                .bind(job.user_id)
                .execute(pool)
                .await;
        }
    }

    let filter = EventFilter {
        contract_address: params.contract_address.parse().context("Invalid address")?,
        event_signature: params.events.first().cloned().context("No events specified")?,
        from_block: params.from_block,
        to_block: params.to_block.unwrap_or(client.get_latest_block().await?),
    };
    
    let events = client.get_events(filter).await?;
    
    for mut event in events {
        let event_id = uuid::Uuid::new_v4();
        event.content_hash = hash_content(format!("{:?}", event.event_data).as_bytes());
        let event_json = serde_json::to_vec(&event).context("Failed to serialize event")?;
        let ipfs_cid = ipfs.store_content(&event_json).await?;
        
        crate::metrics::record_ipfs_upload(event_json.len() as u64);
        crate::metrics::record_blockchain_event();
        
        ipfs.pin_content(&ipfs_cid).await?;
        
        sqlx::query(
            "INSERT INTO blockchain_events (id, job_id, chain, contract_address, event_name, block_number, transaction_hash, event_data, content_hash, ipfs_cid) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)"
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

        // Record IPFS content metadata
        sqlx::query(
            "INSERT INTO ipfs_content (cid, content_hash, size_bytes, pinned, blockchain_event_id) 
             VALUES ($1, $2, $3, true, $4)
             ON CONFLICT (cid) DO NOTHING"
        )
        .bind(&ipfs_cid)
        .bind(&event.content_hash)
        .bind(event_json.len() as i64)
        .bind(event_id)
        .execute(pool)
        .await?;

        // AI extraction if enabled
        let enable_ai: bool = sqlx::query_scalar::<_, bool>("SELECT enable_ai_extraction FROM jobs WHERE id = $1")
            .bind(job.id)
            .fetch_one(pool)
            .await
            .unwrap_or(false);

        if enable_ai {
            let extraction_schema: Option<serde_json::Value> = sqlx::query_scalar::<_, Option<serde_json::Value>>("SELECT extraction_schema FROM jobs WHERE id = $1")
                .bind(job.id)
                .fetch_one(pool)
                .await
                .unwrap_or(None);

            if let Some(schema) = extraction_schema {
                let schema_str = serde_json::to_string(&schema)?;
                let extracted = ai.extract_structured_data(
                    &serde_json::to_string(&event.event_data)?, 
                    &schema_str
                ).await?;
                
                crate::metrics::record_ai_extraction();
                
                sqlx::query(
                    "INSERT INTO ai_extractions (blockchain_event_id, extraction_type, schema_definition, extracted_data) 
                     VALUES ($1, 'structured', $2, $3)"
                )
                .bind(event_id)
                .bind(schema)
                .bind(extracted)
                .execute(pool)
                .await?;
            }
        }
    }
    
    Ok(())
}
