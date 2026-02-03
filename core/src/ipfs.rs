use anyhow::{Context, Result};
use futures::TryStreamExt;
use ipfs_api_backend_hyper::{IpfsApi, IpfsClient, TryFromUri};
use std::io::Cursor;

/// Client for interacting with IPFS storage and pinning services like Pinata.
pub struct IpfsStorage {
    client: IpfsClient,
    #[allow(dead_code)]
    pinata_jwt: Option<String>,
}

impl IpfsStorage {
    /// Creates a new `IpfsStorage` instance.
    /// 
    /// # Arguments
    /// * `api_url` - The URL of the IPFS API (e.g., "http://127.0.0.1:5001").
    /// * `pinata_jwt` - Optional JWT for Pinata authentication.
    pub fn new(api_url: &str, pinata_jwt: Option<String>) -> Result<Self> {
        let client = IpfsClient::from_str(api_url)
            .context("Failed to create IPFS client from URI")?;
        Ok(Self { client, pinata_jwt })
    }

    /// Stores raw binary content to IPFS and returns its Content Identifier (CID).
    pub async fn store_content(&self, data: &[u8]) -> Result<String> {
        let cursor = Cursor::new(data.to_vec());
        let response = self.client
            .add(cursor)
            .await
            .context("Failed to add content to IPFS")?;
        Ok(response.hash)
    }

    /// Retrieves content from IPFS by its CID.
    pub async fn retrieve_content(&self, cid: &str) -> Result<Vec<u8>> {
        let stream = self.client.cat(cid);
        let data = stream
            .map_ok(|chunk| chunk.to_vec())
            .try_concat()
            .await
            .context("Failed to retrieve content from IPFS")?;
        Ok(data)
    }

    /// Pins content to the local IPFS node.
    pub async fn pin_content(&self, cid: &str) -> Result<()> {
        self.client
            .pin_add(cid, true)
            .await
            .context("Failed to pin content in IPFS")?;
        Ok(())
    }

    /// Removes content from the local IPFS node's pin set.
    pub async fn unpin_content(&self, cid: &str) -> Result<()> {
        self.client
            .pin_rm(cid, true)
            .await
            .context("Failed to unpin content from IPFS")?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_ipfs_storage_init() {
        // Just verify the client can be initialized
        let storage = IpfsStorage::new("http://127.0.0.1:5001", None);
        assert!(storage.is_ok());
    }
}
