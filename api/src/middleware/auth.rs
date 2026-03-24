use crate::auth;
use axum::{extract::Request, http::StatusCode, middleware::Next, response::Response};

/// Extracts and validates a Bearer JWT from the `Authorization` header.
/// On success, inserts the authenticated `Uuid` user ID and `UserRole` into request
/// extensions so downstream handlers and GraphQL resolvers can access them.
pub async fn require_auth(mut req: Request, next: Next) -> Result<Response, StatusCode> {
    let token = req
        .headers()
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .ok_or(StatusCode::UNAUTHORIZED)?;

    let info = auth::validate_token(token).map_err(|e| {
        tracing::warn!("Authentication failed: {}", e);
        StatusCode::UNAUTHORIZED
    })?;

    req.extensions_mut().insert(info.user_id);
    req.extensions_mut().insert(info.role);
    Ok(next.run(req).await)
}
