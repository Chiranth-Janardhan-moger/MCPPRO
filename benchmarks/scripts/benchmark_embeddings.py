#!/usr/bin/env python3
"""
Phase 6: Embedding Models Benchmark
Evaluates supported embedding models:
- text-embedding-3-small (1536 dims)
- text-embedding-3-large (3072 dims)
- text-embedding-ada-002 (1536 dims)
- bge-m3 (1024 dims)
Measures latency, batch throughput across batch sizes (1, 4, 8, 16, 32, 64),
scaling behavior with sequence length, and memory consumption.
"""

import os
import sys
import time
import json
import psutil
import statistics
from pathlib import Path
from typing import List

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from app.config.settings import settings
from app.embedders.embedding_factory import get_embedding_model

RAW_RESULTS_DIR = Path("benchmarks/results/raw")
RAW_RESULTS_DIR.mkdir(parents=True, exist_ok=True)

def measure_memory_mb() -> float:
    process = psutil.Process(os.getpid())
    return process.memory_info().rss / (1024 * 1024)

# Synthetic realistic text corpus of varying lengths
SAMPLE_TEXT_SHORT = "MCPPRO is an AI Agent orchestration engine with MCP integration." # ~65 chars
SAMPLE_TEXT_MEDIUM = "MCPPRO coordinates document ingestion, recursive chunking, vector embedding, and similarity retrieval across multiple vector store backends including InMemory, Qdrant, Supabase, and Pinecone." # ~190 chars
SAMPLE_TEXT_LONG = """
MCPPRO Core Architecture Specification Details.
The architecture combines FastAPI on the backend with Next.js 14 on the frontend.
All document processing flows through the DocumentProcessor and FileProcessor modules,
extracting clean text, removing repetitive header and footer patterns, and generating
embeddings with configurable dimensions. The autonomous agent executes up to 15 iterative
reasoning steps using registered MCP and static tools to answer complex multi-hop queries.
""" # ~500 chars

def run_embedding_benchmark():
    print("==================================================")
    print("        Phase 6: Embedding Models Benchmark       ")
    print("==================================================")

    model_specs = [
        {"name": "text-embedding-3-small", "expected_dim": 1536, "requires_api_key": True},
        {"name": "text-embedding-3-large", "expected_dim": 3072, "requires_api_key": True},
        {"name": "text-embedding-ada-002", "expected_dim": 1536, "requires_api_key": True},
        {"name": "bge-m3", "expected_dim": 1024, "requires_api_key": False}
    ]

    batch_sizes = [1, 4, 8, 16, 32, 64]
    results = {}

    for spec in model_specs:
        model_name = spec["name"]
        print(f"\n--- Testing Embedding Model: {model_name} ---")

        if spec["requires_api_key"] and not settings.OPENAI_API_KEY:
            print(f"Status: NOT MEASURABLE - OpenAI API key is not configured in .env.")
            results[model_name] = {
                "status": "NOT MEASURABLE",
                "model_name": model_name,
                "dimension": spec["expected_dim"],
                "reason": "OpenAI API key is required but not configured in environment. Remote API calls cannot be executed without valid credentials."
            }
            continue

        try:
            mem_before = measure_memory_mb()
            embedder = get_embedding_model(model_name, api_key=settings.OPENAI_API_KEY)
            mem_after_init = measure_memory_mb()
            
            dim = embedder.dimension
            
            # 1. Single-text latency test (10 iterations)
            single_latencies = []
            for _ in range(10):
                t0 = time.perf_counter()
                vec = embedder.embed(SAMPLE_TEXT_MEDIUM)
                single_latencies.append(time.perf_counter() - t0)

            # 2. Batch scaling test
            batch_metrics = {}
            for bs in batch_sizes:
                texts = [f"Sample text chunk {i}: {SAMPLE_TEXT_MEDIUM}" for i in range(bs)]
                t0 = time.perf_counter()
                vecs = embedder.embed(texts)
                batch_time = time.perf_counter() - t0
                
                batch_metrics[f"batch_{bs}"] = {
                    "batch_size": bs,
                    "batch_latency_s": round(batch_time, 5),
                    "throughput_chunks_per_s": round(bs / batch_time, 2) if batch_time > 0 else 0,
                    "avg_latency_per_chunk_ms": round((batch_time / bs) * 1000, 3)
                }

            # 3. Sequence Length Scaling
            seq_scaling = {}
            for seq_label, text_content in [("short_65c", SAMPLE_TEXT_SHORT), ("medium_190c", SAMPLE_TEXT_MEDIUM), ("long_500c", SAMPLE_TEXT_LONG)]:
                t0 = time.perf_counter()
                vec = embedder.embed(text_content)
                seq_time = time.perf_counter() - t0
                seq_scaling[seq_label] = {
                    "character_length": len(text_content),
                    "latency_ms": round(seq_time * 1000, 3)
                }

            results[model_name] = {
                "status": "MEASURED",
                "model_name": model_name,
                "dimension": dim,
                "single_embed_mean_ms": round(statistics.mean(single_latencies) * 1000, 3),
                "single_embed_median_ms": round(statistics.median(single_latencies) * 1000, 3),
                "init_memory_mb": round(mem_after_init - mem_before, 2),
                "batch_scaling": batch_metrics,
                "sequence_length_scaling": seq_scaling
            }
            print(f"Success! Dimension = {dim}, Single Latency = {results[model_name]['single_embed_mean_ms']}ms")

        except Exception as e:
            print(f"Execution Error: {e}")
            results[model_name] = {
                "status": "NOT MEASURABLE",
                "model_name": model_name,
                "dimension": spec["expected_dim"],
                "reason": f"Model execution failed: {str(e)}"
            }

    raw_output = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
        "tested_models": results
    }

    output_file = RAW_RESULTS_DIR / "embedding_benchmark.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(raw_output, f, indent=2)

    print(f"\nSaved Embedding Benchmark results to {output_file}")
    return raw_output

if __name__ == "__main__":
    run_embedding_benchmark()
