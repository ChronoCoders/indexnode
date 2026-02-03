CREATE TABLE IF NOT EXISTS timestamp_commits ( 
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), 
    content_hash TEXT NOT NULL UNIQUE, 
    transaction_hash TEXT NOT NULL, 
    block_number BIGINT NOT NULL, 
    chain TEXT NOT NULL DEFAULT 'ethereum', 
    committed_at TIMESTAMPTZ NOT NULL DEFAULT NOW() 
); 
 
CREATE INDEX IF NOT EXISTS idx_timestamp_hash ON timestamp_commits(content_hash); 
CREATE INDEX IF NOT EXISTS idx_timestamp_block ON timestamp_commits(block_number DESC); 
