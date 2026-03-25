use crate::handlers;
use crate::middleware::require_auth;
use axum::{
    middleware,
    routing::{delete, get, post},
    Router,
};
use sqlx::PgPool;

#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
}

pub fn create_public_routes(pool: PgPool) -> Router {
    let state = AppState { pool: pool.clone() };
    Router::new()
        .route("/health", get(handlers::health_check))
        .route("/api/v1/auth/register", post(handlers::register))
        .route("/api/v1/auth/login", post(handlers::login))
        .route("/api/v1/auth/forgot-password", post(handlers::forgot_password))
        .route("/api/v1/auth/reset-password", post(handlers::reset_password))
        .with_state(state)
}

pub fn create_routes(pool: PgPool) -> Router {
    let state = AppState { pool };

    Router::new()
        // Profile
        .route("/api/v1/me", get(handlers::me))
        // Jobs
        .route("/api/v1/jobs", post(handlers::create_job))
        .route("/api/v1/jobs/{id}", get(handlers::get_job))
        .route("/api/v1/verify", post(handlers::verify_hash))
        // API keys
        .route(
            "/api/v1/api-keys",
            post(handlers::create_api_key).get(handlers::list_api_keys),
        )
        .route("/api/v1/api-keys/{id}", delete(handlers::delete_api_key))
        // Webhooks
        .route(
            "/api/v1/webhooks",
            post(handlers::create_webhook).get(handlers::list_webhooks),
        )
        .route("/api/v1/webhooks/{id}", delete(handlers::delete_webhook))
        .route_layer(middleware::from_fn(require_auth))
        .with_state(state)
}
