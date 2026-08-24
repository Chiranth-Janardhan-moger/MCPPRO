from typing import List, Optional

from dotenv import load_dotenv
from pydantic import model_validator
from pydantic_settings import BaseSettings

# Compute the path relative to this file to load the env file robustly
import os

current_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(current_dir, "..", "..", ".env")
load_dotenv(env_path)


def _csv(value: str) -> List[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


class Settings(BaseSettings):
    # API Configuration
    API_V1_PREFIX: str = ""
    PROJECT_NAME: str = "MCPPro Intelligence System"
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000

    # Environment Configuration: production, development
    ENVIRONMENT: str = "development"

    # CORS: comma-separated list of allowed origins ("*" only for local dev)
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

    @property
    def cors_origin_list(self) -> List[str]:
        return _csv(self.CORS_ORIGINS)

    # Authentication (required)
    BEARER_TOKEN: str = ""

    # Vector Store Configuration
    DEFAULT_VECTOR_STORE: str = "inmemory"
    EMBEDDING_MODEL: str = "text-embedding-3-small"

    # Pinecone Configuration (optional)
    PINECONE_API_KEY: Optional[str] = None
    PINECONE_INDEX_NAME: str = "mcppro-documents"
    PINECONE_ENVIRONMENT: str = "us-east-1"

    # Qdrant Configuration (optional)
    QDRANT_URL: Optional[str] = None
    QDRANT_API_KEY: Optional[str] = None
    QDRANT_COLLECTION_NAME: str = "mcppro-documents"
    QDRANT_PATH: Optional[str] = None  # For local on-disk storage
    QDRANT_PREFER_GRPC: bool = True

    # LLM Providers
    DEFAULT_LLM_PROVIDER: str = "openai"

    # OpenAI Configuration
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4o-mini"

    # Gemini Configuration (current stable models; 2.0 is shut down)
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-3.6-flash"

    # Anthropic Configuration
    ANTHROPIC_API_KEY: Optional[str] = None
    ANTHROPIC_MODEL: str = "claude-sonnet-4-5"

    # Groq Configuration
    GROQ_API_KEY: Optional[str] = None
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    # Cerebras Configuration
    CEREBRAS_API_KEY: Optional[str] = None
    CEREBRAS_MODEL: str = "openai/gpt-oss-20b"

    # OpenRouter Configuration
    OPENROUTER_API_KEY: Optional[str] = None
    OPENROUTER_MODEL: str = "openai/gpt-4.1-mini"

    # LM Studio / OpenAI-compatible local servers
    LMSTUDIO_API_KEY: str = "lm-studio"
    LMSTUDIO_MODEL: str = "qwen/qwen3-4b"
    LMSTUDIO_BASE_URL: str = "http://localhost:1234/v1"

    # Supabase Configuration (optional; logging disabled when unset)
    SUPABASE_URL: Optional[str] = None
    SUPABASE_ANON_KEY: Optional[str] = None
    SUPABASE_SERVICE_KEY: Optional[str] = None
    SUPABASE_TABLE_NAME: str = "documents"
    SUPABASE_QUERY_NAME: str = "match_documents"
    ENABLE_REQUEST_LOGGING: bool = True

    # Processing Configuration
    CHUNK_SIZE: int = 1000
    CHUNK_OVERLAP: int = 200

    # Caching Configuration
    ENABLE_CACHING: bool = True
    CACHE_MIN_CHUNKS: int = 0

    # Agent Configuration
    AGENT_ENABLED: bool = True
    AGENT_TEMPERATURE: float = 0.1  # fixed base temperature for agent loops
    AGENT_MAX_ITERATIONS: int = 15

    # MCP server configuration
    MCP_SERVER_PORT: int = 8001
    MCP_SERVER_AUTH_TOKEN: Optional[str] = None  # require bearer auth when set

    class Config:
        env_file = ".env"

    @model_validator(mode="after")
    def _empty_strings_to_none(self):
        """Treat empty env values as unset for optional credentials."""
        for name, value in self.__dict__.items():
            if value == "":
                setattr(self, name, None)
        return self


settings = Settings()
