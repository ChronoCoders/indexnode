use jsonwebtoken::{encode, Header, EncodingKey};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{Utc, Duration};
use anyhow::Result;

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
    pub exp: i64,
}

pub fn create_token(user_id: Uuid) -> Result<String> {
    let secret = std::env::var("JWT_SECRET")
        .unwrap_or_else(|_| "secret".to_string());

    let expiration = Utc::now()
        .checked_add_signed(Duration::hours(24))
        .expect("valid timestamp")
        .timestamp();

    let claims = Claims {
        sub: user_id.to_string(),
        exp: expiration,
    };

    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes())
    )?;

    Ok(token)
}
