use crate::{
    auth, db,
    models::User,
    routes::AppState,
    security::{InputValidator, SecurityConfig},
};
use axum::{
    extract::{Extension, Path, State},
    http::StatusCode,
    Json,
};
use chrono::Utc;
use indexnode_core::{HttpCrawlParams, Job, JobConfig, JobParams, JobQueue, JobStatus, JobType};
use rand_core::{OsRng, RngCore};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Serialize)]
pub struct HealthResponse {
    status: String,
    timestamp: String,
}

pub async fn health_check() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok".to_string(),
        timestamp: Utc::now().to_rfc3339(),
    })
}

#[derive(Deserialize)]
pub struct RegisterRequest {
    email: String,
    password: String,
}

#[derive(Serialize)]
pub struct AuthResponse {
    token: String,
    user_id: String,
}

pub async fn register(
    State(state): State<AppState>,
    Json(req): Json<RegisterRequest>,
) -> Result<Json<AuthResponse>, StatusCode> {
    // Validate password strength before hashing.
    SecurityConfig::default()
        .validate_password(&req.password)
        .map_err(|e| {
            tracing::warn!("Weak password on registration: {}", e);
            StatusCode::UNPROCESSABLE_ENTITY
        })?;

    let user_id = Uuid::new_v4();
    let password_hash = bcrypt::hash(&req.password, bcrypt::DEFAULT_COST).map_err(|e| {
        tracing::error!("Bcrypt error: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    sqlx::query(
        "INSERT INTO users (id, email, password_hash, role, created_at) VALUES ($1, $2, $3, 'user', $4)",
    )
    .bind(user_id)
    .bind(&req.email)
    .bind(&password_hash)
    .bind(Utc::now())
    .execute(&state.pool)
    .await
    .map_err(|e| {
        tracing::error!("Database insert error: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let token = auth::create_token(user_id, "user").map_err(|e| {
        tracing::error!("Token creation error: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    db::audit_log(
        &state.pool,
        Some(user_id),
        "register",
        "user",
        Some(&user_id.to_string()),
        Some(serde_json::json!({"email": req.email})),
    )
    .await;

    Ok(Json(AuthResponse {
        token,
        user_id: user_id.to_string(),
    }))
}

#[derive(Deserialize)]
pub struct LoginRequest {
    email: String,
    password: String,
}

pub async fn login(
    State(state): State<AppState>,
    Json(req): Json<LoginRequest>,
) -> Result<Json<AuthResponse>, StatusCode> {
    let user = sqlx::query_as::<_, User>(
        "SELECT id, email, password_hash, role, created_at FROM users WHERE email = $1",
    )
    .bind(&req.email)
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| {
        tracing::error!("Database query error: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?
    .ok_or(StatusCode::UNAUTHORIZED)?;

    let valid = bcrypt::verify(&req.password, &user.password_hash).map_err(|e| {
        tracing::error!("Bcrypt verify error: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    if !valid {
        db::audit_log(
            &state.pool,
            Some(user.id),
            "login_failed",
            "user",
            Some(&user.id.to_string()),
            Some(serde_json::json!({"email": req.email, "reason": "invalid_password"})),
        )
        .await;
        return Err(StatusCode::UNAUTHORIZED);
    }

    let token = auth::create_token(user.id, &user.role).map_err(|e| {
        tracing::error!("Token creation error: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    db::audit_log(
        &state.pool,
        Some(user.id),
        "login",
        "user",
        Some(&user.id.to_string()),
        None,
    )
    .await;

    Ok(Json(AuthResponse {
        token,
        user_id: user.id.to_string(),
    }))
}

#[derive(Deserialize)]
pub struct CreateJobRequest {
    pub job_type: JobType,
    /// Raw JSON params; validated and converted to typed JobParams during handler.
    pub params: serde_json::Value,
}

#[derive(Serialize)]
pub struct JobResponse {
    id: String,
    status: String,
}

pub async fn create_job(
    State(state): State<AppState>,
    Extension(user_id): Extension<Uuid>,
    Json(req): Json<CreateJobRequest>,
) -> Result<Json<JobResponse>, StatusCode> {
    let job_id = Uuid::new_v4();

    // Validate and convert raw params JSON into typed JobParams at the API boundary.
    let typed_params: JobParams = match req.job_type {
        JobType::HttpCrawl => {
            let p: HttpCrawlParams = serde_json::from_value(req.params).map_err(|e| {
                tracing::warn!("Invalid HttpCrawl params: {}", e);
                StatusCode::UNPROCESSABLE_ENTITY
            })?;
            // Validate the URL at the boundary.
            InputValidator::validate_url(&p.url).map_err(|e| {
                tracing::warn!("Invalid crawl URL: {}", e);
                StatusCode::UNPROCESSABLE_ENTITY
            })?;
            JobParams::HttpCrawl(p)
        }
        JobType::BlockchainIndex => {
            // Blockchain index jobs must be created through the GraphQL mutation
            // which performs address and event validation.
            return Err(StatusCode::BAD_REQUEST);
        }
    };

    let config_value = serde_json::to_value(JobConfig {
        job_type: req.job_type,
        params: typed_params,
    })
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let job = Job {
        id: job_id,
        user_id,
        status: JobStatus::Queued,
        priority: 50,
        config: config_value,
        created_at: Utc::now(),
        scheduled_at: None,
        started_at: None,
        completed_at: None,
        retry_count: 0,
        error: None,
        result_summary: None,
    };

    let queue = JobQueue::new(state.pool.clone());
    queue.enqueue(job).await.map_err(|e| {
        tracing::error!("Job enqueue error: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    db::audit_log(
        &state.pool,
        Some(user_id),
        "create_job",
        "job",
        Some(&job_id.to_string()),
        Some(serde_json::json!({"job_type": "http_crawl"})),
    )
    .await;

    Ok(Json(JobResponse {
        id: job_id.to_string(),
        status: "queued".to_string(),
    }))
}

pub async fn get_job(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<JobResponse>, StatusCode> {
    let queue = JobQueue::new(state.pool.clone());
    let job = queue
        .get_job(id)
        .await
        .map_err(|e| {
            tracing::error!("Job fetch error: {:?}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?
        .ok_or(StatusCode::NOT_FOUND)?;

    Ok(Json(JobResponse {
        id: job.id.to_string(),
        status: job.status.to_string(),
    }))
}

/// Request to verify a content hash on the blockchain.
#[derive(Deserialize)]
pub struct VerifyHashRequest {
    pub content_hash: String,
}

/// Response for content hash verification.
#[derive(Serialize)]
pub struct VerifyHashResponse {
    pub verified: bool,
    pub block_number: Option<i64>,
    pub transaction_hash: Option<String>,
    pub committed_at: Option<String>,
}

/// Verifies a content hash against on-chain Merkle commitments.
///
/// Two-pass lookup:
///   1. Direct match — the hash is itself a committed Merkle root.
///   2. Indirect match — the hash belongs to an event whose batch Merkle root
///      was committed; returns the commitment for that root.
pub async fn verify_hash(
    State(state): State<AppState>,
    Json(req): Json<VerifyHashRequest>,
) -> Result<Json<VerifyHashResponse>, StatusCode> {
    use sqlx::Row;

    // Pass 1: direct match against committed Merkle roots.
    let direct = sqlx::query(
        "SELECT transaction_hash, block_number, committed_at
         FROM timestamp_commits
         WHERE content_hash = $1
         LIMIT 1",
    )
    .bind(&req.content_hash)
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| {
        tracing::error!("verify_hash pass-1 query error: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    if let Some(r) = direct {
        let committed_at: chrono::DateTime<chrono::Utc> = r.get("committed_at");
        return Ok(Json(VerifyHashResponse {
            verified: true,
            block_number: Some(r.get("block_number")),
            transaction_hash: Some(r.get("transaction_hash")),
            committed_at: Some(committed_at.to_rfc3339()),
        }));
    }

    // Pass 2: resolve via event → batch Merkle root → timestamp_commit.
    let via_event = sqlx::query(
        "SELECT tc.transaction_hash, tc.block_number, tc.committed_at
         FROM blockchain_events be
         JOIN timestamp_commits tc ON tc.content_hash = be.merkle_root
         WHERE be.content_hash = $1
         LIMIT 1",
    )
    .bind(&req.content_hash)
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| {
        tracing::error!("verify_hash pass-2 query error: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    match via_event {
        Some(r) => {
            let committed_at: chrono::DateTime<chrono::Utc> = r.get("committed_at");
            Ok(Json(VerifyHashResponse {
                verified: true,
                block_number: Some(r.get("block_number")),
                transaction_hash: Some(r.get("transaction_hash")),
                committed_at: Some(committed_at.to_rfc3339()),
            }))
        }
        None => Ok(Json(VerifyHashResponse {
            verified: false,
            block_number: None,
            transaction_hash: None,
            committed_at: None,
        })),
    }
}

// ── API Keys ──────────────────────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct CreateApiKeyRequest {
    pub name: String,
    /// Validity in days. `None` means the key never expires.
    pub expires_in_days: Option<i64>,
}

#[derive(Serialize)]
pub struct CreateApiKeyResponse {
    pub id: String,
    /// Full raw key — shown **once**. Store it securely; it cannot be recovered.
    pub key: String,
    pub name: String,
    pub key_prefix: String,
    pub created_at: String,
    pub expires_at: Option<String>,
}

#[derive(Serialize)]
pub struct ApiKeyItem {
    pub id: String,
    pub name: String,
    pub key_prefix: String,
    pub last_used_at: Option<String>,
    pub created_at: String,
    pub expires_at: Option<String>,
}

/// Creates a new API key for the authenticated user.
/// The full raw key is returned once in the response — it is not stored.
pub async fn create_api_key(
    State(state): State<AppState>,
    Extension(user_id): Extension<Uuid>,
    Json(req): Json<CreateApiKeyRequest>,
) -> Result<Json<CreateApiKeyResponse>, StatusCode> {
    use rand_core::{OsRng, RngCore};
    use sha2::{Digest, Sha256};

    // Generate 32 cryptographically random bytes → hex → prepend "ink_".
    let mut raw_bytes = [0u8; 32];
    OsRng.fill_bytes(&mut raw_bytes);
    let raw_key = format!("ink_{}", hex::encode(raw_bytes));
    let key_prefix = raw_key[..12].to_string(); // "ink_" + 8 hex chars

    let key_hash = hex::encode(Sha256::digest(raw_key.as_bytes()));

    let expires_at = req
        .expires_in_days
        .map(|d| Utc::now() + chrono::Duration::days(d));

    let id: Uuid = sqlx::query_scalar(
        "INSERT INTO api_keys (user_id, name, key_hash, key_prefix, expires_at)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id",
    )
    .bind(user_id)
    .bind(&req.name)
    .bind(&key_hash)
    .bind(&key_prefix)
    .bind(expires_at)
    .fetch_one(&state.pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to insert api_key: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok(Json(CreateApiKeyResponse {
        id: id.to_string(),
        key: raw_key,
        name: req.name,
        key_prefix,
        created_at: Utc::now().to_rfc3339(),
        expires_at: expires_at.map(|t| t.to_rfc3339()),
    }))
}

/// Lists all API keys belonging to the authenticated user (without raw key values).
pub async fn list_api_keys(
    State(state): State<AppState>,
    Extension(user_id): Extension<Uuid>,
) -> Result<Json<Vec<ApiKeyItem>>, StatusCode> {
    use sqlx::Row;

    let rows = sqlx::query(
        "SELECT id, name, key_prefix, last_used_at, created_at, expires_at
         FROM api_keys
         WHERE user_id = $1
         ORDER BY created_at DESC",
    )
    .bind(user_id)
    .fetch_all(&state.pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to list api_keys: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let keys = rows
        .iter()
        .map(|r| {
            let last_used: Option<chrono::DateTime<Utc>> = r.get("last_used_at");
            let created: chrono::DateTime<Utc> = r.get("created_at");
            let expires: Option<chrono::DateTime<Utc>> = r.get("expires_at");
            let id: Uuid = r.get("id");
            ApiKeyItem {
                id: id.to_string(),
                name: r.get("name"),
                key_prefix: r.get("key_prefix"),
                last_used_at: last_used.map(|t| t.to_rfc3339()),
                created_at: created.to_rfc3339(),
                expires_at: expires.map(|t| t.to_rfc3339()),
            }
        })
        .collect();

    Ok(Json(keys))
}

/// Deletes an API key. Only the owning user may delete their own keys.
pub async fn delete_api_key(
    State(state): State<AppState>,
    Extension(user_id): Extension<Uuid>,
    Path(id): Path<Uuid>,
) -> StatusCode {
    match sqlx::query(
        "DELETE FROM api_keys WHERE id = $1 AND user_id = $2",
    )
    .bind(id)
    .bind(user_id)
    .execute(&state.pool)
    .await
    {
        Ok(r) if r.rows_affected() == 1 => StatusCode::NO_CONTENT,
        Ok(_) => StatusCode::NOT_FOUND,
        Err(e) => {
            tracing::error!("Failed to delete api_key: {:?}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        }
    }
}

// ── Webhooks ──────────────────────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct CreateWebhookRequest {
    pub url: String,
    /// Event types to subscribe to. Defaults to ["job.completed", "job.failed"].
    pub events: Option<Vec<String>>,
}

#[derive(Serialize)]
pub struct CreateWebhookResponse {
    pub id: String,
    pub url: String,
    /// HMAC-SHA256 signing secret — shown **once**.
    pub secret: String,
    pub events: Vec<String>,
    pub created_at: String,
}

#[derive(Serialize)]
pub struct WebhookItem {
    pub id: String,
    pub url: String,
    pub events: Vec<String>,
    pub is_active: bool,
    pub created_at: String,
}

const ALLOWED_WEBHOOK_EVENTS: &[&str] = &["job.completed", "job.failed"];

/// Registers a webhook endpoint for the authenticated user.
/// The HMAC signing secret is returned once and not stored hashed —
/// rotate it by deleting and recreating the subscription.
pub async fn create_webhook(
    State(state): State<AppState>,
    Extension(user_id): Extension<Uuid>,
    Json(req): Json<CreateWebhookRequest>,
) -> Result<Json<CreateWebhookResponse>, StatusCode> {
    use rand_core::{OsRng, RngCore};

    // Validate URL.
    InputValidator::validate_url(&req.url).map_err(|e| {
        tracing::warn!("Invalid webhook URL: {}", e);
        StatusCode::UNPROCESSABLE_ENTITY
    })?;

    let events = req
        .events
        .unwrap_or_else(|| vec!["job.completed".into(), "job.failed".into()]);

    // Validate event names.
    for event in &events {
        if !ALLOWED_WEBHOOK_EVENTS.contains(&event.as_str()) {
            tracing::warn!("Unknown webhook event: {}", event);
            return Err(StatusCode::UNPROCESSABLE_ENTITY);
        }
    }

    // Generate HMAC secret: "whsec_" + 32 random bytes hex.
    let mut raw_bytes = [0u8; 32];
    OsRng.fill_bytes(&mut raw_bytes);
    let secret = format!("whsec_{}", hex::encode(raw_bytes));

    let id: Uuid = sqlx::query_scalar(
        "INSERT INTO webhook_subscriptions (user_id, url, secret, events)
         VALUES ($1, $2, $3, $4)
         RETURNING id",
    )
    .bind(user_id)
    .bind(&req.url)
    .bind(&secret)
    .bind(&events)
    .fetch_one(&state.pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to insert webhook: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok(Json(CreateWebhookResponse {
        id: id.to_string(),
        url: req.url,
        secret,
        events,
        created_at: Utc::now().to_rfc3339(),
    }))
}

/// Lists all webhook subscriptions for the authenticated user.
pub async fn list_webhooks(
    State(state): State<AppState>,
    Extension(user_id): Extension<Uuid>,
) -> Result<Json<Vec<WebhookItem>>, StatusCode> {
    use sqlx::Row;

    let rows = sqlx::query(
        "SELECT id, url, events, is_active, created_at
         FROM webhook_subscriptions
         WHERE user_id = $1
         ORDER BY created_at DESC",
    )
    .bind(user_id)
    .fetch_all(&state.pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to list webhooks: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let webhooks = rows
        .iter()
        .map(|r| {
            let id: Uuid = r.get("id");
            let created: chrono::DateTime<Utc> = r.get("created_at");
            WebhookItem {
                id: id.to_string(),
                url: r.get("url"),
                events: r.get("events"),
                is_active: r.get("is_active"),
                created_at: created.to_rfc3339(),
            }
        })
        .collect();

    Ok(Json(webhooks))
}

/// Deletes a webhook subscription. Only the owning user may delete their own.
pub async fn delete_webhook(
    State(state): State<AppState>,
    Extension(user_id): Extension<Uuid>,
    Path(id): Path<Uuid>,
) -> StatusCode {
    match sqlx::query(
        "DELETE FROM webhook_subscriptions WHERE id = $1 AND user_id = $2",
    )
    .bind(id)
    .bind(user_id)
    .execute(&state.pool)
    .await
    {
        Ok(r) if r.rows_affected() == 1 => StatusCode::NO_CONTENT,
        Ok(_) => StatusCode::NOT_FOUND,
        Err(e) => {
            tracing::error!("Failed to delete webhook: {:?}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        }
    }
}

// ── Password Reset ────────────────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct ForgotPasswordRequest {
    pub email: String,
}

/// Issues a password reset token and sends an email via Resend.
/// Always returns 200 to avoid leaking whether the email is registered.
pub async fn forgot_password(
    State(state): State<AppState>,
    Json(req): Json<ForgotPasswordRequest>,
) -> StatusCode {
    let user = sqlx::query_as::<_, User>(
        "SELECT id, email, password_hash, role, created_at FROM users WHERE email = $1",
    )
    .bind(&req.email)
    .fetch_optional(&state.pool)
    .await;

    let user = match user {
        Ok(Some(u)) => u,
        Ok(None) => return StatusCode::OK, // Don't reveal missing accounts
        Err(e) => {
            tracing::error!("DB error in forgot_password: {:?}", e);
            return StatusCode::INTERNAL_SERVER_ERROR;
        }
    };

    // Generate a cryptographically random 32-byte token.
    let mut raw = [0u8; 32];
    OsRng.fill_bytes(&mut raw);
    let token = hex::encode(raw);

    // Store SHA-256 of the token so a DB leak doesn't expose valid tokens.
    use sha2::{Digest, Sha256};
    let token_hash = hex::encode(Sha256::digest(token.as_bytes()));

    let expires_at = Utc::now() + chrono::Duration::hours(1);

    // Invalidate any existing unused tokens for this user before inserting.
    let _ = sqlx::query(
        "UPDATE password_reset_tokens SET used_at = now()
         WHERE user_id = $1 AND used_at IS NULL AND expires_at > now()",
    )
    .bind(user.id)
    .execute(&state.pool)
    .await;

    if let Err(e) = sqlx::query(
        "INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, $3)",
    )
    .bind(user.id)
    .bind(&token_hash)
    .bind(expires_at)
    .execute(&state.pool)
    .await
    {
        tracing::error!("Failed to insert reset token: {:?}", e);
        return StatusCode::INTERNAL_SERVER_ERROR;
    }

    // Send email via Resend (optional — logs warning if key not configured).
    if let Some(resend_key) = std::env::var("RESEND_API_KEY").ok() {
        let base_url = std::env::var("BASE_URL")
            .unwrap_or_else(|_| "https://indexnode.io".to_string());
        let reset_url = format!("{}/reset-password.html?token={}", base_url, token);

        let body = serde_json::json!({
            "from": "IndexNode <noreply@indexnode.io>",
            "to": [user.email],
            "subject": "Reset your IndexNode password",
            "html": format!(
                "<p>You requested a password reset for your IndexNode account.</p>\
                 <p><a href=\"{url}\">Click here to reset your password</a></p>\
                 <p>This link expires in 1 hour. If you did not request this, you can safely ignore this email.</p>\
                 <p style=\"color:#888;font-size:0.85em\">Or copy this URL: {url}</p>",
                url = reset_url
            ),
        });

        let client = reqwest::Client::new();
        match client
            .post("https://api.resend.com/emails")
            .bearer_auth(&resend_key)
            .json(&body)
            .send()
            .await
        {
            Ok(resp) if resp.status().is_success() => {
                tracing::info!("Password reset email sent to {}", user.email);
            }
            Ok(resp) => {
                tracing::error!("Resend API error: {}", resp.status());
            }
            Err(e) => {
                tracing::error!("Failed to send reset email: {:?}", e);
            }
        }
    } else {
        tracing::warn!(
            "RESEND_API_KEY not set — password reset email not sent. Token (dev only): {}",
            token
        );
    }

    StatusCode::OK
}

#[derive(Deserialize)]
pub struct ResetPasswordRequest {
    pub token: String,
    pub new_password: String,
}

/// Validates a reset token and updates the user's password.
pub async fn reset_password(
    State(state): State<AppState>,
    Json(req): Json<ResetPasswordRequest>,
) -> StatusCode {
    use sha2::{Digest, Sha256};
    let token_hash = hex::encode(Sha256::digest(req.token.as_bytes()));

    // Fetch valid, unused token.
    let row = sqlx::query(
        "SELECT id, user_id FROM password_reset_tokens
         WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()",
    )
    .bind(&token_hash)
    .fetch_optional(&state.pool)
    .await;

    let row = match row {
        Ok(Some(r)) => r,
        Ok(None) => return StatusCode::UNPROCESSABLE_ENTITY,
        Err(e) => {
            tracing::error!("DB error in reset_password: {:?}", e);
            return StatusCode::INTERNAL_SERVER_ERROR;
        }
    };

    use sqlx::Row;
    let token_id: Uuid = row.get("id");
    let user_id: Uuid = row.get("user_id");

    // Validate new password strength.
    if SecurityConfig::default()
        .validate_password(&req.new_password)
        .is_err()
    {
        return StatusCode::UNPROCESSABLE_ENTITY;
    }

    let password_hash = match bcrypt::hash(&req.new_password, bcrypt::DEFAULT_COST) {
        Ok(h) => h,
        Err(e) => {
            tracing::error!("Bcrypt error: {}", e);
            return StatusCode::INTERNAL_SERVER_ERROR;
        }
    };

    // Update password.
    if let Err(e) = sqlx::query("UPDATE users SET password_hash = $1 WHERE id = $2")
        .bind(&password_hash)
        .bind(user_id)
        .execute(&state.pool)
        .await
    {
        tracing::error!("Failed to update password: {:?}", e);
        return StatusCode::INTERNAL_SERVER_ERROR;
    }

    // Mark token as used.
    let _ = sqlx::query("UPDATE password_reset_tokens SET used_at = now() WHERE id = $1")
        .bind(token_id)
        .execute(&state.pool)
        .await;

    db::audit_log(
        &state.pool,
        Some(user_id),
        "password_reset",
        "user",
        Some(&user_id.to_string()),
        None,
    )
    .await;

    StatusCode::OK
}
