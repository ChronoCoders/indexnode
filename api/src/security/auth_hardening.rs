use anyhow::{Context, Result}; 
use argon2::{Argon2, PasswordHash, PasswordHasher, PasswordVerifier}; 
use argon2::password_hash::{SaltString, rand_core::OsRng}; 
 
#[allow(dead_code)]
pub struct SecurityConfig { 
    pub min_password_length: usize, 
    pub require_uppercase: bool, 
    pub require_lowercase: bool, 
    pub require_digit: bool, 
    pub require_special: bool, 
    pub max_login_attempts: u32, 
    pub lockout_duration_secs: u64, 
} 
 
impl Default for SecurityConfig { 
    fn default() -> Self { 
        Self { 
            min_password_length: 12, 
            require_uppercase: true, 
            require_lowercase: true, 
            require_digit: true, 
            require_special: true, 
            max_login_attempts: 5, 
            lockout_duration_secs: 900, 
        } 
    } 
} 
 
impl SecurityConfig { 
    #[allow(dead_code)]
    pub fn validate_password(&self, password: &str) -> Result<()> { 
        if password.len() < self.min_password_length { 
            anyhow::bail!("Password must be at least {} characters", self.min_password_length); 
        } 
 
        if self.require_uppercase && !password.chars().any(|c| c.is_uppercase()) { 
            anyhow::bail!("Password must contain at least one uppercase letter"); 
        } 
 
        if self.require_lowercase && !password.chars().any(|c| c.is_lowercase()) { 
            anyhow::bail!("Password must contain at least one lowercase letter"); 
        } 
 
        if self.require_digit && !password.chars().any(|c| c.is_ascii_digit()) { 
            anyhow::bail!("Password must contain at least one digit"); 
        } 
 
        if self.require_special && !password.chars().any(|c| !c.is_alphanumeric()) { 
            anyhow::bail!("Password must contain at least one special character"); 
        } 
 
        Ok(()) 
    } 
 
    #[allow(dead_code)]
    pub fn hash_password(&self, password: &str) -> Result<String> { 
        let salt = SaltString::generate(&mut OsRng); 
        let argon2 = Argon2::default(); 
        
        let hash = argon2 
            .hash_password(password.as_bytes(), &salt) 
            .map_err(|e| anyhow::anyhow!(e.to_string())) 
            .context("Failed to hash password")? 
            .to_string(); 
        
        Ok(hash) 
    } 
 
    #[allow(dead_code)]
    pub fn verify_password(&self, password: &str, hash: &str) -> Result<bool> { 
        let parsed_hash = PasswordHash::new(hash) 
            .map_err(|e| anyhow::anyhow!(e.to_string())) 
            .context("Failed to parse password hash")?; 
        
        Ok(Argon2::default() 
            .verify_password(password.as_bytes(), &parsed_hash) 
            .is_ok()) 
    } 
} 
