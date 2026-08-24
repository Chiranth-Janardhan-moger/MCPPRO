from langchain_core.vectorstores import InMemoryVectorStore
from app.embedders.embedding_factory import EmbeddingFactory
from app.services.vector_stores.base_vector_store import BaseVectorStore
from app.services.vector_stores.vector_store_cache import VectorStoreCache
from typing import List, Dict, Optional, Any
from langchain_core.documents import Document
from app.config.settings import settings
from pathlib import Path
import uuid
import tempfile
import os

class InMemoryVectorStoreService(BaseVectorStore):
    def __init__(
        self, 
        embedding_model: str = "text-embedding-3-small"
    ):
        """
        Initialize InMemory vector store service
        
        Args:
            embedding_model: Embedding model identifier (provider-aware)
        """
        self.embedding_model = embedding_model
        
        self.embeddings = EmbeddingFactory.create_embedding_model(settings, embedding_model)
        
        self.vector_store = InMemoryVectorStore(embedding=self.embeddings)
        
        self.store_type = "inmemory"
        
        self.cache_manager = VectorStoreCache()
        
        print("Initialized InMemory vector store with caching support")
    
    def add_documents(
        self, 
        texts: List[str], 
        metadatas: List[Dict],
        ids: Optional[List[str]] = None
    ) -> List[str]:
        """Add documents to InMemory vector store (sync)"""
        if not ids:
            ids = [str(uuid.uuid4()) for _ in texts]
        
        print(f"Adding {len(texts)} documents to InMemory vector store...")
        
        try:
            documents = [
                Document(id=doc_id, page_content=text, metadata=metadata)
                for doc_id, text, metadata in zip(ids, texts, metadatas)
            ]
            
            added_ids = self.vector_store.add_documents(documents)
            
            print(f"Successfully added {len(added_ids)} documents to InMemory vector store")
            return added_ids
            
        except Exception as e:
            print(f"Error adding documents to InMemory vector store: {e}")
            raise
    
    def similarity_search_with_score(
        self, 
        query: str, 
        k: int = 10,
        filter: Optional[Dict] = None,
        namespace: Optional[str] = None
    ) -> List[tuple]:
        """Search with relevance scores (sync)"""
        try:
            filter_fn = None
            if filter:
                filter_fn = lambda doc: all(doc.metadata.get(key) == val for key, val in filter.items())
                
            results = self.vector_store.similarity_search_with_score(
                query=query, 
                k=k,
                filter=filter_fn
            )
            return results
            
        except Exception as e:
            print(f"Error during similarity search with score: {e}")
            return []
    
    def delete_documents(
        self, 
        ids: List[str],
        namespace: Optional[str] = None
    ) -> bool:
        """Delete documents by IDs (sync)"""
        try:
            self.vector_store.delete(ids=ids)
            print(f"Deleted {len(ids)} documents from InMemory vector store")
            return True
            
        except Exception as e:
            print(f"Error deleting documents: {e}")
            return False
    
    def get_document_count(self, namespace: Optional[str] = None) -> int:
        """Get total document count (sync)"""
        try:
            count = len(self.vector_store.store)
            return count
            
        except Exception as e:
            print(f"Error getting document count: {e}")
            return 0

    def _iter_stored(self):
        """Yield (metadata, text) for every stored entry.

        langchain's InMemoryVectorStore keeps serialized dicts
        (``{"id", "vector", "text", "metadata"}``) in ``.store``; older
        versions kept Document objects. Handle both.
        """
        for value in self.vector_store.store.values():
            if isinstance(value, dict):
                yield value.get("metadata") or {}, value.get("text", "")
            else:
                yield getattr(value, "metadata", None) or {}, getattr(value, "page_content", "")

    def get_distinct_metadata_values(self, key: str) -> List[str]:
        """Return distinct values of a metadata key across stored documents."""
        try:
            values = set()
            for metadata, _text in self._iter_stored():
                value = metadata.get(key)
                if value is not None:
                    values.add(str(value))
            return sorted(values)
        except Exception as e:
            print(f"Error reading metadata values for key '{key}': {e}")
            return []

    def get_document_summaries(self) -> List[Dict]:
        """Group stored chunks by document_id into document summaries."""
        try:
            grouped: Dict[str, Dict] = {}
            for metadata, _text in self._iter_stored():
                doc_id = str(metadata.get("document_id", ""))
                if not doc_id:
                    continue
                entry = grouped.setdefault(
                    doc_id,
                    {
                        "id": doc_id,
                        "file_name": str(metadata.get("source", doc_id)),
                        "chunk_count": 0,
                    },
                )
                entry["chunk_count"] += 1
            summaries = list(grouped.values())
            for s in summaries:
                s["status"] = "ready"
                s["updated_at"] = ""
            return summaries
        except Exception as e:
            print(f"Error building document summaries: {e}")
            return []
    
    def delete_all_documents(self, namespace: Optional[str] = None) -> bool:
        """Delete all documents from vector store (sync)"""
        try:
            all_ids = list(self.vector_store.store.keys())
            if all_ids:
                self.vector_store.delete(ids=all_ids)
            
            print(f"Deleted all documents from InMemory vector store")
            return True
            
        except Exception as e:
            print(f"Error deleting all documents: {e}")
            return False
    
    # Async methods (prefixed with 'a')
    async def aadd_documents(
        self, 
        texts: List[str], 
        metadatas: List[Dict],
        ids: Optional[List[str]] = None
    ) -> List[str]:
        """Add documents to InMemory vector store (async)"""
        if not ids:
            ids = [str(uuid.uuid4()) for _ in texts]
        
        print(f"Adding {len(texts)} documents to InMemory vector store (async)...")
        
        try:
            documents = [
                Document(id=doc_id, page_content=text, metadata=metadata)
                for doc_id, text, metadata in zip(ids, texts, metadatas)
            ]
            
            added_ids = await self.vector_store.aadd_documents(documents)
            
            print(f"Successfully added {len(added_ids)} documents to InMemory vector store (async)")
            return added_ids
            
        except Exception as e:
            print(f"Error adding documents to InMemory vector store: {e}")
            raise
    
    
    async def asimilarity_search(
        self, 
        query: str, 
        k: int = 10,
        filter: Optional[Dict] = None,
        namespace: Optional[str] = None
    ) -> List[Document]:
        """Perform similarity search in InMemory vector store (async)"""
        try:
            filter_fn = None
            if filter:
                filter_fn = lambda doc: all(doc.metadata.get(key) == val for key, val in filter.items())
                
            results = await self.vector_store.asimilarity_search(
                query=query, 
                k=k,
                filter=filter_fn
            )
            return results
            
        except Exception as e:
            print(f"Error during similarity search: {e}")
            return []
    
    async def asimilarity_search_with_score(
        self, 
        query: str, 
        k: int = 10,
        filter: Optional[Dict] = None,
        namespace: Optional[str] = None
    ) -> List[tuple]:
        """Search with relevance scores (async)"""
        try:
            filter_fn = None
            if filter:
                filter_fn = lambda doc: all(doc.metadata.get(key) == val for key, val in filter.items())
                
            results = await self.vector_store.asimilarity_search_with_score(
                query=query, 
                k=k,
                filter=filter_fn
            )
            return results
            
        except Exception as e:
            print(f"Error during similarity search with score: {e}")
            return []
    
    async def adelete_documents(
        self, 
        ids: List[str],
        namespace: Optional[str] = None
    ) -> bool:
        """Delete documents by IDs (async)"""
        try:
            await self.vector_store.adelete(ids=ids)
            print(f"Deleted {len(ids)} documents from InMemory vector store (async)")
            return True
            
        except Exception as e:
            print(f"Error deleting documents: {e}")
            return False
    
    async def aget_document_count(self, namespace: Optional[str] = None) -> int:
        """Get total document count (async)"""
        try:
            count = len(self.vector_store.store)
            return count
            
        except Exception as e:
            print(f"Error getting document count: {e}")
            return 0
    
    async def adelete_all_documents(self, namespace: Optional[str] = None) -> bool:
        """Delete all documents from vector store (async)"""
        try:
            all_ids = list(self.vector_store.store.keys())
            if all_ids:
                await self.vector_store.adelete(ids=all_ids)
            
            print(f"Deleted all documents from InMemory vector store (async)")
            return True
            
        except Exception as e:
            print(f"Error deleting all documents: {e}")
            return False
    
    def as_retriever(self, **kwargs) -> Any:
        """Get retriever for RAG chains"""
        return self.vector_store.as_retriever(**kwargs)
    
    def dump_to_file(self, file_path: str) -> bool:
        """Dump vector store to file for caching"""
        try:
            self.vector_store.dump(file_path)
            print(f"Dumped vector store to: {file_path}")
            return True
        except Exception as e:
            print(f"Error dumping vector store: {e}")
            return False
    
    @classmethod
    def load_from_file(cls, file_path: str, embedding_model: str = "text-embedding-3-small") -> 'InMemoryVectorStoreService':
        """Load vector store from file"""
        try:
            embeddings = EmbeddingFactory.create_embedding_model(settings, embedding_model)
            
            vector_store = InMemoryVectorStore.load(file_path, embedding=embeddings)
            
            service = cls.__new__(cls)
            service.embedding_model = embedding_model
            service.embeddings = embeddings
            service.vector_store = vector_store
            service.store_type = "inmemory"
            
            print(f"Loaded vector store from: {file_path}")
            return service
            
        except Exception as e:
            print(f"Error loading vector store: {e}")
            raise
    
    def get_temp_dump_path(self) -> str:
        """Get a temporary file path for dumping"""
        # Use the vector_store_cache directory instead of system temp to avoid cross-device issues
        cache_dir = Path("vector_store_cache")
        cache_dir.mkdir(exist_ok=True)
        temp_file = f"temp_vector_store_{uuid.uuid4().hex[:8]}.vs"
        return str(cache_dir / temp_file)
    
    def supports_caching(self) -> bool:
        """Check if this vector store supports caching"""
        return True
    
    def load_from_cache(self, document_url: str) -> bool:
        """Load cached chunks into the shared store WITHOUT replacing it.

        The cached dump is loaded into a temporary store and its entries are
        merged into the live one. Swapping ``self.vector_store`` in-place
        (the old behaviour) let a concurrent cache-load wipe another
        request's index mid-flight.
        """
        try:
            cached_path = self.cache_manager.get_cache_path(document_url)
            if cached_path:
                print(f"Loading cached vector store for: {document_url[:50]}...")

                cached_store = InMemoryVectorStore.load(
                    cached_path, embedding=self.embeddings
                )
                # Merge cached entries into the live store (skip ids that
                # already exist to keep the operation idempotent).
                for key, value in cached_store.store.items():
                    if key not in self.vector_store.store:
                        self.vector_store.store[key] = value

                print("Successfully merged cached vector store")
                return True
            return False
        except Exception as e:
            print(f"Failed to load cached vector store: {e}")
            return False
    
    def save_to_cache(self, document_url: str) -> bool:
        """Save current document chunks to cache for document URL. Returns True if successful."""
        try:
            temp_path = self.get_temp_dump_path()
            doc_id = str(uuid.uuid5(uuid.NAMESPACE_URL, document_url))

            # Isolate entries belonging to this document_url/doc_id to prevent cross-document cache bleed
            filtered_store = InMemoryVectorStore(embedding=self.embeddings)
            for key, value in self.vector_store.store.items():
                if isinstance(value, dict):
                    meta = value.get("metadata") or {}
                else:
                    meta = getattr(value, "metadata", None) or {}
                
                if meta.get("document_id") == doc_id or meta.get("source") == document_url:
                    filtered_store.store[key] = value

            # If specific chunks were matched, dump only them; otherwise dump all as fallback
            target_store = filtered_store if filtered_store.store else self.vector_store
            target_store.dump(temp_path)

            success = self.cache_manager.cache_vector_store(document_url, temp_path)
            if success:
                print("Successfully cached vector store for future use")
            return success
        except Exception as e:
            print(f"Failed to cache vector store: {e}")
            return False
    
    def has_cache(self, document_url: str) -> bool:
        """Check if cache exists for document URL"""
        return self.cache_manager.has_cached_store(document_url)
    
    def clear_cache(self, document_url: Optional[str] = None) -> bool:
        """Clear cache for specific URL or all cache"""
        try:
            self.cache_manager.clear_cache(document_url)
            return True
        except Exception as e:
            print(f"Error clearing cache: {e}")
            return False
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        return self.cache_manager.get_cache_stats()
    
    def list_cached_urls(self) -> List[str]:
        """List all cached document URLs"""
        return self.cache_manager.list_cached_urls()

