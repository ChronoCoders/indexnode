use anyhow::{Context, Result};
use ethers::prelude::*;
use serde::{Deserialize, Serialize};
use std::sync::Arc;

use crate::merkle::hash_content;

pub struct BlockchainClient {
    provider: Arc<Provider<Ws>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventFilter {
    pub chain: String,
    pub contract_address: Address,
    pub event_signature: String,
    pub from_block: u64,
    pub to_block: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlockchainEvent {
    pub chain: String,
    pub contract_address: String,
    pub event_name: String,
    pub block_number: u64,
    pub transaction_hash: String,
    pub event_data: serde_json::Value,
    pub content_hash: String,
}

impl BlockchainClient {
    pub async fn new(rpc_url: &str) -> Result<Self> {
        let provider = Provider::<Ws>::connect(rpc_url)
            .await
            .context("Failed to connect to blockchain RPC")?;
        Ok(Self {
            provider: Arc::new(provider),
        })
    }

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
                chain: filter.chain.clone(),
                contract_address: format!("{:?}", log.address),
                event_name: filter.event_signature.clone(),
                block_number: log.block_number.context("Missing block number")?.as_u64(),
                transaction_hash: format!("{:?}", log.transaction_hash.context("Missing tx hash")?),
                event_data: serde_json::to_value(&log.data).unwrap_or(serde_json::Value::Null),
                content_hash: hash_content(log.data.as_ref()),
            };
            events.push(event);
        }

        Ok(events)
    }

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
        let rpc_url = "wss://ethereum-sepolia-rpc.publicnode.com";
        let client = BlockchainClient::new(rpc_url).await;
        if let Ok(client) = client {
            let block = client.get_latest_block().await;
            assert!(block.is_ok());
        }
    }

    #[tokio::test]
    async fn test_event_filtering() {
        let rpc_url = "wss://ethereum-sepolia-rpc.publicnode.com";
        let client = BlockchainClient::new(rpc_url).await;
        if let Ok(client) = client {
            let address: Address = "0x1c7D4B196Cb023240166624b9c5291532634a66a"
                .parse()
                .expect("Hardcoded USDC address is valid; qed");
            let latest = client
                .get_latest_block()
                .await
                .expect("Failed to get latest block in test");
            let filter = EventFilter {
                chain: "ethereum".to_string(),
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
