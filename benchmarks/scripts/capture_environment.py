#!/usr/bin/env python3
"""
Environment Capture Script for MCPPRO Benchmarks
Gathers hardware specs, OS info, runtime versions, package versions, and platform configurations.
Saves to benchmarks/results/environment.json
"""

import sys
import os
import platform
import psutil
import json
import subprocess
import time
from pathlib import Path

def get_command_output(cmd: list) -> str:
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        return res.stdout.strip()
    except Exception as e:
        return f"Unavailable: {str(e)}"

def capture_environment() -> dict:
    # Basic system info
    cpu_info = platform.processor()
    cpu_count_physical = psutil.cpu_count(logical=False)
    cpu_count_logical = psutil.cpu_count(logical=True)
    ram_bytes = psutil.virtual_memory().total
    ram_gb = round(ram_bytes / (1024 ** 3), 2)

    # GPU info
    gpu_info = "None detected"
    gpu_vram_gb = 0.0
    cuda_available = False
    try:
        import torch
        cuda_available = torch.cuda.is_available()
        if cuda_available:
            gpu_info = torch.cuda.get_device_name(0)
            gpu_vram_gb = round(torch.cuda.get_device_properties(0).total_memory / (1024 ** 3), 2)
    except Exception:
        pass

    # Node & Docker
    node_version = get_command_output(["node", "--version"])
    npm_version = get_command_output(["npm", "--version"])
    docker_version = get_command_output(["docker", "--version"])

    # Git info
    git_sha = get_command_output(["git", "rev-parse", "HEAD"])
    git_branch = get_command_output(["git", "rev-parse", "--abbrev-ref", "HEAD"])

    # Package versions
    relevant_packages = [
        "fastapi", "uvicorn", "pydantic", "langchain", "langchain-core",
        "langchain-community", "langchain-openai", "langchain-qdrant",
        "langchain-pymupdf4llm", "qdrant-client", "pgvector", "pinecone",
        "supabase", "fastmcp", "pymupdf", "pymupdf4llm", "pytesseract",
        "easyocr", "python-pptx", "python-docx", "openpyxl", "torch",
        "transformers", "httpx", "aiohttp", "structlog"
    ]

    installed_packages = {}
    for pkg in relevant_packages:
        try:
            import importlib.metadata
            installed_packages[pkg] = importlib.metadata.version(pkg)
        except Exception:
            installed_packages[pkg] = "Not installed"

    env_data = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
        "git_commit_sha": git_sha,
        "git_branch": git_branch,
        "hardware": {
            "operating_system": platform.platform(),
            "os_release": platform.release(),
            "os_version": platform.version(),
            "architecture": platform.machine(),
            "cpu_processor": cpu_info,
            "cpu_physical_cores": cpu_count_physical,
            "cpu_logical_cores": cpu_count_logical,
            "ram_total_gb": ram_gb,
            "gpu_device": gpu_info,
            "gpu_vram_gb": gpu_vram_gb,
            "cuda_available": cuda_available
        },
        "runtimes": {
            "python_version": sys.version,
            "python_implementation": platform.python_implementation(),
            "python_compiler": platform.python_compiler(),
            "node_version": node_version,
            "npm_version": npm_version,
            "docker_version": docker_version
        },
        "mcppro_configuration": {
            "default_vector_store": "inmemory",
            "supported_vector_stores": ["inmemory", "qdrant", "supabase", "pinecone"],
            "supported_embedding_models": [
                {"name": "text-embedding-3-small", "dimensions": 1536, "provider": "OpenAI"},
                {"name": "text-embedding-3-large", "dimensions": 3072, "provider": "OpenAI"},
                {"name": "text-embedding-ada-002", "dimensions": 1536, "provider": "OpenAI"},
                {"name": "bge-m3", "dimensions": 1024, "provider": "BAAI (Local PyTorch)"}
            ],
            "supported_llm_providers": [
                "openai", "gemini", "anthropic", "groq", "cerebras", "openrouter", "lmstudio"
            ],
            "configured_llm_models": {
                "openai": "gpt-4o-mini",
                "gemini": "gemini-2.0-flash",
                "anthropic": "claude-3-7-sonnet-20250219",
                "groq": "llama-3.1-70b-versatile",
                "cerebras": "openai/gpt-oss-20b",
                "openrouter": "openai/gpt-4.1-mini",
                "lmstudio": "qwen/qwen3-4b"
            },
            "mcp_server": {
                "framework": "fastmcp",
                "server_name": "mcppro-rag-server",
                "transport": "streamable-http",
                "default_port": 8001,
                "exposed_tools": ["retrieve_context", "rag_search"]
            },
            "chunking_defaults": {
                "chunk_size": 1000,
                "chunk_overlap": 200,
                "min_chunk_length": 100
            },
            "caching": {
                "enabled_by_default": True,
                "cache_directory": "vector_store_cache",
                "key_derivation": "SHA256(document_url)"
            }
        },
        "package_versions": installed_packages
    }

    output_path = Path("benchmarks/results/environment.json")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(env_data, f, indent=2)

    print(f"Saved environment specification to {output_path}")
    return env_data

if __name__ == "__main__":
    capture_environment()
