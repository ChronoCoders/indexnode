use anyhow::{anyhow, Context, Result};
use futures::TryStreamExt;
use ipfs_api_backend_hyper::{IpfsApi, IpfsClient, TryFromUri};
use reqwest::multipart;
use serde::Deserialize;
use std::io::Cursor;

const PINATA_API_BASE: &str = "https://api.pinata.cloud";
const PINATA_GATEWAY: &str = "https://gateway.pinata.cloud/ipfs";

/// IPFS storage backed by either Pinata (when a JWT is configured) or a
/// self-hosted IPFS daemon. When Pinata is configured all store / pin /
/// unpin / retrieve operations go through Pinata's HTTP API and gateway,
/// giving third-party persistence. Without a JWT, the local daemon at
/// `api_url` is used and content lives only on that node.
pub struct IpfsStorage {
    backend: Backend,
}

enum Backend {
    Pinata {
        http: reqwest::Client,
        jwt: String,
    },
    Local {
        // Boxed because the hyper-backed IPFS client is ~10x the size of the
        // Pinata HTTP variant; keeping it on the heap balances the enum.
        client: Box<IpfsClient>,
    },
}

#[derive(Deserialize)]
struct PinFileResponse {
    #[serde(rename = "IpfsHash")]
    ipfs_hash: String,
}

impl IpfsStorage {
    /// Creates a new `IpfsStorage`. If `pinata_jwt` is `Some`, all operations
    /// are routed through Pinata. Otherwise they go to the local IPFS daemon
    /// at `api_url`.
    pub fn new(api_url: &str, pinata_jwt: Option<String>) -> Result<Self> {
        let backend = match pinata_jwt {
            Some(jwt) if !jwt.is_empty() => Backend::Pinata {
                http: reqwest::Client::builder()
                    .build()
                    .context("Failed to build Pinata HTTP client")?,
                jwt,
            },
            _ => {
                tracing::warn!(
                    "PINATA_JWT not set — IPFS pinning will use the local daemon only, \
                     content will not be pinned to Pinata"
                );
                Backend::Local {
                    client: Box::new(
                        IpfsClient::from_str(api_url)
                            .context("Failed to create IPFS client from URI")?,
                    ),
                }
            }
        };
        Ok(Self { backend })
    }

    /// Uploads raw bytes and returns the resulting CID. On Pinata this also
    /// pins the content as a side effect of the upload.
    pub async fn store_content(&self, data: &[u8]) -> Result<String> {
        match &self.backend {
            Backend::Pinata { http, jwt } => {
                let part = multipart::Part::bytes(data.to_vec())
                    .file_name("indexnode-payload.bin")
                    .mime_str("application/octet-stream")
                    .context("Failed to set multipart MIME type")?;
                let form = multipart::Form::new().part("file", part);

                let resp = http
                    .post(format!("{PINATA_API_BASE}/pinning/pinFileToIPFS"))
                    .bearer_auth(jwt)
                    .multipart(form)
                    .send()
                    .await
                    .context("Pinata pinFileToIPFS request failed")?;

                if !resp.status().is_success() {
                    let status = resp.status();
                    let body = resp.text().await.unwrap_or_default();
                    return Err(anyhow!("Pinata pinFileToIPFS returned {status}: {body}"));
                }

                let parsed: PinFileResponse = resp
                    .json()
                    .await
                    .context("Failed to parse Pinata pinFileToIPFS response")?;
                Ok(parsed.ipfs_hash)
            }
            Backend::Local { client } => {
                let cursor = Cursor::new(data.to_vec());
                let response = client
                    .add(cursor)
                    .await
                    .context("Failed to add content to local IPFS daemon")?;
                Ok(response.hash)
            }
        }
    }

    /// Retrieves content for a CID. On Pinata this fetches via the public
    /// gateway; locally it uses the daemon's `cat` API.
    pub async fn retrieve_content(&self, cid: &str) -> Result<Vec<u8>> {
        match &self.backend {
            Backend::Pinata { http, .. } => {
                let resp = http
                    .get(format!("{PINATA_GATEWAY}/{cid}"))
                    .send()
                    .await
                    .context("Pinata gateway request failed")?;
                if !resp.status().is_success() {
                    let status = resp.status();
                    let body = resp.text().await.unwrap_or_default();
                    return Err(anyhow!("Pinata gateway returned {status}: {body}"));
                }
                let bytes = resp
                    .bytes()
                    .await
                    .context("Failed to read Pinata gateway response body")?;
                Ok(bytes.to_vec())
            }
            Backend::Local { client } => {
                let stream = client.cat(cid);
                let data = stream
                    .map_ok(|chunk| chunk.to_vec())
                    .try_concat()
                    .await
                    .context("Failed to retrieve content from local IPFS daemon")?;
                Ok(data)
            }
        }
    }

    /// Ensures the given CID is pinned. On Pinata this calls `pinByHash` (a
    /// no-op for content already uploaded via `store_content`, useful when
    /// re-pinning an externally-produced CID). Locally it pins on the daemon.
    pub async fn pin_content(&self, cid: &str) -> Result<()> {
        match &self.backend {
            Backend::Pinata { http, jwt } => {
                let resp = http
                    .post(format!("{PINATA_API_BASE}/pinning/pinByHash"))
                    .bearer_auth(jwt)
                    .json(&serde_json::json!({ "hashToPin": cid }))
                    .send()
                    .await
                    .context("Pinata pinByHash request failed")?;
                let status = resp.status();
                if status.is_success() {
                    return Ok(());
                }
                // pinByHash returns 4xx when the CID is already pinned by this
                // account. Treat that as success — the pin invariant holds.
                let body = resp.text().await.unwrap_or_default();
                if body.contains("already pinned") {
                    return Ok(());
                }
                Err(anyhow!("Pinata pinByHash returned {status}: {body}"))
            }
            Backend::Local { client } => {
                client
                    .pin_add(cid, true)
                    .await
                    .context("Failed to pin content on local IPFS daemon")?;
                Ok(())
            }
        }
    }

    /// Removes the pin for the given CID.
    pub async fn unpin_content(&self, cid: &str) -> Result<()> {
        match &self.backend {
            Backend::Pinata { http, jwt } => {
                let resp = http
                    .delete(format!("{PINATA_API_BASE}/pinning/unpin/{cid}"))
                    .bearer_auth(jwt)
                    .send()
                    .await
                    .context("Pinata unpin request failed")?;
                if !resp.status().is_success() {
                    let status = resp.status();
                    let body = resp.text().await.unwrap_or_default();
                    return Err(anyhow!("Pinata unpin returned {status}: {body}"));
                }
                Ok(())
            }
            Backend::Local { client } => {
                client
                    .pin_rm(cid, true)
                    .await
                    .context("Failed to unpin content on local IPFS daemon")?;
                Ok(())
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn constructs_local_backend_without_jwt() {
        let storage = IpfsStorage::new("http://127.0.0.1:5001", None)
            .expect("local backend should construct without a JWT");
        assert!(matches!(storage.backend, Backend::Local { .. }));
    }

    #[test]
    fn constructs_local_backend_with_empty_jwt() {
        let storage = IpfsStorage::new("http://127.0.0.1:5001", Some(String::new()))
            .expect("empty JWT should fall back to local backend");
        assert!(matches!(storage.backend, Backend::Local { .. }));
    }

    #[test]
    fn constructs_pinata_backend_with_jwt() {
        let storage = IpfsStorage::new("http://127.0.0.1:5001", Some("test-jwt".to_string()))
            .expect("pinata backend should construct with a JWT");
        assert!(matches!(storage.backend, Backend::Pinata { .. }));
    }
}
