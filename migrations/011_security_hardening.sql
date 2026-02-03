CREATE TABLE login_attempts ( 
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), 
    user_email TEXT NOT NULL, 
    ip_address INET NOT NULL, 
    attempt_time TIMESTAMPTZ NOT NULL DEFAULT NOW(), 
    successful BOOLEAN NOT NULL, 
    failure_reason TEXT 
); 
 
CREATE INDEX idx_login_attempts_email_time ON login_attempts(user_email, attempt_time DESC); 
CREATE INDEX idx_login_attempts_ip_time ON login_attempts(ip_address, attempt_time DESC); 
 
CREATE TABLE security_events ( 
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), 
    event_type TEXT NOT NULL CHECK (event_type IN ('login_failed', 'account_locked', 'password_changed', 'suspicious_activity', 'api_abuse')), 
    user_id UUID REFERENCES users(id), 
    ip_address INET, 
    user_agent TEXT, 
    details JSONB, 
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW() 
); 
 
CREATE INDEX idx_security_events_type_time ON security_events(event_type, created_at DESC); 
CREATE INDEX idx_security_events_user ON security_events(user_id, created_at DESC); 
 
ALTER TABLE users ADD COLUMN account_locked BOOLEAN NOT NULL DEFAULT false; 
ALTER TABLE users ADD COLUMN locked_until TIMESTAMPTZ; 
ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER NOT NULL DEFAULT 0; 
ALTER TABLE users ADD COLUMN last_login_at TIMESTAMPTZ; 
ALTER TABLE users ADD COLUMN password_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(); 
