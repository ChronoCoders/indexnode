CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    priority INTEGER NOT NULL DEFAULT 50,
    config JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    scheduled_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    retry_count INTEGER NOT NULL DEFAULT 0,
    error TEXT,
    result_summary JSONB
);

CREATE INDEX idx_jobs_dequeue ON jobs(priority DESC, created_at ASC) WHERE status = 'queued';
CREATE INDEX idx_jobs_user_id ON jobs(user_id);
CREATE INDEX idx_jobs_status ON jobs(status);

CREATE TABLE IF NOT EXISTS crawl_results (
    id UUID PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    status_code INTEGER NOT NULL,
    content_hash VARCHAR(64) NOT NULL,
    links JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_crawl_results_job_id ON crawl_results(job_id);
