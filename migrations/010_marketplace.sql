CREATE TABLE marketplace_listings ( 
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), 
    listing_id BIGINT NOT NULL UNIQUE, 
    seller_id UUID NOT NULL REFERENCES users(id), 
    dataset_name TEXT NOT NULL, 
    dataset_description TEXT, 
    ipfs_cid TEXT NOT NULL, 
    metadata_uri TEXT NOT NULL, 
    price_credits BIGINT NOT NULL, 
    on_chain_listing_id BIGINT, 
    transaction_hash TEXT, 
    active BOOLEAN NOT NULL DEFAULT true, 
    sales_count INTEGER NOT NULL DEFAULT 0, 
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW() 
); 
 
CREATE TABLE marketplace_purchases ( 
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), 
    purchase_id BIGINT NOT NULL UNIQUE, 
    listing_id UUID NOT NULL REFERENCES marketplace_listings(id), 
    buyer_id UUID NOT NULL REFERENCES users(id), 
    paid_amount BIGINT NOT NULL, 
    on_chain_purchase_id BIGINT, 
    transaction_hash TEXT, 
    access_granted BOOLEAN NOT NULL DEFAULT false, 
    purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW() 
); 
 
CREATE TABLE seller_ratings ( 
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), 
    seller_id UUID NOT NULL REFERENCES users(id), 
    buyer_id UUID NOT NULL REFERENCES users(id), 
    purchase_id UUID NOT NULL REFERENCES marketplace_purchases(id), 
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5), 
    review_text TEXT, 
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), 
    UNIQUE(purchase_id, buyer_id) 
); 
 
CREATE INDEX idx_listings_seller ON marketplace_listings(seller_id, active); 
CREATE INDEX idx_listings_price ON marketplace_listings(price_credits, active); 
CREATE INDEX idx_purchases_buyer ON marketplace_purchases(buyer_id); 
CREATE INDEX idx_purchases_listing ON marketplace_purchases(listing_id); 
CREATE INDEX idx_ratings_seller ON seller_ratings(seller_id); 
