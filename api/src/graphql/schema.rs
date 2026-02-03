use async_graphql::*;
use sqlx::PgPool;
use tokio_stream::{Stream, StreamExt};
use std::time::Duration;
use anyhow::Context as AnyhowContext;
use super::types::*;
use uuid::Uuid;
use indexnode_core::{CreditManager, MarketplaceClient};
use ethers::types::U256;
use crate::security::{InputValidator, Sanitizer};

pub struct Query;

#[Object]
impl Query {
    /// Fetches a single job by its ID.
    async fn job(&self, ctx: &Context<'_>, id: String) -> async_graphql::Result<Job> {
        let pool = ctx.data::<PgPool>().map_err(|_| Error::new("Failed to get database pool"))?;
        let job_id = Uuid::parse_str(&id).map_err(|e| Error::new(format!("Invalid job ID format: {}", e)))?;
        
        let row = sqlx::query(
            "SELECT id, status, created_at FROM jobs WHERE id = $1"
        )
        .bind(job_id)
        .fetch_one(pool)
        .await
        .context("Job not found")?;
        
        use sqlx::Row;
        Ok(Job {
            id: row.get::<Uuid, _>("id").to_string(),
            status: row.get("status"),
            created_at: row.get::<chrono::DateTime<chrono::Utc>, _>("created_at").to_rfc3339(),
        })
    }

    /// Fetches blockchain events for a specific contract with an optional limit.
    async fn blockchain_events(
        &self,
        ctx: &Context<'_>,
        contract_address: String,
        limit: Option<i32>,
    ) -> async_graphql::Result<Vec<BlockchainEvent>> {
        let pool = ctx.data::<PgPool>().map_err(|_| Error::new("Failed to get database pool"))?;
        let limit = limit.unwrap_or(10).min(100);
        
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
        Ok(rows.into_iter().map(|r| BlockchainEvent {
            id: r.get::<Uuid, _>("id").to_string(),
            contract_address: r.get("contract_address"),
            event_name: r.get("event_name"),
            block_number: r.get("block_number"),
            transaction_hash: r.get("transaction_hash"),
            event_data: r.get("event_data"),
            content_hash: r.get("content_hash"),
            ipfs_cid: r.get("ipfs_cid"),
        }).collect())
    }

    /// Fetches IPFS content metadata by CID.
    async fn ipfs_content(&self, ctx: &Context<'_>, cid: String) -> async_graphql::Result<IpfsContentMetadata> {
        let pool = ctx.data::<PgPool>().map_err(|_| Error::new("Failed to get database pool"))?;
        
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
            created_at: row.get::<chrono::DateTime<chrono::Utc>, _>("created_at").to_rfc3339(),
        })
    }

    /// Fetches the credit balance for the authenticated user.
    async fn credit_balance(&self, ctx: &Context<'_>) -> async_graphql::Result<i64> {
        let pool = ctx.data::<PgPool>().map_err(|_| Error::new("Failed to get database pool"))?;
        let user_id = ctx.data_opt::<Uuid>().cloned().unwrap_or_else(Uuid::nil);
        
        let balance = sqlx::query_scalar::<_, i64>(
            "SELECT credit_balance FROM user_credits WHERE user_id = $1"
        )
        .bind(user_id)
        .fetch_optional(pool)
        .await
        .context("Failed to fetch credit balance")?
        .unwrap_or(0);
        
        Ok(balance)
    }

    /// Verifies a content hash against the blockchain.
    async fn verify_hash(&self, ctx: &Context<'_>, content_hash: String) -> async_graphql::Result<VerificationResult> {
        let pool = ctx.data::<PgPool>().map_err(|_| Error::new("Failed to get database pool"))?;
        
        let row = sqlx::query(
            "SELECT block_number, transaction_hash FROM timestamp_commits WHERE content_hash = $1 LIMIT 1"
        )
        .bind(content_hash)
        .fetch_optional(pool)
        .await
        .context("Failed to query timestamp commits")?;
        
        match row {
            Some(r) => {
                use sqlx::Row;
                Ok(VerificationResult {
                    verified: true,
                    block_number: Some(r.get("block_number")),
                    transaction_hash: Some(r.get("transaction_hash")),
                })
            },
            None => Ok(VerificationResult {
                verified: false,
                block_number: None,
                transaction_hash: None,
            })
        }
    }

    /// Fetches AI-powered extractions for a specific blockchain event.
    async fn ai_extractions(&self, ctx: &Context<'_>, event_id: String) -> async_graphql::Result<Vec<AIExtraction>> {
        let pool = ctx.data::<PgPool>().map_err(|_| Error::new("Failed to get database pool"))?;
        let event_uuid = Uuid::parse_str(&event_id).map_err(|e| Error::new(format!("Invalid event ID format: {}", e)))?;
        
        let records = sqlx::query(
            "SELECT id, extraction_type, extracted_data, confidence_score, created_at 
             FROM ai_extractions WHERE blockchain_event_id = $1"
        )
        .bind(event_uuid)
        .fetch_all(pool)
        .await
        .context("Failed to fetch AI extractions")?;
        
        use sqlx::Row;
        Ok(records.into_iter().map(|r| AIExtraction {
            id: r.get::<Uuid, _>("id").to_string(),
            extraction_type: r.get("extraction_type"),
            extracted_data: r.get("extracted_data"),
            confidence_score: r.get("confidence_score"),
            created_at: r.get::<chrono::DateTime<chrono::Utc>, _>("created_at").to_rfc3339(),
        }).collect())
    }

    /// Fetches the rate limit status for the authenticated user.
    async fn rate_limit_status(&self, ctx: &Context<'_>) -> async_graphql::Result<RateLimitStatus> { 
        let pool = ctx.data::<PgPool>().map_err(|_| Error::new("Failed to get database pool"))?; 
        let user_id = ctx.data_opt::<Uuid>().cloned().unwrap_or_else(Uuid::nil);
        
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
    
    /// Fetches global system health and queue metrics.
    async fn system_metrics(&self, ctx: &Context<'_>) -> async_graphql::Result<SystemMetrics> { 
        let pool = ctx.data::<PgPool>().map_err(|_| Error::new("Failed to get database pool"))?; 
        
        use sqlx::Row;
        let active_workers = sqlx::query(
            "SELECT COUNT(*) as count FROM worker_nodes WHERE status = 'active' AND last_heartbeat > NOW() - INTERVAL '2 minutes'"
        )
        .fetch_one(pool)
        .await?
        .get::<i64, _>("count"); 
        
        let queue_depth = sqlx::query(
            "SELECT COUNT(*) as count FROM distributed_jobs WHERE status = 'queued'"
        )
        .fetch_one(pool)
        .await?
        .get::<i64, _>("count"); 
        
        Ok(SystemMetrics { 
            active_workers, 
            queue_depth, 
        }) 
    } 

    /// Fetches listings from the data marketplace.
    async fn marketplace_listings(&self, ctx: &Context<'_>, active_only: bool, limit: i32) -> async_graphql::Result<Vec<MarketplaceListing>> { 
        let pool = ctx.data::<PgPool>().map_err(|_| Error::new("Failed to get database pool"))?; 
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
                "#
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
                "#
            )
            .bind(limit as i64)
            .fetch_all(pool)
            .await
        }
        .context("Failed to fetch marketplace listings")?; 
        
        use sqlx::Row;
        Ok(rows.into_iter().map(|r| MarketplaceListing {
            id: r.get::<Uuid, _>("id").to_string(),
            seller_id: r.get::<Uuid, _>("seller_id").to_string(),
            dataset_name: r.get("dataset_name"),
            dataset_description: r.get("dataset_description"),
            ipfs_cid: r.get("ipfs_cid"),
            price_credits: r.get("price_credits"),
            active: r.get("active"),
            sales_count: r.get("sales_count"),
            seller_rating: r.get::<Option<f64>, _>("seller_rating"),
        }).collect())
    } 

    /// Fetches purchases for the authenticated user.
    async fn marketplace_purchases(&self, ctx: &Context<'_>) -> async_graphql::Result<Vec<MarketplacePurchase>> { 
        let pool = ctx.data::<PgPool>().map_err(|_| Error::new("Failed to get database pool"))?; 
        let user_id = ctx.data_opt::<Uuid>().cloned().unwrap_or_else(Uuid::nil);
        
        let rows = sqlx::query( 
            r#" 
            SELECT id, listing_id, buyer_id, paid_amount, access_granted, purchased_at 
            FROM marketplace_purchases 
            WHERE buyer_id = $1 
            ORDER BY purchased_at DESC 
            "#
        )
        .bind(user_id)
        .fetch_all(pool)
        .await
        .context("Failed to fetch marketplace purchases")?; 
        
        use sqlx::Row;
        Ok(rows.into_iter().map(|r| MarketplacePurchase {
            id: r.get::<Uuid, _>("id").to_string(),
            listing_id: r.get::<Uuid, _>("listing_id").to_string(),
            buyer_id: r.get::<Uuid, _>("buyer_id").to_string(),
            paid_amount: r.get("paid_amount"),
            access_granted: r.get("access_granted"),
            purchased_at: r.get::<chrono::DateTime<chrono::Utc>, _>("purchased_at").to_rfc3339(),
        }).collect())
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
        let pool = ctx.data::<PgPool>().map_err(|_| Error::new("Failed to get database pool"))?;
        
        // Input Validation
        InputValidator::validate_ethereum_address(&input.contract_address)
            .map_err(|e| Error::new(format!("Security validation failed: {}", e)))?;
        
        let sanitized_chain = Sanitizer::sanitize_text(&input.chain);
        
        let job_id = Uuid::new_v4();
        
        let config = serde_json::json!({
            "job_type": "blockchain_index",
            "params": {
                "chain": sanitized_chain,
                "contract_address": input.contract_address,
                "events": input.events,
                "from_block": input.from_block,
                "to_block": input.to_block,
            }
        });
        
        sqlx::query(
            "INSERT INTO jobs (id, user_id, status, config) VALUES ($1, $2, 'queued', $3)"
        )
        .bind(job_id)
        .bind(Uuid::nil()) // Temporary: no user auth yet
        .bind(config)
        .execute(pool)
        .await
        .context("Failed to create job")?;
        
        Ok(Job {
            id: job_id.to_string(),
            status: "queued".to_string(),
            created_at: chrono::Utc::now().to_rfc3339(),
        })
    }

    /// Purchases credits using ERC-20 tokens.
    async fn purchase_credits(&self, ctx: &Context<'_>, amount: String) -> async_graphql::Result<String> {
        let pool = ctx.data::<PgPool>().map_err(|_| Error::new("Failed to get database pool"))?;
        let user_id = ctx.data_opt::<Uuid>().cloned().unwrap_or_else(Uuid::nil);
        let credit_manager = ctx.data::<CreditManager>().map_err(|_| Error::new("Credit manager not available"))?;
        
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
        
        // In a real system, we'd wait for the transaction to be confirmed and then update the balance.
        // For now, we just return the hash.
        Ok(format!("{:?}", tx_hash))
    }

    /// Creates a new marketplace listing.
    async fn create_marketplace_listing(&self, ctx: &Context<'_>, input: CreateListingInput) -> async_graphql::Result<String> { 
        let pool = ctx.data::<PgPool>().map_err(|_| Error::new("Failed to get database pool"))?; 
        let user_id = ctx.data_opt::<Uuid>().cloned().unwrap_or_else(Uuid::nil); 
        let marketplace = ctx.data::<MarketplaceClient>().map_err(|_| Error::new("Marketplace client not available"))?; 
        
        let price_u256 = U256::from(input.price_credits); 
        let tx_hash = marketplace.create_listing(&input.ipfs_cid, "", price_u256).await?; 
        
        let listing_id = Uuid::new_v4(); 
        sqlx::query( 
            "INSERT INTO marketplace_listings (id, seller_id, dataset_name, dataset_description, ipfs_cid, metadata_uri, price_credits, transaction_hash, listing_id) 
             VALUES ($1, $2, $3, $4, $5, '', $6, $7, 0)" // placeholder on-chain listing ID
        )
        .bind(listing_id)
        .bind(user_id)
        .bind(input.dataset_name)
        .bind(input.dataset_description)
        .bind(input.ipfs_cid)
        .bind(input.price_credits)
        .bind(format!("{:?}", tx_hash))
        .execute(pool)
        .await
        .context("Failed to create marketplace listing")?; 
        
        Ok(listing_id.to_string()) 
    } 
    
    /// Purchases a dataset from the marketplace.
    async fn purchase_dataset(&self, ctx: &Context<'_>, listing_id: String) -> async_graphql::Result<String> { 
        let pool = ctx.data::<PgPool>().map_err(|_| Error::new("Failed to get database pool"))?; 
        let user_id = ctx.data_opt::<Uuid>().cloned().unwrap_or_else(Uuid::nil); 
        let marketplace = ctx.data::<MarketplaceClient>().map_err(|_| Error::new("Marketplace client not available"))?; 
        
        let listing_uuid = Uuid::parse_str(&listing_id).map_err(|e| Error::new(format!("Invalid listing ID: {}", e)))?; 
        
        let row = sqlx::query( 
            "SELECT price_credits, on_chain_listing_id FROM marketplace_listings WHERE id = $1"
        )
        .bind(listing_uuid)
        .fetch_one(pool)
        .await
        .context("Listing not found")?; 
        
        use sqlx::Row;
        let price_credits: i64 = row.get("price_credits");
        let on_chain_id = U256::from(row.get::<Option<i64>, _>("on_chain_listing_id").unwrap_or(0)); 
        
        let tx_hash = marketplace.purchase_dataset(on_chain_id).await?; 
        
        let purchase_id = Uuid::new_v4(); 
        sqlx::query( 
            "INSERT INTO marketplace_purchases (id, listing_id, buyer_id, paid_amount, transaction_hash, access_granted, purchase_id) 
              VALUES ($1, $2, $3, $4, $5, true, 0)" // placeholder on-chain purchase ID
        )
        .bind(purchase_id)
        .bind(listing_uuid)
        .bind(user_id)
        .bind(price_credits)
        .bind(format!("{:?}", tx_hash))
        .execute(pool)
        .await
        .context("Failed to record marketplace purchase")?; 
        
        Ok(purchase_id.to_string()) 
    } 
}

pub struct Subscription;

#[Subscription]
impl Subscription {
    /// Streams real-time blockchain events for a specific contract.
    async fn blockchain_events<'a>(
        &self,
        ctx: &'a Context<'_>,
        contract_address: String,
    ) -> async_graphql::Result<impl Stream<Item = BlockchainEvent> + 'a> {
        let pool = ctx.data::<PgPool>().map_err(|_| Error::new("Failed to get database pool"))?.clone();
        
        Ok(tokio_stream::wrappers::IntervalStream::new(
            tokio::time::interval(Duration::from_secs(5))
        )
        .then(move |_| {
            let pool = pool.clone();
            let addr = contract_address.clone();
            async move {
                let row = sqlx::query(
                    "SELECT id, contract_address, event_name, block_number, transaction_hash, event_data, content_hash 
                     FROM blockchain_events 
                     WHERE contract_address = $1 
                     ORDER BY created_at DESC 
                     LIMIT 1"
                )
                .bind(addr)
                .fetch_optional(&pool)
                .await
                .ok()
                .flatten();

                row.map(|r| {
                    use sqlx::Row;
                    BlockchainEvent {
                        id: r.get::<Uuid, _>("id").to_string(),
                        contract_address: r.get("contract_address"),
                        event_name: r.get("event_name"),
                        block_number: r.get("block_number"),
                        transaction_hash: r.get("transaction_hash"),
                        event_data: r.get("event_data"),
                        content_hash: r.get("content_hash"),
                        ipfs_cid: r.get("ipfs_cid"),
                    }
                })
            }
        })
        .filter_map(|x| x))
    }
}

pub type AppSchema = Schema<Query, Mutation, Subscription>;

/// Builds the GraphQL schema with the provided database pool and credit manager.
pub fn build_schema(pool: PgPool, credit_manager: CreditManager, marketplace: MarketplaceClient) -> AppSchema {
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
        let database_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| "postgres://localhost/test".to_string());
        let pool = sqlx::PgPool::connect_lazy(&database_url).expect("Failed to create lazy pool");
        // Build schema manually for test since CreditManager and MarketplaceClient require RPC
        let schema = Schema::build(Query, Mutation, Subscription)
            .data(pool)
            .finish();
        assert!(schema.sdl().contains("Query"));
        assert!(schema.sdl().contains("Mutation"));
        assert!(schema.sdl().contains("Subscription"));
    }
}
