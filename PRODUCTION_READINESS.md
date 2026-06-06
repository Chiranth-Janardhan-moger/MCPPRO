# MCPPro Production Readiness Playbook (DevOps & MLOps)

This guide documents the architecture, deployment configurations, and monitoring strategies required to deploy **MCPPro** into a production environment. The project is split into a Next.js frontend and a FastAPI backend, designed for high-availability, scalability, and robust model lifecycle monitoring.

---

## 🛠️ DevOps Architecture

### 1. Project Topology
MCPPro follows a modern decoupled architecture:
*   **Frontend**: Next.js 14 Web App served via Node container. Contains full-featured chat interfaces and an API gateway for serverless LLM/MCP orchestrations.
*   **Backend**: FastAPI Python 3.12 microservice running an agentic RAG system with multi-document parsing, vector indexers, and local caching.
*   **Vector Storage**: Supports local on-disk SQLite/In-memory vector store, local/remote **Qdrant**, or cloud **Pinecone**.
*   **Telemetry & Logs Database**: **Supabase** (PostgreSQL) is used as the relational database for logging agent requests, performance diagnostics, and tool executions.

---

### 2. Multi-Stage Containerization

Both services are equipped with optimized, multi-stage Docker configurations to ensure fast build times and small final production image footprints.

#### Backend Dockerfile (`/backend/Dockerfile`)
*   **Base Image**: Python 3.12 slim.
*   **Package Manager**: `uv` (fast package installation and constraint resolution).
*   **Security**: Runs under a non-root user (`app`) with restricted permissions.
*   **Optimizations**: Installs CPU-only PyTorch and specific NumPy constraints to minimize size and build conflicts.
*   **Health Check**: Periodic container endpoint health monitoring (`/health`).

#### Frontend Dockerfile (`/frontend/Dockerfile`)
*   **Base Image**: Node 18 Alpine.
*   **Stages**:
    1.  `deps`: Rebuilds cache and runs `npm ci` for dependency resolution.
    2.  `builder`: Copies source code and compiles statically optimized Next.js components.
    3.  `runner`: Creates a lightweight production runtime with a non-root user (`nextjs`) to run `next start`.

---

### 3. Unified Docker Compose Orchestration

For self-hosted production or local developer environments, a root-level `docker-compose.yml` orchestrates the entire stack along with a high-performance **Qdrant** vector database:

```bash
# Start the entire stack in detached mode
docker compose up -d
```

#### Services Spawned:
1.  **`mcppro-backend`**: FastAPI application exposed on port `8000`.
2.  **`mcppro-frontend`**: Next.js user interface exposed on port `3000` (depends on the backend container being healthy).
3.  **`qdrant`**: High-performance local vector search engine on ports `6333` and `6334`.

---

### 4. CI/CD Pipelines

A GitHub Actions workflow is configured in `.github/workflows/ci-cd.yml` to automate quality checks:
*   **Triggers**: Commits or pull requests to `main`, `master`, and `dev` branches.
*   **Backend validation**: Sets up Python 3.12, installs dependencies via `uv`, compiles python code, and builds the Docker image.
*   **Frontend validation**: Sets up Node, runs `npm ci`, builds/compiles Next.js bundle, and runs a Docker build test.

---

## 📈 MLOps Setup & Monitoring

### 1. LLM Provider Redundancy & Failover
MCPPro is designed to be highly resilient against LLM provider outages. Under `backend/app/config/settings.py`, you can configure credentials for:
*   **OpenAI** (`gpt-4o-mini`, `gpt-4o`)
*   **Google Gemini** (`gemini-2.0-flash`)
*   **Anthropic** (`claude-3-7-sonnet-20250219`)
*   **Groq** (`llama-3.1-70b-versatile`)
*   **LM Studio** (Local offline LLM serving on `http://localhost:1234/v1`)

If a primary provider API is down or rate-limited, you can hot-swap the default model by updating the `DEFAULT_LLM_PROVIDER` environment variable without rebuilding the container.

---

### 2. Request & RAG Telemetry (Supabase Logging)
Every agent run and RAG transaction is logged to a PostgreSQL database for real-time monitoring.

#### SQL Schemas (`/backend/schemas/`)
Run these SQL queries in your Supabase Editor to initialize the database:
1.  **Request Logs** (`database_setup.sql`): Creates `mcppro_requests` to log the URL, prompt questions, processing time, answers, tool execution logs, success status, and vector store details.
2.  **Document Storage** (`supabase_vector_setup.sql`): Installs `pgvector` and sets up the `documents` vector store table and cosine similarity functions.

---

### 3. Automated RAG Pipeline Evaluation
To evaluate retrieval precision, chunk indexing, and latency metrics, run the dedicated evaluation script:

```bash
# Run the evaluation script locally (or as part of a release stage)
python backend/scripts/evaluate_rag.py
```

This script evaluates a "Golden Dataset" of documents and questions and calculates:
1.  **Overall Pipeline Success Rate** (%)
2.  **Document Chunking Efficiency** (number of chunks generated)
3.  **Indexing Latency** (seconds to chunk and insert vectors)
4.  **Query Answering Latency** (seconds to retrieve and generate answer)
5.  **Cosine Similarity Relevancy Score** (evaluates search quality)

---

## 🚀 Production Deployment Checklist

1.  **Environment Variables**:
    *   Set `ENVIRONMENT=production`.
    *   Set `BEARER_TOKEN` to a secure API token.
    *   Set Supabase keys: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_KEY`.
    *   Configure API keys for your active LLM providers (e.g., `OPENAI_API_KEY`).
2.  **Vector Store**:
    *   For light/local deployments, use `DEFAULT_VECTOR_STORE=inmemory` or connect to the local `qdrant` container.
    *   For production-grade cloud scale, use Pinecone: set `DEFAULT_VECTOR_STORE=pinecone` and supply `PINECONE_API_KEY`.
3.  **Scaling**:
    *   Set replication limits on your container service (e.g., AWS ECS, Render, Azure Container Apps).
    *   The FastAPI service is stateless (documents are stored in Pinecone/Supabase/Qdrant and cached on mounted persistent volume claims), enabling it to scale horizontally behind a load balancer.
