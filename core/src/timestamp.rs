use anyhow::{Context, Result};
use ethers::prelude::*;
use std::sync::Arc;

abigen!(
    TimestampRegistry,
    "./contracts/TimestampRegistry.json",
    derives(serde::Serialize, serde::Deserialize)
);

pub struct TimestampClient {
    contract: TimestampRegistry<SignerMiddleware<Provider<Ws>, LocalWallet>>,
}

impl TimestampClient {
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

    pub async fn commit_hash(&self, hash: &str) -> Result<(H256, u64)> {
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

        let block_number = receipt
            .block_number
            .context("Missing block number in receipt")?
            .as_u64();

        Ok((receipt.transaction_hash, block_number))
    }

    pub async fn verify_hash(&self, hash: &str) -> Result<Option<u64>> {
        let hash_bytes = hash.parse::<H256>().context("Invalid hash format")?;

        let block = self
            .contract
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
        let rpc_url = "wss://ethereum-sepolia-rpc.publicnode.com";
        let addr = Address::zero();
        let pk = "0000000000000000000000000000000000000000000000000000000000000001";

        let _ = TimestampClient::new(rpc_url, addr, pk).await;
    }
}
