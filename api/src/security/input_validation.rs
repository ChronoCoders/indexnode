use anyhow::{Context, Result}; 
use regex::Regex; 
use url::Url;
 
#[allow(dead_code)]
pub struct InputValidator; 
 
impl InputValidator { 
    pub fn validate_ethereum_address(addr: &str) -> Result<()> { 
        let re = Regex::new(r"^0x[a-fA-F0-9]{40}$") 
            .context("Failed to compile regex")?; 
        
        if !re.is_match(addr) { 
            anyhow::bail!("Invalid Ethereum address format"); 
        } 
        Ok(()) 
    } 
 
    #[allow(dead_code)]
    pub fn validate_ipfs_cid(cid: &str) -> Result<()> { 
        if cid.is_empty() || cid.len() > 100 { 
            anyhow::bail!("Invalid IPFS CID length"); 
        } 
        
        if !cid.starts_with("Qm") && !cid.starts_with("bafy") { 
            anyhow::bail!("Invalid IPFS CID format"); 
        } 
        Ok(()) 
    } 
 
    #[allow(dead_code)]
    pub fn validate_url(url: &str) -> Result<()> { 
        let parsed = Url::parse(url) 
            .context("Invalid URL format")?; 
        
        let scheme = parsed.scheme(); 
        if scheme != "http" && scheme != "https" { 
            anyhow::bail!("Only HTTP(S) URLs allowed"); 
        } 
        
        if let Some(host) = parsed.host_str() { 
            if host == "localhost" 
                || host == "127.0.0.1" 
                || host.starts_with("10.") 
                || host.starts_with("172.") 
                || host.starts_with("192.168.") 
            { 
                anyhow::bail!("Private network URLs not allowed"); 
            } 
        } 
        
        Ok(()) 
    } 
 
    #[allow(dead_code)]
    pub fn validate_string_length(s: &str, min: usize, max: usize, field: &str) -> Result<()> { 
        if s.len() < min { 
            anyhow::bail!("{} must be at least {} characters", field, min); 
        } 
        if s.len() > max { 
            anyhow::bail!("{} must not exceed {} characters", field, max); 
        } 
        Ok(()) 
    } 
 
    #[allow(dead_code)]
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
