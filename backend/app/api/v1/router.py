from fastapi import APIRouter
from app.api.v1.endpoints.max_agent import router as max_agent_router

api_router = APIRouter()

api_router.include_router(max_agent_router, prefix="/max-agent", tags=["Max-Agent"])

