# MCPPro Intelligence System Documentation Suite

This folder contains the complete, production-grade documentation for the MCPPro Intelligence System. It is designed to explain the architecture, codebase, and RAG concepts for both engineering reference and technical interview preparation.

## Documentation Index

1.  **[architecture.md](./architecture.md)**
    *   System topology and the 5-layer design.
    *   Role of the Next.js Frontend Orchestrator and FastAPI Backend.
    *   Engineering rationale behind the decoupled runtime architecture.
    *   Dual-orchestration execution paths (traditional RAG vs. agentic loops).

2.  **[codebase_breakdown.md](./codebase_breakdown.md)**
    *   File-by-file codebase analysis of the backend services, preprocessors, and agents.
    *   Analysis of the frontend route, query refinement mechanisms, and MCP client manager.
    *   Detailed breakdown of key logic blocks, including loop policies, connection pooling, and vector database batch indexing.

3.  **[interview_guide.md](./interview_guide.md)**
    *   2-minute technical elevator pitch for presenting the project.
    *   Expected interview system design questions and answers.
    *   Academic and practical deep dive into Retrieval-Augmented Generation (RAG).
    *   Vector math comparisons (Cosine Similarity, Inner Product, Euclidean Distance) with formulas.
    *   Analysis of document loaders (Standard PyMuPDF vs Layout-preserving PyMuPDF4LLM) and OCR.
    *   Evaluation metrics (Faithfulness, Relevance, Precision, Recall) and the caching engine.

## Key System Concepts

*   **Next.js Orchestration**: Coordinates multi-model selections, refines search terms to block prompt injection, and executes a 15-step agent loop utilizing Vercel AI SDK.
*   **Model Context Protocol (MCP)**: Utilizes JSON-RPC 2.0 over Stdio and HTTP streamable transport to connect TypeScript agents to local tools (Playwright, v0) and the FastAPI RAG service.
*   **Python FastAPI Backend**: Manages CPU-bound document loading, text splitting, layout parsing, and vectorized search with Qdrant, Pinecone, PGVector, or InMemory stores.
*   **Variant-Sensitive Cache**: Serializes in-memory vector stores to disk, routing by URL and parsing variant (std vs. ocr) to bypass redundant embedding calculations.
