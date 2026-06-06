from app.providers.base import BaseLLMProvider
from app.prompts.traditional_rag_prompt import TraditionalRagPrompt
from langchain_anthropic import ChatAnthropic
from typing import Dict, Any
import json

class AnthropicProvider(BaseLLMProvider):
    def __init__(self, api_key: str, model: str = "claude-3-7-sonnet-20250219"):
        self.api_key = api_key
        self.model = model
        self.llm = ChatAnthropic(
            anthropic_api_key=api_key,
            model_name=model,
            temperature=0.1
        )
    
    async def generate_answer(self, context: str, question: str) -> str:
        prompt_template = TraditionalRagPrompt.get_traditional_rag_prompt()
        prompt = prompt_template.format(context=context, question=question)
        
        try:
            response = await self.llm.ainvoke(prompt)
            return response.content
        except Exception as e:
            return f"Error generating answer: {str(e)}"
    
    async def extract_structured_query(self, query: str) -> Dict:
        prompt = f"""
        Extract structured information from this query: "{query}"
        
        Return a JSON object with:
        - intent: main intent (search, information, comparison, etc.)
        - entities: key entities mentioned
        - keywords: important keywords for search
        - question_type: type of question (factual, conditional, temporal, etc.)
        
        Query: {query}
        
        JSON:
        """
        
        try:
            response = await self.llm.ainvoke(prompt)
            # Find the JSON block in case there's markdown wrapping
            content = response.content
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            return json.loads(content)
        except:
            return {
                "intent": "search",
                "entities": [],
                "keywords": [query],
                "question_type": "factual"
            }
    
    def get_langchain_llm(self) -> Any:
        return self.llm
    
    @property
    def provider_name(self) -> str:
        return "anthropic"
