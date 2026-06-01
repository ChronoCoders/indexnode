use async_graphql::*;
use serde::{Deserialize, Serialize};

#[derive(SimpleObject, Serialize, Deserialize)]
pub struct Job {
    pub id: String,
    pub status: String,
    pub created_at: String,
}

#[derive(SimpleObject, Serialize, Deserialize)]
pub struct BlockchainEvent {
    pub id: String,
    pub contract_address: String,
    pub event_name: String,
    pub block_number: i64,
    pub transaction_hash: String,
    pub event_data: serde_json::Value,
    pub content_hash: String,
    pub ipfs_cid: Option<String>,
}

#[derive(SimpleObject)]
pub struct IpfsContentMetadata {
    pub cid: String,
    pub content_hash: String,
    pub size_bytes: i64,
    pub pinned: bool,
    pub created_at: String,
}

#[derive(InputObject)]
pub struct CreateBlockchainJobInput {
    pub chain: String,
    pub contract_address: String,
    pub events: Vec<String>,
    pub from_block: i64,
    pub to_block: Option<i64>,
    pub enable_ai_extraction: Option<bool>,
    pub extraction_schema: Option<String>,
    pub ai_token_budget: Option<i32>,
}

#[derive(SimpleObject)]
pub struct AIExtraction {
    pub id: String,
    pub extraction_type: String,
    pub extracted_data: serde_json::Value,
    pub confidence_score: Option<f64>,
    pub created_at: String,
}

#[derive(SimpleObject)]
pub struct RateLimitStatus {
    pub tier: String,
    pub quota: i32,
    pub used: i32,
    pub remaining: i32,
}

#[derive(SimpleObject)]
pub struct MarketplaceListing {
    pub id: String,
    pub seller_id: String,
    pub dataset_name: String,
    pub dataset_description: Option<String>,
    pub ipfs_cid: String,
    pub price_credits: i64,
    pub active: bool,
    pub sales_count: i32,
    pub seller_rating: Option<f64>,
}

#[derive(SimpleObject)]
pub struct MarketplacePurchase {
    pub id: String,
    pub listing_id: String,
    pub buyer_id: String,
    pub paid_amount: i64,
    pub access_granted: bool,
    pub purchased_at: String,
}

#[derive(SimpleObject)]
pub struct UserJob {
    pub id: String,
    pub job_type: String,
    pub status: String,
    pub target: Option<String>,
    pub chain: Option<String>,
    pub created_at: String,
    pub completed_at: Option<String>,
    pub error: Option<String>,
}

#[derive(SimpleObject)]
pub struct WalletInfo {
    pub wallet_address: Option<String>,
    pub credit_balance: i64,
}

#[derive(InputObject)]
pub struct CreateListingInput {
    pub dataset_name: String,
    pub dataset_description: Option<String>,
    pub ipfs_cid: String,
    pub price_credits: i64,
}
