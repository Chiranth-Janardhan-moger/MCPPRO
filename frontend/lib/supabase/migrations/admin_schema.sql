-- Migration for Admin Panel, Global System Documents, Context-Aware Routing & Analytics

-- 1. System Settings Table
CREATE TABLE IF NOT EXISTS app_system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by TEXT
);

-- 2. User Documents Table (Create if not exists)
CREATE TABLE IF NOT EXISTS user_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    file_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ready',
    document_ref TEXT,
    chunk_count INTEGER DEFAULT 0,
    file_size BIGINT DEFAULT 0,
    is_global BOOLEAN NOT NULL DEFAULT FALSE,
    uploaded_by_email TEXT,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2b. Add columns if user_documents table already exists
ALTER TABLE user_documents ADD COLUMN IF NOT EXISTS is_global BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE user_documents ADD COLUMN IF NOT EXISTS uploaded_by_email TEXT;
ALTER TABLE user_documents ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE user_documents ADD COLUMN IF NOT EXISTS chunk_count INTEGER DEFAULT 0;
ALTER TABLE user_documents ADD COLUMN IF NOT EXISTS file_size BIGINT DEFAULT 0;
ALTER TABLE user_documents ADD COLUMN IF NOT EXISTS document_ref TEXT;
ALTER TABLE user_documents ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ready';
ALTER TABLE user_documents ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE user_documents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_user_documents_user_id ON user_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_documents_is_global ON user_documents(is_global);

-- 3. Telemetry & Analytics Requests Table
CREATE TABLE IF NOT EXISTS mcppro_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    document_url TEXT NOT NULL DEFAULT 'general-query',
    questions JSONB NOT NULL DEFAULT '[]'::jsonb,
    answers JSONB NOT NULL DEFAULT '[]'::jsonb,
    processing_time FLOAT NOT NULL DEFAULT 0,
    document_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    raw_response JSONB NOT NULL DEFAULT '{}'::jsonb,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    questions_count INTEGER DEFAULT 1,
    chunks_processed INTEGER DEFAULT 0,
    vector_store TEXT DEFAULT 'system',
    user_id TEXT,
    user_email TEXT,
    model TEXT DEFAULT 'gemini-3.6-flash',
    route TEXT DEFAULT 'DIRECT',
    router_confidence FLOAT DEFAULT 1.0,
    router_reasoning TEXT,
    tokens_used INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3b. Add columns if mcppro_requests table already exists
ALTER TABLE mcppro_requests ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE mcppro_requests ADD COLUMN IF NOT EXISTS user_email TEXT;
ALTER TABLE mcppro_requests ADD COLUMN IF NOT EXISTS model TEXT DEFAULT 'gemini-3.6-flash';
ALTER TABLE mcppro_requests ADD COLUMN IF NOT EXISTS route TEXT DEFAULT 'DIRECT';
ALTER TABLE mcppro_requests ADD COLUMN IF NOT EXISTS router_confidence FLOAT DEFAULT 1.0;
ALTER TABLE mcppro_requests ADD COLUMN IF NOT EXISTS router_reasoning TEXT;
ALTER TABLE mcppro_requests ADD COLUMN IF NOT EXISTS tokens_used INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_mcppro_requests_timestamp ON mcppro_requests(timestamp);
CREATE INDEX IF NOT EXISTS idx_mcppro_requests_success ON mcppro_requests(success);
CREATE INDEX IF NOT EXISTS idx_mcppro_requests_user_id ON mcppro_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_mcppro_requests_route ON mcppro_requests(route);
CREATE INDEX IF NOT EXISTS idx_mcppro_requests_model ON mcppro_requests(model);
