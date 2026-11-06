from typing import Optional
import os
import tempfile
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.api.v1.endpoints.mcppro_agent import _get_services
from app.core.auth import verify_token

router = APIRouter()

ALLOWED_EXTENSIONS = {
    ".pdf", ".doc", ".docx", ".ppt", ".pptx",
    ".txt", ".md", ".xlsx", ".xls", ".jpg", ".jpeg", ".png",
    ".csv", ".json", ".xml", ".html",
}
MAX_UPLOAD_BYTES = 25 * 1024 * 1024


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    user_id: Optional[str] = None,
    is_global: bool = False,
    _: bool = Depends(verify_token),
):
    """Upload a local file, chunk + embed it into the vector store."""
    services = _get_services()

    filename = os.path.basename(file.filename or "upload")
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: {sorted(ALLOWED_EXTENSIONS)}",
        )

    content = await file.read()
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File exceeds 25MB limit")
    if not content:
        raise HTTPException(status_code=400, detail="Empty file")

    suffix = f"_{filename}"
    fd, temp_path = tempfile.mkstemp(suffix=suffix)
    result = None
    try:
        with os.fdopen(fd, "wb") as tmp:
            tmp.write(content)

        detected_type = ext.lstrip(".") or "txt"
        import hashlib
        content_hash = hashlib.sha256(content).hexdigest()[:16]
        doc_id = str(uuid.uuid5(uuid.NAMESPACE_URL, f"{filename}:{content_hash}"))
        result = await services["document_processor"].process_document_file(
            file_path=temp_path,
            detected_type=detected_type,
            document_id=doc_id,
            source=filename,
            user_id=user_id,
            is_global=is_global,
        )
    finally:
        try:
            os.remove(temp_path)
        except OSError:
            pass

    if not result or not result.get("success"):
        raise HTTPException(status_code=500, detail=(result or {}).get("error", "Processing failed"))

    return {
        "success": True,
        "document_id": result["document_id"],
        "filename": filename,
        "chunks_processed": result["chunks_processed"],
        "vector_store": result["vector_store"],
    }


@router.get("")
async def list_documents(_: bool = Depends(verify_token)):
    """List documents currently indexed in the vector store."""
    services = _get_services()
    vector_store = services["vector_store"]
    return vector_store.get_document_summaries()


from pydantic import BaseModel

class DocumentSearchRequest(BaseModel):
    query: str
    k: int = 5
    user_id: Optional[str] = None


@router.post("/query")
async def query_documents(
    payload: DocumentSearchRequest,
    _: bool = Depends(verify_token),
):
    """Semantic vector search across indexed documents."""
    query_str = (payload.query or "").strip()
    if not query_str:
        return {"success": True, "query": "", "count": 0, "chunks": []}
    services = _get_services()
    vector_store = services["vector_store"]
    try:
        if hasattr(vector_store, "similarity_search_with_score"):
            results = vector_store.similarity_search_with_score(payload.query, k=payload.k)
        elif hasattr(vector_store, "similarity_search"):
            raw = vector_store.similarity_search(payload.query, k=payload.k)
            results = [(d, 0.0) for d in raw]
        else:
            results = []

        chunks = []
        for doc, score in results:
            content = getattr(doc, "page_content", "") or (doc.get("text") if isinstance(doc, dict) else str(doc))
            meta = getattr(doc, "metadata", {}) or (doc.get("metadata") if isinstance(doc, dict) else {})
            
            # Multi-tenant isolation: allow access if chunk belongs to user, is global, or payload has no user_id restriction
            if payload.user_id:
                doc_user = meta.get("user_id")
                is_glob = meta.get("is_global", False)
                if doc_user and doc_user != payload.user_id and not is_glob:
                    continue

            chunks.append({
                "content": content,
                "metadata": meta,
                "score": float(score) if score is not None else 0.0,
            })

        return {
            "success": True,
            "query": payload.query,
            "count": len(chunks),
            "chunks": chunks,
        }
    except Exception as e:
        return {"success": False, "error": str(e), "chunks": []}



@router.delete("/{document_id}")
async def delete_document(
    document_id: str,
    _: bool = Depends(verify_token),
):
    """Delete a document by ID from the vector store."""
    services = _get_services()
    vector_store = services["vector_store"]
    success = False
    if hasattr(vector_store, "delete_by_document_id"):
        success = vector_store.delete_by_document_id(document_id)
    if not success:
        success = vector_store.delete_documents(ids=[document_id])
    return {"success": True, "document_id": document_id}
