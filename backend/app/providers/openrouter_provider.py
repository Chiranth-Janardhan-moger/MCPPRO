import json
import openai
from typing import Dict, List, Any
from langchain_openai import ChatOpenAI
from app.providers.base import BaseLLMProvider


class OpenRouterProvider(BaseLLMProvider):
    def __init__(self, api_key: str, model: str = "meta-llama/llama-3.1-8b-instruct:free"):
        self.api_key = api_key
        self.model = model
        self.llm = ChatOpenAI(
            api_key=api_key,
            base_url="https://openrouter.ai/api/v1",  
            model=model,
            temperature=0.3
        )
        self.client = openai.AsyncOpenAI(
            api_key=api_key,
            base_url="https://openrouter.ai/api/v1"
        )



    def get_langchain_llm(self) -> Any:
        return self.llm

    @property
    def provider_name(self) -> str:
        return "openrouter"

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
            OpenRouter response object (OpenAI-compatible format via OpenRouter endpoint)
        """
        try:
            functions = []
            for tool in tools:
                functions.append({
                    "type": "function",
                    "function": {
                        "name": tool["name"],
                        "description": tool["description"],
                        "parameters": tool["parameters"]
                    }
                })
            
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                tools=functions,
                tool_choice="auto",
                temperature=temperature
            )
            
            return response
            
        except Exception as e:
            raise Exception(f"OpenRouter function calling failed: {str(e)}")