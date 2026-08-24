#  MCPPro Intelligence System

Welcome to the **MCPPro Intelligence System**, a production-grade, state-of-the-art AI agent and Document RAG (Retrieval-Augmented Generation) orchestration platform. MCPPro features a decoupled architecture split across an orchestrator layer, a specialized Model Context Protocol (MCP) tool layer, a FastAPI document processing pipeline, and secure telemetry/vector storage.

---

## ️ System Architecture

The MCPPro architecture consists of five main layers, structured as follows:

<img width="1920" height="1080" alt="Major-project-review-2" src="https://github.com/user-attachments/assets/f424118c-ae5e-47fd-a3ed-6551c35bf41b" />

### The 5 Architectural Layers:

1. **Client Layer**: Contains the **Web Chat Interface** (with streaming responses, multi-model selection, and file uploading) and the **Admin Dashboard** (with request logs, analytics, and service metrics).
2. **Backend 1 (Orchestrator)**: Next.js 14 API routes (`/api/run`, `/api/chat`, and `/api/auth`) act as the entry point. The **MCP Client Manager** in this layer coordinates multi-agent interactions and decides which tool or agent should handle a query.
3. **Tool Layer**: Houses core tools (such as JavaScript execution and file editing), specialized **MCP Servers** (like the web-browsing agent and RAG query agent), and external integrations (Tavily search, GitHub, Resend, and v0).
4. **Backend 2 (FastAPI/Python)**: Houses the **Document Intelligence & RAG Pipeline**. Handles document uploading, OCR extraction (using Tesseract/EasyOCR), embeddings generation (BGE-M3 or OpenAI), and document retrieval.
5. **Data Layer**: Relies on **Supabase PostgreSQL** as the core transactional database for logging, sessions, user settings, and metadata, alongside **Vector Databases** (Qdrant, Pinecone, or PGVector) for semantic storage.

---

##  Quick Start

###  Prerequisites
Make sure you have the following installed on your machine:
- **Node.js**: `18.x` or later (with `npm` package manager)
- **Python**: `3.12.x` (recommended)
- **Docker & Docker Compose**: For containerized setup
- **Tesseract OCR**: For image-based document parsing (optional)

### 🗄️ Database Setup (one time)

Run [`backend/schemas/supabase_full_setup.sql`](backend/schemas/supabase_full_setup.sql) in your Supabase SQL Editor. It creates the chat tables (`conversations`, `messages`), the Document Manager table (`user_documents`), request logging (`mcppro_requests`), the pgvector store, and row-level-security policies — all idempotent.

### ✅ Verification Commands

```bash
# Backend tests (31 tests, fully offline)
cd backend && .\venv\Scripts\python.exe -m pytest tests -q

# Frontend unit tests (21 tests)
cd frontend && npm test

# Frontend type-check + lint + production build
cd frontend && npm run typecheck && npm run lint && npm run build

# Browser E2E suite (9 tests; starts its own dev server)
cd frontend && npx playwright test

# Start the stack locally
cd backend && python main.py        # FastAPI on :8000
cd backend && python run_mcp.py     # MCP server on :8001
cd frontend && npm run dev          # Next.js on :3000
```

---

### 1. Unified Local Execution (Docker Compose)

The easiest way to run the entire stack (Next.js frontend, FastAPI backend, and Qdrant vector store) is using Docker Compose:

```bash
# Clone the repository and navigate to root
cd MCPPRO-agent-main

# Start all services in the background
docker compose up -d
```

Once running, access the services at:
*   **Frontend**: [http://localhost:3000](http://localhost:3000)
*   **FastAPI Backend**: [http://localhost:8000](http://localhost:8000)
*   **API Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)
*   **Qdrant Console**: [http://localhost:6333/dashboard](http://localhost:6333/dashboard)

---

### 2. Manual Development Setup

If you prefer to run the components manually for development:

#### A. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   # Windows PowerShell
   python -m venv venv
   .\venv\Scripts\Activate.ps1

   # macOS/Linux
   python -m venv venv
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   pip install -r requirements-mcp.txt
   ```
4. Copy the environment template and configure your keys:
   ```bash
   cp env.example .env
   # Edit the .env file with your API keys (OpenAI, Gemini, Supabase, etc.)
   ```
5. Start the backend services:
   ```bash
   # Start FastAPI Server (Port 8000)
   python main.py

   # Start MCP Server (Port 8001, optional in a separate shell)
   python run_mcp.py
   ```

#### B. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy the environment variables:
   ```bash
   cp env.example .env.local
   # Edit .env.local with Supabase keys and LLM settings
   ```
4. Start the Next.js development server:
   ```bash
   npm run dev
   ```
   Access the frontend at [http://localhost:3000](http://localhost:3000).

---

## ️ Environment Variables Configuration

Both frontend and backend rely on configuration files (`.env` and `.env.local` respectively). Key configuration values include:

| Key | Description | Recommended / Example |
| :--- | :--- | :--- |
| `ENVIRONMENT` | Deployment environment | `development` / `production` |
| `DEFAULT_VECTOR_STORE` | Target vector database | `inmemory` / `qdrant` / `pinecone` |
| `DEFAULT_LLM_PROVIDER` | Default LLM service | `openai` / `gemini` / `anthropic` |
| `SUPABASE_URL` | Supabase API Endpoint | `https://your-project.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Relational & logs storage key | `your-supabase-service-key` |
| `OPENAI_API_KEY` | OpenAI authentication | `sk-proj-...` |
| `GEMINI_API_KEY` | Gemini authentication | `AIzaSy...` |

> [!NOTE]
> Detailed database schemas (`database_setup.sql` and `supabase_vector_setup.sql`) are located under [backend/schemas](file:///D:/Antigravity/Major-project/MCPPRO%20agent-main/backend/schemas) to set up request tracking and `pgvector` tables on Supabase.

---

## ️ CI/CD Pipeline

The project is configured with an automated CI/CD pipeline using GitHub Actions, located in [.github/workflows/ci-cd.yml](file:///D:/Antigravity/Major-project/MCPPRO%20agent-main/.github/workflows/ci-cd.yml). 

The pipeline runs validation steps on every push and pull request to `main`, `master`, and `dev` branches:
- **Backend CI**: Sets up Python 3.12, installs dependencies via `uv`, compiles backend code, and runs a dry-run Docker build using `docker/setup-buildx-action` and `docker/build-push-action`.
- **Frontend CI**: Sets up Node 18, synchronizes dependencies, validates Next.js builds, and performs a dry-run Docker build.

---

##  RAG Evaluation & Diagnostics

To verify the quality and latency of the RAG (Retrieval-Augmented Generation) search engine, run the automated evaluation runner:

```bash
cd backend
python scripts/evaluate_rag.py
```

This evaluations suite tests index latency, query-answering latency, and cosine similarity relevancy score against a golden dataset of target documents.

---

##  Production Readiness
For production deployments, high-availability architecture, failover guidelines, and scaling checklists, please consult the complete [PRODUCTION_READINESS.md](file:///D:/Antigravity/Major-project/MCPPRO%20agent-main/PRODUCTION_READINESS.md).

<!-- Visitor Radar Telemetry -->
<img src="https://chiranth.vercel.app/api/telemetry/pixel.svg?target=MCPPRO%20Repository" width="1" height="1" alt="" style="display:none;" />
