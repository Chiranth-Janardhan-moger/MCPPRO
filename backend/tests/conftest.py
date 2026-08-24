"""Shared pytest fixtures.

Environment is configured BEFORE any app import so that settings pick up
test values. The suite runs fully offline: no real API keys or network.
"""

import os
import sys
from pathlib import Path

import pytest

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

os.environ.setdefault("BEARER_TOKEN", "test-token-abc123")
os.environ.setdefault("ENVIRONMENT", "development")
os.environ.setdefault("DEFAULT_VECTOR_STORE", "inmemory")
# Dummy key: store construction only needs a non-empty value; no calls made.
os.environ.setdefault("OPENAI_API_KEY", "sk-test-dummy-key")
os.environ.setdefault("ENABLE_REQUEST_LOGGING", "false")
os.environ.setdefault("AGENT_ENABLED", "false")
os.environ.setdefault("SUPABASE_URL", "")
os.environ.setdefault("SUPABASE_ANON_KEY", "")
os.environ.setdefault("SUPABASE_SERVICE_KEY", "")

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

TEST_TOKEN = os.environ["BEARER_TOKEN"]
AUTH_HEADERS = {"Authorization": f"Bearer {TEST_TOKEN}"}


@pytest.fixture()
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture()
def auth_headers():
    return dict(AUTH_HEADERS)
