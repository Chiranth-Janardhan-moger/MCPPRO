#!/usr/bin/env python3
"""
Phase 9 & Phase 18: RAG Performance and Scalability Benchmark
Measures latency percentiles (mean, median, p90, p95, p99) for indexing, retrieval, and total query cycles.
Evaluates concurrency scaling across 1, 5, 10, and 25 concurrent users.
Generates throughput curves (queries/sec, docs/sec) and corpus scaling trends.
"""

import os
import sys
import time
import json
import asyncio
import statistics
import psutil
import numpy as np
from pathlib import Path
from typing import List, Dict, Any

# Add benchmark directory and initialize compatibility shims
sys.path.insert(0, str(Path(__file__).resolve().parent))
import benchmark_common
from benchmark_common import (
    measure_memory_mb, calculate_distribution_stats,
    save_benchmark_results, DATASETS_DIR, RAW_DIR
)

from langchain_core.vectorstores import InMemoryVectorStore
from langchain_core.documents import Document
from langchain_core.embeddings import Embeddings

class PerfEmbedder(Embeddings):
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

async def simulate_query_worker(store: InMemoryVectorStore, question: str, k: int = 5) -> Dict[str, float]:
    t0 = time.perf_counter()
    # 1. Retrieval
    t_ret0 = time.perf_counter()
    docs = await store.asimilarity_search_with_score(question, k=k)
    retrieval_dur = time.perf_counter() - t_ret0
    
    # 2. Simulated Generation / Context synthesis overhead
    t_gen0 = time.perf_counter()
    await asyncio.sleep(0.005)  # Simulated LLM dispatch / token stream window
    generation_dur = time.perf_counter() - t_gen0
    
    total_dur = time.perf_counter() - t0
    return {
        "retrieval_s": retrieval_dur,
        "generation_s": generation_dur,
        "total_s": total_dur
    }

async def run_concurrency_test(store: InMemoryVectorStore, concurrency_level: int, total_requests: int) -> Dict[str, Any]:
    print(f"Running concurrency test: {concurrency_level} concurrent users ({total_requests} total requests)...")
    sample_queries = [
        "What is MCPPRO architecture?",
        "How does vector caching operate?",
        "What are the supported vector stores?",
        "Explain multi-hop agent reasoning.",
        "What are the default chunk size parameters?"
    ]

    mem_before = measure_memory_mb()
    t_start = time.perf_counter()

    latencies = []
    retrieval_lats = []
    generation_lats = []
    
    # Semaphore for concurrency limiting
    sem = asyncio.Semaphore(concurrency_level)

    async def bound_worker(q):
        async with sem:
            res = await simulate_query_worker(store, q)
            return res

    tasks = [bound_worker(sample_queries[i % len(sample_queries)]) for i in range(total_requests)]
    results = await asyncio.gather(*tasks)
    
    total_wall_time = time.perf_counter() - t_start
    mem_after = measure_memory_mb()

    for r in results:
        latencies.append(r["total_s"])
        retrieval_lats.append(r["retrieval_s"])
        generation_lats.append(r["generation_s"])

    throughput_qps = total_requests / total_wall_time if total_wall_time > 0 else 0

    stats_total = calculate_distribution_stats(latencies)
    stats_retrieval = calculate_distribution_stats(retrieval_lats)
    stats_generation = calculate_distribution_stats(generation_lats)

    return {
        "concurrency_level": concurrency_level,
        "total_requests": total_requests,
        "total_wall_time_s": round(total_wall_time, 4),
        "throughput_queries_per_s": round(throughput_qps, 2),
        "memory_delta_mb": round(max(0.0, mem_after - mem_before), 3),
        "total_latency_stats_s": stats_total,
        "retrieval_latency_stats_s": stats_retrieval,
        "generation_latency_stats_s": stats_generation
    }

async def run_rag_performance_benchmark():
    print("==================================================")
    print("    Phase 9 & 18: RAG Performance & Scalability   ")
    print("==================================================")

    embedder = PerfEmbedder(dimension=1536)
    store = InMemoryVectorStore(embedding=embedder)

    # 1. Index 1,000 document chunks for performance baseline
    print("Pre-populating 1,000 document vectors...")
    t0_idx = time.perf_counter()
    docs = [
        Document(
            page_content=f"MCPPRO performance benchmark document chunk {i}: technical specifications, RAG optimization, vector indexing metrics.",
            metadata={"doc_id": f"doc_{i}", "index": i}
        ) for i in range(1000)
    ]
    store.add_documents(docs)
    indexing_time = time.perf_counter() - t0_idx
    docs_per_sec = len(docs) / indexing_time if indexing_time > 0 else 0
    print(f"Indexed {len(docs)} chunks in {indexing_time:.3f}s ({docs_per_sec:.1f} chunks/sec)")

    # 2. Concurrency Load Tests: 1, 5, 10, 25 concurrent users
    concurrency_levels = [1, 5, 10, 25]
    concurrency_results = {}

    for c_level in concurrency_levels:
        req_count = c_level * 10
        c_res = await run_concurrency_test(store, c_level, req_count)
        concurrency_results[f"concurrency_{c_level}"] = c_res
        print(f"Concurrency {c_level}: Throughput = {c_res['throughput_queries_per_s']} QPS | Mean Latency = {c_res['total_latency_stats_s']['mean']*1000:.2f}ms | P95 = {c_res['total_latency_stats_s']['p95']*1000:.2f}ms")

    # 3. Scalability: Corpus Size Scaling (100 -> 1,000 -> 10,000)
    corpus_scaling_metrics = {}
    for c_size in [100, 1000, 5000, 10000]:
        t0_sub = time.perf_counter()
        sub_docs = [Document(page_content=f"Doc {j} content", metadata={"id": j}) for j in range(c_size)]
        sub_store = InMemoryVectorStore(embedding=embedder)
        sub_store.add_documents(sub_docs)
        sub_idx_time = time.perf_counter() - t0_sub

        # Measure 20 queries latency
        q_lats = []
        for _ in range(20):
            tq0 = time.perf_counter()
            sub_store.similarity_search("test query", k=5)
            q_lats.append(time.perf_counter() - tq0)

        corpus_scaling_metrics[f"corpus_{c_size}"] = {
            "corpus_size": c_size,
            "indexing_time_s": round(sub_idx_time, 4),
            "indexing_throughput_docs_per_s": round(c_size / sub_idx_time, 2) if sub_idx_time > 0 else 0,
            "query_latency_mean_ms": round(statistics.mean(q_lats) * 1000, 3),
            "query_latency_p95_ms": round(calculate_distribution_stats(q_lats)["p95"] * 1000, 3)
        }

    summary = {
        "indexing_throughput_chunks_per_s": round(docs_per_sec, 2),
        "concurrency_scaling": concurrency_results,
        "corpus_scaling": corpus_scaling_metrics
    }

    raw_output = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
        "summary": summary
    }

    save_benchmark_results("rag_performance_benchmark", raw_output, summary)

    print(f"\n==================================================")
    print(f"Baseline Indexing Speed: {summary['indexing_throughput_chunks_per_s']} chunks/sec")
    print(f"Max Concurrent QPS Measured: {max(c['throughput_queries_per_s'] for c in concurrency_results.values())} QPS")
    print(f"==================================================")

    return raw_output

if __name__ == "__main__":
    asyncio.run(run_rag_performance_benchmark())
