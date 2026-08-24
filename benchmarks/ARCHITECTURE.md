# MCPPRO System Architecture and Benchmarkable Components

## 1. System Overview

MCPPRO is an AI Agent, Model Context Protocol (MCP), and Document RAG orchestration platform designed to process heterogeneous documents, build vector indices, coordinate agentic multi-tool workflows, and deliver grounded question answering.

The repository is structured into two core runtime layers alongside external integration boundaries:
1. Backend Layer (Python / FastAPI / FastMCP)
2. Frontend and Orchestrator Layer (Next.js / TypeScript / VoltAgent / Vercel AI SDK)
3. Storage and Telemetry Infrastructure (Vector Stores, SQLite/Supabase, Cache)

---

## 2. Component Breakdown and Measurable Properties

### 2.1 Document Preprocessor and File Loaders
- Source Location: `backend/app/services/preprocessors/`, `backend/app/services/utils/file_processor/`
- Key Classes: `DocumentProcessor`, `FileProcessor`, `CustomPptxLoader`, `ChunkCleaner`, `DocumentSplitter`
- Supported Document Types:
  - PDF: PyMuPDF (`PyMuPDFLoader`) vs PyMuPDF4LLM (`PyMuPDF4LLMLoader`)
  - Word: DOCX, DOC (`DocxLoader`)
  - PowerPoint: PPTX, PPT (`CustomPptxLoader` supporting standard extraction and image OCR extraction)
  - Spreadsheet: XLSX, XLS (`XlsxLoader`)
  - Image: JPEG, JPG, PNG (`pytesseract`, `PIL`)
  - Plaintext / Markdown: TXT, MD
- Measurable Properties:
  - Document ingestion latency (seconds per document)
  - File size scaling (MB/s throughput)
  - Page processing throughput (pages/sec)
  - Character and chunk extraction yield (characters/sec, chunks/doc)
  - Ingestion memory footprint (RAM peak delta in MB)
  - Parsing success rate and failure rate on valid vs malformed inputs

### 2.2 Optical Character Recognition (OCR)
- Source Location: `backend/app/services/utils/file_processor/custom_pptx_loader.py`, `backend/app/services/preprocessors/file_processor.py`
- Engines: `pytesseract` (Tesseract OCR), `easyocr` (EasyOCR PyTorch engine)
- Measurable Properties:
  - Extraction latency per page / image
  - Character recognition throughput (chars/sec)
  - Character Error Rate (CER) and Word Error Rate (WER) against ground-truth text
  - Engine comparison latency (Tesseract vs EasyOCR on identical image inputs)
  - OCR failure rate and empty extraction rate

### 2.3 Document Chunking and Cleaning
- Source Location: `backend/app/services/utils/file_processor/document_splitter.py`, `backend/app/services/utils/file_processor/chunk_cleaner.py`
- Key Classes: `DocumentSplitter` (RecursiveCharacterTextSplitter), `ChunkCleaner`
- Configurable Parameters: `CHUNK_SIZE` (default 1000), `CHUNK_OVERLAP` (default 200), `min_chunk_length` (100)
- Measurable Properties:
  - Chunking latency per document / page
  - Chunks generated per document
  - Chunk character length distribution (min, max, mean, median, standard deviation)
  - Overlap verification and character redundancy
  - Repetitive header/footer pattern detection and cleaning latency

### 2.4 Embedding Models
- Source Location: `backend/app/embedders/`
- Key Classes: `BaseEmbedder`, `OpenAIEmbedder`, `BGEM3Embedder`, `EmbeddingFactory`
- Supported Models:
  - `text-embedding-3-small` (1536 dimensions)
  - `text-embedding-3-large` (3072 dimensions)
  - `text-embedding-ada-002` (1536 dimensions)
  - `bge-m3` (1024 dimensions, dense, local PyTorch execution)
- Measurable Properties:
  - Embedding vector dimensionality verification
  - Single-text embedding latency (ms/text)
  - Batch embedding latency across batch sizes (1, 4, 8, 16, 32, 64)
  - Throughput (texts/second, chunks/second)
  - Scaling behavior with sequence length

### 2.5 Vector Database Subsystem
- Source Location: `backend/app/services/vector_stores/`
- Key Classes: `BaseVectorStore`, `InMemoryVectorStoreService`, `QdrantVectorStoreService`, `SupabaseVectorStoreService`, `PineconeVectorStoreService`, `VectorStoreFactory`
- Vector Store Types:
  - `inmemory`: LangChain InMemoryVectorStore with local serialization
  - `qdrant`: QdrantClient (in-memory mode, local on-disk path, or remote server)
  - `supabase`: PostgreSQL + pgvector via Supabase RPC `match_documents`
  - `pinecone`: Pinecone serverless / pod index
- Measurable Properties:
  - Vector insertion latency (seconds for N vectors)
  - Insertion throughput (vectors/second)
  - Similarity search query latency (mean, median, p90, p95, p99)
  - Search accuracy and score distribution across distance metrics (Cosine)
  - Top-k retrieval recall and precision on controlled corpus sizes (100, 1000, 10000 vectors)
  - Document count verification and deletion latency

### 2.6 Vector Store Caching Subsystem
- Source Location: `backend/app/services/vector_stores/vector_store_cache.py`, `backend/app/services/vector_stores/inmemory_vector_store.py`
- Key Classes: `VectorStoreCache`
- Cache Mechanism: SHA-256 URL hash keyed disk serialization (`.vs` files) with metadata ledger (`cache_metadata.json`)
- Measurable Properties:
  - Cold request latency (full parsing + embedding + indexing)
  - Warm request latency (cache hit + index deserialization)
  - Cache lookup latency (ms)
  - Latency reduction percentage: `((cold_latency - warm_latency) / cold_latency) * 100`
  - Cache speedup factor: `cold_latency / warm_latency`
  - Cache hit rate and cache miss behavior
  - Disk storage footprint per cached document

### 2.7 Retrieval and RAG Pipeline
- Source Location: `backend/app/services/retrievers/retrieval_service.py`, `backend/app/services/pipelines/traditional_rag.py`
- Key Classes: `RetrievalService`, `traditional_rag`
- Measurable Properties:
  - End-to-end RAG latency (retrieval stage + generation stage)
  - Top-k retrieval recall (Recall@1, Recall@3, Recall@5, Recall@10)
  - Mean Reciprocal Rank (MRR)
  - Average cosine similarity scores
  - Answer correctness, answer relevance, groundedness/faithfulness, and hallucination rate
  - Single question latency vs parallel multi-question batching latency

### 2.8 Tool Registry and Static Tools
- Source Location: `backend/app/tools/`
- Key Classes: `ToolRegistry`, `ProcessDocumentTool`, `RetrieveContextTool`, `TraditionalRAGTool`, `URLRequestTool`
- Measurable Properties:
  - Tool execution latency per tool
  - Function schema generation latency
  - Input validation and exception handling robustness
  - HTTP request tool connection pooling and fetch latency (`URLRequestTool`)

### 2.9 Model Context Protocol (MCP) Server and Client
- Source Location: `backend/mcp_server/`, `frontend/app/chat/lib/ai/mcp-servers/mcp-client-manager.ts`
- Key Classes / Functions: `FastMCP("mcppro-rag-server")`, `mcpClientManager`
- Exposed Tools: `retrieve_context`, `rag_search`
- Transports: HTTP (`streamable-http`) and Stdio
- Measurable Properties:
  - MCP server initialization time
  - Tool discovery latency (retrieving schema list from MCP server)
  - MCP tool call invocation latency over HTTP streamable transport
  - Serialization / deserialization overhead
  - MCP tool execution success rate and error handling

### 2.10 Agent Orchestration and Tool Routing
- Source Location: `backend/app/services/agents/master_mcppro_agent.py`, `backend/app/services/agents/worker_mcppro_agent.py`, `frontend/app/api/mcppro-agent/run/route.ts`
- Key Classes: `MasterMCPPro`, `WorkerMCPPro`
- Execution Modes:
  - Direct / Traditional RAG
  - Agentic Mode with dynamic iterative tool-calling loop (up to 15 iterations)
- Measurable Properties:
  - Routing decision latency (LLM prompt classification: Traditional vs Agentic)
  - Routing accuracy across query types
  - Worker agent loop iteration count and convergence latency
  - Orchestration overhead: total latency minus raw tool execution time
  - Parallel worker question answering scaling

### 2.11 Multi-Model LLM Providers
- Source Location: `backend/app/providers/`
- Supported Providers: OpenAI (`OpenAIProvider`), Gemini (`GeminiProvider`), Anthropic (`AnthropicProvider`), Groq (`GroqProvider`), Cerebras (`CerebrasProvider`), OpenRouter (`OpenRouterProvider`), LMStudio (`LMStudioProvider`)
- Measurable Properties:
  - Generation latency per query
  - Token throughput (output tokens/second)
  - Input token count, output token count, total tokens
  - Answer quality and groundedness
  - Availability and error rates per provider

### 2.12 End-to-End System and API Endpoints
- Source Location: `backend/app/api/v1/endpoints/mcppro_agent.py`, `frontend/app/api/mcppro-agent/run/route.ts`
- Endpoints: `POST /mcppro/run`, `GET /mcppro/health`, `POST /api/mcppro-agent/run`
- Measurable Properties:
  - End-to-end request latency breakdown by pipeline stage
  - Concurrency throughput (requests/second at 1, 5, 10, 25 concurrent requests)
  - Error rate under concurrent load
  - Stage latency percentage breakdown (Preprocess %, Embedding %, Retrieval %, Generation %)

### 2.13 System Reliability and Robustness
- Measurable Properties:
  - Malformed document handling (corrupted PDFs, unsupported extensions)
  - Missing credential resilience
  - Vector store fallback behavior
  - Graceful degradation and error message fidelity

### 2.14 CI/CD Pipeline and Code Validation
- Source Location: `.github/workflows/ci-cd.yml`
- Workflow Jobs: `backend-ci` (Python 3.12, syntax validation `py_compile`, Docker build dry-run), `frontend-ci` (Node 20, Next.js build, Docker build dry-run)
- Measurable Properties:
  - Python compile / syntax check execution duration
  - Frontend build duration
  - Docker container build timing
