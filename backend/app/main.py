from contextlib import asynccontextmanager
import asyncio
import logging
import platform

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.config.settings import settings

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle startup and shutdown events cleanly."""
    logger.info("Starting MCPPro API Server...")
    if platform.system() == "Windows":
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
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
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(api_router)


@app.get("/")
async def root():
    return {
        "message": "MCPPro Intelligence System API",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    # Intentionally minimal: no store/provider internals leaked on an
    # unauthenticated endpoint.
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host=settings.API_HOST,
        port=settings.API_PORT,
        access_log=True,
        log_level="info",
    )
