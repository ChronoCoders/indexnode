CREATE TABLE IF NOT EXISTS blockchain_events ( 
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), 
    job_id UUID NOT NULL REFERENCES jobs(id), 
    chain TEXT NOT NULL, 
    contract_address TEXT NOT NULL, 
    event_name TEXT NOT NULL, 
    block_number BIGINT NOT NULL, 
    transaction_hash TEXT NOT NULL, 
    event_data JSONB NOT NULL, 
    content_hash TEXT NOT NULL, 
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW() 
); 

CREATE INDEX IF NOT EXISTS idx_blockchain_events_job ON blockchain_events(job_id); 
CREATE INDEX IF NOT EXISTS idx_blockchain_events_contract ON blockchain_events(contract_address); 
CREATE INDEX IF NOT EXISTS idx_blockchain_events_block ON blockchain_events(block_number); 
