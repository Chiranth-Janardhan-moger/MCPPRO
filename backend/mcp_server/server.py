from typing import List, Optional, Union

from fastmcp import FastMCP
from fastmcp.server.auth import TokenVerifier
from fastmcp.server.auth.providers.jwt import AccessToken
from mcp_server.config.mcp_settings import MCP_SERVER_AUTH_TOKEN, MCP_SERVER_PORT
from mcp_server.tools.retrieve_context_mcp import retrieve_context_mcp
from mcp_server.tools.rag_mcp import rag_mcp


class StaticTokenVerifier(TokenVerifier):
    """Single shared-secret bearer auth for the local MCP server."""

    def __init__(self, token: str):
        super().__init__(required_scopes=[])
        self._token = token

    async def verify_token(self, token: str) -> Optional[AccessToken]:
        if token == self._token:
            return AccessToken(
                token=token,
                client_id="mcppro-frontend",
                scopes=[],
                expires_at=None,
            )
        return None


def _build_server() -> FastMCP:
    kwargs = {}
    if MCP_SERVER_AUTH_TOKEN:
        kwargs["auth"] = StaticTokenVerifier(MCP_SERVER_AUTH_TOKEN)
    return FastMCP("mcppro-rag-server", **kwargs)


mcp = _build_server()


@mcp.tool(description="Retrieve relevant chunks from documents using natural language queries")
async def retrieve_context(questions: Union[str, List[str]], k: int = 10):
    return await retrieve_context_mcp(questions, k)


@mcp.tool(description="Process a document from URL and retrieve relevant context/chunks based on questions. Returns document content chunks with summary.")
async def rag_search(document_url: str, questions: Union[str, List[str]], k: int = 10, use_ocr: bool = False, use_cache: bool = True):
    return await rag_mcp(document_url, questions, k, use_ocr, use_cache)


def run_server(port: int = None):
    if MCP_SERVER_AUTH_TOKEN:
        print(f"MCP server starting on port {port or MCP_SERVER_PORT} WITH bearer auth")
    else:
        print(
            f"MCP server starting on port {port or MCP_SERVER_PORT} WITHOUT auth "
            "(set MCP_SERVER_AUTH_TOKEN to require a bearer token)"
        )
    mcp.run(transport="streamable-http", port=port or MCP_SERVER_PORT)
