use crate::handlers;
use axum::{
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

    Router::new()
        .route("/health", get(handlers::health_check))
        .route("/api/v1/auth/register", post(handlers::register))
        .route("/api/v1/auth/login", post(handlers::login))
        .route("/api/v1/jobs", post(handlers::create_job))
        .route("/api/v1/jobs/{id}", get(handlers::get_job))
        .with_state(state)
}
