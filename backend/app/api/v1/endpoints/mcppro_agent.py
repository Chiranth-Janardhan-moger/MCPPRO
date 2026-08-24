import logging
import time
import uuid
from typing import Optional, Union

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException

from app.config.settings import settings
from app.core.auth import verify_token
from app.models.request import MCPProRequest
from app.models.response import HealthResponse, MCPProProductionResponse, MCPProResponse
from app.providers.factory import LLMProviderFactory
from app.services.agents.master_mcppro_agent import MasterMCPPro
from app.services.logging.supabase_logger import supabase_logger
from app.services.pipelines.traditional_rag import traditional_rag
from app.services.preprocessors.document_processor import DocumentProcessor
from app.services.retrievers.retrieval_service import RetrievalService
from app.services.vector_stores.vector_store_factory import VectorStoreFactory

logger = logging.getLogger(__name__)

router = APIRouter()

_singletons = {}


def _get_services():
    """Lazily build the heavy singletons on first use.

    Import-time construction made `/health` fail (and Pinecone block for 10s)
    whenever optional credentials were missing; lazy construction keeps the
    API process up and only fails the endpoints that actually need them.
    """
    if "services" not in _singletons:
        try:
            vector_store = VectorStoreFactory.create_vector_store(settings)
            llm_provider = LLMProviderFactory.create_provider(
                settings.DEFAULT_LLM_PROVIDER, settings
            )
        except Exception as exc:
            # Configuration problems (missing keys, unreachable stores) must
            # surface as a clean 503, not an unhandled 500.
            raise HTTPException(
                status_code=503,
                detail=f"Backend services unavailable: {exc}",
            )
        _singletons["services"] = {
            "vector_store": vector_store,
            "llm_provider": llm_provider,
            "mcppro_agent": MasterMCPPro(),
            "document_processor": DocumentProcessor(
                vector_store=vector_store,
                chunk_size=settings.CHUNK_SIZE,
                chunk_overlap=settings.CHUNK_OVERLAP,
            ),
            "retrieval_service": RetrievalService(
                vector_store=vector_store,
                llm_provider=llm_provider,
            ),
        }
    return _singletons["services"]


async def log_request_background(
    document_url: str,
    questions: list,
    answers: list,
    processing_time: float,
    document_metadata: dict,
    raw_response: dict,
    success: bool,
    error_message: Optional[str] = None,
):
    """Background task for logging requests to Supabase"""
    try:
        await supabase_logger.log_mcppro_agent_request(
            document_url=document_url,
            questions=questions,
            answers=answers,
            processing_time=processing_time,
            document_metadata=document_metadata,
            raw_response=raw_response,
            success=success,
            error_message=error_message,
        )
    except Exception as e:
        logger.warning("Background logging failed: %s", e)


@router.post("/run", response_model=Union[MCPProResponse, MCPProProductionResponse])
async def run_mcppro_agent(
    request: MCPProRequest,
    background_tasks: BackgroundTasks,
    _: bool = Depends(verify_token),
):
    """Main MCPPro endpoint - process document and answer questions.

    Supports both traditional RAG processing and agentic processing with tools.

    - Traditional mode: Document is processed once, stored in vector store,
      questions answered via RAG.
    - Agentic mode: AI agent uses tools (RAG, URL requests, etc.) to handle
      complex multi-step instructions.

    `use_agent` on the request overrides the AGENT_ENABLED default.
    """
    services = _get_services()
    start_time = time.time()

    document_id = str(uuid.uuid5(uuid.NAMESPACE_URL, request.documents))
    answers = []
    document_metadata = {}
    raw_response = {}
    success = True
    error_message = None

    use_agent = (
        request.use_agent if request.use_agent is not None else settings.AGENT_ENABLED
    )

    try:
        if use_agent:
            logger.info("Using agentic processing with tools.")

            agent_result = await services["mcppro_agent"].process_request(
                document_url=request.documents,
                questions=request.questions,
                k=request.k,
            )

            answers = agent_result["answers"]
            execution_log = agent_result.get("execution_log", [])

            document_metadata = {
                "document_id": document_id,
                "processing_mode": "agentic",
                "agent_used": True,
                "execution_log_length": len(execution_log),
            }

            raw_response = {
                "processing_mode": "agentic",
                "agent_execution_log": execution_log,
                "total_questions": len(request.questions),
                "k_value": request.k,
            }

        else:
            logger.info("Using traditional RAG processing")

            answers, document_metadata, raw_response = await traditional_rag(
                document_id=document_id,
                document_url=request.documents,
                questions=request.questions,
                k=request.k,
                vector_store=services["vector_store"],
                document_processor=services["document_processor"],
                retrieval_service=services["retrieval_service"],
                settings=settings,
            )

        processing_time = time.time() - start_time

        background_tasks.add_task(
            log_request_background,
            document_url=request.documents,
            questions=request.questions,
            answers=answers,
            processing_time=processing_time,
            document_metadata=document_metadata,
            raw_response=raw_response,
            success=success,
        )

        if settings.ENVIRONMENT.lower() == "production":
            return MCPProProductionResponse(success=True, answers=answers)

        return MCPProResponse(
            success=True,
            answers=answers,
            processing_time=processing_time,
            document_metadata=document_metadata,
            raw_response=raw_response,
            deleted_documents=False,
        )

    except HTTPException:
        processing_time = time.time() - start_time

        background_tasks.add_task(
            log_request_background,
            document_url=request.documents,
            questions=request.questions,
            answers=answers,
            processing_time=processing_time,
            document_metadata=document_metadata,
            raw_response=raw_response,
            success=False,
            error_message=error_message,
        )

        raise

    except Exception as e:
        processing_time = time.time() - start_time
        error_message = str(e)
        logger.exception("Agent run failed")

        background_tasks.add_task(
            log_request_background,
            document_url=request.documents,
            questions=request.questions,
            answers=answers,
            processing_time=processing_time,
            document_metadata=document_metadata,
            raw_response=raw_response,
            success=False,
            error_message=error_message,
        )

        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/health", response_model=HealthResponse)
async def health_check(_: bool = Depends(verify_token)):
    """Detailed health check (authenticated; no internals leak publicly)."""
    services = _get_services()
    vector_store = services["vector_store"]
    llm_provider = services["llm_provider"]

    try:
        if hasattr(vector_store, "aget_document_count"):
            doc_count = await vector_store.aget_document_count()
        else:
            doc_count = vector_store.get_document_count()

        return HealthResponse(
            status="healthy",
            vector_store=vector_store.store_type,
            llm_provider=llm_provider.provider_name,
            document_count=doc_count,
        )

    except Exception as e:
        return HealthResponse(
            status=f"unhealthy: {str(e)}",
            vector_store=getattr(vector_store, "store_type", "unknown"),
            llm_provider=getattr(llm_provider, "provider_name", "unknown"),
        )
