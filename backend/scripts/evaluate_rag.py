#!/usr/bin/env python3
"""
MCPPro RAG Pipeline Evaluation Script
This script provides automated evaluation of the document processing and question answering pipeline.
It calculates key MLOps performance and quality metrics:
1. Indexing Time (seconds)
2. Average Query Latency (seconds)
3. Chunks Processed per Document
4. Retrieval Similarity Scores (average)
5. Execution Success Rate
"""

import os
import sys
import time
import asyncio
from typing import List, Dict, Any

# Ensure backend directory is in path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config.settings import settings
from app.services.vector_stores.vector_store_factory import VectorStoreFactory
from app.providers.factory import LLMProviderFactory
from app.services.preprocessors.document_processor import DocumentProcessor
from app.services.retrievers.retrieval_service import RetrievalService
from app.services.pipelines.traditional_rag import traditional_rag

# Sample Golden Dataset for Evaluation
EVALUATION_DATASET = [
    {
        "document_url": "https://raw.githubusercontent.com/otter-technology/mcp-pro-eval-docs/main/sample_data.txt",
        "document_name": "Sample Data Manual",
        "questions": [
            "What is the core purpose of MCPPro?",
            "What vector stores are supported?",
            "How does caching improve processing times?"
        ],
        "expected_topics": ["agent", "vector", "cache"]
    }
]

async def run_evaluation():
    print("==================================================")
    print("      MCPPro RAG Pipeline Evaluation (MLOps)     ")
    print("==================================================")
    print(f"Timestamp: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Environment: {settings.ENVIRONMENT}")
    print(f"Vector Store Type: {settings.DEFAULT_VECTOR_STORE}")
    print(f"LLM Provider: {settings.DEFAULT_LLM_PROVIDER}")
    print("==================================================")

    # Initialize services
    vector_store = VectorStoreFactory.create_vector_store(settings)
    llm_provider = LLMProviderFactory.create_provider(settings.DEFAULT_LLM_PROVIDER, settings)
    
    document_processor = DocumentProcessor(
        vector_store=vector_store,
        chunk_size=settings.CHUNK_SIZE,
        chunk_overlap=settings.CHUNK_OVERLAP
    )
    
    retrieval_service = RetrievalService(
        vector_store=vector_store,
        llm_provider=llm_provider
    )

    results = []
    
    for item in EVALUATION_DATASET:
        doc_url = item["document_url"]
        doc_name = item["document_name"]
        questions = item["questions"]
        
        print(f"\n[Evaluating] Document: {doc_name}")
        print(f"URL: {doc_url}")
        print(f"Running {len(questions)} test queries...")
        
        doc_id = "eval_" + str(int(time.time()))
        
        try:
            # 1. Measure Indexing time
            start_index_time = time.time()
            processing_result = await document_processor.process_document_url(
                document_url=doc_url,
                document_id=doc_id,
            )
            indexing_duration = time.time() - start_index_time
            
            if not processing_result["success"]:
                raise RuntimeError(processing_result.get("error", "Unknown indexing error"))
                
            chunks_count = processing_result["chunks_processed"]
            print(f"-> Successfully indexed document into {chunks_count} chunks in {indexing_duration:.2f}s")

            # 2. Measure Query time & quality metrics
            query_latencies = []
            similarity_scores = []
            answers = []
            
            for question in questions:
                start_query_time = time.time()
                query_res = await retrieval_service.process_document_queries(
                    document_id=doc_id,
                    questions=[question],
                    k=3
                )
                query_duration = time.time() - start_query_time
                query_latencies.append(query_duration)
                
                # Extract similarity scores if available
                debug_info = query_res.get("debug_info", [])
                if debug_info:
                    scores = [c.get("similarity_score", 0.0) for c in debug_info[0].get("context_with_scores", [])]
                    if scores:
                        similarity_scores.append(sum(scores) / len(scores))
                
                ans = query_res["answers"][0]
                answers.append(ans)
                print(f"   Q: '{question}' -> Answered in {query_duration:.2f}s")
            
            # Record success metrics
            results.append({
                "document_name": doc_name,
                "success": True,
                "indexing_time": indexing_duration,
                "chunks_count": chunks_count,
                "avg_query_latency": sum(query_latencies) / len(query_latencies),
                "avg_similarity_score": sum(similarity_scores) / len(similarity_scores) if similarity_scores else 0.0,
                "error": None
            })
            
        except Exception as e:
            print(f"-> [FAILURE] Evaluation failed for {doc_name}: {e}")
            results.append({
                "document_name": doc_name,
                "success": False,
                "indexing_time": 0.0,
                "chunks_count": 0,
                "avg_query_latency": 0.0,
                "avg_similarity_score": 0.0,
                "error": str(e)
            })

    # Summary Report
    print("\n" + "=" * 50)
    print("           EVALUATION METRICS SUMMARY             ")
    print("=" * 50)
    
    total_docs = len(results)
    successful_docs = sum(1 for r in results if r["success"])
    success_rate = (successful_docs / total_docs) * 100
    
    print(f"Overall Success Rate: {success_rate:.1f}% ({successful_docs}/{total_docs})")
    
    for r in results:
        print(f"\nDocument: {r['document_name']}")
        if r["success"]:
            print(f"  * Status: SUCCESS")
            print(f"  * Chunks Created: {r['chunks_count']}")
            print(f"  * Indexing Latency: {r['indexing_time']:.3f} seconds")
            print(f"  * Avg Query Latency: {r['avg_query_latency']:.3f} seconds")
            print(f"  * Avg Retrieved Chunk Similarity: {r['avg_similarity_score']:.4f}")
        else:
            print(f"  * Status: FAILED")
            print(f"  * Error: {r['error']}")
            
    print("=" * 50)

if __name__ == "__main__":
    # If the user has a local test setup, they can run this script.
    # We will use dummy environment variables if not loaded.
    if not os.getenv("OPENAI_API_KEY") and not os.getenv("GEMINI_API_KEY"):
        print("Warning: Neither OPENAI_API_KEY nor GEMINI_API_KEY is configured.")
        print("Please configure your API keys in the backend/.env file before running evaluation.")
        
    asyncio.run(run_evaluation())
