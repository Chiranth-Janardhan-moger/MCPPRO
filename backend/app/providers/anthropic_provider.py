from typing import Any, Dict, List

from langchain_anthropic import ChatAnthropic

from app.providers.base import BaseLLMProvider
from app.providers.tool_calling import (
    openai_tool_schema,
    to_langchain_messages,
    wrap_ai_message,
)
import json

class AnthropicProvider(BaseLLMProvider):
    def __init__(self, api_key: str, model: str = "claude-sonnet-4-5"):
        self.api_key = api_key
        self.model = model
        self.llm = ChatAnthropic(
            anthropic_api_key=api_key,
            model_name=model,
            temperature=0.1
        )
    


    def get_langchain_llm(self) -> Any:
        return self.llm
    
    @property
    def provider_name(self) -> str:
        return "anthropic"

    async def chat_completion_with_tools(
        self,
        messages: List[Dict[str, Any]],
        tools: List[Dict[str, Any]],
        temperature: float = 1,
    ) -> Any:
        """Tool calling via LangChain bind_tools, returned in OpenAI shape."""
        try:
            bound = self.llm.bind_tools(
                [openai_tool_schema(t) for t in tools],
                temperature=temperature,
            )
            ai_message = await bound.ainvoke(to_langchain_messages(messages))
            return wrap_ai_message(ai_message)
        except Exception as e:
            raise Exception(f"Function calling failed: {str(e)}")
