#!/usr/bin/env python3
"""
Phase 10: Vector Store Caching Benchmark
Evaluates cold request vs warm request performance using VectorStoreCache and InMemoryVectorStoreService.
Measures cold latency, warm latency, cache lookup time, speedup factor, latency reduction percentage, and disk storage.
"""

import os
import sys
import time
import json
import statistics
from pathlib import Path

# Add benchmark directory and initialize compatibility shims
sys.path.insert(0, str(Path(__file__).resolve().parent))
import benchmark_common
from benchmark_common import (
    measure_memory_mb, calculate_distribution_stats,
    save_benchmark_results, DATASETS_DIR, RAW_DIR
)

from app.services.vector_stores.vector_store_cache import VectorStoreCache
from app.services.preprocessors.file_processor import FileProcessor
from langchain_core.vectorstores import InMemoryVectorStore
from langchain_core.documents import Document
import numpy as np
from langchain_core.embeddings import Embeddings

class DeterministicCacheEmbedder(Embeddings):
    def __init__(self, dimension: int = 1536):
        self.dimension = dimension

    def _embed_str(self, text: str) -> list:
        import hashlib
        seed = int(hashlib.md5(text.encode()).hexdigest(), 16) % (2**32)
        rng = np.random.RandomState(seed)
        vec = rng.randn(self.dimension).astype(np.float32)
        norm = np.linalg.norm(vec)
        return (vec / norm).tolist() if norm > 0 else vec.tolist()

    def embed_documents(self, texts: list) -> list:
        return [self._embed_str(t) for t in texts]

    def embed_query(self, text: str) -> list:
        return self._embed_str(text)

def run_cache_benchmark():
    print("==================================================")
    print("         Phase 10: Vector Store Caching           ")
    print("==================================================")

    cache_dir = Path("vector_store_cache")
    cache_manager = VectorStoreCache(str(cache_dir))
    embedder = DeterministicCacheEmbedder(dimension=1536)
    file_processor = FileProcessor(use_llm_pdf_loader=False, use_pptx_ocr=False)

    docs_dir = DATASETS_DIR / "documents"
    test_docs = list(docs_dir.glob("*.pdf")) + list(docs_dir.glob("*.docx")) + list(docs_dir.glob("*.txt"))
    test_docs = test_docs[:10]  # Benchmark 10 representative documents

    print(f"Benchmarking caching across {len(test_docs)} documents...")

    measurements = []

    for doc_path in test_docs:
        doc_url = f"file://{doc_path.resolve()}"
        file_ext = doc_path.suffix.lower()
        detected_type = file_processor.supported_extensions.get(file_ext, "application/octet-stream")

        # 0. Ensure Clean Cache for Cold Run
        cache_manager.clear_cache(doc_url)
        assert not cache_manager.has_cached_store(doc_url), "Cache must be cleared for cold run"

        # -------------------------------------------------------------
        # 1. Cold Request: Parse + Split + Embed + Index + Dump to Cache
        # -------------------------------------------------------------
        t0_cold = time.perf_counter()
        
        load_res = file_processor.load_document(str(doc_path), detected_type)
        if not load_res["success"]:
            continue
        chunk_res = file_processor.process_to_chunks(load_res["documents"], detected_type)
        if not chunk_res["success"]:
            continue
        
        chunks = chunk_res["chunks"]
        store = InMemoryVectorStore(embedding=embedder)
        store.add_documents(chunks)
        
        # Dump to cache
        temp_dump_path = str(cache_dir / f"temp_{int(time.time()*1000)}.vs")
        store.dump(temp_dump_path)
        cache_success = cache_manager.cache_vector_store(doc_url, temp_dump_path)
        
        cold_latency_s = time.perf_counter() - t0_cold

        # -------------------------------------------------------------
        # 2. Cache Lookup Latency
        # -------------------------------------------------------------
        t0_lookup = time.perf_counter()
        has_cache = cache_manager.has_cached_store(doc_url)
        cache_path = cache_manager.get_cache_path(doc_url)
        lookup_latency_s = time.perf_counter() - t0_lookup

        # -------------------------------------------------------------
        # 3. Warm Request: Direct Deserialization from Disk
        # -------------------------------------------------------------
        t0_warm = time.perf_counter()
        loaded_store = InMemoryVectorStore.load(cache_path, embedding=embedder)
        warm_latency_s = time.perf_counter() - t0_warm

        # Metrics computation
        speedup = cold_latency_s / warm_latency_s if warm_latency_s > 0 else 1.0
        reduction_pct = ((cold_latency_s - warm_latency_s) / cold_latency_s) * 100 if cold_latency_s > 0 else 0.0

        file_size_bytes = Path(cache_path).stat().st_size if cache_path and Path(cache_path).exists() else 0

        record = {
            "document": doc_path.name,
            "document_url": doc_url,
            "chunks_count": len(chunks),
            "cold_latency_s": round(cold_latency_s, 5),
            "warm_latency_s": round(warm_latency_s, 5),
            "cache_lookup_latency_ms": round(lookup_latency_s * 1000, 4),
            "cache_speedup_factor": round(speedup, 2),
            "latency_reduction_percent": round(reduction_pct, 2),
            "cached_file_size_bytes": file_size_bytes,
            "cached_file_size_kb": round(file_size_bytes / 1024, 2),
            "cold_cache_hit": False,
            "warm_cache_hit": True
        }
        measurements.append(record)
        print(f"Doc: {doc_path.name[:30]} | Cold: {cold_latency_s:.4f}s | Warm: {warm_latency_s:.4f}s | Speedup: {speedup:.1f}x ({reduction_pct:.1f}% reduction)")

    # Aggregate Statistics
    cold_lats = [m["cold_latency_s"] for m in measurements]
    warm_lats = [m["warm_latency_s"] for m in measurements]
    speedups = [m["cache_speedup_factor"] for m in measurements]
    reductions = [m["latency_reduction_percent"] for m in measurements]
    lookups = [m["cache_lookup_latency_ms"] for m in measurements]

    summary = {
        "total_documents_evaluated": len(measurements),
        "cold_request_cache_miss_rate_percent": 100.0,
        "warm_request_cache_hit_rate_percent": 100.0,
        "cold_latency_stats_s": calculate_distribution_stats(cold_lats),
        "warm_latency_stats_s": calculate_distribution_stats(warm_lats),
        "speedup_stats": calculate_distribution_stats(speedups),
        "latency_reduction_stats_percent": calculate_distribution_stats(reductions),
        "cache_lookup_latency_stats_ms": calculate_distribution_stats(lookups),
        "mean_speedup_factor": round(statistics.mean(speedups), 2),
        "mean_latency_reduction_percent": round(statistics.mean(reductions), 2)
    }

    raw_output = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
        "summary": summary,
        "raw_measurements": measurements
    }

    save_benchmark_results("cache_benchmark", raw_output, summary)

    print(f"\n==================================================")
    print(f"Mean Cold Latency: {summary['cold_latency_stats_s']['mean']}s")
    print(f"Mean Warm Latency: {summary['warm_latency_stats_s']['mean']}s")
    print(f"Mean Speedup Factor: {summary['mean_speedup_factor']}x")
    print(f"Mean Latency Reduction: {summary['mean_latency_reduction_percent']}%")
    print(f"Mean Cache Lookup Latency: {summary['cache_lookup_latency_stats_ms']['mean']}ms")
    print(f"==================================================")

    return raw_output

if __name__ == "__main__":
    run_cache_benchmark()
