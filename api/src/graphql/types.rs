use async_graphql::*;
use serde::{Deserialize, Serialize};

/// Represents a background job in the system.
#[derive(SimpleObject, Serialize, Deserialize)]
pub struct Job {
    /// Unique identifier for the job.
    pub id: String,
    /// Current status of the job (e.g., "pending", "completed").
    pub status: String,
    /// RFC3339 formatted timestamp of when the job was created.
    pub created_at: String,
}

/// Represents an event indexed from a blockchain smart contract.
#[derive(SimpleObject, Serialize, Deserialize)]
pub struct BlockchainEvent {
    /// Unique identifier for the event record.
    pub id: String,
    /// The smart contract address that emitted the event.
    pub contract_address: String,
    /// The signature or name of the event.
    pub event_name: String,
    /// The block number where the event was emitted.
    pub block_number: i64,
    /// The hash of the transaction that emitted the event.
    pub transaction_hash: String,
    /// JSON data containing event parameters.
    pub event_data: serde_json::Value,
    /// A cryptographic hash of the event content for integrity verification.
    pub content_hash: String,
    /// The IPFS Content Identifier (CID) where the event data is stored.
    pub ipfs_cid: Option<String>,
}

/// Metadata for content stored on IPFS.
#[derive(SimpleObject)]
pub struct IpfsContentMetadata {
    /// The Content Identifier (CID) of the data.
    pub cid: String,
    /// A cryptographic hash of the content.
    pub content_hash: String,
    /// The size of the content in bytes.
    pub size_bytes: i64,
    /// Whether the content is pinned on the IPFS node.
    pub pinned: bool,
    /// RFC3339 formatted timestamp of when the metadata was recorded.
    pub created_at: String,
}

/// Input for creating a new blockchain indexing job.
#[derive(InputObject)]
pub struct CreateBlockchainJobInput {
    /// The blockchain network (e.g., "ethereum").
    pub chain: String,
    /// The address of the smart contract to index.
    pub contract_address: String,
    /// List of event signatures to monitor.
    pub events: Vec<String>,
    /// The starting block number for indexing.
    pub from_block: i64,
    /// Optional ending block number for indexing.
    pub to_block: Option<i64>,
}

/// Result of a content hash verification against the blockchain.
#[derive(SimpleObject)]
pub struct VerificationResult {
    /// Whether the hash has been verified on-chain.
    pub verified: bool,
    /// The block number where the hash was committed, if verified.
    pub block_number: Option<i64>,
    /// The transaction hash of the commitment, if verified.
    pub transaction_hash: Option<String>,
}

/// Represents an AI-powered extraction from a blockchain event.
#[derive(SimpleObject)]
pub struct AIExtraction {
    /// Unique identifier for the extraction.
    pub id: String,
    /// The type of extraction (e.g., "structured", "summary", "classification").
    pub extraction_type: String,
    /// The extracted data in JSON format.
    pub extracted_data: serde_json::Value,
    /// Optional confidence score from the AI model.
    pub confidence_score: Option<f64>,
    /// RFC3339 formatted timestamp of when the extraction was performed.
    pub created_at: String,
}

/// Current rate limit status for a user.
#[derive(SimpleObject)] 
pub struct RateLimitStatus { 
    /// The user's current rate limit tier (e.g., "free", "premium").
    pub tier: String, 
    /// Total request quota for the current period.
    pub quota: i32, 
    /// Number of requests used in the current period.
    pub used: i32, 
    /// Number of requests remaining in the current period.
    pub remaining: i32, 
} 

/// Global system health and queue metrics.
#[derive(SimpleObject)] 
pub struct SystemMetrics { 
    /// Number of currently active worker nodes.
    pub active_workers: i64, 
    /// Number of jobs waiting in the distributed queue.
    pub queue_depth: i64, 
} 

/// A listing in the data marketplace.
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
 
/// A purchase record in the data marketplace.
#[derive(SimpleObject)] 
pub struct MarketplacePurchase { 
    pub id: String, 
    pub listing_id: String, 
    pub buyer_id: String, 
    pub paid_amount: i64, 
    pub access_granted: bool, 
    pub purchased_at: String, 
} 
 
/// Input for creating a new marketplace listing.
#[derive(InputObject)] 
pub struct CreateListingInput { 
    pub dataset_name: String, 
    pub dataset_description: Option<String>, 
    pub ipfs_cid: String, 
    pub price_credits: i64, 
} 
