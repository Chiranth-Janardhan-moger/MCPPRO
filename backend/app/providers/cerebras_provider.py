from app.providers.base import BaseLLMProvider
from langchain_openai import ChatOpenAI
from typing import Dict, Any, List
import json
import openai

class CerebrasProvider(BaseLLMProvider):
    def __init__(self, api_key: str, model: str = "qwen-3-235b-a22b-instruct-2507"):
        self.api_key = api_key
        self.model = model
        self.llm = ChatOpenAI(
            api_key=api_key,
            base_url="https://api.cerebras.ai/v1",  
            model=model,
            temperature=0.3
        )
        self.client = openai.AsyncOpenAI(
            api_key=api_key,
            base_url="https://api.cerebras.ai/v1"
        )
    


    def get_langchain_llm(self) -> Any:
        return self.llm
    
    @property
    def provider_name(self) -> str:
        return "cerebras"
    
    async def chat_completion_with_tools(
        self, 
        messages: List[Dict[str, Any]], 
        tools: List[Dict[str, Any]], 
        temperature: float = 0.1
    ) -> Any:
        """
        Chat completion with function calling support
        
        Args:
            messages: List of messages in OpenAI format
            tools: List of available tools/functions
            temperature: Temperature for generation
        
        Returns:
            Cerebras response object (OpenAI-compatible format via Cerebras endpoint)
        """
        try:
            functions = [openai_tool_schema(t) for t in tools]

            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                tools=functions,
                tool_choice="auto",
                temperature=temperature
            )
            
            return response
            
        except Exception as e:
            raise Exception(f"Cerebras function calling failed: {str(e)}")