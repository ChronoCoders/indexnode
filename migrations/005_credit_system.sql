CREATE TABLE IF NOT EXISTS user_credits ( 
    user_id UUID PRIMARY KEY, -- REFERENCES users(id) commented out until users table exists
    on_chain_address TEXT NOT NULL, 
    credit_balance BIGINT NOT NULL DEFAULT 0, 
    total_purchased BIGINT NOT NULL DEFAULT 0, 
    total_spent BIGINT NOT NULL DEFAULT 0, 
    last_sync_at TIMESTAMPTZ NOT NULL DEFAULT NOW() 
); 
 
CREATE TABLE IF NOT EXISTS credit_transactions ( 
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), 
    user_id UUID NOT NULL, 
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'spend')), 
    amount BIGINT NOT NULL, 
    job_id UUID REFERENCES jobs(id), 
    tx_hash TEXT, 
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW() 
); 
 
CREATE INDEX IF NOT EXISTS idx_credit_tx_user ON credit_transactions(user_id, created_at DESC); 
CREATE INDEX IF NOT EXISTS idx_credit_tx_hash ON credit_transactions(tx_hash); 
 
-- Add credit_cost to jobs if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jobs' AND column_name='credit_cost') THEN 
        ALTER TABLE jobs ADD COLUMN credit_cost BIGINT NOT NULL DEFAULT 0; 
    END IF; 
END $$;
