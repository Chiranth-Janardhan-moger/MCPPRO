"""Provider-aware embedding factory.

Vector stores previously hardcoded OpenAIEmbeddings, forcing every deployment
to have an OPENAI_API_KEY even when the chat LLM was Gemini/Groq/etc. This
factory selects an embedding backend from whatever credentials exist:

1. OPENAI_API_KEY  -> OpenAIEmbeddings (text-embedding-3-small)
2. GEMINI_API_KEY  -> GoogleGenerativeAIEmbeddings (gemini-embedding-001)
3. otherwise       -> ValueError with actionable guidance

NOTE on dimensions: OpenAI text-embedding-3-small produces 1536-dim vectors;
Google gemini-embedding-001 produces 3072-dim vectors by default. The
in-memory store is dimension-agnostic, but the Supabase pgvector schema ships
as VECTOR(1536). If you switch embedders, alter the column accordingly
(see schemas/).
"""

from __future__ import annotations

from typing import Any

from app.config.settings import Settings


class EmbeddingFactory:
    @staticmethod
    def create_embedding_model(settings: Settings, model: str | None = None) -> Any:
        """Create an embedder from whatever credentials exist.

        `model` is honoured only when it belongs to the selected provider's
        family — e.g. a configured EMBEDDING_MODEL of "text-embedding-3-small"
        must not be forwarded to Google's API when only a Gemini key exists.
        """
        if settings.OPENAI_API_KEY:
            effective = (
                model
                if model and model.startswith("text-embedding")
                else "text-embedding-3-small"
            )
            from langchain_openai import OpenAIEmbeddings

            return OpenAIEmbeddings(
                model=effective,
                openai_api_key=settings.OPENAI_API_KEY,
            )

        if settings.GEMINI_API_KEY:
            effective = (
                model
                if model and "gemini-embedding" in model
                else "gemini-embedding-001"
            )
            if not effective.startswith("models/"):
                effective = f"models/{effective}"
            from langchain_google_genai import GoogleGenerativeAIEmbeddings

            return GoogleGenerativeAIEmbeddings(
                google_api_key=settings.GEMINI_API_KEY,
                model=effective,
            )

        raise ValueError(
            "No embedding provider configured. Set OPENAI_API_KEY "
            "(text-embedding-3-small) or GEMINI_API_KEY "
            "(gemini-embedding-001) in the environment."
        )
