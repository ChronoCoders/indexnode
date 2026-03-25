-- Restore the foreign key constraint on user_credits.user_id that was omitted
-- in migration 005 because the users table was incorrectly assumed to not exist yet.
-- The users table is created in migration 001 and is always present by this point.
ALTER TABLE user_credits
    ADD CONSTRAINT fk_user_credits_user_id
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
