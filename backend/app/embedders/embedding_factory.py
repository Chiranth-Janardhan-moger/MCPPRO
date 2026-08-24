"""Provider-aware embedding factory.

Selects an embedding backend from whatever credentials or libraries exist:
1. FastEmbed BGE (BAAI/bge-small-en-v1.5 or BAAI/bge-m3) -> Offline ONNX CPU embeddings (Zero API keys, ideal for Render)
2. OPENAI_API_KEY -> OpenAIEmbeddings (text-embedding-3-small)
3. GEMINI_API_KEY / GOOGLE_API_KEY -> GoogleGenerativeAIEmbeddings (gemini-embedding-001)
4. DeterministicEmbeddings -> Zero-dependency feature hashing fallback
"""

from __future__ import annotations

import hashlib
import math
import os
from typing import Any, List

from app.config.settings import Settings


class FastEmbedOfflineEmbeddings:
    """Offline BGE embeddings using FastEmbed ONNX runtime (CPU optimized for server/Render)."""

    def __init__(self, model_name: str = "BAAI/bge-small-en-v1.5"):
        from fastembed import TextEmbedding

        self.model_name = model_name
        self.client = TextEmbedding(model_name=model_name)

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        embeddings = list(self.client.embed(texts))
        return [e.tolist() for e in embeddings]

    def embed_query(self, text: str) -> List[float]:
        embeddings = list(self.client.embed([text]))
        return embeddings[0].tolist()


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
        # 1. Check if user configured FastEmbed / BGE offline model
        requested_model = (model or getattr(settings, "EMBEDDING_MODEL", "")).lower()
        if "bge" in requested_model or "fastembed" in requested_model:
            try:
                bge_model = (
                    "BAAI/bge-m3"
                    if "m3" in requested_model
                    else "BAAI/bge-small-en-v1.5"
                )
                print(f"Initializing FastEmbed offline embeddings ({bge_model})...")
                return FastEmbedOfflineEmbeddings(model_name=bge_model)
            except Exception as e:
                print(f"FastEmbed BGE offline init deferred: {e}")

        # 2. Check OpenAI credentials
        openai_key = settings.OPENAI_API_KEY or os.getenv("OPENAI_API_KEY")
        if openai_key and ("openai" in requested_model or "text-embedding" in requested_model or not requested_model):
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

        # 3. Check Google Gemini credentials
        gemini_key = (
            settings.GEMINI_API_KEY
            or getattr(settings, "GOOGLE_API_KEY", None)
            or getattr(settings, "GOOGLE_GENERATIVE_AI_API_KEY", None)
            or os.getenv("GEMINI_API_KEY")
            or os.getenv("GOOGLE_API_KEY")
            or os.getenv("GOOGLE_GENERATIVE_AI_API_KEY")
        )
        if gemini_key and ("gemini" in requested_model or "google" in requested_model or not openai_key):
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

        # 4. Try FastEmbed BGE as preferred offline server embedder
        try:
            print("Trying default FastEmbed BAAI/bge-small-en-v1.5 offline embedder...")
            return FastEmbedOfflineEmbeddings(model_name="BAAI/bge-small-en-v1.5")
        except Exception as e:
            print(f"FastEmbed fallback not available, using deterministic hasher: {e}")

        # 5. Deterministic offline fallback
        print("Using zero-config deterministic embeddings fallback for in-memory store")
        return DeterministicEmbeddings(dim=1536)
