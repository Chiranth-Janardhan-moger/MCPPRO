from typing import Dict, List, Any
from app.tools.base import BaseTool

from app.tools.url_request_tool import URLRequestTool
from app.tools.process_document_tool import ProcessDocumentTool
from app.tools.retrieve_context_tool import RetrieveContextTool
from app.tools.traditional_rag_tool import TraditionalRAGTool

class ToolRegistry:
    """
    Registry for managing all available tools.

    Tools are constructed lazily on first use: several tools build vector
    stores that require credentials, and eager construction at import time
    made the whole API unbootable without a full environment configured.
    """

    def __init__(self):
        self._tools: Dict[str, BaseTool] = {}
        self._initialized = False

    def _ensure_initialized(self):
        if self._initialized:
            return
        tools = [
            URLRequestTool(),
            ProcessDocumentTool(),
            RetrieveContextTool(),
            TraditionalRAGTool(),
        ]
        for tool in tools:
            self.register_tool(tool)
        self._initialized = True

    def register_tool(self, tool: BaseTool):
        """Register a new tool"""
        self._tools[tool.name] = tool

    def get_tool(self, name: str) -> BaseTool:
        self._ensure_initialized()
        if name not in self._tools:
            raise ValueError(f"Tool '{name}' not found. Available tools: {list(self._tools.keys())}")
        return self._tools[name]

    def list_tools(self) -> List[str]:
        self._ensure_initialized()
        return list(self._tools.keys())

    def get_tools_for_llm(self) -> List[Dict[str, Any]]:
        self._ensure_initialized()
        return [tool.to_function_definition() for tool in self._tools.values()]

    async def execute_tool(self, tool_name: str, **kwargs) -> Any:
        """Execute a tool by name with given parameters"""
        tool = self.get_tool(tool_name)
        return await tool.execute(**kwargs)

tool_registry = ToolRegistry()
