-- API keys allow programmatic access without JWT session management.
-- The raw key (ink_<32 random hex bytes>) is shown to the user once;
-- only its SHA-256 hash is stored here.
CREATE TABLE api_keys (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name         TEXT        NOT NULL,
    key_hash     TEXT        NOT NULL UNIQUE,
    key_prefix   TEXT        NOT NULL,    -- first 12 chars of raw key (e.g. "ink_a1b2c3d4") for display
    last_used_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at   TIMESTAMPTZ           -- NULL means never expires
);

CREATE INDEX api_keys_user_id_idx  ON api_keys(user_id);
CREATE INDEX api_keys_key_hash_idx ON api_keys(key_hash);
