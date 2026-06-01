use anyhow::{Context, Result};
use regex::Regex;
use std::net::{IpAddr, Ipv4Addr, Ipv6Addr};
use url::{Host, Url};

pub struct InputValidator;

impl InputValidator {
    pub fn validate_ethereum_address(addr: &str) -> Result<()> {
        let re = Regex::new(r"^0x[a-fA-F0-9]{40}$").context("Failed to compile regex")?;
        if !re.is_match(addr) {
            anyhow::bail!("Invalid Ethereum address format");
        }
        Ok(())
    }

    pub fn validate_ipfs_cid(cid: &str) -> Result<()> {
        if cid.is_empty() || cid.len() > 100 {
            anyhow::bail!("Invalid IPFS CID length");
        }
        if !cid.starts_with("Qm") && !cid.starts_with("bafy") {
            anyhow::bail!("Invalid IPFS CID format");
        }
        Ok(())
    }

    pub async fn validate_url(url: &str) -> Result<()> {
        let parsed = Url::parse(url).context("Invalid URL format")?;
        if parsed.scheme() != "http" && parsed.scheme() != "https" {
            anyhow::bail!("Only HTTP(S) URLs allowed");
        }
        match parsed.host() {
            None => anyhow::bail!("URL has no host"),
            Some(Host::Ipv4(addr)) => reject_private_ipv4(addr)?,
            Some(Host::Ipv6(addr)) => reject_private_ipv6(addr)?,
            Some(Host::Domain(host)) => {
                let port = parsed.port_or_known_default().unwrap_or(80);
                let addrs = tokio::net::lookup_host((host, port))
                    .await
                    .context("Failed to resolve host")?;
                for sock_addr in addrs {
                    match sock_addr.ip() {
                        IpAddr::V4(v4) => reject_private_ipv4(v4)?,
                        IpAddr::V6(v6) => reject_private_ipv6(v6)?,
                    }
                }
            }
        }
        Ok(())
    }

    pub fn validate_string_length(s: &str, min: usize, max: usize, field: &str) -> Result<()> {
        if s.len() < min {
            anyhow::bail!("{} must be at least {} characters", field, min);
        }
        if s.len() > max {
            anyhow::bail!("{} must not exceed {} characters", field, max);
        }
        Ok(())
    }

    pub fn validate_numeric_range<T: PartialOrd + std::fmt::Display>(
        value: T,
        min: T,
        max: T,
        field: &str,
    ) -> Result<()> {
        if value < min || value > max {
            anyhow::bail!("{} must be between {} and {}", field, min, max);
        }
        Ok(())
    }
}

fn reject_private_ipv4(addr: Ipv4Addr) -> Result<()> {
    if addr.is_loopback()
        || addr.is_private()
        || addr.is_link_local()
        || addr.is_unspecified()
        || addr.is_broadcast()
    {
        anyhow::bail!("Private/reserved IP addresses not allowed");
    }
    Ok(())
}

fn reject_private_ipv6(addr: Ipv6Addr) -> Result<()> {
    if addr.is_loopback()
        || addr.is_unspecified()
    {
        anyhow::bail!("Private/reserved IP addresses not allowed");
    }
    let seg = addr.segments();
    if (seg[0] & 0xfe00) == 0xfc00 {
        anyhow::bail!("Private/reserved IP addresses not allowed");
    }
    if (seg[0] & 0xffc0) == 0xfe80 {
        anyhow::bail!("Private/reserved IP addresses not allowed");
    }
    Ok(())
}
