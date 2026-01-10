use crate::{auth, models::User, routes::AppState};
use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use chrono::Utc;
use indexnode_core::{Job, JobQueue, JobStatus};
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
    let user_id = Uuid::new_v4();
    let password_hash = bcrypt::hash(&req.password, bcrypt::DEFAULT_COST).map_err(|e| {
        tracing::error!("Bcrypt error: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    sqlx::query("INSERT INTO users (id, email, password_hash, created_at) VALUES ($1, $2, $3, $4)")
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

    let token = auth::create_token(user_id).map_err(|e| {
        tracing::error!("Token creation error: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

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
        "SELECT id, email, password_hash, created_at FROM users WHERE email = $1",
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
        return Err(StatusCode::UNAUTHORIZED);
    }

    let token = auth::create_token(user.id).map_err(|e| {
        tracing::error!("Token creation error: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok(Json(AuthResponse {
        token,
        user_id: user.id.to_string(),
    }))
}

#[derive(Deserialize)]
pub struct CreateJobRequest {
    url: String,
    max_pages: usize,
    max_depth: Option<usize>,
}

#[derive(Serialize)]
pub struct JobResponse {
    id: String,
    status: String,
}

pub async fn create_job(
    State(state): State<AppState>,
    Json(req): Json<CreateJobRequest>,
) -> Result<Json<JobResponse>, StatusCode> {
    let job_id = Uuid::new_v4();

    let user_id: Uuid = sqlx::query_scalar("SELECT id FROM users LIMIT 1")
        .fetch_one(&state.pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to get user: {:?}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    let config = serde_json::json!({
        "url": req.url,
        "max_pages": req.max_pages,
        "max_depth": req.max_depth,
        "respect_robots_txt": true
    });

    let job = Job {
        id: job_id,
        user_id,
        status: JobStatus::Queued,
        priority: 50,
        config,
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
