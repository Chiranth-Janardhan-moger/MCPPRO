from typing import Any, Dict, List

from app.tools.base import BaseTool, ToolResult
from app.services.vector_stores.vector_store_factory import VectorStoreFactory
from app.config.settings import settings
from app.providers.factory import LLMProviderFactory
from app.providers.tool_calling import content_to_text
from app.prompts.context_summary_prompt import CONTEXT_SUMMARY_PROMPT
import asyncio


class RetrieveContextTool(BaseTool):
    """Lightweight retrieval tool using an existing vector store.

    Expects that the document has already been embedded and stored via
    `process_document`. It filters by the provided `document_id` metadata
    (added during embedding) and returns the top-k chunks for the supplied
    question.
    """

    def __init__(self):
        super().__init__(
            name="retrieve_context",
            description="Retrieve relevant chunks from a previously processed document"
        )
        self.vector_store = VectorStoreFactory.create_vector_store(settings)
        self.llm_provider = LLMProviderFactory.create_provider(
            settings.DEFAULT_LLM_PROVIDER, settings
        )

    @property
    def parameters_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "questions": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "One or more natural language queries for which to retrieve relevant chunks from the document. Accepts a single string or an array of strings."
                },

                "k": {"type": "integer", "default": 10},
            },
            "required": ["questions"],
        }

    async def _search(self, query: str, k: int, document_id: str):
        metadata_filter = {"document_id": document_id} if document_id else None
        if hasattr(self.vector_store, "asimilarity_search_with_score"):
            return await self.vector_store.asimilarity_search_with_score(
                query=query, k=k, filter=metadata_filter
            )
        return await asyncio.to_thread(
            self.vector_store.similarity_search_with_score,
            query=query,
            k=k,
            filter=metadata_filter,
        )

    async def execute(self, **kwargs):  # type: ignore[override]
        try:
            queries = kwargs.get("questions")
            if isinstance(queries, str):
                queries = [queries]
            if not queries:
                return ToolResult(success=False, error="'questions' (array of strings) is required")
            k: int = kwargs.get("k", 10)
            document_id: str = kwargs.get("document_id", "")

            docs_with_scores = []

            print(f"Executing {len(queries)} vector searches in parallel...")
            search_tasks = [
                self._search(q, k, document_id) for q in queries
            ]

            search_results = await asyncio.gather(*search_tasks, return_exceptions=True)

            for i, result in enumerate(search_results):
                if isinstance(result, Exception):
                    print(f"Search failed for query '{queries[i]}': {result}")
                    continue
                docs_with_scores.extend(result)

            chunks = [
                {"content": doc.page_content, "similarity_score": float(score)}
                for doc, score in docs_with_scores
            ]

            try:
                context_text = "\n\n".join([c["content"] for c in chunks])
                summary_prompt = CONTEXT_SUMMARY_PROMPT.format(
                    question=" | ".join(queries), context=context_text
                )

                llm = self.llm_provider.get_langchain_llm()

                if hasattr(llm, 'ainvoke'):
                    summary_response = await llm.ainvoke(summary_prompt)
                    summary = content_to_text(summary_response.content)
                else:
                    summary = content_to_text(llm.invoke(summary_prompt).content)

            except Exception as e:
                print(f"Summary generation failed: {e}")
                summary = ""

            print(f"Retrieved {len(chunks)} chunks from {len(queries)} parallel queries")
            return ToolResult(success=True, result={"chunks": chunks, "summary": summary.strip()})
            
        except Exception as exc:
            return ToolResult(success=False, error=str(exc))
