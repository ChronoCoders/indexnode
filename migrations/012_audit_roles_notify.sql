-- Add role column to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
    CHECK (role IN ('user', 'admin'));

-- Audit log for sensitive user-initiated operations
CREATE TABLE audit_log (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        REFERENCES users(id),
    action      TEXT        NOT NULL,
    resource_type TEXT      NOT NULL,
    resource_id TEXT,
    details     JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_log_user   ON audit_log(user_id,   created_at DESC);
CREATE INDEX idx_audit_log_action ON audit_log(action,    created_at DESC);

-- Real-time notification trigger for blockchain events.
-- Publishes to the single channel "blockchain_event"; the payload includes
-- the contract_address so subscribers can filter client-side.
CREATE OR REPLACE FUNCTION notify_blockchain_event()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify(
        'blockchain_event',
        json_build_object(
            'id',                  NEW.id,
            'contract_address',    NEW.contract_address,
            'event_name',          NEW.event_name,
            'block_number',        NEW.block_number,
            'transaction_hash',    NEW.transaction_hash,
            'event_data',          NEW.event_data,
            'content_hash',        NEW.content_hash,
            'ipfs_cid',            NEW.ipfs_cid
        )::text
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER blockchain_event_notify
    AFTER INSERT ON blockchain_events
    FOR EACH ROW EXECUTE FUNCTION notify_blockchain_event();
