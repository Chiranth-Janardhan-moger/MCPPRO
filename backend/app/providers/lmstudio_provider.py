import json
import openai
from typing import Dict, List, Any
from langchain_openai import ChatOpenAI
from app.providers.base import BaseLLMProvider


class LMStudioProvider(BaseLLMProvider):
    def __init__(self, api_key: str = "lm-studio", model: str = "local-model", base_url: str = "http://localhost:1234/v1"):
        self.api_key = api_key  # LM Studio doesn't require a real API key
        self.model = model
        self.base_url = base_url
        self.llm = ChatOpenAI(
            api_key=api_key,
            base_url=base_url,  
            model=model,
            temperature=0.3
        )
        self.client = openai.AsyncOpenAI(
            api_key=api_key,
            base_url=base_url
        )



    def get_langchain_llm(self) -> Any:
        return self.llm

    @property
    def provider_name(self) -> str:
        return "lmstudio"

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
            LM Studio response object (OpenAI-compatible format)
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
            raise Exception(f"LM Studio function calling failed: {str(e)}")