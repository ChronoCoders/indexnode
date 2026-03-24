use crate::handlers;
use crate::middleware::require_auth;
use axum::{
    middleware,
    routing::{get, post},
    Router,
};
use sqlx::PgPool;

#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
}

pub fn create_routes(pool: PgPool) -> Router {
    let state = AppState { pool };

    let public_routes = Router::new()
        .route("/health", get(handlers::health_check))
        .route("/api/v1/auth/register", post(handlers::register))
        .route("/api/v1/auth/login", post(handlers::login));

    let protected_routes = Router::new()
        .route("/api/v1/jobs", post(handlers::create_job))
        .route("/api/v1/jobs/{id}", get(handlers::get_job))
        .route("/api/v1/verify", post(handlers::verify_hash))
        .route_layer(middleware::from_fn(require_auth));

    Router::new()
        .merge(public_routes)
        .merge(protected_routes)
        .with_state(state)
}
