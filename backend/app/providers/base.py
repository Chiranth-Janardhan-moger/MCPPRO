from abc import ABC, abstractmethod
from typing import Dict, Any, List

class BaseLLMProvider(ABC):
    
    @abstractmethod
    def get_langchain_llm(self) -> Any:
        """Get LangChain compatible LLM instance"""
        pass
    
    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Get provider name"""
        pass
    
    async def chat_completion_with_tools(
        self, 
        messages: List[Dict[str, Any]], 
        tools: List[Dict[str, Any]], 
        temperature: float = 0.1
    ) -> Any:
        """
        Chat completion with function calling support
        Default implementation raises NotImplementedError
        """
        raise NotImplementedError("Function calling not supported by this provider")
