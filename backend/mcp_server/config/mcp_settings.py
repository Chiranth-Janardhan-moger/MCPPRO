import os

MCP_SERVER_PORT = int(os.getenv("MCP_SERVER_PORT", "8001"))

# When set, the MCP server requires `Authorization: Bearer <token>` on every
# request. Leave unset only for trusted local development.
MCP_SERVER_AUTH_TOKEN = os.getenv("MCP_SERVER_AUTH_TOKEN") or None
