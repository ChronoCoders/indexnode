-- Dead-letter queue for failed on-chain Merkle root commitments.
-- A row is inserted here when TimestampRegistry.commitHash() fails for a job.
-- The worker retries with exponential backoff up to MAX_RETRIES times.
-- status: 'pending' | 'committed' | 'failed'
CREATE TABLE IF NOT EXISTS pending_merkle_commits (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id       UUID        NOT NULL REFERENCES jobs(id),
    merkle_root  TEXT        NOT NULL,
    event_chain  TEXT        NOT NULL,  -- blockchain the events came from (e.g. 'ethereum', 'polygon')
    attempt_count INT        NOT NULL DEFAULT 0,
    next_retry_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_error   TEXT,
    status       TEXT        NOT NULL DEFAULT 'pending',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pending_merkle_commits_status_check CHECK (status IN ('pending', 'committed', 'failed'))
);

CREATE INDEX idx_pending_merkle_commits_retry
    ON pending_merkle_commits (next_retry_at, status)
    WHERE status = 'pending';

CREATE INDEX idx_pending_merkle_commits_job_id
    ON pending_merkle_commits (job_id);
