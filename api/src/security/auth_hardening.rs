use anyhow::Result;

pub struct SecurityConfig {
    pub min_password_length: usize,
    pub require_uppercase: bool,
    pub require_lowercase: bool,
    pub require_digit: bool,
    pub require_special: bool,
}

impl Default for SecurityConfig {
    fn default() -> Self {
        Self {
            min_password_length: 12,
            require_uppercase: true,
            require_lowercase: true,
            require_digit: true,
            require_special: true,
        }
    }
}

impl SecurityConfig {
    pub fn validate_password(&self, password: &str) -> Result<()> {
        if password.len() < self.min_password_length {
            anyhow::bail!(
                "Password must be at least {} characters",
                self.min_password_length
            );
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
}
