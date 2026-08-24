from pydantic import BaseModel, field_validator
from typing import List, Optional


MAX_QUESTIONS = 25
MAX_QUESTION_LENGTH = 8000
MAX_K = 100


class MCPProRequest(BaseModel):
    documents: str
    questions: List[str]
    k: Optional[int] = 10
    # None = fall back to the AGENT_ENABLED server default
    use_agent: Optional[bool] = None

    @field_validator("documents")
    @classmethod
    def documents_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("documents must be a non-empty URL")
        if len(v) > 8000:
            raise ValueError("documents URL too long")
        return v

    @field_validator("questions")
    @classmethod
    def questions_valid(cls, v: List[str]) -> List[str]:
        if not v:
            raise ValueError("at least one question is required")
        if len(v) > MAX_QUESTIONS:
            raise ValueError(f"at most {MAX_QUESTIONS} questions allowed")
        for q in v:
            if not q.strip():
                raise ValueError("questions must be non-empty strings")
            if len(q) > MAX_QUESTION_LENGTH:
                raise ValueError(f"each question must be <= {MAX_QUESTION_LENGTH} chars")
        return v

    @field_validator("k")
    @classmethod
    def k_in_range(cls, v: Optional[int]) -> Optional[int]:
        if v is None:
            return v
        if not 1 <= v <= MAX_K:
            raise ValueError(f"k must be between 1 and {MAX_K}")
        return v
