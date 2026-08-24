# MCPPro Codebase Breakdown and Line-by-Line Analysis

This document provides a line-by-line and section-by-section analysis of the primary source code files in both the backend and frontend components.

---

## 1. Backend Codebase Analysis

### [backend/app/main.py](../backend/app/main.py)
This is the entry point for the FastAPI backend application.
*   **Lines 8-12**: Instantiates the FastAPI application with a custom title, version, and description loaded from the system settings.
*   **Lines 14-20**: Registers CORSMiddleware to allow cross-origin requests from the Next.js frontend (origin configured to permit all hosts `*` for maximum flexibility in localized dev settings).
*   **Line 22**: Includes the API router containing versioned endpoints under `/mcppro-agent`.
*   **Lines 24-30**: Configures the event loop policy on startup. On Windows platforms, it explicitly registers `asyncio.WindowsProactorEventLoopPolicy` to enable async handling of subprocesses and sockets, preventing common runtime loop crashes.
*   **Lines 32-44**: Registers the shutdown event handler to gracefully terminate open resources, calling `URLRequestTool.cleanup_session()` to close shared HTTP client connection pools.

### [backend/app/api/v1/endpoints/mcppro_agent.py](../backend/app/api/v1/endpoints/mcppro_agent.py)
Exposes the core REST routes for RAG queries.
*   **Lines 19-37**: Instantiates the shared services on load: the vector store instance via `VectorStoreFactory`, the default LLM provider, `MasterMCPPro`, `DocumentProcessor`, and `RetrievalService`.
*   **Lines 39-63**: Defines `log_request_background`, an asynchronous function queued as a background task to record request details, answers, latency, and debug info to Supabase without blocking the HTTP response.
*   **Lines 64-193**: Exposes `/run`. It computes a unique `document_id` using a UUID hash of the document URL. It branches execution depending on `settings.AGENT_ENABLED`:
    *   **If AGENT_ENABLED is True**: Invokes `mcppro_agent.process_request`, running the Python reasoning agent with dynamic tools.
    *   **If AGENT_ENABLED is False**: Runs `traditional_rag` pipeline (one-shot search and generate).
    *   At the end, it computes total processing time, queues the logging task, and returns `MCPProResponse` or a production-truncated response.

### [backend/app/services/agents/master_mcppro_agent.py](../backend/app/services/agents/master_mcppro_agent.py)
Orchestrates the decision process in python-agentic mode.
*   **Lines 36-43**: Extracts the file extension from the `document_url`. It maintains a list of supported file formats (`.pdf`, `.docx`, etc.). It flags unsupported types immediately.
*   **Line 45**: Wipes the current vector database entries to prevent content leaking between queries (as each query starts fresh on the specified file).
*   **Lines 59-82**: Runs the initial preprocessing tool (`process_document`) with `llm_friendly=False` (faster PyMuPDF parsing). It executes a quick vector query to obtain a context snippet.
*   **Lines 86-103**: Routes based on LLM classification. An LLM selector prompt evaluates the document context snippet and parameters to choose between `traditional` RAG or `agentic` execution. Unsupported files or generic URLs default directly to `agentic`.
*   **Lines 107-120**: If `traditional` mode is selected, it attempts to execute `TraditionalRAGTool`. If it fails, it falls back to the `agentic` flow.
*   **Lines 123-126**: If `agentic` is selected, it triggers a second preprocessing pass with `llm_friendly=True` (using `PyMuPDF4LLMLoader` to parse structured Markdown, tables, and sections).
*   **Lines 129-154**: Spawns concurrent tasks for each user question using `WorkerMCPPro.answer_question()` inside an `asyncio.gather` loop. It returns the combined answers and step-by-step logs.

### [backend/app/services/agents/worker_mcppro_agent.py](../backend/app/services/agents/worker_mcppro_agent.py)
Implements the multi-step worker execution cycle.
*   **Lines 20-31**: Defines `_parse_output`, which sends the raw drafted answer to a formatting parser model to clean, structure, and format it according to strict JSON/styling rules.
*   **Lines 33-146**: Runs `answer_question` in up to 15 iterations.
    *   **Line 43-44**: Generates a random seed and appends it to the system prompt to add subtle temperature variations.
    *   **Line 51**: Restricts the worker tool registry to `retrieve_context` (vector search) and `url_request` (external scraping).
    *   **Lines 55-144**: The loop:
        *   Invokes `chat_completion_with_tools` on the selected LLM provider.
        *   If the model decides to invoke tools, it executes them in parallel using `asyncio.gather`.
        *   It appends the execution results back to the conversation message list as a `tool` role.
        *   If no tool calls are emitted, it stops the loop, parses the output through the format clean pipeline, and returns the final answer.

### [backend/app/services/pipelines/traditional_rag.py](../backend/app/services/pipelines/traditional_rag.py)
Executes a traditional one-shot RAG query.
*   **Lines 58-61**: Wipes the vector database.
*   **Lines 67-108**: Looks for a cached vector index associated with the document URL. If found, it bypasses parsing and embedding. It loads the cached vectors and routes directly to query QA via `RetrievalService`.
*   **Lines 112-154**: If no cache is found, it downloads and processes the file, inserts the vectors, runs the query retrieval, and saves the vector store to disk if the document meets the size threshold (`settings.CACHE_MIN_CHUNKS`).

### [backend/app/services/preprocessors/document_processor.py](../backend/app/services/preprocessors/document_processor.py)
High-level ingest pipeline manager.
*   **Lines 20-63**: Defines `_store_chunks_in_batches`. Splits a large list of chunks into chunks of `batch_size` (default 2000) and inserts them into the vector database. This prevents packet size overruns in remote vector databases.
*   **Lines 65-174**: Orchestrates URL download, sniffs MIME type headers, triggers `FileProcessor.load_document` to read contents, splits document pages into overlap-bounded chunks, builds metadata structures, and inserts them into the vector database.

### [backend/app/services/preprocessors/file_processor.py](../backend/app/services/preprocessors/file_processor.py)
The core loader and format parser.
*   **Lines 24-35**: Defines the supported extensions and MIME types.
*   **Lines 95-164**: Downloads file contents to memory. Analyzes binary headers (e.g., `%PDF` for PDF, `PK\x03\x04` for Office ZIP archives, image signatures) to confirm file types even when URLs lack standard file extensions. Writes verified payloads to a local temp file.
*   **Lines 166-191**: Implements OCR text extraction using PyTesseract.
*   **Lines 192-226**: Resolves the document loader based on the detected format:
    *   PDF: `PyMuPDF4LLMLoader` (markdown extraction mode) if `use_llm_pdf_loader` is set; otherwise, standard `PyMuPDFLoader`.
    *   Word: `DocxLoader`.
    *   PowerPoint: `CustomPptxLoader` (supporting OCR).
    *   Excel: `XlsxLoader`.
    *   Images: Triggers Tesseract OCR.
*   **Lines 227-261**: Processes documents into chunks. Detects repetitive layout patterns (like page numbers or headers) and strips them to prevent noise in vector embeddings.

### [backend/app/services/vector_stores/inmemory_vector_store.py](../backend/app/services/vector_stores/inmemory_vector_store.py)
Implements the transient on-disk cached vector store.
*   **Lines 29-32**: Initializes `OpenAIEmbeddings` using `text-embedding-3-small`.
*   **Lines 301-329**: Implements caching logic. Bypasses repetitive document embeddings by dumping serialized representations of the LangChain vector database using JSON-based disk storage (`dump_to_file` and `load_from_file`). The cache key is composed of `document_url` combined with the parser variant suffix (`std` vs `llm`/`ocr`).

---

## 2. Frontend Codebase Analysis

### [frontend/app/api/mcppro-agent/run/route.ts](../frontend/app/api/mcppro-agent/run/route.ts)
Coordinates the primary Node.js orchestrator layer.
*   **Lines 43-61**: Automatically registers static core tools and loads dynamic external tools from `mcpClientManager.getAllTools()`.
*   **Lines 63-81**: Implements `refineQuery`. Invokes `gpt-4o-mini` with a sanitization prompt to strip script tags, injection attacks, or malicious search query modifiers.
*   **Lines 104-110**: Invokes `generateText` from the Vercel AI SDK. Passes the refined prompt, unified agent system prompt, and registered tools. Sets `maxSteps` to 15, allowing the LLM to recursively call tools, analyze outputs, and make subsequent calls in a single execution thread.
*   **Lines 112-133**: Loops through the execution steps. It extracts tool names, input arguments, and execution outputs, formatting them into a standardized database log format.
*   **Lines 135-153**: Extracts final answers, maps them back to the user's questions, logs the transaction to Supabase via `logMCPProRequest`, and returns the results.

### [frontend/app/chat/lib/ai/mcp-servers/mcp-client-manager.ts](../frontend/app/chat/lib/ai/mcp-servers/mcp-client-manager.ts)
The Model Context Protocol integration hub.
*   **Lines 39-114**: Defines configuration settings for local and remote MCP servers:
    *   `playwright`: Run using Stdio connector (`npx -y @smithery/cli run @microsoft/playwright-mcp`).
    *   `v0`: Run using Stdio connector (`npx -y mcp-remote https://mcp.v0.dev`).
    *   `rag`: HTTP streamable transport pointing to the Python FastAPI backend `http://127.0.0.1:8001/mcp`.
    *   `computer`: HTTP transport pointing to `http://127.0.0.1:8002/mcp`.
*   **Lines 128-185**: Spawns client instances. For `http` transport, it initializes `StreamableHTTPClientTransport`. For `stdio` transport, it spawns node subprocesses using `StdioClientTransport`, piping standard input/output streams.
*   **Lines 262-282**: Exposes `getAllTools`, aggregating tools from all active MCP servers and prefixing tool names with the server's name (e.g. `rag_retrieve_context`, `playwright_navigate`) to avoid naming collisions.
