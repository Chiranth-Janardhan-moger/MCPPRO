<<<<<<< HEAD
# OmniAgent Intelligence System

An advanced, full-stack agentic workspace and RAG-based intelligence platform. The project is split into a **Next.js Frontend** (the primary client-facing workspace and web application) and a **Python FastAPI Backend** (serving as an MCP server and advanced document/RAG processor).

---

## 🏗️ Repository Architecture

This repository is structured as a monorepo consisting of two main parts:

```
omni-agent-main/
├── frontend/               # Next.js 14 Web Application
│   ├── app/                # App Router (Pages, Layouts, API Routes)
│   ├── components/         # UI Components (Radix UI, shadcn)
│   ├── actions/            # Server Actions
│   ├── voltagent/          # Agent orchestration and telemetry
│   └── public/             # Static assets
└── backend/                # Python FastAPI & MCP Server
    ├── app/                # FastAPI application endpoints
    ├── mcp_server/         # Model Context Protocol tools & configuration
    ├── schemas/            # Data models and structures
    └── tests/              # Backend testing suite
```

### Key Components
*   **Frontend (Next.js 14)**: Uses the **Vercel AI SDK**, **VoltAgent** for agent observability, **Supabase** for user auth/database, and features integration with **Browserbase / Stagehand** for automated browser execution and web tools.
*   **Backend (Python FastAPI & FastMCP)**: Serves as an advanced Document Processing and **RAG (Retrieval-Augmented Generation)** backend. It integrates multi-provider LLM support and exposes tools (e.g., `retrieve_context`, `rag_search`) through a **Model Context Protocol (MCP)** server to the Next.js frontend.

---

## 📋 Prerequisites

Before setting up the project, make sure you have installed:
*   [Node.js (v18.0.0+)](https://nodejs.org/) & `npm`
*   [Python (v3.12+)](https://www.python.org/) & `pip`
*   [Docker](https://www.docker.com/) (Optional, for backend Dockerized setup)
*   [Tesseract OCR](https://github.com/tesseract-ocr/tesseract) (Optional, for backend image text extraction)

---

## 🚀 Quick Start & Installation

### 1. Backend Setup (Python FastAPI & MCP)

Navigate to the `backend` directory, create a virtual environment, install dependencies, and configure environment variables.

```bash
# Navigate to backend directory
cd backend

# Create a Python virtual environment
python -m venv venv

# Activate the virtual environment
# On Windows PowerShell:
.\venv\Scripts\Activate.ps1
# On Windows Command Prompt:
.\venv\Scripts\activate.bat
# On macOS/Linux:
source venv/bin/activate

# Install required dependencies
pip install -r requirements.txt

# Install MCP-specific dependencies (optional/recommended)
pip install -r requirements-mcp.txt

# Copy the environment file template
cp env.example .env
```

> [!IMPORTANT]
> Edit the newly created `backend/.env` file to provide your API keys (e.g. OpenAI, Gemini, Groq, Supabase, Pinecone).

#### Running the Backend Services:
*   **Start FastAPI Server**:
    ```bash
    python main.py
    ```
    *   API will be available at: `http://127.0.0.1:8000`
    *   Interactive API Docs: `http://127.0.0.1:8000/docs`
*   **Start MCP Server** (in a separate activated terminal):
    ```bash
    python run_mcp.py
    ```
    *   MCP Server will be available at: `http://127.0.0.1:8001`

---

### 2. Frontend Setup (Next.js 14)

Navigate to the `frontend` directory, install node modules, configure environment variables, and start the development server.

```bash
# Navigate to frontend directory
cd ../frontend

# Install dependencies
npm install

# Copy the environment file template
cp env.example .env.local
```

> [!IMPORTANT]
> Edit the newly created `frontend/.env.local` file and fill in the required keys:
> *   `NEXT_PUBLIC_SUPABASE_URL` & `NEXT_PUBLIC_SUPABASE_ANON_KEY`
> *   AI Provider API keys (`OPENAI_API_KEY`, etc.)
> *   `NEXT_PUBLIC_MCP_URL` (should point to backend's MCP URL, default: `http://127.0.0.1:8001/mcp`)
> *   `VOLTAGENT_PUBLIC_KEY` & `VOLTAGENT_SECRET_KEY` (for VoltAgent logging/observability)

#### Running the Frontend:
*   **Start Development Server**:
    ```bash
    npm run dev
    ```
    *   The web application will be accessible at: `http://localhost:3000`

---

## 🛠️ Environment Configuration Reference

### Frontend Configuration (`frontend/.env.local`)
| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://your-project.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous public key | `your-anon-key` |
| `OPENAI_API_KEY` | OpenAI API Key for models/embeddings | `sk-...` |
| `NEXT_PUBLIC_MCP_URL` | Endpoint of the Python MCP server | `http://127.0.0.1:8001/mcp` |
| `VOLTAGENT_PUBLIC_KEY` | VoltAgent Public Key | `your-voltagent-key` |
| `TAVILY_API_KEY` | Tavily Search API Key | `tvly-...` |

### Backend Configuration (`backend/.env`)
| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `DEFAULT_VECTOR_STORE` | Core Vector Database | `inmemory` (or `pinecone`, `qdrant`, `pgvector`) |
| `DEFAULT_LLM_PROVIDER` | Default LLM Router | `openai` |
| `OPENAI_API_KEY` | OpenAI credentials | `your-openai-key` |
| `GEMINI_API_KEY` | Google Gemini API credentials | `your-gemini-key` |
| `PINECONE_API_KEY` | Pinecone API credentials (optional) | `your-pinecone-key` |

---

## 🐳 Docker Deployment (Backend alternative)

You can also orchestrate the backend services using Docker:

```bash
cd backend

# Build and spin up the Docker services
docker-compose up -d

# Check service logs
docker-compose logs -f
```

---

## 📝 Development Cheat Sheet

*   **Format & Lint Frontend**: `npm run lint`
*   **Build Frontend**: `npm run build`
*   **Test Backend API**: `python test_api.py` (ensure backend is running or mock is enabled)
=======
# MCPPRO
>>>>>>> 32746c112242b0462372f96d9b23643cb54c7dd1
