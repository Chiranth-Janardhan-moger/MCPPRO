"""Security-focused API tests: auth enforcement and information leakage."""

from tests.conftest import TEST_TOKEN


class TestAuthenticationEnforcement:
    def test_root_is_public(self, client):
        res = client.get("/")
        assert res.status_code == 200
        body = res.json()
        assert "MCPPro" in body["message"]

    def test_public_health_leaks_nothing(self, client):
        """The unauthenticated /health must not reveal store/provider internals."""
        res = client.get("/health")
        assert res.status_code == 200
        body = res.json()
        assert body == {"status": "healthy"}
        assert "vector_store" not in body
        assert "llm_provider" not in body

    def test_run_requires_auth(self, client):
        res = client.post(
            "/mcppro-agent/run",
            json={"documents": "https://example.com/a.pdf", "questions": ["q?"]},
        )
        assert res.status_code == 401

    def test_run_rejects_bad_token(self, client):
        res = client.post(
            "/mcppro-agent/run",
            headers={"Authorization": "Bearer wrong-token"},
            json={"documents": "https://example.com/a.pdf", "questions": ["q?"]},
        )
        assert res.status_code == 401

    def test_run_rejects_malformed_header(self, client):
        res = client.post(
            "/mcppro-agent/run",
            headers={"Authorization": "Basic abc"},
            json={"documents": "https://example.com/a.pdf", "questions": ["q?"]},
        )
        assert res.status_code == 401

    def test_detailed_health_requires_auth(self, client):
        res = client.get("/mcppro-agent/health")
        assert res.status_code == 401

    def test_documents_list_requires_auth(self, client):
        res = client.get("/documents")
        assert res.status_code == 401

    def test_document_upload_requires_auth(self, client):
        res = client.post(
            "/documents/upload",
            files={"file": ("a.txt", b"hello", "text/plain")},
        )
        assert res.status_code == 401


class TestAuthenticatedEndpoints:
    def test_detailed_health_with_token(self, client, auth_headers):
        res = client.get("/mcppro-agent/health", headers=auth_headers)
        assert res.status_code == 200
        body = res.json()
        assert body["status"] == "healthy"
        assert body["vector_store"] == "inmemory"

    def test_documents_list_with_token(self, client, auth_headers):
        res = client.get("/documents", headers=auth_headers)
        assert res.status_code == 200
        assert isinstance(res.json(), list)

    def test_upload_rejects_disallowed_extension(self, client, auth_headers):
        res = client.post(
            "/documents/upload",
            headers=auth_headers,
            files={"file": ("evil.exe", b"MZ...", "application/octet-stream")},
        )
        assert res.status_code == 400
        assert "Unsupported file type" in res.json()["detail"]

    def test_upload_rejects_empty_file(self, client, auth_headers):
        res = client.post(
            "/documents/upload",
            headers=auth_headers,
            files={"file": ("empty.txt", b"", "text/plain")},
        )
        assert res.status_code == 400


class TestRunValidation:
    def test_run_rejects_empty_questions(self, client, auth_headers):
        res = client.post(
            "/mcppro-agent/run",
            headers=auth_headers,
            json={"documents": "https://example.com/a.pdf", "questions": []},
        )
        assert res.status_code == 422

    def test_run_rejects_oversized_input(self, client, auth_headers):
        res = client.post(
            "/mcppro-agent/run",
            headers=auth_headers,
            json={
                "documents": "https://example.com/a.pdf",
                "questions": ["x" * 9000],
            },
        )
        assert res.status_code == 422
