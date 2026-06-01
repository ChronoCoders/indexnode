
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_credits_on_chain_address_unique
    ON user_credits (on_chain_address)
    WHERE on_chain_address IS NOT NULL;
