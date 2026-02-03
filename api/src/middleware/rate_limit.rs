use governor::middleware::NoOpMiddleware;
use governor::{Quota, RateLimiter as GovRateLimiter}; 
use std::num::NonZeroU32; 
use std::sync::Arc; 
use tower_governor::{governor::GovernorConfigBuilder, GovernorLayer}; 
use axum::http::Request; 
use std::net::IpAddr; 

pub fn create_global_rate_limiter() -> GovernorLayer<tower_governor::key_extractor::SmartIpKeyExtractor, NoOpMiddleware, axum::body::Body> { 
    let config = GovernorConfigBuilder::default() 
        .key_extractor(tower_governor::key_extractor::SmartIpKeyExtractor)
        .per_second(10) 
        .burst_size(20) 
        .finish() 
        .expect("Failed to build rate limiter config"); 
    
    GovernorLayer::new(Arc::new(config))
} 

#[allow(dead_code)]
pub fn create_per_user_rate_limiter() -> anyhow::Result<Arc<GovRateLimiter<String, governor::state::keyed::DashMapStateStore<String>, governor::clock::DefaultClock>>> { 
    let quota = Quota::per_minute(NonZeroU32::new(100).unwrap()); 
    Ok(Arc::new(GovRateLimiter::keyed(quota))) 
} 

#[allow(dead_code)]
pub fn extract_ip<B>(req: &Request<B>) -> Option<IpAddr> { 
    req.headers() 
        .get("x-forwarded-for") 
        .and_then(|v| v.to_str().ok()) 
        .and_then(|s| s.split(',').next()) 
        .and_then(|ip| ip.trim().parse().ok()) 
        .or_else(|| { 
            req.extensions() 
                .get::<std::net::SocketAddr>() 
                .map(|addr| addr.ip()) 
        }) 
} 
