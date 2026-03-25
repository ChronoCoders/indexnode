use super::types::*;
use crate::auth::UserRole;
use crate::db;
use crate::security::{InputValidator, Sanitizer};
use anyhow::Context as AnyhowContext;
use async_graphql::*;
use ethers::types::U256;
use indexnode_core::{
    BlockchainIndexParams, CreditManager, JobConfig, JobParams, JobType, MarketplaceClient,
};
use sqlx::PgPool;
use tokio_stream::{Stream, StreamExt};
use uuid::Uuid;

pub struct Query;

#[Object]
impl Query {
    /// Fetches a single job by its ID.
    async fn job(&self, ctx: &Context<'_>, id: String) -> async_graphql::Result<Job> {
        let pool = ctx
            .data::<PgPool>()
            .map_err(|_| Error::new("Failed to get database pool"))?;
        let job_id = Uuid::parse_str(&id)
            .map_err(|e| Error::new(format!("Invalid job ID format: {}", e)))?;

        let row = sqlx::query("SELECT id, status, created_at FROM jobs WHERE id = $1")
            .bind(job_id)
            .fetch_one(pool)
            .await
            .context("Job not found")?;

        use sqlx::Row;
        Ok(Job {
            id: row.get::<Uuid, _>("id").to_string(),
            status: row.get("status"),
            created_at: row
                .get::<chrono::DateTime<chrono::Utc>, _>("created_at")
                .to_rfc3339(),
        })
    }

    /// Fetches blockchain events for a specific contract with an optional limit.
    async fn blockchain_events(
        &self,
        ctx: &Context<'_>,
        contract_address: String,
        limit: Option<i32>,
    ) -> async_graphql::Result<Vec<BlockchainEvent>> {
        let pool = ctx
            .data::<PgPool>()
            .map_err(|_| Error::new("Failed to get database pool"))?;
        let limit = limit.unwrap_or(10).min(100);

        // Validate the address before using it in a query.
        InputValidator::validate_ethereum_address(&contract_address)
            .map_err(|e| Error::new(format!("Invalid contract address: {}", e)))?;

        let rows = sqlx::query(
            "SELECT id, contract_address, event_name, block_number, transaction_hash, event_data, content_hash, ipfs_cid
             FROM blockchain_events
             WHERE contract_address = $1
             ORDER BY block_number DESC
             LIMIT $2"
        )
        .bind(&contract_address)
        .bind(limit as i64)
        .fetch_all(pool)
        .await
        .context("Failed to fetch blockchain events")?;

        use sqlx::Row;
        Ok(rows
            .into_iter()
            .map(|r| BlockchainEvent {
                id: r.get::<Uuid, _>("id").to_string(),
                contract_address: r.get("contract_address"),
                event_name: r.get("event_name"),
                block_number: r.get("block_number"),
                transaction_hash: r.get("transaction_hash"),
                event_data: r.get("event_data"),
                content_hash: r.get("content_hash"),
                ipfs_cid: r.get("ipfs_cid"),
            })
            .collect())
    }

    /// Fetches IPFS content metadata by CID.
    async fn ipfs_content(
        &self,
        ctx: &Context<'_>,
        cid: String,
    ) -> async_graphql::Result<IpfsContentMetadata> {
        let pool = ctx
            .data::<PgPool>()
            .map_err(|_| Error::new("Failed to get database pool"))?;

        InputValidator::validate_ipfs_cid(&cid)
            .map_err(|e| Error::new(format!("Invalid IPFS CID: {}", e)))?;

        let row = sqlx::query(
            "SELECT cid, content_hash, size_bytes, pinned, created_at FROM ipfs_content WHERE cid = $1"
        )
        .bind(cid)
        .fetch_one(pool)
        .await
        .context("IPFS content not found")?;

        use sqlx::Row;
        Ok(IpfsContentMetadata {
            cid: row.get("cid"),
            content_hash: row.get("content_hash"),
            size_bytes: row.get("size_bytes"),
            pinned: row.get("pinned"),
            created_at: row
                .get::<chrono::DateTime<chrono::Utc>, _>("created_at")
                .to_rfc3339(),
        })
    }

    /// Fetches the credit balance for the authenticated user.
    async fn credit_balance(&self, ctx: &Context<'_>) -> async_graphql::Result<i64> {
        let pool = ctx
            .data::<PgPool>()
            .map_err(|_| Error::new("Failed to get database pool"))?;
        let user_id = ctx
            .data_opt::<Uuid>()
            .cloned()
            .ok_or_else(|| Error::new("Unauthorized"))?;

        let balance = sqlx::query_scalar::<_, i64>(
            "SELECT credit_balance FROM user_credits WHERE user_id = $1",
        )
        .bind(user_id)
        .fetch_optional(pool)
        .await
        .context("Failed to fetch credit balance")?
        .unwrap_or(0);

        Ok(balance)
    }

    /// Returns the registered wallet address and credit balance for the authenticated user.
    async fn wallet_info(&self, ctx: &Context<'_>) -> async_graphql::Result<Option<WalletInfo>> {
        let pool = ctx
            .data::<PgPool>()
            .map_err(|_| Error::new("Failed to get database pool"))?;
        let user_id = ctx
            .data_opt::<Uuid>()
            .cloned()
            .ok_or_else(|| Error::new("Unauthorized"))?;

        let row = sqlx::query(
            "SELECT on_chain_address, credit_balance FROM user_credits WHERE user_id = $1",
        )
        .bind(user_id)
        .fetch_optional(pool)
        .await
        .context("Failed to fetch wallet info")?;

        use sqlx::Row;
        Ok(row.map(|r| WalletInfo {
            wallet_address: r.get("on_chain_address"),
            credit_balance: r.get("credit_balance"),
        }))
    }

    /// Verifies a content hash against the on-chain Merkle commitment.
    /// Accepts either an individual event content_hash or a batch Merkle root.
    async fn verify_hash(
        &self,
        ctx: &Context<'_>,
        content_hash: String,
    ) -> async_graphql::Result<VerificationResult> {
        let pool = ctx
            .data::<PgPool>()
            .map_err(|_| Error::new("Failed to get database pool"))?;

        use sqlx::Row;

        // Try direct lookup — handles Merkle roots committed directly.
        let direct = sqlx::query(
            "SELECT block_number, transaction_hash FROM timestamp_commits WHERE content_hash = $1 LIMIT 1",
        )
        .bind(&content_hash)
        .fetch_optional(pool)
        .await
        .context("Failed to query timestamp commits")?;

        if let Some(r) = direct {
            return Ok(VerificationResult {
                verified: true,
                block_number: Some(r.get("block_number")),
                transaction_hash: Some(r.get("transaction_hash")),
            });
        }

        // Resolve via event → batch Merkle root → on-chain commit.
        let via_event = sqlx::query(
            "SELECT tc.block_number, tc.transaction_hash
             FROM blockchain_events be
             JOIN timestamp_commits tc ON tc.content_hash = be.merkle_root
             WHERE be.content_hash = $1
             LIMIT 1",
        )
        .bind(&content_hash)
        .fetch_optional(pool)
        .await
        .context("Failed to query via event merkle root")?;

        match via_event {
            Some(r) => Ok(VerificationResult {
                verified: true,
                block_number: Some(r.get("block_number")),
                transaction_hash: Some(r.get("transaction_hash")),
            }),
            None => Ok(VerificationResult {
                verified: false,
                block_number: None,
                transaction_hash: None,
            }),
        }
    }

    /// Fetches AI-powered extractions for a specific blockchain event.
    async fn ai_extractions(
        &self,
        ctx: &Context<'_>,
        event_id: String,
    ) -> async_graphql::Result<Vec<AIExtraction>> {
        let pool = ctx
            .data::<PgPool>()
            .map_err(|_| Error::new("Failed to get database pool"))?;
        let event_uuid = Uuid::parse_str(&event_id)
            .map_err(|e| Error::new(format!("Invalid event ID format: {}", e)))?;

        let records = sqlx::query(
            "SELECT id, extraction_type, extracted_data, confidence_score, created_at
             FROM ai_extractions WHERE blockchain_event_id = $1",
        )
        .bind(event_uuid)
        .fetch_all(pool)
        .await
        .context("Failed to fetch AI extractions")?;

        use sqlx::Row;
        Ok(records
            .into_iter()
            .map(|r| AIExtraction {
                id: r.get::<Uuid, _>("id").to_string(),
                extraction_type: r.get("extraction_type"),
                extracted_data: r.get("extracted_data"),
                confidence_score: r.get("confidence_score"),
                created_at: r
                    .get::<chrono::DateTime<chrono::Utc>, _>("created_at")
                    .to_rfc3339(),
            })
            .collect())
    }

    /// Fetches the rate limit status for the authenticated user.
    async fn rate_limit_status(&self, ctx: &Context<'_>) -> async_graphql::Result<RateLimitStatus> {
        let pool = ctx
            .data::<PgPool>()
            .map_err(|_| Error::new("Failed to get database pool"))?;
        let user_id = ctx
            .data_opt::<Uuid>()
            .cloned()
            .ok_or_else(|| Error::new("Unauthorized"))?;

        let row = sqlx::query(
            "SELECT rate_limit_tier, monthly_request_quota, requests_this_month FROM users WHERE id = $1"
        )
        .bind(user_id)
        .fetch_one(pool)
        .await
        .context("User not found")?;

        use sqlx::Row;
        let quota: i32 = row.get("monthly_request_quota");
        let used: i32 = row.get("requests_this_month");

        Ok(RateLimitStatus {
            tier: row.get("rate_limit_tier"),
            quota,
            used,
            remaining: quota - used,
        })
    }

    /// Fetches global system health and queue metrics. Requires admin role.
    async fn system_metrics(&self, ctx: &Context<'_>) -> async_graphql::Result<SystemMetrics> {
        // Admin-only endpoint.
        let role = ctx
            .data_opt::<UserRole>()
            .cloned()
            .ok_or_else(|| Error::new("Unauthorized"))?;
        if role != UserRole::Admin {
            return Err(Error::new("Forbidden: admin access required"));
        }

        let pool = ctx
            .data::<PgPool>()
            .map_err(|_| Error::new("Failed to get database pool"))?;

        use sqlx::Row;
        let active_workers = sqlx::query(
            "SELECT COUNT(*) as count FROM worker_nodes WHERE status = 'active' AND last_heartbeat > NOW() - INTERVAL '2 minutes'"
        )
        .fetch_one(pool)
        .await?
        .get::<i64, _>("count");

        let queue_depth =
            sqlx::query("SELECT COUNT(*) as count FROM distributed_jobs WHERE status = 'queued'")
                .fetch_one(pool)
                .await?
                .get::<i64, _>("count");

        Ok(SystemMetrics {
            active_workers,
            queue_depth,
        })
    }

    /// Fetches listings from the data marketplace.
    async fn marketplace_listings(
        &self,
        ctx: &Context<'_>,
        active_only: bool,
        limit: i32,
    ) -> async_graphql::Result<Vec<MarketplaceListing>> {
        let pool = ctx
            .data::<PgPool>()
            .map_err(|_| Error::new("Failed to get database pool"))?;
        let limit = limit.min(100);

        let rows = if active_only {
            sqlx::query(
                r#"
                SELECT l.id, l.seller_id, l.dataset_name, l.dataset_description, l.ipfs_cid,
                       l.price_credits, l.active, l.sales_count,
                       AVG(r.rating)::float8 as seller_rating
                FROM marketplace_listings l
                LEFT JOIN seller_ratings r ON l.seller_id = r.seller_id
                WHERE l.active = true
                GROUP BY l.id, l.seller_id, l.dataset_name, l.dataset_description, l.ipfs_cid, l.price_credits, l.active, l.sales_count, l.created_at
                ORDER BY l.created_at DESC
                LIMIT $1
                "#,
            )
            .bind(limit as i64)
            .fetch_all(pool)
            .await
        } else {
            sqlx::query(
                r#"
                SELECT l.id, l.seller_id, l.dataset_name, l.dataset_description, l.ipfs_cid,
                       l.price_credits, l.active, l.sales_count,
                       AVG(r.rating)::float8 as seller_rating
                FROM marketplace_listings l
                LEFT JOIN seller_ratings r ON l.seller_id = r.seller_id
                GROUP BY l.id, l.seller_id, l.dataset_name, l.dataset_description, l.ipfs_cid, l.price_credits, l.active, l.sales_count, l.created_at
                ORDER BY l.created_at DESC
                LIMIT $1
                "#,
            )
            .bind(limit as i64)
            .fetch_all(pool)
            .await
        }
        .context("Failed to fetch marketplace listings")?;

        use sqlx::Row;
        Ok(rows
            .into_iter()
            .map(|r| MarketplaceListing {
                id: r.get::<Uuid, _>("id").to_string(),
                seller_id: r.get::<Uuid, _>("seller_id").to_string(),
                dataset_name: r.get("dataset_name"),
                dataset_description: r.get("dataset_description"),
                ipfs_cid: r.get("ipfs_cid"),
                price_credits: r.get("price_credits"),
                active: r.get("active"),
                sales_count: r.get("sales_count"),
                seller_rating: r.get::<Option<f64>, _>("seller_rating"),
            })
            .collect())
    }

    /// Fetches purchases for the authenticated user.
    async fn marketplace_purchases(
        &self,
        ctx: &Context<'_>,
    ) -> async_graphql::Result<Vec<MarketplacePurchase>> {
        let pool = ctx
            .data::<PgPool>()
            .map_err(|_| Error::new("Failed to get database pool"))?;
        let user_id = ctx
            .data_opt::<Uuid>()
            .cloned()
            .ok_or_else(|| Error::new("Unauthorized"))?;

        let rows = sqlx::query(
            r#"
            SELECT id, listing_id, buyer_id, paid_amount, access_granted, purchased_at
            FROM marketplace_purchases
            WHERE buyer_id = $1
            ORDER BY purchased_at DESC
            "#,
        )
        .bind(user_id)
        .fetch_all(pool)
        .await
        .context("Failed to fetch marketplace purchases")?;

        use sqlx::Row;
        Ok(rows
            .into_iter()
            .map(|r| MarketplacePurchase {
                id: r.get::<Uuid, _>("id").to_string(),
                listing_id: r.get::<Uuid, _>("listing_id").to_string(),
                buyer_id: r.get::<Uuid, _>("buyer_id").to_string(),
                paid_amount: r.get("paid_amount"),
                access_granted: r.get("access_granted"),
                purchased_at: r
                    .get::<chrono::DateTime<chrono::Utc>, _>("purchased_at")
                    .to_rfc3339(),
            })
            .collect())
    }
}

pub struct Mutation;

#[Object]
impl Mutation {
    /// Creates a new blockchain indexing job.
    async fn create_blockchain_job(
        &self,
        ctx: &Context<'_>,
        input: CreateBlockchainJobInput,
    ) -> async_graphql::Result<Job> {
        let pool = ctx
            .data::<PgPool>()
            .map_err(|_| Error::new("Failed to get database pool"))?;
        let user_id = ctx
            .data_opt::<Uuid>()
            .cloned()
            .ok_or_else(|| Error::new("Unauthorized"))?;

        // Input validation
        InputValidator::validate_ethereum_address(&input.contract_address)
            .map_err(|e| Error::new(format!("Security validation failed: {}", e)))?;
        InputValidator::validate_string_length(&input.chain, 1, 64, "chain")
            .map_err(|e| Error::new(format!("Validation failed: {}", e)))?;
        InputValidator::validate_numeric_range(input.from_block, 0_i64, i64::MAX, "from_block")
            .map_err(|e| Error::new(format!("Validation failed: {}", e)))?;

        const SUPPORTED_CHAINS: &[&str] = &["ethereum", "polygon"];
        let sanitized_chain = Sanitizer::sanitize_text(&input.chain);
        if !SUPPORTED_CHAINS.contains(&sanitized_chain.as_str()) {
            return Err(Error::new(format!(
                "Unsupported chain '{}'. Supported chains: {}",
                sanitized_chain,
                SUPPORTED_CHAINS.join(", ")
            )));
        }

        let job_id = Uuid::new_v4();

        let config = JobConfig {
            job_type: JobType::BlockchainIndex,
            params: JobParams::BlockchainIndex(BlockchainIndexParams {
                chain: sanitized_chain,
                contract_address: input.contract_address,
                events: input.events,
                from_block: input.from_block as u64,
                to_block: input.to_block.map(|b| b as u64),
            }),
        };
        let config_json = serde_json::to_value(&config)
            .map_err(|e| Error::new(format!("Config error: {}", e)))?;

        sqlx::query("INSERT INTO jobs (id, user_id, status, config) VALUES ($1, $2, 'queued', $3)")
            .bind(job_id)
            .bind(user_id)
            .bind(config_json)
            .execute(pool)
            .await
            .context("Failed to create job")?;

        db::audit_log(
            pool,
            Some(user_id),
            "create_blockchain_job",
            "job",
            Some(&job_id.to_string()),
            Some(serde_json::json!({"contract_address": &config.params
                .as_blockchain_index().map(|p| p.contract_address.as_str()).unwrap_or("")})),
        )
        .await;

        Ok(Job {
            id: job_id.to_string(),
            status: "queued".to_string(),
            created_at: chrono::Utc::now().to_rfc3339(),
        })
    }

    /// Registers or updates the Ethereum wallet address for the authenticated user.
    /// This address is used for on-chain credit spending when indexing jobs run.
    async fn register_wallet(
        &self,
        ctx: &Context<'_>,
        wallet_address: String,
    ) -> async_graphql::Result<WalletInfo> {
        let pool = ctx
            .data::<PgPool>()
            .map_err(|_| Error::new("Failed to get database pool"))?;
        let user_id = ctx
            .data_opt::<Uuid>()
            .cloned()
            .ok_or_else(|| Error::new("Unauthorized"))?;

        InputValidator::validate_ethereum_address(&wallet_address)
            .map_err(|e| Error::new(format!("Invalid wallet address: {}", e)))?;

        sqlx::query(
            "INSERT INTO user_credits (user_id, on_chain_address, credit_balance, total_purchased, total_spent)
             VALUES ($1, $2, 0, 0, 0)
             ON CONFLICT (user_id) DO UPDATE SET on_chain_address = EXCLUDED.on_chain_address",
        )
        .bind(user_id)
        .bind(&wallet_address)
        .execute(pool)
        .await
        .context("Failed to register wallet")?;

        let balance = sqlx::query_scalar::<_, i64>(
            "SELECT credit_balance FROM user_credits WHERE user_id = $1",
        )
        .bind(user_id)
        .fetch_one(pool)
        .await
        .context("Failed to fetch credit balance after registration")?;

        db::audit_log(
            pool,
            Some(user_id),
            "register_wallet",
            "user_credits",
            Some(&user_id.to_string()),
            Some(serde_json::json!({ "wallet_address": &wallet_address })),
        )
        .await;

        Ok(WalletInfo {
            wallet_address,
            credit_balance: balance,
        })
    }

    /// Purchases credits using ERC-20 tokens.
    async fn purchase_credits(
        &self,
        ctx: &Context<'_>,
        amount: String,
    ) -> async_graphql::Result<String> {
        let pool = ctx
            .data::<PgPool>()
            .map_err(|_| Error::new("Failed to get database pool"))?;
        let user_id = ctx
            .data_opt::<Uuid>()
            .cloned()
            .ok_or_else(|| Error::new("Unauthorized"))?;
        let credit_manager = ctx
            .data::<CreditManager>()
            .map_err(|_| Error::new("Credit manager not available"))?;

        let amount_u256 = U256::from_dec_str(&amount).context("Invalid amount format")?;
        let tx_hash = credit_manager.purchase_credits(amount_u256).await?;

        sqlx::query(
            "INSERT INTO credit_transactions (user_id, transaction_type, amount, tx_hash) VALUES ($1, 'purchase', $2, $3)"
        )
        .bind(user_id)
        .bind(amount.parse::<i64>().unwrap_or(0))
        .bind(format!("{:?}", tx_hash))
        .execute(pool)
        .await
        .context("Failed to record credit transaction")?;

        db::audit_log(
            pool,
            Some(user_id),
            "purchase_credits",
            "credit_transaction",
            Some(&format!("{:?}", tx_hash)),
            Some(serde_json::json!({"amount": amount})),
        )
        .await;

        Ok(format!("{:?}", tx_hash))
    }

    /// Creates a new marketplace listing.
    async fn create_marketplace_listing(
        &self,
        ctx: &Context<'_>,
        input: CreateListingInput,
    ) -> async_graphql::Result<String> {
        let pool = ctx
            .data::<PgPool>()
            .map_err(|_| Error::new("Failed to get database pool"))?;
        let user_id = ctx
            .data_opt::<Uuid>()
            .cloned()
            .ok_or_else(|| Error::new("Unauthorized"))?;
        let marketplace = ctx
            .data::<MarketplaceClient>()
            .map_err(|_| Error::new("Marketplace client not available"))?;

        // Validate inputs
        InputValidator::validate_ipfs_cid(&input.ipfs_cid)
            .map_err(|e| Error::new(format!("Invalid IPFS CID: {}", e)))?;
        InputValidator::validate_string_length(&input.dataset_name, 1, 256, "dataset_name")
            .map_err(|e| Error::new(format!("Validation failed: {}", e)))?;
        InputValidator::validate_numeric_range(
            input.price_credits,
            1_i64,
            1_000_000_i64,
            "price_credits",
        )
        .map_err(|e| Error::new(format!("Validation failed: {}", e)))?;

        let sanitized_name = Sanitizer::remove_null_bytes(&input.dataset_name);
        let sanitized_desc = input
            .dataset_description
            .as_deref()
            .map(Sanitizer::remove_null_bytes);

        let price_u256 = U256::from(input.price_credits as u64);
        let tx_hash = marketplace
            .create_listing(&input.ipfs_cid, "", price_u256)
            .await?;

        let listing_id = Uuid::new_v4();
        sqlx::query(
            "INSERT INTO marketplace_listings (id, seller_id, dataset_name, dataset_description, ipfs_cid, metadata_uri, price_credits, transaction_hash, listing_id)
             VALUES ($1, $2, $3, $4, $5, '', $6, $7, 0)",
        )
        .bind(listing_id)
        .bind(user_id)
        .bind(sanitized_name)
        .bind(sanitized_desc)
        .bind(&input.ipfs_cid)
        .bind(input.price_credits)
        .bind(format!("{:?}", tx_hash))
        .execute(pool)
        .await
        .context("Failed to create marketplace listing")?;

        db::audit_log(
            pool,
            Some(user_id),
            "create_listing",
            "marketplace_listing",
            Some(&listing_id.to_string()),
            Some(serde_json::json!({"ipfs_cid": input.ipfs_cid, "price_credits": input.price_credits})),
        )
        .await;

        Ok(listing_id.to_string())
    }

    /// Purchases a dataset from the marketplace.
    async fn purchase_dataset(
        &self,
        ctx: &Context<'_>,
        listing_id: String,
    ) -> async_graphql::Result<String> {
        let pool = ctx
            .data::<PgPool>()
            .map_err(|_| Error::new("Failed to get database pool"))?;
        let user_id = ctx
            .data_opt::<Uuid>()
            .cloned()
            .ok_or_else(|| Error::new("Unauthorized"))?;
        let marketplace = ctx
            .data::<MarketplaceClient>()
            .map_err(|_| Error::new("Marketplace client not available"))?;

        let listing_uuid = Uuid::parse_str(&listing_id)
            .map_err(|e| Error::new(format!("Invalid listing ID: {}", e)))?;

        let row = sqlx::query(
            "SELECT price_credits, on_chain_listing_id, seller_id FROM marketplace_listings WHERE id = $1",
        )
        .bind(listing_uuid)
        .fetch_one(pool)
        .await
        .context("Listing not found")?;

        use sqlx::Row;
        let seller_id: Uuid = row.get("seller_id");
        if seller_id == user_id {
            return Err(Error::new("Cannot purchase your own listing"));
        }
        let price_credits: i64 = row.get("price_credits");
        let on_chain_id = U256::from(
            row.get::<Option<i64>, _>("on_chain_listing_id")
                .ok_or_else(|| Error::new("Listing is not available for on-chain purchase: missing on_chain_listing_id"))?,
        );

        let tx_hash = marketplace.purchase_dataset(on_chain_id).await?;

        let purchase_id = Uuid::new_v4();
        sqlx::query(
            "INSERT INTO marketplace_purchases (id, listing_id, buyer_id, paid_amount, transaction_hash, access_granted, purchase_id)
              VALUES ($1, $2, $3, $4, $5, true, 0)",
        )
        .bind(purchase_id)
        .bind(listing_uuid)
        .bind(user_id)
        .bind(price_credits)
        .bind(format!("{:?}", tx_hash))
        .execute(pool)
        .await
        .context("Failed to record marketplace purchase")?;

        db::audit_log(
            pool,
            Some(user_id),
            "purchase_dataset",
            "marketplace_purchase",
            Some(&purchase_id.to_string()),
            Some(serde_json::json!({"listing_id": listing_id, "paid_amount": price_credits})),
        )
        .await;

        Ok(purchase_id.to_string())
    }
}

pub struct Subscription;

#[Subscription]
impl Subscription {
    /// Streams real-time blockchain events for a specific contract using PostgreSQL LISTEN/NOTIFY.
    async fn blockchain_events<'a>(
        &self,
        ctx: &'a Context<'_>,
        contract_address: String,
    ) -> async_graphql::Result<impl Stream<Item = BlockchainEvent> + 'a> {
        let pool = ctx
            .data::<PgPool>()
            .map_err(|_| Error::new("Failed to get database pool"))?
            .clone();

        InputValidator::validate_ethereum_address(&contract_address)
            .map_err(|e| Error::new(format!("Invalid contract address: {}", e)))?;

        let mut listener = sqlx::postgres::PgListener::connect_with(&pool)
            .await
            .map_err(|e| Error::new(format!("Failed to create listener: {}", e)))?;

        listener
            .listen("blockchain_event")
            .await
            .map_err(|e| Error::new(format!("Failed to listen on channel: {}", e)))?;

        Ok(listener.into_stream().filter_map(move |notification| {
            let n = notification.ok()?;
            let v: serde_json::Value = serde_json::from_str(n.payload()).ok()?;
            // Filter server-side to only emit events for the requested contract.
            if v["contract_address"].as_str()? != contract_address.as_str() {
                return None;
            }
            let id_str = v["id"].as_str().unwrap_or("");
            let id = Uuid::parse_str(id_str).unwrap_or_else(|_| Uuid::new_v4());
            Some(BlockchainEvent {
                id: id.to_string(),
                contract_address: v["contract_address"].as_str()?.to_string(),
                event_name: v["event_name"].as_str()?.to_string(),
                block_number: v["block_number"].as_i64()?,
                transaction_hash: v["transaction_hash"].as_str()?.to_string(),
                event_data: v["event_data"].clone(),
                content_hash: v["content_hash"].as_str()?.to_string(),
                ipfs_cid: v["ipfs_cid"].as_str().map(|s| s.to_string()),
            })
        }))
    }
}

pub type AppSchema = Schema<Query, Mutation, Subscription>;

/// Builds the GraphQL schema with the provided database pool and credit manager.
pub fn build_schema(
    pool: PgPool,
    credit_manager: CreditManager,
    marketplace: MarketplaceClient,
) -> AppSchema {
    Schema::build(Query, Mutation, Subscription)
        .data(pool)
        .data(credit_manager)
        .data(marketplace)
        .finish()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_schema_build() {
        let database_url = std::env::var("DATABASE_URL")
            .unwrap_or_else(|_| "postgres://localhost/test".to_string());
        let pool = sqlx::PgPool::connect_lazy(&database_url)
            .expect("Lazy connection to test DB is valid; qed");
        let schema = Schema::build(Query, Mutation, Subscription)
            .data(pool)
            .finish();
        assert!(schema.sdl().contains("Query"));
        assert!(schema.sdl().contains("Mutation"));
        assert!(schema.sdl().contains("Subscription"));
    }
}
