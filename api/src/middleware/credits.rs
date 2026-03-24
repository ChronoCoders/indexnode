use axum::{
    body::Body,
    extract::State,
    http::{Request, StatusCode},
    middleware::Next,
    response::Response,
};
use sqlx::PgPool;

pub async fn check_credits(
    State(pool): State<PgPool>,
    req: Request<Body>,
    next: Next,
) -> Result<Response, StatusCode> {
    // Require the user to be authenticated. The `require_auth` middleware must
    // run before this middleware and insert the user ID into extensions.
    let user_id = req
        .extensions()
        .get::<uuid::Uuid>()
        .cloned()
        .ok_or(StatusCode::UNAUTHORIZED)?;

    let balance =
        sqlx::query_scalar::<_, i64>("SELECT credit_balance FROM user_credits WHERE user_id = $1")
            .bind(user_id)
            .fetch_optional(&pool)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
            .unwrap_or(0);

    if balance < 50 {
        return Err(StatusCode::PAYMENT_REQUIRED);
    }

    Ok(next.run(req).await)
}
