from app.providers.base import BaseLLMProvider
from app.providers.tool_calling import openai_tool_schema
from langchain_openai import ChatOpenAI
from typing import Dict, Any, List
import json
import openai

class OpenAIProvider(BaseLLMProvider):
    def __init__(self, api_key: str, model: str = "gpt-4.1-nano"):
        self.api_key = api_key
        self.model = model
        self.llm = ChatOpenAI(
            api_key=api_key,
            model=model,
            temperature=0.1
        )
        self.client = openai.AsyncOpenAI(api_key=api_key)
    


    def get_langchain_llm(self) -> Any:
        return self.llm
    
    @property
    def provider_name(self) -> str:
        return "openai"
    
    async def chat_completion_with_tools(
        self, 
        messages: List[Dict[str, Any]], 
        tools: List[Dict[str, Any]], 
        temperature: float = 1
    ) -> Any:
        """
        Chat completion with function calling support
        
        Args:
            messages: List of messages in OpenAI format
            tools: List of available tools/functions
            temperature: Temperature for generation
        
        Returns:
            OpenAI response object
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
            raise Exception(f"Function calling failed: {str(e)}")
