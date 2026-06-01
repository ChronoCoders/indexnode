ALTER TABLE blockchain_events ADD COLUMN IF NOT EXISTS merkle_root TEXT;

ALTER TABLE timestamp_commits ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES jobs(id);

CREATE INDEX IF NOT EXISTS idx_blockchain_events_merkle_root ON blockchain_events(merkle_root);
CREATE INDEX IF NOT EXISTS idx_timestamp_commits_job_id ON timestamp_commits(job_id);
