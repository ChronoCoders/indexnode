CREATE TABLE IF NOT EXISTS ai_extractions ( 
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), 
    blockchain_event_id UUID REFERENCES blockchain_events(id) ON DELETE CASCADE, 
    extraction_type TEXT NOT NULL CHECK (extraction_type IN ('structured', 'summary', 'classification')), 
    schema_definition JSONB, 
    extracted_data JSONB NOT NULL, 
    confidence_score FLOAT, 
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW() 
); 
 
CREATE INDEX IF NOT EXISTS idx_ai_extractions_event ON ai_extractions(blockchain_event_id); 
CREATE INDEX IF NOT EXISTS idx_ai_extractions_type ON ai_extractions(extraction_type); 
 
-- Add enable_ai_extraction and extraction_schema to jobs if they don't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jobs' AND column_name='enable_ai_extraction') THEN 
        ALTER TABLE jobs ADD COLUMN enable_ai_extraction BOOLEAN NOT NULL DEFAULT false; 
    END IF; 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jobs' AND column_name='extraction_schema') THEN 
        ALTER TABLE jobs ADD COLUMN extraction_schema JSONB; 
    END IF; 
END $$;
