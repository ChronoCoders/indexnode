-- Prevent two users from registering the same wallet address. The on-chain
-- spend path resolves a user_id -> address; a shared address would make that
-- mapping ambiguous and let one user's job drain another user's on-chain
-- credit balance.
--
-- on_chain_address is nullable (users have a credits row from signup before
-- registering a wallet), so a partial unique index excludes NULLs and allows
-- arbitrarily many users to coexist without a wallet.

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_credits_on_chain_address_unique
    ON user_credits (on_chain_address)
    WHERE on_chain_address IS NOT NULL;
