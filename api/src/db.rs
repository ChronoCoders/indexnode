use sqlx::PgPool;
use uuid::Uuid;

/// Writes a structured entry to the `audit_log` table.
///
/// This is a best-effort call: failures are logged but never propagate to the
/// caller so that an audit-log write failure never breaks a user operation.
pub async fn audit_log(
    pool: &PgPool,
    user_id: Option<Uuid>,
    action: &str,
    resource_type: &str,
    resource_id: Option<&str>,
    details: Option<serde_json::Value>,
) {
    let result = sqlx::query(
        "INSERT INTO audit_log (user_id, action, resource_type, resource_id, details)
         VALUES ($1, $2, $3, $4, $5)",
    )
    .bind(user_id)
    .bind(action)
    .bind(resource_type)
    .bind(resource_id)
    .bind(details)
    .execute(pool)
    .await;

    if let Err(e) = result {
        tracing::error!(
            audit_error = true,
            action,
            resource_type,
            "Failed to write audit log entry: {:?}",
            e
        );
    }
}
