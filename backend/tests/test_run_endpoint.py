"""Endpoint contract tests with mocked services (no LLM/network calls)."""

import sys
import types
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.api.v1.endpoints import mcppro_agent as endpoint_module
from tests.conftest import AUTH_HEADERS


class StubAgent:
    async def process_request(self, document_url, questions, k=10):
        return {
            "answers": [f"answer-{q}" for q in questions],
            "execution_log": [{"mode": "agentic"}],
            "preprocessed": True,
        }


class StubRetrieval:
    async def process_document_queries(self, document_id, questions, k=10):
        return {
            "answers": [f"rag-{q}" for q in questions],
            "debug_info": [{"question": q} for q in questions],
        }


class StubVectorStore:
    store_type = "inmemory"

    def get_distinct_metadata_values(self, key):
        return []

    def get_document_summaries(self):
        return []


@pytest.fixture()
def stubbed_services(monkeypatch):
    services = {
        "vector_store": StubVectorStore(),
        "llm_provider": types.SimpleNamespace(provider_name="stub"),
        "mcppro_agent": StubAgent(),
        "document_processor": types.SimpleNamespace(
            file_processor=types.SimpleNamespace(use_llm_pdf_loader=False)
        ),
        "retrieval_service": StubRetrieval(),
    }
    monkeypatch.setattr(endpoint_module, "_get_services", lambda: services)
    # Disable background Supabase logging in tests.
    monkeypatch.setattr(
        endpoint_module,
        "log_request_background",
        lambda *a, **kw: None,
    )
    return services


def test_run_agentic_mode(client, auth_headers, stubbed_services):
    res = client.post(
        "/mcppro-agent/run",
        headers=auth_headers,
        json={
            "documents": "https://example.com/report.pdf",
            "questions": ["What is revenue?"],
            "use_agent": True,
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert body["success"] is True
    assert body["answers"] == ["answer-What is revenue?"]
    assert body["document_metadata"]["processing_mode"] == "agentic"


def test_run_traditional_mode(client, auth_headers, stubbed_services, monkeypatch):
    import app.services.pipelines.traditional_rag as tr

    async def fake_traditional(**kwargs):
        return ["rag-answer"], {"processing_mode": "traditional"}, {}

    monkeypatch.setattr(endpoint_module, "traditional_rag", fake_traditional)

    res = client.post(
        "/mcppro-agent/run",
        headers=auth_headers,
        json={
            "documents": "https://example.com/report.pdf",
            "questions": ["Q1"],
            "use_agent": False,
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert body["answers"] == ["rag-answer"]
    assert body["document_metadata"]["processing_mode"] == "traditional"


def test_run_production_response_is_trimmed(client, auth_headers, stubbed_services, monkeypatch):
    monkeypatch.setattr(endpoint_module.settings, "ENVIRONMENT", "production")
    res = client.post(
        "/mcppro-agent/run",
        headers=auth_headers,
        json={
            "documents": "https://example.com/report.pdf",
            "questions": ["Q1"],
            "use_agent": True,
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert set(body.keys()) == {"success", "answers"}
