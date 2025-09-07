-- DeSciChain Database Schema
-- Extends existing Stelace database with ML marketplace tables

-- Published Models Table
CREATE TABLE IF NOT EXISTS published_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lab_id VARCHAR(255) NOT NULL,
    model_cid VARCHAR(255) NOT NULL UNIQUE,
    algorand_txn_id VARCHAR(255) NOT NULL,
    blockchain_model_id INTEGER NOT NULL,
    encryption_key_hash VARCHAR(255) NOT NULL,
    encryption_metadata JSONB, -- Metadata about encryption (algorithm, key derivation, etc.)
    license_terms JSONB NOT NULL,
    watermark VARCHAR(255),
    watermark_position INTEGER,
    publisher_address VARCHAR(255) NOT NULL,
    file_size BIGINT, -- File size in bytes
    price_algo DECIMAL(10, 6), -- Price in ALGO
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Model Purchases Table
CREATE TABLE IF NOT EXISTS model_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_wallet VARCHAR(255) NOT NULL,
    model_id UUID REFERENCES published_models(id) ON DELETE CASCADE,
    escrow_id VARCHAR(255) NOT NULL UNIQUE,
    escrow_txn_id VARCHAR(255) NOT NULL,
    price INTEGER NOT NULL, -- Price in microAlgos
    status VARCHAR(50) CHECK (status IN ('pending', 'completed', 'refunded', 'failed')) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    encryption_key_hash VARCHAR(255) -- Hash of the encryption key
);

-- Model Metadata Table
CREATE TABLE IF NOT EXISTS model_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID REFERENCES published_models(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    version VARCHAR(50),
    framework VARCHAR(100), -- e.g., 'tensorflow', 'pytorch', 'scikit-learn'
    model_type VARCHAR(100), -- e.g., 'classification', 'regression', 'nlp'
    tags TEXT[], -- Array of tags
    performance_metrics JSONB, -- Performance metrics as JSON
    dataset_info JSONB, -- Information about training dataset
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Lab Information Table
CREATE TABLE IF NOT EXISTS labs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    website VARCHAR(255),
    contact_email VARCHAR(255),
    wallet_address VARCHAR(255) UNIQUE,
    verification_status VARCHAR(50) CHECK (verification_status IN ('pending', 'verified', 'rejected')) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Model Reviews Table
CREATE TABLE IF NOT EXISTS model_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID REFERENCES published_models(id) ON DELETE CASCADE,
    buyer_wallet VARCHAR(255) NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    performance_rating INTEGER CHECK (performance_rating >= 1 AND performance_rating <= 5),
    ease_of_use_rating INTEGER CHECK (ease_of_use_rating >= 1 AND ease_of_use_rating <= 5),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Model Downloads Table (for analytics)
CREATE TABLE IF NOT EXISTS model_downloads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID REFERENCES published_models(id) ON DELETE CASCADE,
    buyer_wallet VARCHAR(255) NOT NULL,
    download_timestamp TIMESTAMP DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- Escrow States Table (for persistence)
CREATE TABLE IF NOT EXISTS escrow_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    escrow_id VARCHAR(255) NOT NULL UNIQUE,
    model_id INTEGER NOT NULL,
    buyer VARCHAR(255) NOT NULL,
    publisher VARCHAR(255) NOT NULL,
    price INTEGER NOT NULL,
    status VARCHAR(50) CHECK (status IN ('pending', 'completed', 'refunded', 'failed')) DEFAULT 'pending',
    txn_id VARCHAR(255) NOT NULL,
    encryption_key_hash VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- Model Access Keys Table (secure key delivery)
CREATE TABLE IF NOT EXISTS model_access_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID REFERENCES published_models(id) ON DELETE CASCADE,
    buyer_address VARCHAR(255) NOT NULL,
    encrypted_key TEXT NOT NULL, -- RSA-encrypted key for buyer
    key_hash VARCHAR(255) NOT NULL, -- Hash of the original key
    key_type VARCHAR(50) DEFAULT 'AES-256-GCM', -- Encryption algorithm used
    access_granted_at TIMESTAMP DEFAULT NOW(),
    access_expires_at TIMESTAMP, -- Optional expiration
    download_count INTEGER DEFAULT 0,
    max_downloads INTEGER DEFAULT 10, -- Limit downloads
    created_at TIMESTAMP DEFAULT NOW()
);

-- API Keys Table (for backend authentication)
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_hash VARCHAR(255) NOT NULL UNIQUE,
    key_name VARCHAR(255),
    permissions JSONB, -- Array of permissions
    lab_id UUID REFERENCES labs(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Pending Models Table (before blockchain confirmation)
CREATE TABLE IF NOT EXISTS pending_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    publisher_address VARCHAR(255) NOT NULL,
    framework VARCHAR(100),
    model_type VARCHAR(100),
    price DECIMAL(10, 6) NOT NULL,
    license_terms VARCHAR(100),
    tags TEXT[],
    file_size BIGINT,
    cid VARCHAR(255) NOT NULL,
    encryption_metadata JSONB,
    encryption_key_hash VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending_blockchain',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Pending Purchases Table (before blockchain confirmation)
CREATE TABLE IF NOT EXISTS pending_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID NOT NULL,
    buyer_address VARCHAR(255) NOT NULL,
    price INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'pending_payment',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_published_models_lab_id ON published_models(lab_id);
CREATE INDEX IF NOT EXISTS idx_published_models_created_at ON published_models(created_at);
CREATE INDEX IF NOT EXISTS idx_published_models_publisher ON published_models(publisher_address);
CREATE INDEX IF NOT EXISTS idx_model_purchases_buyer ON model_purchases(buyer_wallet);
CREATE INDEX IF NOT EXISTS idx_model_purchases_status ON model_purchases(status);
CREATE INDEX IF NOT EXISTS idx_model_metadata_model_id ON model_metadata(model_id);
CREATE INDEX IF NOT EXISTS idx_model_metadata_framework ON model_metadata(framework);
CREATE INDEX IF NOT EXISTS idx_model_metadata_model_type ON model_metadata(model_type);
CREATE INDEX IF NOT EXISTS idx_model_reviews_model_id ON model_reviews(model_id);
CREATE INDEX IF NOT EXISTS idx_model_downloads_model_id ON model_downloads(model_id);
CREATE INDEX IF NOT EXISTS idx_escrow_states_escrow_id ON escrow_states(escrow_id);
CREATE INDEX IF NOT EXISTS idx_escrow_states_buyer ON escrow_states(buyer);
CREATE INDEX IF NOT EXISTS idx_escrow_states_publisher ON escrow_states(publisher);
CREATE INDEX IF NOT EXISTS idx_model_access_keys_model_id ON model_access_keys(model_id);
CREATE INDEX IF NOT EXISTS idx_model_access_keys_buyer ON model_access_keys(buyer_address);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_lab_id ON api_keys(lab_id);
CREATE INDEX IF NOT EXISTS idx_pending_models_publisher ON pending_models(publisher_address);
CREATE INDEX IF NOT EXISTS idx_pending_models_status ON pending_models(status);
CREATE INDEX IF NOT EXISTS idx_pending_purchases_buyer ON pending_purchases(buyer_address);
CREATE INDEX IF NOT EXISTS idx_pending_purchases_model_id ON pending_purchases(model_id);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_published_models_updated_at 
    BEFORE UPDATE ON published_models 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_model_metadata_updated_at 
    BEFORE UPDATE ON model_metadata 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_model_reviews_updated_at 
    BEFORE UPDATE ON model_reviews 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_labs_updated_at 
    BEFORE UPDATE ON labs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Views for common queries
CREATE OR REPLACE VIEW model_stats AS
SELECT 
    pm.id,
    pm.lab_id,
    pm.model_cid,
    pm.blockchain_model_id,
    pm.publisher_address,
    pm.created_at,
    mm.name,
    mm.description,
    mm.framework,
    mm.model_type,
    mm.tags,
    mm.performance_metrics,
    COUNT(mp.id) as purchase_count,
    COUNT(md.id) as download_count,
    AVG(mr.rating) as average_rating,
    COUNT(mr.id) as review_count
FROM published_models pm
LEFT JOIN model_metadata mm ON pm.id = mm.model_id
LEFT JOIN model_purchases mp ON pm.id = mp.model_id AND mp.status = 'completed'
LEFT JOIN model_downloads md ON pm.id = md.model_id
LEFT JOIN model_reviews mr ON pm.id = mr.model_id
GROUP BY pm.id, pm.lab_id, pm.model_cid, pm.blockchain_model_id, pm.publisher_address, pm.created_at, mm.name, mm.description, mm.framework, mm.model_type, mm.tags, mm.performance_metrics;

CREATE OR REPLACE VIEW lab_stats AS
SELECT 
    l.id,
    l.name,
    l.description,
    l.website,
    l.contact_email,
    l.wallet_address,
    l.verification_status,
    l.created_at,
    COUNT(pm.id) as model_count,
    COUNT(mp.id) as total_purchases,
    SUM(mp.price) as total_revenue,
    AVG(mr.rating) as average_rating
FROM labs l
LEFT JOIN published_models pm ON l.id = pm.lab_id
LEFT JOIN model_purchases mp ON pm.id = mp.model_id AND mp.status = 'completed'
LEFT JOIN model_reviews mr ON pm.id = mr.model_id
GROUP BY l.id, l.name, l.description, l.website, l.contact_email, l.wallet_address, l.verification_status, l.created_at;

-- Sample data for testing (optional)
INSERT INTO labs (id, name, description, website, contact_email, wallet_address, verification_status) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'MIT AI Lab', 'Leading AI research laboratory', 'https://ai.mit.edu', 'contact@ai.mit.edu', 'MITWALLET123', 'verified'),
('550e8400-e29b-41d4-a716-446655440001', 'Stanford ML Group', 'Machine learning research group', 'https://ml.stanford.edu', 'contact@ml.stanford.edu', 'STANFORDWALLET456', 'verified'),
('550e8400-e29b-41d4-a716-446655440002', 'Berkeley AI Lab', 'AI research laboratory', 'https://ai.berkeley.edu', 'contact@ai.berkeley.edu', 'BERKELEYWALLET789', 'pending')
ON CONFLICT (id) DO NOTHING;
