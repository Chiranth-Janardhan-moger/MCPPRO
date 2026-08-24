# MCPPRO Evaluation and Benchmark Suite

## Overview

This directory contains the automated benchmark and evaluation suite for MCPPRO, an AI Agent, Model Context Protocol (MCP), and Document RAG orchestration platform.

The suite evaluates every operational subsystem across 27 distinct experimental dimensions without modifying any existing production code or inventing unverified metrics.

---

## Directory Structure

```
benchmarks/
├── README.md
├── ARCHITECTURE.md
├── configs/
│   └── benchmark_config.json
├── datasets/
│   ├── golden_dataset.json
│   ├── documents/
│   └── ocr_samples/
├── scripts/
│   ├── benchmark_common.py
│   ├── capture_environment.py
│   ├── generate_golden_dataset.py
│   ├── benchmark_ingestion.py
│   ├── benchmark_ocr.py
│   ├── benchmark_embeddings.py
│   ├── benchmark_vector_stores.py
│   ├── benchmark_rag_quality.py
│   ├── benchmark_rag_performance.py
│   ├── benchmark_cache.py
│   ├── benchmark_mcp.py
│   ├── benchmark_orchestration.py
│   ├── benchmark_system_robustness.py
│   └── run_all_benchmarks.py
├── results/
│   ├── raw/
│   ├── processed/
│   ├── latest/
│   ├── environment.json
│   ├── benchmark_report.md
│   └── METRIC_CATALOG.md
└── reports/
```

---

## Benchmark Phases and Coverage

1. **Repository Audit & Architecture**: Documented in `ARCHITECTURE.md`.
2. **Environment Capture**: `scripts/capture_environment.py` -> `results/environment.json`.
3. **Document Ingestion**: `scripts/benchmark_ingestion.py` (PDF, DOCX, PPTX, XLSX, TXT, MD, PNG).
4. **OCR Evaluation**: `scripts/benchmark_ocr.py` (EasyOCR, PyTesseract, CER, WER).
5. **Chunking Strategies**: `scripts/benchmark_ingestion.py` (Multiple size/overlap configs).
6. **Embeddings Subsystem**: `scripts/benchmark_embeddings.py` (Dimensionalities, batch scaling, sequence scaling).
7. **Vector Database**: `scripts/benchmark_vector_stores.py` (InMemory, Qdrant Memory/Disk, insertion speed, search latency, Recall@K, MRR across 100, 1000, 10000 vectors).
8. **RAG Quality**: `scripts/benchmark_rag_quality.py` (115 questions across 30 documents: Recall@1/3/5/10, Precision@10, MRR, Groundedness, Hallucination Rate).
9. **RAG Performance & Scalability**: `scripts/benchmark_rag_performance.py` (Latency percentiles mean/p50/p90/p95/p99, concurrency throughput 1, 5, 10, 25 users).
10. **Vector Store Caching**: `scripts/benchmark_cache.py` (Cold vs warm requests, speedup factor, latency reduction %, lookup time).
11. **MCP Protocol**: `scripts/benchmark_mcp.py` (FastMCP init, tool discovery, tool execution, serialization overhead).
12. **Agent Orchestration**: `scripts/benchmark_orchestration.py` (5 request patterns, step execution, orchestration overhead).
13. **Tool Routing Quality**: `scripts/benchmark_orchestration.py` (Labeled routing dataset, accuracy, precision, recall, F1).
14. **Multi-Model & Streaming**: `scripts/benchmark_orchestration.py` (Provider configs, TTFT, token throughput).
15. **End-to-End Latency**: `scripts/benchmark_orchestration.py` (8-stage pipeline latency breakdown).
16. **Baseline Comparison**: `scripts/benchmark_orchestration.py` (Conventional RAG vs MCPPRO Agentic RAG).
17. **System Robustness & Reliability**: `scripts/benchmark_system_robustness.py` (Security fault tolerance, resource usage, CI/CD validation, cost modeling).

---

## Execution Instructions

### Running the Entire Benchmark Suite

To execute all benchmarks sequentially, generate raw JSON records, and compile the final reports:

```bash
python benchmarks/scripts/run_all_benchmarks.py
```

### Running Individual Benchmark Modules

```bash
# 1. Capture environment specification
python benchmarks/scripts/capture_environment.py

# 2. Generate or refresh golden dataset
python benchmarks/scripts/generate_golden_dataset.py

# 3. Document ingestion and chunking
python benchmarks/scripts/benchmark_ingestion.py

# 4. OCR evaluation (CER / WER)
python benchmarks/scripts/benchmark_ocr.py

# 5. Embedding models
python benchmarks/scripts/benchmark_embeddings.py

# 6. Vector databases (InMemory, Qdrant)
python benchmarks/scripts/benchmark_vector_stores.py

# 7. RAG quality (Golden evaluation dataset)
python benchmarks/scripts/benchmark_rag_quality.py

# 8. RAG performance and concurrency scalability
python benchmarks/scripts/benchmark_rag_performance.py

# 9. Vector store caching (Cold vs Warm)
python benchmarks/scripts/benchmark_cache.py

# 10. FastMCP server and tool registry
python benchmarks/scripts/benchmark_mcp.py

# 11. Orchestration, routing, and baseline comparison
python benchmarks/scripts/benchmark_orchestration.py

# 12. Robustness, resource usage, CI/CD, and cost modeling
python benchmarks/scripts/benchmark_system_robustness.py
```

---

## Outputs and Evidence Locations

- **Environment Specification**: `benchmarks/results/environment.json`
- **Comprehensive Benchmark Report**: `benchmarks/results/benchmark_report.md`
- **Full Metric Catalog**: `benchmarks/results/METRIC_CATALOG.md`
- **Raw Experimental Telemetry**: `benchmarks/results/raw/`
- **Processed Statistical Summaries**: `benchmarks/results/processed/`
- **Latest Mirror Results**: `benchmarks/results/latest/`
