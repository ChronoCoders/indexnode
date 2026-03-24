use anyhow::{Context, Result};
use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Role carried inside the JWT and inserted into request extensions by `require_auth`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum UserRole {
    User,
    Admin,
}

impl UserRole {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::User => "user",
            Self::Admin => "admin",
        }
    }
}

impl std::fmt::Display for UserRole {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_str())
    }
}

impl std::str::FromStr for UserRole {
    type Err = anyhow::Error;
    fn from_str(s: &str) -> Result<Self> {
        match s {
            "admin" => Ok(Self::Admin),
            _ => Ok(Self::User),
        }
    }
}

/// The data returned after successfully validating a JWT.
#[derive(Debug, Clone)]
pub struct AuthInfo {
    pub user_id: Uuid,
    pub role: UserRole,
}

#[derive(Debug, Serialize, Deserialize)]
struct Claims {
    sub: String,
    role: String,
    exp: i64,
}

fn jwt_secret() -> Result<String> {
    std::env::var("JWT_SECRET").context("JWT_SECRET environment variable must be set")
}

/// Creates a signed JWT for the given user. `role` is the user's role string (e.g. "user", "admin").
pub fn create_token(user_id: Uuid, role: &str) -> Result<String> {
    let secret = jwt_secret()?;

    let expiration = Utc::now()
        .checked_add_signed(Duration::hours(24))
        .context("Failed to calculate token expiration")?
        .timestamp();

    let claims = Claims {
        sub: user_id.to_string(),
        role: role.to_string(),
        exp: expiration,
    };

    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )?;

    Ok(token)
}

/// Validates a JWT Bearer token and returns the authenticated user's ID and role.
/// Returns an error if the token is missing, malformed, expired, or signed with the wrong secret.
pub fn validate_token(token: &str) -> Result<AuthInfo> {
    let secret = jwt_secret()?;

    let mut validation = Validation::default();
    validation.validate_exp = true;

    let token_data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &validation,
    )
    .context("Invalid or expired token")?;

    let user_id =
        Uuid::parse_str(&token_data.claims.sub).context("Invalid user ID in token claims")?;

    let role: UserRole = token_data.claims.role.parse().unwrap_or(UserRole::User);

    Ok(AuthInfo { user_id, role })
}
