#!/usr/bin/env python3
"""
Phase 11: MCP (Model Context Protocol) Benchmark
Evaluates FastMCP server initialization, tool discovery, schema reflection,
tool invocation latencies, serialization/deserialization overhead, and error rates.
"""

import os
import sys
import time
import json
import asyncio
import statistics
from pathlib import Path

# Add benchmark directory and initialize compatibility shims
sys.path.insert(0, str(Path(__file__).resolve().parent))
import benchmark_common
from benchmark_common import (
    calculate_distribution_stats, save_benchmark_results,
    DATASETS_DIR, RAW_DIR
)

from fastmcp import FastMCP
from app.tools.registry import ToolRegistry
from app.tools.url_request_tool import URLRequestTool
from app.tools.process_document_tool import ProcessDocumentTool
from app.tools.retrieve_context_tool import RetrieveContextTool
from app.tools.traditional_rag_tool import TraditionalRAGTool

async def run_mcp_benchmark():
    print("==================================================")
    print("           Phase 11: MCP Protocol Benchmark       ")
    print("==================================================")

    # 1. MCP Initialization Latency
    t0_init = time.perf_counter()
    mcp = FastMCP("mcppro-rag-server-benchmark")
    
    @mcp.tool(description="Retrieve relevant chunks from documents")
    async def bench_retrieve_context(questions: list[str], k: int = 10):
        return {"status": "success", "chunks_retrieved": k, "queries": len(questions)}
        
    @mcp.tool(description="Process a document from URL and retrieve relevant context")
    async def bench_rag_search(document_url: str, questions: list[str], k: int = 10):
        return {"status": "success", "url": document_url, "chunks_retrieved": k}

    mcp_init_latency_s = time.perf_counter() - t0_init
    print(f"MCP Server Initialization Latency: {mcp_init_latency_s * 1000:.3f}ms")

    # 2. Tool Discovery Latency
    t0_disc = time.perf_counter()
    # Query tools from FastMCP or ToolRegistry
    registry = ToolRegistry()
    available_tools = registry.list_tools()
    llm_schemas = registry.get_tools_for_llm()
    discovery_latency_s = time.perf_counter() - t0_disc
    print(f"Tool Discovery Latency: {discovery_latency_s * 1000:.3f}ms ({len(available_tools)} tools discovered)")

    # 3. Serialization and Deserialization Overhead
    sample_payload = {
        "document_url": "https://raw.githubusercontent.com/otter-technology/mcp-pro-eval-docs/main/sample_data.txt",
        "questions": ["What is MCPPRO?", "How does vector caching work?", "What LLMs are supported?"],
        "k": 10
    }
    
    ser_latencies = []
    deser_latencies = []
    for _ in range(100):
        t0_s = time.perf_counter()
        ser_str = json.dumps(sample_payload)
        ser_latencies.append(time.perf_counter() - t0_s)

        t0_d = time.perf_counter()
        deser_obj = json.loads(ser_str)
        deser_latencies.append(time.perf_counter() - t0_d)

    mean_ser_us = statistics.mean(ser_latencies) * 1_000_000
    mean_deser_us = statistics.mean(deser_latencies) * 1_000_000

    # 4. Individual Tool Invocations
    tool_benchmarks = {}
    
    # Tool A: URLRequestTool
    url_tool = registry.get_tool("url_request")
    url_invocations = []
    for test_url in ["https://httpbin.org/get", "https://api.github.com"]:
        t0 = time.perf_counter()
        res = await url_tool.execute(url=test_url)
        dur = time.perf_counter() - t0
        url_invocations.append({
            "url": test_url,
            "success": res.success,
            "latency_s": round(dur, 5),
            "error": res.error if not res.success else None
        })
    tool_benchmarks["url_request"] = {
        "invocations": len(url_invocations),
        "success_rate": sum(1 for r in url_invocations if r["success"]) / len(url_invocations) * 100,
        "mean_latency_s": round(statistics.mean([r["latency_s"] for r in url_invocations]), 5),
        "runs": url_invocations
    }

    # Tool B: RetrieveContextTool
    rc_tool = registry.get_tool("retrieve_context")
    rc_invocations = []
    for k_val in [1, 5, 10]:
        t0 = time.perf_counter()
        res = await rc_tool.execute(questions=["What is MCPPRO architecture?"], k=k_val)
        dur = time.perf_counter() - t0
        rc_invocations.append({
            "k": k_val,
            "success": res.success,
            "latency_s": round(dur, 5),
            "error": res.error if not res.success else None
        })
    tool_benchmarks["retrieve_context"] = {
        "invocations": len(rc_invocations),
        "success_rate": sum(1 for r in rc_invocations if r["success"]) / len(rc_invocations) * 100,
        "mean_latency_s": round(statistics.mean([r["latency_s"] for r in rc_invocations]), 5),
        "runs": rc_invocations
    }

    # Tool C: TraditionalRAGTool
    trad_tool = registry.get_tool("traditional_rag")
    t0 = time.perf_counter()
    trad_res = await trad_tool.execute(
        document_url="https://example.com/sample.pdf",
        questions=["Explain system features"]
    )
    trad_dur = time.perf_counter() - t0
    tool_benchmarks["traditional_rag"] = {
        "invocations": 1,
        "success_rate": 100.0 if trad_res.success else 0.0,
        "mean_latency_s": round(trad_dur, 5),
        "runs": [{"success": trad_res.success, "latency_s": round(trad_dur, 5)}]
    }

    # Tool D: Error Handling on Invalid Parameters
    t0 = time.perf_counter()
    err_res = await rc_tool.execute()  # Missing required questions
    err_dur = time.perf_counter() - t0
    error_handling_benchmark = {
        "handled_gracefully": not err_res.success,
        "error_message": err_res.error,
        "validation_latency_ms": round(err_dur * 1000, 3)
    }

    # Overall Summary
    total_calls = sum(tb["invocations"] for tb in tool_benchmarks.values()) + 1
    successful_calls = sum(sum(1 for r in tb["runs"] if r["success"]) for tb in tool_benchmarks.values())
    failed_calls = total_calls - successful_calls

    summary = {
        "mcp_server_init_latency_ms": round(mcp_init_latency_s * 1000, 3),
        "tool_discovery_latency_ms": round(discovery_latency_s * 1000, 3),
        "mean_serialization_latency_us": round(mean_ser_us, 3),
        "mean_deserialization_latency_us": round(mean_deser_us, 3),
        "total_tool_invocations": total_calls,
        "successful_tool_calls": successful_calls,
        "failed_tool_calls": failed_calls,
        "tool_error_rate_percent": round((failed_calls / total_calls) * 100, 2),
        "tool_benchmarks": tool_benchmarks,
        "error_handling_validation": error_handling_benchmark
    }

    raw_output = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
        "summary": summary
    }

    save_benchmark_results("mcp_benchmark", raw_output, summary)

    print(f"\n==================================================")
    print(f"MCP Server Init: {summary['mcp_server_init_latency_ms']}ms")
    print(f"Tool Discovery: {summary['tool_discovery_latency_ms']}ms")
    print(f"Serialization Overhead: {summary['mean_serialization_latency_us']} microseconds")
    print(f"Total Tool Calls: {total_calls}, Success Rate: {100 - summary['tool_error_rate_percent']}%")
    print(f"==================================================")

    return raw_output

if __name__ == "__main__":
    asyncio.run(run_mcp_benchmark())
