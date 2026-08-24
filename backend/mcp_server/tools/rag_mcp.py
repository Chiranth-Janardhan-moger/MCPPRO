from typing import Union, List

from app.tools.registry import tool_registry


async def rag_mcp(document_url: str, questions: Union[str, List[str]], k: int = 10, use_ocr: bool = False, use_cache: bool = True):
    """Process a document from URL and retrieve relevant context/chunks.

    Composes the shared registry tools (process_document -> retrieve_context)
    instead of duplicating ingestion/retrieval logic.
    """
    if isinstance(questions, str):
        questions = [questions]

    proc = await tool_registry.execute_tool(
        "process_document",
        document_url=document_url,
        use_cache=use_cache,
        llm_friendly=bool(use_ocr),
    )
    if not proc.success:
        return {
            "chunks": [],
            "summary": "",
            "document_processed": False,
            "chunks_processed": 0,
            "cached_used": False,
            "use_ocr": use_ocr,
            "success": False,
            "error": proc.error,
        }

    document_id = (proc.result or {}).get("document_id", "")
    chunks_processed = (proc.result or {}).get("chunks_processed", 0)

    rc = await tool_registry.execute_tool(
        "retrieve_context",
        questions=questions,
        k=k,
        document_id=document_id,
    )

    if rc.success:
        return {
            "chunks": (rc.result or {}).get("chunks", []),
            "summary": (rc.result or {}).get("summary", ""),
            "document_processed": True,
            "chunks_processed": chunks_processed,
            "cached_used": (proc.result or {}).get("cached_used", False),
            "use_ocr": use_ocr,
            "success": True,
        }
    return {
        "chunks": [],
        "summary": "",
        "document_processed": True,
        "chunks_processed": chunks_processed,
        "cached_used": (proc.result or {}).get("cached_used", False),
        "use_ocr": use_ocr,
        "success": False,
        "error": rc.error,
    }
