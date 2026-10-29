from contextlib import asynccontextmanager
import asyncio
import logging
import platform

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.config.settings import settings

logger = logging.getLogger(__name__)

# FastMCP Streamable-HTTP sub-application integration
try:
    from mcp_server.server import mcp
    mcp_app = mcp.http_app(path="/", transport="streamable-http")
except Exception as e:
    logger.warning("Could not initialize FastMCP http_app: %s", e)
    mcp_app = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle startup and shutdown events cleanly."""
    logger.info("Starting MCPPro API Server...")
    if platform.system() == "Windows":
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

    if mcp_app is not None:
        async with mcp_app.lifespan(app):
            yield
    else:
        yield

    logger.info("Shutting down MCPPro API Server...")
    try:
        from app.tools.url_request_tool import URLRequestTool

        await URLRequestTool.cleanup_session()
    except Exception as e:
        logger.warning("Error cleaning up HTTP session: %s", e)

    await asyncio.sleep(0.1)
    logger.info("Cleanup completed")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="LLM-Powered Intelligent Query-Retrieval and Agentic System for Document and Query Processing",
    lifespan=lifespan,
)

# CORS: wildcard origins combined with credentials is invalid and unsafe.
# Allowed origins are configurable via the CORS_ORIGINS setting (comma-separated).
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "mcp-session-id"],
)

from app.api.v1.endpoints.documents import router as documents_router
from app.api.v1.endpoints.mcppro_agent import router as mcppro_agent_router

app.include_router(mcppro_agent_router, prefix="/mcppro-agent", tags=["MCPPro"])
app.include_router(documents_router, prefix="/documents", tags=["Documents"])
app.include_router(api_router, prefix="/api/v1")

if mcp_app is not None:
    app.mount("/mcp", mcp_app)
    logger.info("Mounted FastMCP streamable-http app at /mcp")


@app.get("/")
async def root():
    return {
        "message": "MCPPro Intelligence System API",
        "version": "1.0.0",
        "docs": "/docs",
        "mcp": "/mcp",
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.get("/api/v1/mcp-status")
async def mcp_status():
    return {
        "status": "online" if mcp_app is not None else "unavailable",
        "transport": "streamable-http",
        "tools": ["retrieve_context", "rag_search"],
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host=settings.API_HOST,
        port=settings.API_PORT,
        access_log=True,
        log_level="info",
    )
