-- MCPPro API Request Logging Tables
-- Run this script in your Supabase SQL editor to create the required tables

CREATE TABLE IF NOT EXISTS mcppro_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    document_url TEXT NOT NULL,
    questions JSONB NOT NULL,
    answers JSONB NOT NULL,
    processing_time FLOAT NOT NULL,
    document_metadata JSONB NOT NULL,
    raw_response JSONB NOT NULL,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    questions_count INTEGER,
    chunks_processed INTEGER,
    vector_store TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mcppro_requests_timestamp ON mcppro_requests(timestamp);
CREATE INDEX IF NOT EXISTS idx_mcppro_requests_success ON mcppro_requests(success);
CREATE INDEX IF NOT EXISTS idx_mcppro_requests_vector_store ON mcppro_requests(vector_store);
