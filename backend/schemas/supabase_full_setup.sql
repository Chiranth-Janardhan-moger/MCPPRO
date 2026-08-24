-- ============================================================================
-- MCPPro — Complete Supabase Setup
-- Run this ONCE in the Supabase SQL Editor (Dashboard → SQL Editor).
-- Safe to re-run: every statement is idempotent.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. EXTENSIONS
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS vector;

-- ----------------------------------------------------------------------------
-- 2. CHAT: CONVERSATIONS + MESSAGES (row-level security enforced per user)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'New Chat',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_user
    ON conversations(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'data')),
    content TEXT NOT NULL DEFAULT '',
    tool_invocations JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation
    ON messages(conversation_id, created_at);

-- Keep conversations.updated_at fresh automatically.
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_conversations_touch ON conversations;
CREATE TRIGGER trg_conversations_touch
    BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_conversations_select" ON conversations;
CREATE POLICY "own_conversations_select" ON conversations
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "own_conversations_insert" ON conversations;
CREATE POLICY "own_conversations_insert" ON conversations
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "own_conversations_update" ON conversations;
CREATE POLICY "own_conversations_update" ON conversations
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "own_conversations_delete" ON conversations;
CREATE POLICY "own_conversations_delete" ON conversations
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- Messages inherit ownership through their conversation.
DROP POLICY IF EXISTS "own_messages_select" ON messages;
CREATE POLICY "own_messages_select" ON messages
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM conversations c
            WHERE c.id = messages.conversation_id
              AND c.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "own_messages_insert" ON messages;
CREATE POLICY "own_messages_insert" ON messages
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM conversations c
            WHERE c.id = messages.conversation_id
              AND c.user_id = auth.uid()
        )
    );

-- ----------------------------------------------------------------------------
-- 3. USER DOCUMENT METADATA (what the sidebar Document Manager reads)
--    NOTE: distinct from the pgvector `documents` chunk table in section 5.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ready'
        CHECK (status IN ('pending', 'processing', 'ready', 'failed')),
    document_ref TEXT,           -- vector-store document_id after indexing
    chunk_count INTEGER,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_documents_user
    ON user_documents(user_id, created_at DESC);

ALTER TABLE user_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_user_documents_select" ON user_documents;
CREATE POLICY "own_user_documents_select" ON user_documents
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "own_user_documents_insert" ON user_documents;
CREATE POLICY "own_user_documents_insert" ON user_documents
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "own_user_documents_update" ON user_documents;
CREATE POLICY "own_user_documents_update" ON user_documents
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "own_user_documents_delete" ON user_documents;
CREATE POLICY "own_user_documents_delete" ON user_documents
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 4. REQUEST LOGGING (written by the FastAPI backend with the service key;
--    readable by any authenticated user for the admin dashboard)
-- ----------------------------------------------------------------------------
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

ALTER TABLE mcppro_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_read_requests" ON mcppro_requests;
CREATE POLICY "authenticated_read_requests" ON mcppro_requests
    FOR SELECT TO authenticated
    USING (true);
-- Writes happen with SUPABASE_SERVICE_KEY which bypasses RLS.

-- ----------------------------------------------------------------------------
-- 5. PGVECTOR CHUNK STORE (used by the backend SupabaseVectorStore)
--    Service-key writes only; no direct client access.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT,
    metadata JSONB,
    embedding VECTOR(1536)
);

CREATE INDEX IF NOT EXISTS documents_embedding_idx ON documents
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX IF NOT EXISTS documents_metadata_idx ON documents USING GIN (metadata);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
-- No policies: only the service role touches chunk rows directly.

CREATE OR REPLACE FUNCTION match_documents(
    query_embedding VECTOR(1536),
    filter JSONB DEFAULT '{}'
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    metadata JSONB,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
#variable_conflict use_column
BEGIN
    RETURN query
    SELECT
        id,
        content,
        metadata,
        1 - (documents.embedding <=> query_embedding) AS similarity
    FROM documents
    WHERE metadata @> filter
    ORDER BY documents.embedding <=> query_embedding;
END;
$$;

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION match_documents TO service_role;

CREATE OR REPLACE FUNCTION get_document_count(filter JSONB DEFAULT '{}')
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    doc_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO doc_count
    FROM documents
    WHERE metadata @> filter;
    RETURN doc_count;
END;
$$;

GRANT EXECUTE ON FUNCTION get_document_count TO service_role;

CREATE OR REPLACE FUNCTION delete_documents(filter JSONB DEFAULT '{}')
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM documents
    WHERE metadata @> filter;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_documents TO service_role;

-- ----------------------------------------------------------------------------
-- 6. STORAGE BUCKET for generated images (public read)
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('generated-images', 'generated-images', true)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- DONE. Verify with:
--   select table_name from information_schema.tables
--   where table_schema='public';
-- Expected: conversations, messages, user_documents, mcppro_requests, documents
-- ----------------------------------------------------------------------------
