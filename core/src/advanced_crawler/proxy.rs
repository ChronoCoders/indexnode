use anyhow::{Context, Result}; 
use std::collections::VecDeque; 
use tokio::sync::RwLock; 
  
#[derive(Debug, Clone)] 
pub struct Proxy { 
    pub host: String, 
    pub port: u16, 
    pub username: Option<String>, 
    pub password: Option<String>, 
} 
  
impl Proxy { 
    pub fn to_url(&self) -> String { 
        if let (Some(user), Some(pass)) = (&self.username, &self.password) { 
            format!("http://{}:{}@{}:{}", user, pass, self.host, self.port) 
        } else { 
            format!("http://{}:{}", self.host, self.port) 
        } 
    } 
} 
  
pub struct ProxyManager { 
    proxies: RwLock<VecDeque<Proxy>>, 
} 
  
impl ProxyManager { 
    pub fn new(proxies: Vec<Proxy>) -> Self { 
        Self { 
            proxies: RwLock::new(VecDeque::from(proxies)), 
        } 
    } 
  
    pub async fn get_proxy(&self) -> Result<Proxy> { 
        let mut proxies = self.proxies.write().await; 
          
        let proxy = proxies.pop_front() 
            .context("No proxies available")?; 
          
        proxies.push_back(proxy.clone()); 
          
        Ok(proxy) 
    } 
  
    pub async fn mark_failed(&self, proxy: &Proxy) -> Result<()> { 
        let mut proxies = self.proxies.write().await; 
        proxies.retain(|p| p.host != proxy.host || p.port != proxy.port); 
        Ok(()) 
    } 
  
    pub async fn count(&self) -> usize { 
        self.proxies.read().await.len() 
    } 
} 
