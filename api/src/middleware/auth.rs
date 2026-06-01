use crate::auth;
use axum::{extract::Request, http::StatusCode, middleware::Next, response::Response};
use sqlx::PgPool;

pub async fn require_auth(mut req: Request, next: Next) -> Result<Response, StatusCode> {
    let token = extract_token(&req).ok_or(StatusCode::UNAUTHORIZED)?;

    if token.starts_with("ink_") {
        let pool = req
            .extensions()
            .get::<PgPool>()
            .ok_or(StatusCode::INTERNAL_SERVER_ERROR)?
            .clone();

        use sha2::{Digest, Sha256};
        let key_hash = hex::encode(Sha256::digest(token.as_bytes()));

        use sqlx::Row;
        let row = sqlx::query(
            "SELECT user_id FROM api_keys
             WHERE key_hash = $1
               AND (expires_at IS NULL OR expires_at > now())",
        )
        .bind(&key_hash)
        .fetch_optional(&pool)
        .await
        .map_err(|e| {
            tracing::error!("API key lookup error: {:?}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?
        .ok_or(StatusCode::UNAUTHORIZED)?;

        let user_id: uuid::Uuid = row.get("user_id");

        let pool_clone = pool.clone();
        let hash_clone = key_hash.clone();
        tokio::spawn(async move {
            if let Err(e) =
                sqlx::query("UPDATE api_keys SET last_used_at = now() WHERE key_hash = $1")
                    .bind(&hash_clone)
                    .execute(&pool_clone)
                    .await
            {
                tracing::warn!("Failed to update api_key last_used_at: {:?}", e);
            }
        });

        req.extensions_mut().insert(user_id);
        req.extensions_mut().insert(crate::auth::UserRole::User);
    } else {
        let info = auth::validate_token(&token).map_err(|e| {
            tracing::warn!("Authentication failed: {}", e);
            StatusCode::UNAUTHORIZED
        })?;

        req.extensions_mut().insert(info.user_id);
        req.extensions_mut().insert(info.role);
    }

    Ok(next.run(req).await)
}

fn extract_token(req: &Request) -> Option<String> {
    if let Some(token) = extract_bearer(req) {
        return Some(token);
    }
    extract_cookie(req, "auth_token")
}

fn extract_bearer(req: &Request) -> Option<String> {
    req.headers()
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .map(|v| v.to_owned())
}

fn extract_cookie(req: &Request, name: &str) -> Option<String> {
    let header = req.headers().get("cookie")?.to_str().ok()?;
    for part in header.split(';') {
        let p = part.trim();
        if let Some(value) = p.strip_prefix(&format!("{}=", name)) {
            return Some(value.to_string());
        }
    }
    None
}
