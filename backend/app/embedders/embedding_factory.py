"""Provider-aware embedding factory.

Selects an embedding backend from whatever credentials exist:
1. OPENAI_API_KEY  -> OpenAIEmbeddings (text-embedding-3-small)
2. GEMINI_API_KEY / GOOGLE_API_KEY -> GoogleGenerativeAIEmbeddings (gemini-embedding-001)
3. fallback -> Deterministic zero-config Embeddings for offline & in-memory vector stores
"""

from __future__ import annotations

import hashlib
import math
import os
from typing import Any, List

from app.config.settings import Settings


class DeterministicEmbeddings:
    """Fast zero-dependency embedding provider based on feature hashing for zero-config in-memory RAG."""

    def __init__(self, dim: int = 1536):
        self.dim = dim

    def _embed_text(self, text: str) -> List[float]:
        vec = [0.0] * self.dim
        words = text.lower().split()
        if not words:
            return vec
        for word in words:
            h = int(hashlib.md5(word.encode("utf-8")).hexdigest(), 16)
            idx = h % self.dim
            sign = 1.0 if (h // self.dim) % 2 == 0 else -1.0
            vec[idx] += sign
        norm = math.sqrt(sum(x * x for x in vec)) or 1.0
        return [x / norm for x in vec]

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        return [self._embed_text(t) for t in texts]

    def embed_query(self, text: str) -> List[float]:
        return self._embed_text(text)


class EmbeddingFactory:
    @staticmethod
    def create_embedding_model(settings: Settings, model: str | None = None) -> Any:
        openai_key = settings.OPENAI_API_KEY or os.getenv("OPENAI_API_KEY")
        if openai_key:
            effective = (
                model
                if model and model.startswith("text-embedding")
                else "text-embedding-3-small"
            )
            try:
                from langchain_openai import OpenAIEmbeddings

                return OpenAIEmbeddings(
                    model=effective,
                    openai_api_key=openai_key,
                )
            except Exception as e:
                print(f"OpenAIEmbeddings init failed: {e}")

        gemini_key = (
            settings.GEMINI_API_KEY
            or getattr(settings, "GOOGLE_API_KEY", None)
            or getattr(settings, "GOOGLE_GENERATIVE_AI_API_KEY", None)
            or os.getenv("GEMINI_API_KEY")
            or os.getenv("GOOGLE_API_KEY")
            or os.getenv("GOOGLE_GENERATIVE_AI_API_KEY")
        )
        if gemini_key:
            effective = (
                model
                if model and "gemini-embedding" in model
                else "gemini-embedding-001"
            )
            if not effective.startswith("models/"):
                effective = f"models/{effective}"
            try:
                from langchain_google_genai import GoogleGenerativeAIEmbeddings

                return GoogleGenerativeAIEmbeddings(
                    google_api_key=gemini_key,
                    model=effective,
                )
            except Exception as e:
                print(f"GoogleGenerativeAIEmbeddings init failed: {e}")

        # Fallback to deterministic embedder to guarantee in-memory RAG never crashes
        print("Using zero-config deterministic embeddings fallback for in-memory store")
        return DeterministicEmbeddings(dim=1536)
