CREATE TABLE webhook_subscriptions (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    url        TEXT        NOT NULL,
    secret     TEXT        NOT NULL,
    events     TEXT[]      NOT NULL DEFAULT ARRAY['job.completed', 'job.failed'],
    is_active  BOOL        NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX webhook_subscriptions_user_id_idx ON webhook_subscriptions(user_id);
