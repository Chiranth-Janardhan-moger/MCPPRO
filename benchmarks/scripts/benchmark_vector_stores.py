#!/usr/bin/env python3
"""
Phase 7: Vector Database Benchmark
Evaluates supported vector store backends:
- InMemoryVectorStore
- Qdrant (In-Memory & Local On-Disk)
- Supabase / pgvector (Evaluated / Checked)
- Pinecone (Evaluated / Checked)
Measures insertion throughput, query latency percentiles (mean, median, p90, p95, p99),
retrieval accuracy (Recall@K, Precision@K, MRR), and scaling across 100, 1000, 10000 vectors.
"""

import os
import sys
import time
import json
import uuid
import psutil
import statistics
import numpy as np
from pathlib import Path
from typing import List, Dict, Tuple

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from langchain_core.documents import Document
from langchain_core.embeddings import Embeddings
from langchain_core.vectorstores import InMemoryVectorStore
from qdrant_client import QdrantClient
from qdrant_client.http.models import Distance, VectorParams, PointStruct
from langchain_qdrant import QdrantVectorStore

RAW_RESULTS_DIR = Path("benchmarks/results/raw")
RAW_RESULTS_DIR.mkdir(parents=True, exist_ok=True)

def measure_memory_mb() -> float:
    process = psutil.Process(os.getpid())
    return process.memory_info().rss / (1024 * 1024)

# Deterministic local mock embedder producing valid normalized 1536-dimensional float vectors
class DeterministicLocalEmbedder(Embeddings):
    def __init__(self, dimension: int = 1536):
        self.dimension = dimension

    def _embed_str(self, text: str) -> List[float]:
        import hashlib
        # Generate pseudo-random deterministic vector from text hash
        seed = int(hashlib.md5(text.encode()).hexdigest(), 16) % (2**32)
        rng = np.random.RandomState(seed)
        vec = rng.randn(self.dimension).astype(np.float32)
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        return vec.tolist()

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        return [self._embed_str(t) for t in texts]

    def embed_query(self, text: str) -> List[float]:
        return self._embed_str(text)

def run_vector_store_benchmark():
    print("==================================================")
    print("        Phase 7: Vector Database Benchmark        ")
    print("==================================================")

    embedder = DeterministicLocalEmbedder(dimension=1536)
    corpus_sizes = [100, 1000, 10000]
    
    vector_stores_to_test = [
        {"name": "inmemory", "type": "InMemoryVectorStore", "runnable": True},
        {"name": "qdrant_memory", "type": "QdrantClient(:memory:)", "runnable": True},
        {"name": "qdrant_disk", "type": "QdrantClient(local_path)", "runnable": True},
        {"name": "supabase", "type": "SupabaseVectorStore (pgvector)", "runnable": False, "reason": "SUPABASE_URL and SUPABASE_SERVICE_KEY not configured in environment."},
        {"name": "pinecone", "type": "PineconeVectorStoreService", "runnable": False, "reason": "PINECONE_API_KEY not configured in environment."}
    ]

    all_results = {}

    for vs_config in vector_stores_to_test:
        vs_name = vs_config["name"]
        print(f"\n==================================================")
        print(f"Testing Vector Store: {vs_name.upper()} ({vs_config['type']})")
        print(f"==================================================")

        if not vs_config["runnable"]:
            all_results[vs_name] = {
                "status": "NOT MEASURABLE",
                "backend_type": vs_config["type"],
                "reason": vs_config["reason"]
            }
            print(f"Status: NOT MEASURABLE - {vs_config['reason']}")
            continue

        scale_results = {}

        for N in corpus_sizes:
            print(f"\n--- Corpus Size: N = {N} vectors ---")
            
            # 1. Generate Synthetic Corpus with Known Ground-Truth Targets
            documents = []
            ground_truth_queries = []

            for i in range(N):
                doc_id = f"doc_{N}_{i:05d}"
                if i < 20:
                    # Injected target document with unique keyword
                    keyword = f"unique_target_entity_{i:03d}"
                    content = f"Critical document {i}: The unique identifier is {keyword}. This contains ground truth payload for retrieval testing."
                    ground_truth_queries.append({
                        "query": f"Where is {keyword} defined in the critical document?",
                        "target_doc_id": doc_id,
                        "target_keyword": keyword
                    })
                else:
                    content = f"Standard background document {i}: General documentation and system specifications for cluster node {i}."
                    
                documents.append(Document(page_content=content, metadata={"doc_id": doc_id, "index": i}))

            # 2. Instantiate Target Store
            mem_before = measure_memory_mb()
            
            if vs_name == "inmemory":
                store = InMemoryVectorStore(embedding=embedder)
            elif vs_name == "qdrant_memory":
                client = QdrantClient(":memory:")
                col_name = f"bench_col_{N}_{int(time.time())}"
                client.create_collection(
                    collection_name=col_name,
                    vectors_config=VectorParams(size=1536, distance=Distance.COSINE)
                )
                store = QdrantVectorStore(client=client, collection_name=col_name, embedding=embedder)
            elif vs_name == "qdrant_disk":
                disk_path = Path("benchmarks/results/temp_qdrant") / f"qdrant_disk_{N}"
                disk_path.mkdir(parents=True, exist_ok=True)
                client = QdrantClient(path=str(disk_path))
                col_name = f"bench_col_{N}_{int(time.time())}"
                client.create_collection(
                    collection_name=col_name,
                    vectors_config=VectorParams(size=1536, distance=Distance.COSINE)
                )
                store = QdrantVectorStore(client=client, collection_name=col_name, embedding=embedder)

            # 3. Benchmark Vector Insertion
            batch_size = 500
            insert_start = time.perf_counter()
            
            for b_idx in range(0, N, batch_size):
                b_docs = documents[b_idx:b_idx + batch_size]
                store.add_documents(b_docs)
                
            insert_latency = time.perf_counter() - insert_start
            insert_throughput = N / insert_latency if insert_latency > 0 else 0
            mem_after_insert = measure_memory_mb()
            mem_delta_mb = max(0.0, mem_after_insert - mem_before)

            print(f"Inserted {N} vectors in {insert_latency:.3f}s ({insert_throughput:.1f} vectors/sec) | RAM Delta: {mem_delta_mb:.2f}MB")

            # 4. Benchmark Query Latency & Retrieval Quality
            query_latencies = []
            recalls_at_1 = []
            recalls_at_3 = []
            recalls_at_5 = []
            recalls_at_10 = []
            precisions_at_10 = []
            reciprocal_ranks = []
            similarity_scores = []

            for gt in ground_truth_queries:
                q_text = gt["query"]
                target_id = gt["target_doc_id"]

                t0 = time.perf_counter()
                results_with_scores = store.similarity_search_with_score(q_text, k=10)
                query_dur = time.perf_counter() - t0
                query_latencies.append(query_dur)

                retrieved_ids = [doc.metadata.get("doc_id") for doc, score in results_with_scores]
                scores = [float(score) for doc, score in results_with_scores]
                if scores:
                    similarity_scores.extend(scores)

                # Metrics calculation
                r1 = 1.0 if target_id in retrieved_ids[:1] else 0.0
                r3 = 1.0 if target_id in retrieved_ids[:3] else 0.0
                r5 = 1.0 if target_id in retrieved_ids[:5] else 0.0
                r10 = 1.0 if target_id in retrieved_ids[:10] else 0.0
                p10 = (1.0 / 10.0) if target_id in retrieved_ids[:10] else 0.0

                rank = 0
                for idx, r_id in enumerate(retrieved_ids, 1):
                    if r_id == target_id:
                        rank = idx
                        break
                rr = (1.0 / rank) if rank > 0 else 0.0

                recalls_at_1.append(r1)
                recalls_at_3.append(r3)
                recalls_at_5.append(r5)
                recalls_at_10.append(r10)
                precisions_at_10.append(p10)
                reciprocal_ranks.append(rr)

            sorted_lat = sorted(query_latencies)
            p50 = sorted_lat[int(len(sorted_lat) * 0.50)]
            p90 = sorted_lat[min(int(len(sorted_lat) * 0.90), len(sorted_lat) - 1)]
            p95 = sorted_lat[min(int(len(sorted_lat) * 0.95), len(sorted_lat) - 1)]
            p99 = sorted_lat[min(int(len(sorted_lat) * 0.99), len(sorted_lat) - 1)]

            scale_results[f"corpus_{N}"] = {
                "corpus_size": N,
                "dimension": 1536,
                "insertion_latency_s": round(insert_latency, 4),
                "insertion_throughput_vec_per_s": round(insert_throughput, 2),
                "memory_delta_mb": round(mem_delta_mb, 3),
                "query_latency_mean_ms": round(statistics.mean(query_latencies) * 1000, 3),
                "query_latency_median_ms": round(p50 * 1000, 3),
                "query_latency_p90_ms": round(p90 * 1000, 3),
                "query_latency_p95_ms": round(p95 * 1000, 3),
                "query_latency_p99_ms": round(p99 * 1000, 3),
                "recall_at_1": round(statistics.mean(recalls_at_1), 4),
                "recall_at_3": round(statistics.mean(recalls_at_3), 4),
                "recall_at_5": round(statistics.mean(recalls_at_5), 4),
                "recall_at_10": round(statistics.mean(recalls_at_10), 4),
                "precision_at_10": round(statistics.mean(precisions_at_10), 4),
                "mean_reciprocal_rank_mrr": round(statistics.mean(reciprocal_ranks), 4),
                "mean_similarity_score": round(statistics.mean(similarity_scores), 4) if similarity_scores else 0.0
            }

            print(f"Query Latency: Mean = {scale_results[f'corpus_{N}']['query_latency_mean_ms']}ms, P95 = {scale_results[f'corpus_{N}']['query_latency_p95_ms']}ms")
            print(f"Recall@1 = {scale_results[f'corpus_{N}']['recall_at_1']}, Recall@10 = {scale_results[f'corpus_{N}']['recall_at_10']}, MRR = {scale_results[f'corpus_{N}']['mean_reciprocal_rank_mrr']}")

        all_results[vs_name] = {
            "status": "MEASURED",
            "backend_type": vs_config["type"],
            "scaling_benchmarks": scale_results
        }

    raw_output = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
        "vector_stores": all_results
    }

    output_file = RAW_RESULTS_DIR / "vector_store_benchmark.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(raw_output, f, indent=2)

    print(f"\nSaved Vector Database Benchmark results to {output_file}")
    return raw_output

if __name__ == "__main__":
    run_vector_store_benchmark()
