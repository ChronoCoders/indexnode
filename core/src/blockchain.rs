use anyhow::{Context, Result};
use ethers::prelude::*;
use serde::{Deserialize, Serialize};
use std::sync::Arc;

/// Client for interacting with blockchain RPC nodes.
pub struct BlockchainClient {
    provider: Arc<Provider<Ws>>,
}

/// Filter parameters for blockchain event indexing.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventFilter {
    /// The smart contract address to monitor.
    pub contract_address: Address,
    /// The signature of the event to filter (e.g., "Transfer(address,address,uint256)").
    pub event_signature: String,
    /// The starting block number for the filter.
    pub from_block: u64,
    /// The ending block number for the filter.
    pub to_block: u64,
}

/// Represents an indexed blockchain event.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlockchainEvent {
    /// The name of the blockchain (e.g., "ethereum").
    pub chain: String,
    /// The address of the contract that emitted the event.
    pub contract_address: String,
    /// The name/signature of the event.
    pub event_name: String,
    /// The block number where the event was emitted.
    pub block_number: u64,
    /// The hash of the transaction that emitted the event.
    pub transaction_hash: String,
    /// The raw data of the event as a JSON value.
    pub event_data: serde_json::Value,
    /// A cryptographic hash of the event content for integrity verification.
    pub content_hash: String,
}

impl BlockchainClient {
    /// Creates a new `BlockchainClient` connected to the specified RPC URL.
    pub async fn new(rpc_url: &str) -> Result<Self> {
        let provider = Provider::<Ws>::connect(rpc_url)
            .await
            .context("Failed to connect to blockchain RPC")?;
        Ok(Self {
            provider: Arc::new(provider),
        })
    }

    /// Fetches events from the blockchain based on the provided filter.
    pub async fn get_events(&self, filter: EventFilter) -> Result<Vec<BlockchainEvent>> {
        let ethers_filter = ethers::types::Filter::new()
            .address(filter.contract_address)
            .from_block(filter.from_block)
            .to_block(filter.to_block)
            .event(&filter.event_signature);

        let logs = self
            .provider
            .get_logs(&ethers_filter)
            .await
            .context("Failed to fetch logs from provider")?;

        let mut events = Vec::new();
        for log in logs {
            let event = BlockchainEvent {
                chain: "ethereum".to_string(), // Default for now, can be parameterized
                contract_address: format!("{:?}", log.address),
                event_name: filter.event_signature.clone(),
                block_number: log.block_number.context("Missing block number")?.as_u64(),
                transaction_hash: format!("{:?}", log.transaction_hash.context("Missing tx hash")?),
                event_data: serde_json::to_value(&log.data).unwrap_or(serde_json::Value::Null),
                content_hash: "".to_string(), // Will be populated by merkle hashing logic
            };
            events.push(event);
        }

        Ok(events)
    }

    /// Returns the latest block number from the connected blockchain.
    pub async fn get_latest_block(&self) -> Result<u64> {
        let block_number = self
            .provider
            .get_block_number()
            .await
            .context("Failed to get latest block number")?;
        Ok(block_number.as_u64())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_rpc_connection() {
        // Use a public Sepolia RPC for testing if available, or skip if not in CI
        let rpc_url = "wss://ethereum-sepolia-rpc.publicnode.com";
        let client = BlockchainClient::new(rpc_url).await;
        if let Ok(client) = client {
            let block = client.get_latest_block().await;
            assert!(block.is_ok());
        }
    }

    #[tokio::test]
    async fn test_event_filtering() {
        // USDC on Sepolia: 0x1c7D4B196Cb023240166624b9c5291532634a66a
        // Transfer(address,address,uint256)
        let rpc_url = "wss://ethereum-sepolia-rpc.publicnode.com";
        let client = BlockchainClient::new(rpc_url).await;
        if let Ok(client) = client {
            let address: Address = "0x1c7D4B196Cb023240166624b9c5291532634a66a".parse().unwrap();
            let latest = client.get_latest_block().await.unwrap();
            let filter = EventFilter {
                contract_address: address,
                event_signature: "Transfer(address,address,uint256)".to_string(),
                from_block: latest - 100,
                to_block: latest,
            };
            let events = client.get_events(filter).await;
            assert!(events.is_ok());
        }
    }
}
