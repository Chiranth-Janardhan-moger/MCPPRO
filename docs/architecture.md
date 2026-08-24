# MCPPro Intelligence System Architecture

This document describes the system architecture of the MCPPro Intelligence System. It outlines the modular 5-layer design, describes end-to-end data flows, and explains the engineering decisions behind the decoupled frontend-backend architecture.

---

## System Overview

MCPPro is structured as a decoupled multi-agent intelligence system split into distinct logical boundaries. By isolating frontend interface orchestration from backend heavy-duty data processing and vector operations, the system achieves separation of concerns, high throughput, and independent scalability.

```
+-----------------------------------------------------------+
|                      1. Client Layer                      |
|  - Next.js Web Chat UI (React, Tailwind, Radix UI)        |
|  - Admin Dashboard (Traces, Metrics, API Logs)            |
+-----------------------------+-----------------------------+
                              | HTTPS / WSS
                              v
+-----------------------------------------------------------+
|             2. Frontend Orchestrator (Next.js)            |
|  - API Routing (/api/chat, /api/run)                      |
|  - Vercel AI SDK (15-step agent execution loop)           |
|  - MCP Client Manager (Dynamic tool routing)              |
|  - Supabase Transactional & Log DB integration            |
+----------------------+-------------+----------------------+
                       |             |
                       |             | Local/Remote Stdio
     HTTP / Streamable |             v
             Transport |    +-------------------------------+
                       |    |     3. Tool & External Layer  |
                       |    |  - Playwright Stdio Server    |
                       |    |  - Sandboxed JS execution     |
                       |    |  - v0 UI Generator & Search   |
                       |    +-------------------------------+
                       v
+-----------------------------------------------------------+
|              4. Backend FastAPI Service (Python)          |
|  - FastAPI Web Server (/mcppro-agent/run on port 8000)    |
|  - FastMCP Server (RAG MCP on port 8001)                  |
|  - Document Processing (PyMuPDF, PyMuPDF4LLM, OCR)        |
|  - Agentic Processing Service (Master & Worker Agents)    |
|  - Traditional RAG Pipeline Execution                     |
+-----------------------------+-----------------------------+
                              |
                              v
+-----------------------------------------------------------+
|                       5. Data Layer                       |
|  - Vector DBs (Qdrant, Pinecone, PGVector, InMemory)      |
|  - Transactional Store (Supabase PostgreSQL)              |
|  - Vector Cache (Disk-based serialization format)          |
+-----------------------------------------------------------+
```

---

## The 5 Architectural Layers

### 1. Client Layer
The client layer provides the user interaction interface:
*   **Web Chat Interface**: Built using React, Tailwind CSS, and Radix UI primitives. It supports streaming responses, multi-model selectors (OpenAI, Gemini, Anthropic), and secure document uploads via temporary storage or pre-signed URLs.
*   **Admin Dashboard**: Monitors API latency, tool usage statistics, and request-response traces, enabling developers to monitor agent execution logs in real-time.

### 2. Frontend Orchestrator (Next.js)
The frontend orchestrator serves as the primary coordination layer for LLM agents:
*   **Agent Run API (/api/mcppro-agent/run/route.ts)**: Validates incoming requests, executes pre-processing/query refinement (using lightweight models to filter or scrub malicious content), and starts the primary LLM reasoning loop.
*   **Vercel AI SDK Agent Loop**: Implements a step-by-step reasoning cycle capped at 15 steps. The model receives a set of available tools, analyzes the user query, and decides whether to invoke tools or finalize its answer.
*   **Model Context Protocol (MCP) Client Manager**: Handles runtime discovery, registration, and communication with multiple MCP servers. It translates standard tool calls from the orchestrator into MCP transport requests.

### 3. Tool and External Layer
Provides runtime capabilities to the orchestrator:
*   **Core Tools**: Static tools implemented directly in the frontend (such as sandboxed JavaScript runners and local file creation utilities).
*   **External MCP Servers**: Includes Playwright (UI testing and scraping using Smithery), v0 (remote UI generator), and RAG MCP.
*   **APIs**: Tavily Web Search, GitHub, and Resend for email notifications.

### 4. Backend FastAPI Service (Python)
The backend acts as the data processing and retrieval engine:
*   **FastAPI Webserver**: Listens on port 8000. Exposes unified endpoints for document extraction, traditional vector search QA, and agentic processing.
*   **FastMCP Server**: Listens on port 8001. Connects the Next.js orchestrator to Python-specific retrieval libraries via HTTP-streamable transport.
*   **Document Intelligence**: Extracts text from PDFs, Word files, Excel, PowerPoint, and images using standard loaders, OCR (Tesseract), or LLM-oriented layout extraction (PyMuPDF4LLM).
*   **Python Orchestration (Master/Worker)**: For backend-only runs, a Python-based Master agent decides whether to route the request to a traditional one-shot RAG pipeline or spin up a worker agent that loops through vector searches and HTTP requests.

### 5. Data Layer
The storage foundations:
*   **Supabase (PostgreSQL)**: Stores user credentials, session state, audit trails, and execution trace logs.
*   **Vector Databases**: Standardized interface supporting:
    *   **Qdrant**: High-performance production-grade vector search engine.
    *   **Pinecone**: Fully-managed cloud vector database.
    *   **Supabase PGVector**: SQL-native vector storage.
    *   **InMemory**: High-speed, transient vector database for development and serverless testing.
*   **Vector Cache**: Stores serialized vector store snapshots to disk, allowing files to be loaded into memory without running embeddings twice.

---

## Architectural Decisions and Rationale

### Decoupled Next.js Frontend + FastAPI Backend
*   **Language-Specific Advantages**: The Node.js/TypeScript ecosystem is the standard for web UI, streaming API endpoints, and the Vercel AI SDK. Conversely, Python is the standard for data processing, OCR, vector database integration, and semantic parsing (using PyMuPDF, Pandas, and LangChain). Decoupling allows each service to use the optimal runtime.
*   **Security Isolation**: The frontend orchestrator manages user sessions, credentials, and LLM orchestration. The backend remains hidden behind the internal network, performing document processing and database tasks.
*   **Independent Scaling**: Document processing (FastAPI/Python) is CPU-bound due to OCR and document ingestion. Chat orchestration (Next.js) is network-bound due to streaming and LLM calls. Decoupling allows scaling the FastAPI services independently when processing large documents.

### Dual-Orchestration Capability
*   **Hybrid Routing**: When a document is structured and straightforward, the system routes queries to the traditional RAG pipeline (FastAPI-driven, one-shot retrieval and generation). This cuts LLM token costs and reduces query response latency. For complex instructions spanning multi-source analysis, the system uses the 15-step agentic loop.

### Dynamic Caching for Vector Stores
*   **Reduced Embedding Costs**: Regenerating document embeddings for every query is expensive. The backend implements a variant-sensitive cache using disk-based serialization, associating cache keys with document URLs and processing configurations (e.g., standard vs OCR loaders).
