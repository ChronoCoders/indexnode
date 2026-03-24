use anyhow::Context;
use axum::http::Request;
use governor::middleware::NoOpMiddleware;
use std::sync::Arc;
use tower_governor::{
    governor::GovernorConfigBuilder, key_extractor::KeyExtractor, GovernorError, GovernorLayer,
};
use uuid::Uuid;

pub fn create_global_rate_limiter() -> anyhow::Result<
    GovernorLayer<
        tower_governor::key_extractor::SmartIpKeyExtractor,
        NoOpMiddleware,
        axum::body::Body,
    >,
> {
    let config = GovernorConfigBuilder::default()
        .key_extractor(tower_governor::key_extractor::SmartIpKeyExtractor)
        .per_second(10)
        .burst_size(20)
        .finish()
        .context("Failed to build rate limiter config")?;

    Ok(GovernorLayer::new(Arc::new(config)))
}

/// Key extractor that uses the authenticated user ID for per-user rate limiting.
/// Requires `require_auth` to have already inserted a `Uuid` into request extensions.
#[derive(Clone)]
pub struct UserIdKeyExtractor;

impl KeyExtractor for UserIdKeyExtractor {
    type Key = String;

    fn extract<T>(&self, req: &Request<T>) -> Result<Self::Key, GovernorError> {
        req.extensions()
            .get::<Uuid>()
            .map(|id| id.to_string())
            .ok_or(GovernorError::UnableToExtractKey)
    }
}

pub fn create_per_user_rate_limiter(
) -> anyhow::Result<GovernorLayer<UserIdKeyExtractor, NoOpMiddleware, axum::body::Body>> {
    let config = GovernorConfigBuilder::default()
        .key_extractor(UserIdKeyExtractor)
        .per_second(5)
        .burst_size(20)
        .finish()
        .context("Failed to build per-user rate limiter config")?;

    Ok(GovernorLayer::new(Arc::new(config)))
}
