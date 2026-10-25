from langchain_qdrant import QdrantVectorStore
from app.embedders.embedding_factory import EmbeddingFactory
from qdrant_client import QdrantClient
from qdrant_client.http.models import Distance, VectorParams, HnswConfigDiff, SearchParams
from app.services.vector_stores.base_vector_store import BaseVectorStore
from typing import List, Dict, Optional, Any
from langchain_core.documents import Document
from app.config.settings import settings
import uuid
import time
import os

def _to_valid_qdrant_id(raw_id: Any) -> str:
    """Ensure point ID is a valid RFC-4122 UUID string as required by Qdrant."""
    try:
        return str(uuid.UUID(str(raw_id)))
    except (ValueError, AttributeError):
        return str(uuid.uuid5(uuid.NAMESPACE_DNS, str(raw_id)))


class QdrantVectorStoreService(BaseVectorStore):
    def __init__(
        self, 
        collection_name: str = "mcppro-documents",
        embedding_model: str = "text-embedding-3-small",
        url: Optional[str] = None,
        api_key: Optional[str] = None,
        path: Optional[str] = None,
        prefer_grpc: bool = True
    ):
        """
        Initialize Qdrant vector store service
        
        Args:
            collection_name: Name of the Qdrant collection
            embedding_model: OpenAI embedding model to use
            url: Qdrant server URL (for cloud/server deployments)
            api_key: API key for Qdrant cloud
            path: Local path for on-disk storage (for local mode)
            prefer_grpc: Whether to prefer gRPC protocol
        """
        self.collection_name = collection_name
        self.embedding_model = embedding_model
        self.url = url
        self.api_key = api_key
        self.path = path
        self.prefer_grpc = prefer_grpc
        
        # Provider-aware embeddings (OpenAI or Gemini depending on env)
        self.embeddings = EmbeddingFactory.create_embedding_model(
            settings, embedding_model
        )
        
        # Initialize Qdrant client based on configuration
        self.client = self._initialize_client()
        
        # Create or get collection
        self._setup_collection()
        
        # Initialize Qdrant vector store
        self.vector_store = QdrantVectorStore(
            client=self.client,
            collection_name=self.collection_name,
            embedding=self.embeddings
        )
        
        self.store_type = "qdrant"
    
    def _initialize_client(self) -> QdrantClient:
        """Initialize Qdrant client based on configuration"""
        if self.url:
            # Cloud or server deployment
            print(f"Connecting to Qdrant server at {self.url}")
            return QdrantClient(
                url=self.url,
                api_key=self.api_key,
                prefer_grpc=self.prefer_grpc
            )
        elif self.path:
            # Local on-disk storage
            print(f"Using Qdrant local storage at {self.path}")
            return QdrantClient(path=self.path)
        else:
            # In-memory storage
            print("Using Qdrant in-memory storage")
            return QdrantClient(":memory:")
    
    def _get_embedding_dimension(self) -> int:
        """Dynamically detect embedding dimension from active embedding model."""
        try:
            sample = self.embeddings.embed_query("dimension test")
            return len(sample)
        except Exception:
            model_dimensions = {
                "text-embedding-ada-002": 1536,
                "text-embedding-3-small": 1536,
                "text-embedding-3-large": 3072,
                "gemini-embedding-001": 3072,
            }
            return model_dimensions.get(self.embedding_model, 1536)
    
    def _setup_collection(self):
        """Create collection if it doesn't exist or recreate if empty with mismatched dim"""
        try:
            collections = self.client.get_collections()
            collection_names = [col.name for col in collections.collections]
            dimension = self._get_embedding_dimension()
            
            if self.collection_name in collection_names:
                existing_info = self.client.get_collection(self.collection_name)
                existing_dim = getattr(getattr(existing_info.config.params, "vectors", None), "size", None)
                if existing_dim and existing_dim != dimension:
                    print(f"Dimension mismatch in '{self.collection_name}': existing {existing_dim} vs required {dimension}")
                    if (existing_info.points_count or 0) == 0:
                        print("Recreating empty collection with correct dimension...")
                        self.client.delete_collection(self.collection_name)
                        collection_names.remove(self.collection_name)

            if self.collection_name not in collection_names:
                print(f"Creating Qdrant collection: {self.collection_name} (dim: {dimension})")
                
                hnsw_diff = HnswConfigDiff(
                    m=getattr(settings, 'QDRANT_HNSW_M', 16),
                    ef_construct=getattr(settings, 'QDRANT_HNSW_EF_CONSTRUCT', 100),
                    on_disk=getattr(settings, 'QDRANT_HNSW_ON_DISK', False),
                )
                
                self.client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=VectorParams(
                        size=dimension,
                        distance=Distance.COSINE,
                        hnsw_config=hnsw_diff,
                    ),
                    hnsw_config=hnsw_diff,
                )
                print(f"Created collection '{self.collection_name}' with dimension {dimension} and HNSW index")
            else:
                print(f"Collection '{self.collection_name}' already exists")
                
        except Exception as e:
            print(f"Error setting up collection: {e}")
            raise
    
    def add_documents(
        self, 
        texts: List[str], 
        metadatas: List[Dict],
        ids: Optional[List[str]] = None
    ) -> List[str]:
        """Add documents to Qdrant vector store"""
        if not ids:
            ids = [str(uuid.uuid4()) for _ in texts]
        else:
            ids = [_to_valid_qdrant_id(i) for i in ids]
        
        print(f"Adding {len(texts)} documents to Qdrant...")
        
        try:
            # Create Document objects
            documents = [
                Document(page_content=text, metadata=metadata)
                for text, metadata in zip(texts, metadatas)
            ]
            
            # Add documents to Qdrant
            added_ids = self.vector_store.add_documents(documents, ids=ids)
            
            print(f"Successfully added {len(added_ids)} documents to Qdrant")
            
# Indexing completes immediately on write
            
            return added_ids
            
        except Exception as e:
            print(f"Error adding documents to Qdrant: {e}")
            raise
    
    def _verify_documents_added(self, document_id: Optional[str] = None) -> bool:
        """Verify that documents were successfully added and are searchable"""
        try:
            # Simple search without filter - just verify documents exist
            test_results = self.vector_store.similarity_search(
                query="test verification search",
                k=1
            )
            return len(test_results) > 0
        except Exception:
            return False
    
    def similarity_search(
        self,
        query: str,
        k: int = 10,
        filter: Optional[Dict] = None,
        **kwargs: Any
    ) -> List[Document]:
        """Search similar documents using HNSW approximate nearest neighbor index."""
        try:
            search_params = SearchParams(
                hnsw_ef=getattr(settings, "QDRANT_HNSW_EF_SEARCH", 64),
                exact=False,
            )
            return self.vector_store.similarity_search(
                query, k=k, filter=filter, search_params=search_params, **kwargs
            )
        except Exception as e:
            print(f"Error during HNSW similarity search: {e}")
            return []

    def similarity_search_with_score(
        self, 
        query: str, 
        k: int = 10,
        filter: Optional[Dict] = None,
        namespace: Optional[str] = None
    ) -> List[tuple]:
        """Search with relevance scores using HNSW approximate nearest neighbor index."""
        try:
            search_params = SearchParams(
                hnsw_ef=getattr(settings, "QDRANT_HNSW_EF_SEARCH", 64),
                exact=False,
            )
            if filter:
                results = self.vector_store.similarity_search_with_score(
                    query, k=k, filter=filter, search_params=search_params
                )
            else:
                results = self.vector_store.similarity_search_with_score(
                    query, k=k, search_params=search_params
                )
            return results
            
        except Exception as e:
            print(f"Error during HNSW similarity search with score: {e}")
            return []
    
    def as_retriever(self, **kwargs) -> Any:
        """Get retriever for RAG chains"""
        return self.vector_store.as_retriever(**kwargs)
    
    def delete_documents(
        self, 
        ids: List[str],
        namespace: Optional[str] = None
    ) -> bool:
        """Delete documents by IDs"""
        try:
            # Qdrant uses delete method
            valid_ids = [_to_valid_qdrant_id(i) for i in ids]
            self.vector_store.delete(valid_ids)
            print(f"Deleted {len(ids)} documents from Qdrant")
            return True
            
        except Exception as e:
            print(f"Error deleting documents: {e}")
            return False
    
    def get_document_count(self, namespace: Optional[str] = None) -> int:
        """Get total document count"""
        try:
            collection_info = self.client.get_collection(self.collection_name)
            return collection_info.points_count or 0
            
        except Exception as e:
            print(f"Error getting document count: {e}")
            return 0
    
    def delete_all_documents(self, namespace: Optional[str] = None) -> bool:
        """Delete all documents from vector store"""
        try:
            # Delete the entire collection and recreate it
            self.client.delete_collection(self.collection_name)
            self._setup_collection()
            
            # Reinitialize vector store
            self.vector_store = QdrantVectorStore(
                client=self.client,
                collection_name=self.collection_name,
                embedding=self.embeddings
            )
            
            print(f"Deleted all documents from collection '{self.collection_name}'")
            return True
            
        except Exception as e:
            print(f"Error deleting all documents: {e}")
            return False

    def get_document_summaries(self) -> List[Dict]:
        """Summarise indexed documents in Qdrant (id, file_name, status, chunk_count)."""
        try:
            points, _ = self.client.scroll(
                collection_name=self.collection_name,
                limit=1000,
                with_payload=True,
                with_vectors=False,
            )
            by_id: Dict[str, Dict] = {}
            for p in points:
                payload = p.payload or {}
                meta = payload.get("metadata", payload)
                doc_id = meta.get("document_id") or str(p.id)
                file_name = meta.get("file_name") or meta.get("source") or "document"
                if doc_id not in by_id:
                    by_id[doc_id] = {
                        "id": doc_id,
                        "file_name": file_name,
                        "status": "ready",
                        "chunk_count": 0,
                    }
                by_id[doc_id]["chunk_count"] += 1
            return list(by_id.values())
        except Exception as e:
            print(f"Error getting document summaries from Qdrant: {e}")
            return []

    async def adelete_documents(self, ids: List[str], namespace: Optional[str] = None) -> bool:
        """Asynchronously delete documents by IDs"""
        return self.delete_documents(ids, namespace)
