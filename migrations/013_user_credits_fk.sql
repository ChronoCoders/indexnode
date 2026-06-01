ALTER TABLE user_credits
    ADD CONSTRAINT fk_user_credits_user_id
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
