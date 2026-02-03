CREATE TABLE IF NOT EXISTS crawler_sessions ( 
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), 
    job_id UUID NOT NULL REFERENCES jobs(id), 
    url TEXT NOT NULL, 
    used_browser BOOLEAN NOT NULL DEFAULT false, 
    used_proxy BOOLEAN NOT NULL DEFAULT false, 
    solved_captcha BOOLEAN NOT NULL DEFAULT false, 
    proxy_host TEXT, 
    session_duration_ms BIGINT, 
    screenshot_path TEXT, 
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW() 
); 
 
CREATE INDEX IF NOT EXISTS idx_crawler_sessions_job ON crawler_sessions(job_id); 
 
-- Add require_javascript, use_proxy, and captcha_site_key to jobs if they don't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jobs' AND column_name='require_javascript') THEN 
        ALTER TABLE jobs ADD COLUMN require_javascript BOOLEAN NOT NULL DEFAULT false; 
    END IF; 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jobs' AND column_name='use_proxy') THEN 
        ALTER TABLE jobs ADD COLUMN use_proxy BOOLEAN NOT NULL DEFAULT false; 
    END IF; 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jobs' AND column_name='captcha_site_key') THEN 
        ALTER TABLE jobs ADD COLUMN captcha_site_key TEXT; 
    END IF; 
END $$;
