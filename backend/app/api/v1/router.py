from fastapi import APIRouter
from app.api.v1.endpoints.mcppro_agent import router as mcppro_agent_router

api_router = APIRouter()

api_router.include_router(mcppro_agent_router, prefix="/mcppro-agent", tags=["MCPPro"])

