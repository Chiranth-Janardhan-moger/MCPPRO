# MCPPro Architecture & File Placements

## 1. Client Layer (Next.js Frontend)
**Location:** `/frontend/app`
- **UI Components:** `/frontend/components` (Tailwind, Radix UI)
- **Chat Interface:** `/frontend/app/chat` handles the primary user interface.

*Why Next.js instead of React?* 
Next.js provides built-in API routes (`/app/api`). Plain React is strictly client-side, meaning we would have needed a completely separate Node.js server just to securely manage the Vercel AI SDK, MCP servers, and Supabase auth keys. Next.js lets us bundle the Orchestrator API and the UI together securely.

## 2. Frontend Orchestrator (Next.js API)
**Location:** `/frontend/app/api` and `/frontend/lib`
- **Agent Run API:** `/frontend/app/api/mcppro-agent/run/route.ts`
  - The core hub. Takes queries, loads tools, and runs a 15-step agent loop.
- **Chat Stream API:** `/frontend/app/api/chat/route.ts`
  - Uses `@voltagent/core` to stream text and tool-calls back to the UI.
- **AI Logic & MCP:** `/frontend/app/chat/lib/ai`
  - `prompts/`: System prompts for the agent and query refinement.
  - `tools/`: Local static tools.
  - `mcp-servers/mcp-client-manager.ts`: Dynamically discovers and loads external Model Context Protocol tools.
- **Telemetry/Logs:** `/frontend/lib/mcppro-agent-logger.ts` logs traces to Supabase.

## 3. Backend RAG Pipeline (FastAPI)
**Location:** `/backend/app`
- **Main App:** `/backend/app/main.py` (Entry point for uvicorn).
- **Core Endpoints:** `/backend/app/api/v1/endpoints/mcppro_agent.py`
  - Exposes the backend `/run` endpoint for document queries.

This backend routes work to one of two modes:
1. **Agentic Mode:** `/backend/app/services/agents/master_mcppro_agent.py` (Python-based reasoning agent).
2. **Traditional RAG:** `/backend/app/services/pipelines/traditional_rag.py`

## 4. Backend Services & Data Processing
**Location:** `/backend/app/services`
- **Retrievers:** `/backend/app/services/retrievers/` (Extracts context from DB).
- **Processors:** `/backend/app/services/preprocessors/` (Document parsing & OCR).
- **Vector Stores:** `/backend/app/services/vector_stores/` (Qdrant, Pinecone logic).
- **Backend MCP Server:** `/backend/mcp_server/` (Exposes Python tools over MCP so the Next.js orchestrator can call them).

## 5. Data Layer
- **Supabase**: Handles auth and logs. Called from both `/frontend/lib/supabase` and `/backend/app/services/logging/supabase_logger.py`.
- **Vector DBs**: Pluggable storage managed by `VectorStoreFactory` in the backend.

## Key Terminology
- **MCP (Model Context Protocol)**: Standard allowing the Next.js orchestrator to connect to servers (like the one in `/backend/mcp_server`).
- **RAG**: Fetching documents from Vector DBs before answering.
- **Vercel AI SDK**: Manages LLM streams in Next.js (`frontend/package.json`).
- **MasterMCPPro**: The Python agent for complex RAG tasks (`master_mcppro_agent.py`).
