#!/usr/bin/env python3
"""
Phase 3 & Phase 5: Document Ingestion and Chunking Benchmark
Measures parsing latency, chunk yield, memory delta, and throughput across all supported document types.
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
from benchmark_common import measure_memory_mb, calculate_distribution_stats, save_benchmark_results

from app.services.preprocessors.file_processor import FileProcessor
from app.services.utils.file_processor.document_splitter import DocumentSplitter
from app.services.utils.file_processor.chunk_cleaner import ChunkCleaner

RAW_RESULTS_DIR = Path("benchmarks/results/raw")
RAW_RESULTS_DIR.mkdir(parents=True, exist_ok=True)

def run_ingestion_benchmark():
    print("==================================================")
    print("    Phase 3 & 5: Document Ingestion Benchmark     ")
    print("==================================================")

    docs_dir = Path("benchmarks/datasets/documents")
    if not docs_dir.exists():
        print("Error: Document dataset not found. Run generate_golden_dataset.py first.")
        return

    doc_files = list(docs_dir.glob("*.*"))
    print(f"Found {len(doc_files)} benchmark documents.")

    processor_standard = FileProcessor(use_llm_pdf_loader=False, use_pptx_ocr=False)
    processor_llm = FileProcessor(use_llm_pdf_loader=True, use_pptx_ocr=False)

    results = []

    for doc_path in doc_files:
        file_ext = doc_path.suffix.lower()
        file_size_bytes = doc_path.stat().st_size
        file_size_mb = file_size_bytes / (1024 * 1024)
        doc_name = doc_path.name
        
        # Test configurations: for PDF test both standard and llm loader
        test_variants = ["standard"]
        if file_ext == ".pdf":
            test_variants.append("llm_markdown")

        for variant in test_variants:
            proc = processor_llm if variant == "llm_markdown" else processor_standard
            detected_type = proc.supported_extensions.get(file_ext, "application/octet-stream")

            mem_before = measure_memory_mb()
            start_total = time.perf_counter()

            # 1. Text Extraction / Loading
            start_load = time.perf_counter()
            try:
                load_res = proc.load_document(str(doc_path), detected_type)
                load_time = time.perf_counter() - start_load
                
                if not load_res["success"]:
                    results.append({
                        "filename": doc_name,
                        "variant": variant,
                        "format": file_ext,
                        "file_size_bytes": file_size_bytes,
                        "file_size_mb": file_size_mb,
                        "success": False,
                        "error": load_res.get("error", "Unknown load failure"),
                        "total_time_s": round(time.perf_counter() - start_total, 5)
                    })
                    continue

                documents = load_res["documents"]
                page_count = len(documents)

                # 2. Chunking and Preprocessing
                start_chunk = time.perf_counter()
                chunk_res = proc.process_to_chunks(documents, detected_type)
                chunk_time = time.perf_counter() - start_chunk

                total_time = time.perf_counter() - start_total
                mem_after = measure_memory_mb()
                mem_delta_mb = max(0.0, mem_after - mem_before)

                if chunk_res["success"]:
                    chunks = chunk_res["chunks"]
                    chunks_count = len(chunks)
                    total_chars = sum(len(c.page_content) for c in chunks)
                    chunk_lengths = [len(c.page_content) for c in chunks] if chunks else [0]
                    avg_chunk_size = statistics.mean(chunk_lengths)
                    min_chunk_size = min(chunk_lengths)
                    max_chunk_size = max(chunk_lengths)
                    
                    results.append({
                        "filename": doc_name,
                        "variant": variant,
                        "format": file_ext,
                        "file_size_bytes": file_size_bytes,
                        "file_size_mb": round(file_size_mb, 4),
                        "page_count": page_count,
                        "extraction_time_s": round(load_time, 5),
                        "chunking_time_s": round(chunk_time, 5),
                        "total_time_s": round(total_time, 5),
                        "chunks_count": chunks_count,
                        "total_characters": total_chars,
                        "avg_chunk_size": round(avg_chunk_size, 2),
                        "min_chunk_size": min_chunk_size,
                        "max_chunk_size": max_chunk_size,
                        "memory_delta_mb": round(mem_delta_mb, 3),
                        "success": True,
                        "throughput_mb_per_s": round(file_size_mb / total_time, 4) if total_time > 0 else 0,
                        "throughput_pages_per_s": round(page_count / total_time, 2) if total_time > 0 else 0,
                        "throughput_chunks_per_s": round(chunks_count / total_time, 2) if total_time > 0 else 0
                    })
                else:
                    results.append({
                        "filename": doc_name,
                        "variant": variant,
                        "format": file_ext,
                        "file_size_bytes": file_size_bytes,
                        "file_size_mb": round(file_size_mb, 4),
                        "page_count": page_count,
                        "extraction_time_s": round(load_time, 5),
                        "chunking_time_s": round(chunk_time, 5),
                        "total_time_s": round(total_time, 5),
                        "success": False,
                        "error": chunk_res.get("error", "Chunking failed")
                    })

            except Exception as e:
                total_time = time.perf_counter() - start_total
                results.append({
                    "filename": doc_name,
                    "variant": variant,
                    "format": file_ext,
                    "file_size_bytes": file_size_bytes,
                    "file_size_mb": round(file_size_mb, 4),
                    "total_time_s": round(total_time, 5),
                    "success": False,
                    "error": str(e)
                })

    # Phase 5: Additional Multi-Configuration Chunking Benchmark
    chunk_configs = [
        {"chunk_size": 500, "chunk_overlap": 100},
        {"chunk_size": 1000, "chunk_overlap": 200},
        {"chunk_size": 1500, "chunk_overlap": 300}
    ]
    chunking_config_results = {}
    
    # Run on sample long text documents
    sample_pdf = next((d for d in doc_files if d.suffix.lower() == ".pdf"), None)
    if sample_pdf:
        load_res = processor_standard.load_document(str(sample_pdf), "application/pdf")
        if load_res["success"]:
            for cfg in chunk_configs:
                splitter = DocumentSplitter(chunk_size=cfg["chunk_size"], chunk_overlap=cfg["chunk_overlap"])
                t0 = time.perf_counter()
                split_chunks = splitter.split_documents(load_res["documents"])
                split_dur = time.perf_counter() - t0
                
                lens = [len(c.page_content) for c in split_chunks] if split_chunks else [0]
                cfg_key = f"size_{cfg['chunk_size']}_overlap_{cfg['chunk_overlap']}"
                chunking_config_results[cfg_key] = {
                    "config": cfg,
                    "chunks_generated": len(split_chunks),
                    "latency_s": round(split_dur, 5),
                    "avg_chunk_size": round(statistics.mean(lens), 2),
                    "min_chunk_size": min(lens),
                    "max_chunk_size": max(lens)
                }

    # Calculate Aggregated Statistics by Format
    format_stats = {}
    formats = sorted(list(set(r["format"] for r in results)))

    for fmt in formats:
        fmt_results = [r for r in results if r["format"] == fmt and r["success"]]
        total_runs = len([r for r in results if r["format"] == fmt])
        successful_runs = len(fmt_results)
        
        if fmt_results:
            latencies = [r["total_time_s"] for r in fmt_results]
            chunk_counts = [r["chunks_count"] for r in fmt_results]
            mb_throughputs = [r["throughput_mb_per_s"] for r in fmt_results]
            
            lat_stats = calculate_distribution_stats(latencies)

            format_stats[fmt] = {
                "total_documents": total_runs,
                "successful_documents": successful_runs,
                "success_rate_percent": round((successful_runs / total_runs) * 100, 2),
                "latency_stats_s": lat_stats,
                "mean_chunks_generated": round(statistics.mean(chunk_counts), 2),
                "mean_throughput_mb_per_s": round(statistics.mean(mb_throughputs), 4)
            }
        else:
            format_stats[fmt] = {
                "total_documents": total_runs,
                "successful_documents": successful_runs,
                "success_rate_percent": 0.0,
                "error": "All runs failed"
            }

    raw_output = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
        "total_experiments": len(results),
        "successful_experiments": sum(1 for r in results if r["success"]),
        "failed_experiments": sum(1 for r in results if not r["success"]),
        "overall_success_rate_percent": round((sum(1 for r in results if r["success"]) / len(results)) * 100, 2),
        "by_format_summary": format_stats,
        "chunking_strategy_comparison": chunking_config_results,
        "raw_measurements": results
    }

    save_benchmark_results("document_ingestion_benchmark", raw_output, format_stats)

    print(f"Overall Success Rate: {raw_output['overall_success_rate_percent']}% ({raw_output['successful_experiments']}/{raw_output['total_experiments']})")
    for fmt, stats in format_stats.items():
        if "latency_stats_s" in stats:
            print(f"Format {fmt.upper()}: Mean Latency = {stats['latency_stats_s']['mean']}s, P95 = {stats['latency_stats_s']['p95']}s, Success = {stats['success_rate_percent']}%")

    return raw_output

if __name__ == "__main__":
    run_ingestion_benchmark()
