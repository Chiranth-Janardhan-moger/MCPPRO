# MCPPro Technical Interview and RAG Deep-Dive Guide

This guide is structured to help you explain the MCPPro Intelligence System during technical engineering interviews. It covers the project pitch, key system design questions, and an academic/practical deep dive into Retrieval-Augmented Generation (RAG) and Agentic Workflow concepts.

---

## 1. Project Pitch (The 2-Minute Elevator Pitch)

"MCPPro is a production-grade, dual-orchestration AI agent and Document RAG platform. I designed it to solve a common enterprise problem: standard RAG systems are great for simple search-and-answer tasks but fail on complex, multi-step queries that require browser automation, file generation, or external tool execution.

To solve this, I built a decoupled system with a Next.js frontend orchestrator and a FastAPI/Python backend. The Next.js orchestrator uses the Vercel AI SDK to manage a 15-step agentic reasoning loop. It dynamically connects to multiple external tools via the Model Context Protocol (MCP), including Playwright for scraping, v0 for UI generation, and our custom Python RAG server.

On the backend, I built a high-performance Python RAG service that handles document parsing (Excel, PowerPoint, Word, PDFs, and OCR for images), vector indexing (supporting pluggable databases like Qdrant, Pinecone, and PGVector), and query retrieval. To optimize latency and API costs, the backend implements a variant-sensitive disk cache for vector indexes, parallel query execution using python's asyncio, and layout-preserving parsing using PyMuPDF4LLM.

This architecture gives us the best of both worlds: a highly interactive, streaming UI with a TypeScript agent engine, combined with a powerful, specialized Python backend for CPU-intensive document processing and vector math."

---

## 2. Key System Design Questions & Answers

### Q1: Why did you decouple the Next.js frontend and the FastAPI backend?
*   **Separation of Concerns**: Chat streaming, session auth (via Supabase), and client-side state are network-bound and fit naturally in Next.js. Document preprocessing, OCR, and vector operations are CPU-bound and require Python's scientific ecosystem (Pandas, PyMuPDF, PyTesseract, LangChain).
*   **Scalability**: Document processing is computationally heavy. If a user uploads a 500MB PDF, the OCR and text-chunking tasks spike CPU usage. In a decoupled model, the FastAPI backend can run on autoscaling GPU/CPU container instances (like AWS ECS or GCP Cloud Run), while the Next.js API routes run on edge/serverless runtimes (like Vercel).
*   **Security**: The frontend orchestrator handles external API keys (OpenAI, Gemini, Resend) and manages user sessions. The backend remains isolated within the private network, exposing endpoints only to the orchestrator.

### Q2: What is the Model Context Protocol (MCP) and how does it work in this project?
*   **Concept**: Developed by Anthropic, MCP is an open standard that allows LLMs to interact with external data sources and tools through a standardized protocol.
*   **Implementation**: The frontend orchestrator acts as an **MCP Client**. It uses the `mcpClientManager` to establish connections.
    *   **Stdio Transport**: Used for local command-line tools. The client spawns a sub-process (e.g. Playwright or v0) and communicates over standard input/output streams using JSON-RPC 2.0.
    *   **HTTP/Streamable Transport**: Used to connect to the backend Python RAG server running on port 8001. It communicates using Server-Sent Events (SSE) for downstream server-to-client streaming, and standard POST requests for upstream client-to-server calls.
*   **Dynamic Tool Registration**: The MCP client queries each server for its available tool schemas, dynamically registers them, prefixes their names (e.g., `rag_retrieve_context`), and exposes them to the LLM agent.

### Q3: How does the 15-step agentic loop work?
*   **Mechanism**: Implemented via the Vercel AI SDK's `generateText` function with `maxSteps: 15`.
*   **Loop Cycle**: The LLM is provided with the user prompt, system prompt, and the schema of all active tools.
    1.  The LLM generates a response. If it requires information it does not have, it outputs a tool-call request.
    2.  The orchestrator intercepts the tool call, executes the tool (locally or via an MCP server), collects the output, and appends it to the message history with the `tool` role.
    3.  The orchestrator calls the LLM again with the updated history.
    4.  This repeats until the LLM determines it has enough context to answer, or the loop hits the 15-step safety limit (preventing infinite loops and runaway API costs).

### Q4: How do you handle concurrency and connection pooling on the backend?
*   **Connection Pooling**: The backend uses `URLRequestTool` which implements a shared `aiohttp.ClientSession` pool. It uses an `asyncio.Lock` to guarantee that only one session is created. The session is configured with a high socket limit (`limit=100`, `limit_per_host=10`) and a keepalive timeout of 30 seconds to recycle TCP sockets and avoid socket exhaustion under high load.
*   **Parallel Retrieval**: When answering multiple questions or searching for multiple queries, the `RetrievalService` avoids sequential blocking calls. It wraps the vector search tasks in an `asyncio.gather` block, executing similarity searches across Qdrant or Pinecone concurrently.

---

## 3. Advanced RAG Deep Dive

### Chunking Strategies and Trade-offs
Different document types and query structures demand specialized chunking strategies:

*   **Fixed-Size Character/Token Chunking**:
    *   *Mechanism*: Splitting text at a hard character/token limit (e.g., 500 characters) with a fixed overlap (e.g., 50 characters).
    *   *Trade-offs*: Fast and computationally cheap, but frequently breaks semantic coherence, such as separating a table header from its row or splitting a sentence in half.
    *   *Use Case*: Standard text files with flat, unstructured content.
*   **Recursive Character Chunking**:
    *   *Mechanism*: Uses a hierarchy of separators (typically `["\n\n", "\n", " ", ""]`) to split text, keeping paragraphs and sentences together.
    *   *Trade-offs*: Balances structural preservation with target chunk size. Better than fixed-size but still context-blind.
    *   *Use Case*: Standard articles, documentation pages, and markdown files.
*   **Semantic Chunking**:
    *   *Mechanism*: Computes semantic similarity embeddings between adjacent sentences and splits the document when similarity drops below a defined threshold.
    *   *Trade-offs*: Preserves logical units of thought, but is computationally expensive due to the high volume of embedding calls required during preprocessing.
    *   *Use Case*: Highly narrative or variable-length documents where concepts shift unpredictably.
*   **Parent-Child (Hierarchical) Chunking**:
    *   *Mechanism*: Splits documents into small "child" chunks (e.g., 100-200 tokens) for precise vector retrieval, but links each child to a larger "parent" chunk (e.g., 1000 tokens) or the full document context.
    *   *Trade-offs*: Resolves the retrieval-generation mismatch (small vectors index better; large text blocks generate better). Increases metadata database complexity and storage overhead.
    *   *Use Case*: Dense manuals where specific terms are nested within broad sections.
*   **Late Chunking**:
    *   *Mechanism*: Feeds the entire document into a long-context embedding model first, then chunks the text at the token-embedding layer before pooling.
    *   *Trade-offs*: Retains cross-chunk attention and global document context for each vector. Requires specialized, long-context embedding models and increases initial GPU memory overhead.
    *   *Use Case*: Code files where functions and variables are separated but share global context.

### Vector Similarity Metrics Math
When performing a search, the database computes the distance between the query vector $q$ and document vectors $d$. The three primary metrics are:

1.  **Cosine Similarity**: Measures the cosine of the angle between query vector $q$ and document vector $d$.
    $$\text{Cosine Similarity}(q, d) = \frac{q \cdot d}{\|q\| \|d\|} = \frac{\sum_{i=1}^n q_i d_i}{\sqrt{\sum_{i=1}^n q_i^2} \sqrt{\sum_{i=1}^n d_i^2}}$$
    *Cosine similarity is ideal when document lengths vary, as it normalizes the vectors.*

2.  **Inner Product (Dot Product)**: Computes the sum of the products of corresponding coordinates.
    $$\text{Dot Product}(q, d) = q \cdot d = \sum_{i=1}^n q_i d_i$$
    *If vectors are normalized to unit length ($\|q\| = \|d\| = 1$), Cosine Similarity simplifies to Dot Product. This is highly recommended for production databases like Qdrant as it avoids computing square roots, reducing latency.*

3.  **Euclidean Distance (L2)**: Measures the straight-line distance between two points in Euclidean space.
    $$\text{L2 Distance}(q, d) = \sqrt{\sum_{i=1}^n (q_i - d_i)^2}$$
    *L2 distance is sensitive to vector magnitudes. It is commonly used when absolute coordinate values are meaningful.*

### Metadata Filtering Design
*   **Pre-filtering**: Applies metadata constraints (e.g., access control roles or document categories) directly in the vector database index *before* executing the similarity search. This guarantees that the top-k retrieved results satisfy the filter criteria.
*   **Post-filtering (Security Anti-pattern)**: Retrieves the top-k most similar vector matches first, and then filters out results that do not match the metadata constraints in application logic. If the top-k vectors retrieved are all unauthorized or out-of-date, post-filtering will discard them, leaving the LLM with zero context (or $k=0$ results). This causes silent retrieval failures and exposes information leakage risks if the database indexes sensitive columns.

### Hybrid Search and Reciprocal Rank Fusion (RRF)
*   **Concept**: Combines semantic vector search (which captures conceptual meaning) with keyword search (such as BM25, which matches exact terms like product IDs, error codes, or names). The results are merged using Reciprocal Rank Fusion (RRF).
*   **RRF Math**: Instead of trying to normalize incompatible raw scores (distance vs. BM25 frequency), RRF merges results by sorting documents based on their rank positions in both search strategies:
    $$RRF(d) = \sum_{m \in M} \frac{1}{k + r_m(d)}$$
    *Where $r_m(d)$ is the rank of document $d$ in retriever $m$, and $k$ is a constant (typically 60) to prevent low-ranked documents from dominating.*

### Document Parsers and OCR
*   **PyMuPDF vs. PyMuPDF4LLM**: Standard `PyMuPDFLoader` extracts plain text sequentially, which strips document structure (such as tables, headers, and bullet points). `PyMuPDF4LLM` parses layout elements and outputs clean Markdown. This preserves table structures and hierarchical headers, allowing the LLM to understand columns and nested sections.
*   **OCR Integration**: For scanned documents or images, the system uses Tesseract (`pytesseract`). Image files are converted to PIL structures, pre-processed, and passed to the OCR engine. The extracted text is then chunked and embedded with an `extraction_method: OCR` metadata tag.

### Caching Layers Design
*   **Exact Match Cache**: A key-value store (e.g., Redis) mapping the hashed raw query string to the cached answer. This results in latency under 10ms but requires identical queries.
*   **Semantic Cache**: A vector database that stores previous user queries and their generated responses. When a new query arrives, its embedding is compared to the cache index. If the cosine similarity exceeds a high threshold (e.g., $> 0.96$), the system returns the cached answer.
*   **Vector Cache Engine**: To optimize development and runtime execution, `InMemoryVectorStoreService` integrates a serialization cache. It serialize the vector index to a file on disk when a document exceeds `settings.CACHE_MIN_CHUNKS`. On subsequent requests, the system loads the serialized index from disk, bypassing document downloading, text extraction, chunking, and embedding API calls.

### Evaluation Metrics and Framework
RAG system quality is measured using four core metrics from the RAGAS framework:
1.  **Faithfulness**: Evaluates if the generated answer is derived *only* from the retrieved context. (Detects hallucinations).
2.  **Answer Relevance**: Measures how directly the generated answer addresses the user's question.
3.  **Context Precision**: Evaluates if the retrieved chunks are highly relevant to the query. (Ranks relevant chunks near the top).
4.  **Context Recall**: Confirms if all key information needed to answer the question was successfully retrieved.

To run the automated RAG pipeline diagnostics, execute the following script from the root backend folder:
```bash
python backend/scripts/evaluate_rag.py
```
This script evaluates a ground-truth "golden dataset" of documents and questions and calculates overall success rate, document chunking efficiency, indexing latency, query-answering latency, and cosine similarity relevancy scores.

---

## 4. Agentic Loops and Workflows Deep Dive

### Concurrency and State Mutations
*   **Parallel Tool Execution**: Advanced LLMs can generate multiple independent tool calls in a single turn (e.g., fetching a web page and executing a database search simultaneously). The orchestrator intercepts these calls and executes them concurrently using `asyncio.gather` in Python or `Promise.all` in TypeScript.
*   **Race Conditions & State Mutation**: When multiple tools modify the same resources (e.g., editing files), race conditions occur. The system mitigates this by implementing async locks (`asyncio.Lock` or Redis locks) or restricting tool designs to be stateless and idempotent.

### Intent Routing
In multi-agent systems, a fast, inexpensive classifier (or a regex gateway) inspects the user query and routes it to specialized, domain-specific agents. This prevents sending massive system prompts and tool schemas to a heavy model, reducing latency and cost while improving accuracy.

### Tool Call Resilience and Self-Correction
*   **Schema Enforcement**: Use runtime validation (Pydantic in Python, Zod in TypeScript) to enforce the argument schemas returned by the LLM.
*   **Self-Correction Loops**: If the LLM generates invalid JSON or misses a mandatory parameter, the orchestrator catches the validation error and sends it back to the LLM as a tool execution result (e.g., `"Error: 'user_id' is a required field. Retrying..."`). The LLM reads the error and corrects its argument structure in the next step.

### Safety Limits and Durable Workflows
*   **Recursion Limits**: The system enforces a hard `maxSteps: 15` limit to prevent infinite loops (where an LLM repeats the same failing tool call indefinitely) and runaway API costs.
*   **Graceful Degradation**: If the step limit is reached, the orchestrator intercepts the cycle, extracts the context gathered so far, and feeds it into a final "synthesizer" prompt: `"We reached the maximum execution steps. Based on the gathered information: [context], generate the best possible partial answer."`
*   **Durable Execution**: For long-running workflows, use durable execution frameworks (like Temporal or Vercel AI SDK Workflows). These persist state changes to a database after every step, allowing the agent to crash, resume, or wait for human input without losing memory.
