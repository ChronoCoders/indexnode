CREATE TABLE rate_limits ( 
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), 
    user_id UUID REFERENCES users(id), 
    endpoint TEXT NOT NULL, 
    requests_count INTEGER NOT NULL DEFAULT 0, 
    window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(), 
    window_end TIMESTAMPTZ NOT NULL, 
    is_blocked BOOLEAN NOT NULL DEFAULT false 
); 

CREATE INDEX idx_rate_limits_user_window ON rate_limits(user_id, window_start, window_end); 

CREATE TABLE metrics_snapshots ( 
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), 
    metric_name TEXT NOT NULL, 
    metric_value DOUBLE PRECISION NOT NULL, 
    labels JSONB, 
    captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW() 
); 

CREATE INDEX idx_metrics_name_time ON metrics_snapshots(metric_name, captured_at DESC); 

ALTER TABLE users ADD COLUMN rate_limit_tier TEXT NOT NULL DEFAULT 'free' CHECK (rate_limit_tier IN ('free', 'premium', 'enterprise')); 
ALTER TABLE users ADD COLUMN monthly_request_quota INTEGER NOT NULL DEFAULT 1000; 
ALTER TABLE users ADD COLUMN requests_this_month INTEGER NOT NULL DEFAULT 0; 
