use axum::{extract::State, http::{Request, StatusCode}, middleware::Next, response::Response, body::Body}; 
use sqlx::PgPool; 
 
pub async fn check_credits( 
    State(pool): State<PgPool>, 
    req: Request<Body>, 
    next: Next, 
) -> Result<Response, StatusCode> { 
    // In a real app, this would come from an auth middleware
    // For now, we'll try to get it from extensions, or use a default for testing
    let user_id = req.extensions().get::<uuid::Uuid>().cloned()
        .unwrap_or_else(uuid::Uuid::nil);
    
    let balance = sqlx::query_scalar::<_, i64>( 
        "SELECT credit_balance FROM user_credits WHERE user_id = $1" 
    ) 
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
