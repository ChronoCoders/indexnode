-- Allow users to have credits before registering a wallet address.
ALTER TABLE user_credits ALTER COLUMN on_chain_address DROP NOT NULL;

-- Track signup bonus as a distinct transaction type.
ALTER TABLE credit_transactions DROP CONSTRAINT IF EXISTS credit_transactions_transaction_type_check;
ALTER TABLE credit_transactions ADD CONSTRAINT credit_transactions_transaction_type_check
    CHECK (transaction_type IN ('purchase', 'spend', 'bonus'));
