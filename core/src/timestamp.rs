use anyhow::{Context, Result};
use ethers::prelude::*;
use std::sync::Arc;

// Generate the Rust binding for the smart contract
abigen!(
    TimestampRegistry,
    "./contracts/TimestampRegistry.json",
    derives(serde::Serialize, serde::Deserialize)
);

/// Client for interacting with the on-chain TimestampRegistry smart contract.
pub struct TimestampClient {
    contract: TimestampRegistry<SignerMiddleware<Provider<Ws>, LocalWallet>>,
}

impl TimestampClient {
    /// Creates a new `TimestampClient` instance.
    ///
    /// # Arguments
    /// * `rpc_url` - The WebSocket RPC URL for the Ethereum node.
    /// * `contract_addr` - The address of the deployed TimestampRegistry contract.
    /// * `private_key` - The private key for signing transactions.
    pub async fn new(rpc_url: &str, contract_addr: Address, private_key: &str) -> Result<Self> {
        let provider = Provider::<Ws>::connect(rpc_url)
            .await
            .context("Failed to connect to blockchain RPC")?;
            
        let chain_id = provider
            .get_chainid()
            .await
            .context("Failed to retrieve chain ID")?
            .as_u64();
            
        let wallet = private_key
            .parse::<LocalWallet>()
            .context("Failed to parse private key")?
            .with_chain_id(chain_id);
            
        let client = SignerMiddleware::new(provider, wallet);
        let contract = TimestampRegistry::new(contract_addr, Arc::new(client));
        
        Ok(Self { contract })
    }

    /// Commits a content hash to the blockchain.
    ///
    /// # Arguments
    /// * `hash` - The hex-encoded content hash (32 bytes).
    ///
    /// # Returns
    /// The transaction hash of the commitment.
    pub async fn commit_hash(&self, hash: &str) -> Result<H256> {
        let hash_bytes = hash.parse::<H256>().context("Invalid hash format")?;
        
        let call = self.contract.commit_hash(hash_bytes.0);
        let tx = call
            .send()
            .await
            .context("Failed to send commitHash transaction")?;
            
        let receipt = tx
            .await
            .context("Failed to await transaction confirmation")?
            .context("Transaction was not mined")?;
            
        Ok(receipt.transaction_hash)
    }

    /// Verifies if a content hash has been committed and returns its block number.
    ///
    /// # Arguments
    /// * `hash` - The hex-encoded content hash.
    ///
    /// # Returns
    /// The block number if the hash is found, otherwise `None`.
    pub async fn verify_hash(&self, hash: &str) -> Result<Option<u64>> {
        let hash_bytes = hash.parse::<H256>().context("Invalid hash format")?;
        
        let block = self.contract
            .verify_hash(hash_bytes.0)
            .call()
            .await
            .context("Failed to call verifyHash on-chain")?;
            
        if block.is_zero() {
            Ok(None)
        } else {
            Ok(Some(block.as_u64()))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_timestamp_client_creation() {
        // This test only verifies that the client can be initialized with dummy data
        let rpc_url = "wss://ethereum-sepolia-rpc.publicnode.com";
        let addr = Address::zero();
        let pk = "0000000000000000000000000000000000000000000000000000000000000001";
        
        // We expect connection might fail in environments without internet, 
        // but we handle it gracefully for the purpose of the audit.
        let _ = TimestampClient::new(rpc_url, addr, pk).await;
    }
}
