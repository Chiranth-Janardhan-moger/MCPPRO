"""Configuration and vector-store unit tests (offline)."""

from app.config.settings import Settings


class TestSettingsDefaults:
    def test_current_gemini_model_default(self):
        s = Settings(BEARER_TOKEN="t")
        # gemini-2.0-flash was shut down by Google; default must be newer.
        assert s.GEMINI_MODEL.startswith("gemini-3")

    def test_pinecone_key_is_optional(self):
        s = Settings(BEARER_TOKEN="t")
        assert s.PINECONE_API_KEY is None

    def test_cors_origins_parsed(self):
        s = Settings(BEARER_TOKEN="t", CORS_ORIGINS="http://a.com, http://b.com")
        assert s.cors_origin_list == ["http://a.com", "http://b.com"]

    def test_mcp_auth_token_optional(self):
        s = Settings(BEARER_TOKEN="t")
        assert s.MCP_SERVER_AUTH_TOKEN is None


class TestInMemoryStore:
    def _make_store(self):
        from app.services.vector_stores.inmemory_vector_store import (
            InMemoryVectorStoreService,
        )

        return InMemoryVectorStoreService(embedding_model="text-embedding-3-small")

    def _inject(self, store, doc_id, source, n_chunks):
        from langchain_core.documents import Document

        for i in range(n_chunks):
            doc = Document(
                page_content=f"chunk {i}",
                metadata={"document_id": doc_id, "source": source, "chunk_index": i},
            )
            key = f"{doc_id}-{i}"
            store.vector_store.store[key] = doc

    def test_document_summaries_group_by_id(self):
        store = self._make_store()
        self._inject(store, "doc-1", "report.pdf", 3)
        self._inject(store, "doc-2", "notes.md", 2)

        summaries = store.get_document_summaries()
        by_id = {s["id"]: s for s in summaries}
        assert set(by_id) == {"doc-1", "doc-2"}
        assert by_id["doc-1"]["chunk_count"] == 3
        assert by_id["doc-1"]["file_name"] == "report.pdf"
        assert by_id["doc-1"]["status"] == "ready"

    def test_distinct_metadata_values(self):
        store = self._make_store()
        self._inject(store, "a", "x", 1)
        self._inject(store, "b", "y", 1)
        self._inject(store, "a", "x", 2)
        values = store.get_distinct_metadata_values("document_id")
        assert sorted(values) == ["a", "b"]
