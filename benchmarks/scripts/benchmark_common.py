#!/usr/bin/env python3
"""
Common Utilities and Statistical Helpers for MCPPRO Evaluation Suite
Provides compatibility shims, math/statistical aggregators, timing primitives, and JSON/CSV exporters.
"""

import sys
import os
import time
import json
import csv
import math
import psutil
import statistics
import types
from pathlib import Path
from typing import List, Dict, Any, Optional

# Ensure fallback environment variables for offline local evaluation
if not os.environ.get("OPENAI_API_KEY"):
    os.environ["OPENAI_API_KEY"] = "sk-eval-local-benchmark-key"
if not os.environ.get("BEARER_TOKEN"):
    os.environ["BEARER_TOKEN"] = "eval-local-bearer-token"

# Ensure compatibility for langchain schema and splitters in modern langchain environments
try:
    import langchain_core.documents
    import langchain_core.retrievers
    import langchain_core.messages
    import langchain_core.prompts

    if "langchain.schema" not in sys.modules:
        schema_mod = types.ModuleType("langchain.schema")
        schema_mod.Document = langchain_core.documents.Document
        schema_mod.BaseRetriever = langchain_core.retrievers.BaseRetriever
        schema_mod.HumanMessage = getattr(langchain_core.messages, "HumanMessage", None)
        schema_mod.AIMessage = getattr(langchain_core.messages, "AIMessage", None)
        schema_mod.SystemMessage = getattr(langchain_core.messages, "SystemMessage", None)
        schema_mod.BaseMessage = getattr(langchain_core.messages, "BaseMessage", None)
        sys.modules["langchain.schema"] = schema_mod

    if "langchain.schema.document" not in sys.modules:
        schema_doc = types.ModuleType("langchain.schema.document")
        schema_doc.Document = langchain_core.documents.Document
        sys.modules["langchain.schema.document"] = schema_doc
except Exception:
    pass

try:
    import langchain_text_splitters
    if "langchain.text_splitter" not in sys.modules:
        langchain_ts = types.ModuleType("langchain.text_splitter")
        langchain_ts.RecursiveCharacterTextSplitter = langchain_text_splitters.RecursiveCharacterTextSplitter
        langchain_ts.MarkdownTextSplitter = langchain_text_splitters.MarkdownTextSplitter
        sys.modules["langchain.text_splitter"] = langchain_ts
except Exception:
    pass

# Ensure backend directory is in path
backend_dir = Path(__file__).resolve().parent.parent.parent / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

BENCHMARK_ROOT = Path(__file__).resolve().parent.parent
DATASETS_DIR = BENCHMARK_ROOT / "datasets"
RESULTS_DIR = BENCHMARK_ROOT / "results"
RAW_DIR = RESULTS_DIR / "raw"
PROCESSED_DIR = RESULTS_DIR / "processed"
LATEST_DIR = RESULTS_DIR / "latest"

RAW_DIR.mkdir(parents=True, exist_ok=True)
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
LATEST_DIR.mkdir(parents=True, exist_ok=True)

def measure_memory_mb() -> float:
    """Returns current process RSS memory in Megabytes"""
    process = psutil.Process(os.getpid())
    return process.memory_info().rss / (1024 * 1024)

def calculate_distribution_stats(values: List[float]) -> Dict[str, Any]:
    """Calculates comprehensive statistical metrics: count, min, max, mean, median, stddev, p90, p95, p99."""
    if not values:
        return {
            "count": 0, "min": None, "max": None, "mean": None,
            "median": None, "std_dev": None, "p90": None, "p95": None, "p99": None
        }

    sorted_vals = sorted(values)
    n = len(sorted_vals)
    
    mean_val = statistics.mean(sorted_vals)
    median_val = statistics.median(sorted_vals)
    std_val = statistics.stdev(sorted_vals) if n > 1 else 0.0
    
    p90_idx = min(int(n * 0.90), n - 1)
    p95_idx = min(int(n * 0.95), n - 1)
    p99_idx = min(int(n * 0.99), n - 1)

    return {
        "count": n,
        "min": round(min(sorted_vals), 5),
        "max": round(max(sorted_vals), 5),
        "mean": round(mean_val, 5),
        "median": round(median_val, 5),
        "std_dev": round(std_val, 5),
        "p90": round(sorted_vals[p90_idx], 5),
        "p95": round(sorted_vals[p95_idx], 5),
        "p99": round(sorted_vals[p99_idx], 5)
    }

def calculate_comparison_metrics(baseline_val: float, mcppro_val: float) -> Dict[str, Any]:
    """Calculates absolute difference and percentage difference."""
    if baseline_val is None or mcppro_val is None:
        return {"absolute_diff": None, "percentage_diff": None}
    
    abs_diff = mcppro_val - baseline_val
    if baseline_val != 0:
        pct_diff = ((mcppro_val - baseline_val) / abs(baseline_val)) * 100
    else:
        pct_diff = 0.0

    return {
        "absolute_diff": round(abs_diff, 5),
        "percentage_diff": round(pct_diff, 2)
    }

def save_benchmark_results(name: str, raw_data: Dict[str, Any], processed_summary: Optional[Dict[str, Any]] = None):
    """Saves raw data to raw/, processed summary to processed/, and mirrors latest."""
    timestamp = time.strftime("%Y%m%d_%H%M%S")
    
    # Save raw JSON
    raw_file = RAW_DIR / f"{name}_{timestamp}.json"
    with open(raw_file, "w", encoding="utf-8") as f:
        json.dump(raw_data, f, indent=2)

    # Save latest raw
    latest_raw_file = LATEST_DIR / f"{name}.json"
    with open(latest_raw_file, "w", encoding="utf-8") as f:
        json.dump(raw_data, f, indent=2)

    # Save processed if provided
    if processed_summary:
        proc_file = PROCESSED_DIR / f"{name}_summary_{timestamp}.json"
        with open(proc_file, "w", encoding="utf-8") as f:
            json.dump(processed_summary, f, indent=2)
            
        latest_proc_file = LATEST_DIR / f"{name}_summary.json"
        with open(latest_proc_file, "w", encoding="utf-8") as f:
            json.dump(processed_summary, f, indent=2)

    print(f"Results saved to {raw_file} and mirrored to {latest_raw_file}")
