CREATE TABLE IF NOT EXISTS ipfs_content ( 
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), 
    cid TEXT NOT NULL UNIQUE, 
    content_hash TEXT NOT NULL, 
    size_bytes BIGINT NOT NULL, 
    pinned BOOLEAN NOT NULL DEFAULT false, 
    blockchain_event_id UUID REFERENCES blockchain_events(id) ON DELETE SET NULL, 
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW() 
); 
 
CREATE INDEX IF NOT EXISTS idx_ipfs_cid ON ipfs_content(cid); 
CREATE INDEX IF NOT EXISTS idx_ipfs_hash ON ipfs_content(content_hash); 
CREATE INDEX IF NOT EXISTS idx_ipfs_event ON ipfs_content(blockchain_event_id); 
 
-- Add ipfs_cid to blockchain_events if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='blockchain_events' AND column_name='ipfs_cid') THEN 
        ALTER TABLE blockchain_events ADD COLUMN ipfs_cid TEXT; 
    END IF; 
END $$;
