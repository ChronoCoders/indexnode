CREATE TABLE IF NOT EXISTS worker_nodes ( 
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), 
    worker_id TEXT NOT NULL UNIQUE, 
    hostname TEXT NOT NULL, 
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), 
    last_heartbeat TIMESTAMPTZ NOT NULL DEFAULT NOW(), 
    jobs_processed BIGINT NOT NULL DEFAULT 0, 
    jobs_failed BIGINT NOT NULL DEFAULT 0, 
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'stopped')) 
); 
 
CREATE INDEX IF NOT EXISTS idx_worker_status ON worker_nodes(status, last_heartbeat); 
 
CREATE TABLE IF NOT EXISTS distributed_jobs ( 
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), 
    job_type TEXT NOT NULL, 
    payload JSONB NOT NULL, 
    priority INTEGER NOT NULL DEFAULT 50, 
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')), 
    worker_id TEXT REFERENCES worker_nodes(worker_id), 
    retry_count INTEGER NOT NULL DEFAULT 0, 
    max_retries INTEGER NOT NULL DEFAULT 3, 
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), 
    started_at TIMESTAMPTZ, 
    completed_at TIMESTAMPTZ, 
    error_message TEXT 
); 
 
CREATE INDEX IF NOT EXISTS idx_distributed_jobs_status ON distributed_jobs(status, priority DESC, created_at); 
CREATE INDEX IF NOT EXISTS idx_distributed_jobs_worker ON distributed_jobs(worker_id); 
