-- Webhook subscriptions: users register callback URLs that receive
-- HMAC-SHA256-signed POST payloads when job terminal events occur.
-- The HMAC secret (whsec_<32 random hex bytes>) is shown once at creation.
CREATE TABLE webhook_subscriptions (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    url        TEXT        NOT NULL,
    secret     TEXT        NOT NULL,   -- raw HMAC secret stored in plain; rotate via delete+recreate
    events     TEXT[]      NOT NULL DEFAULT ARRAY['job.completed', 'job.failed'],
    is_active  BOOL        NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX webhook_subscriptions_user_id_idx ON webhook_subscriptions(user_id);
