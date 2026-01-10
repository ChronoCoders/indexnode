use crate::job::{Job, JobStatus};
use anyhow::Result;
use sqlx::{PgPool, Row};
use uuid::Uuid;

pub struct JobQueue {
    pool: PgPool,
}

impl JobQueue {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn enqueue(&self, job: Job) -> Result<Uuid> {
        let id = sqlx::query_scalar(
            "INSERT INTO jobs (id, user_id, status, priority, config, created_at) 
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
        )
        .bind(job.id)
        .bind(job.user_id)
        .bind(job.status.to_string())
        .bind(job.priority)
        .bind(job.config)
        .bind(job.created_at)
        .fetch_one(&self.pool)
        .await?;

        Ok(id)
    }

    pub async fn dequeue(&self) -> Result<Option<Job>> {
        let row = sqlx::query(
            "UPDATE jobs SET status = 'processing', started_at = NOW() 
             WHERE id = (
                 SELECT id FROM jobs 
                 WHERE status = 'queued' 
                 ORDER BY priority DESC, created_at ASC 
                 LIMIT 1 FOR UPDATE SKIP LOCKED
             ) RETURNING *",
        )
        .fetch_optional(&self.pool)
        .await?;

        if let Some(r) = row {
            let job = Job {
                id: r.get("id"),
                user_id: r.get("user_id"),
                status: r
                    .get::<String, _>("status")
                    .parse()
                    .unwrap_or(JobStatus::Queued),
                priority: r.get("priority"),
                config: r.get("config"),
                created_at: r.get("created_at"),
                scheduled_at: r.get("scheduled_at"),
                started_at: r.get("started_at"),
                completed_at: r.get("completed_at"),
                retry_count: r.get("retry_count"),
                error: r.get("error"),
                result_summary: r.get("result_summary"),
            };
            Ok(Some(job))
        } else {
            Ok(None)
        }
    }

    pub async fn update_status(
        &self,
        job_id: Uuid,
        status: JobStatus,
        error: Option<String>,
    ) -> Result<()> {
        sqlx::query(
            "UPDATE jobs SET status = $1, completed_at = CASE WHEN $1 IN ('completed', 'failed') THEN NOW() ELSE completed_at END, error = $2 WHERE id = $3"
        )
        .bind(status.to_string())
        .bind(error)
        .bind(job_id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn get_job(&self, job_id: Uuid) -> Result<Option<Job>> {
        let row = sqlx::query("SELECT * FROM jobs WHERE id = $1")
            .bind(job_id)
            .fetch_optional(&self.pool)
            .await?;

        if let Some(r) = row {
            let job = Job {
                id: r.get("id"),
                user_id: r.get("user_id"),
                status: r
                    .get::<String, _>("status")
                    .parse()
                    .unwrap_or(JobStatus::Queued),
                priority: r.get("priority"),
                config: r.get("config"),
                created_at: r.get("created_at"),
                scheduled_at: r.get("scheduled_at"),
                started_at: r.get("started_at"),
                completed_at: r.get("completed_at"),
                retry_count: r.get("retry_count"),
                error: r.get("error"),
                result_summary: r.get("result_summary"),
            };
            Ok(Some(job))
        } else {
            Ok(None)
        }
    }
}
