import json
import asyncio
import logging
from typing import List, Dict, Any

from app.tools.registry import tool_registry
from app.providers.factory import LLMProviderFactory
from app.providers.tool_calling import content_to_text
from app.config.settings import settings
from app.prompts.worker_agent_prompt import WORKER_AGENT_PROMPT
from app.prompts.output_parser_prompt import OUTPUT_PARSER_PROMPT

logger = logging.getLogger(__name__)


class WorkerMCPPro:
    def __init__(self):
        self.llm_provider = LLMProviderFactory.create_provider(
            settings.DEFAULT_LLM_PROVIDER, settings
        )
        self.max_iterations = settings.AGENT_MAX_ITERATIONS

    @staticmethod
    def _safe_json_loads(raw: str) -> Dict[str, Any]:
        """Parse tool-call arguments defensively; malformed JSON yields {}."""
        if not raw:
            return {}
        try:
            parsed = json.loads(raw)
            return parsed if isinstance(parsed, dict) else {"value": parsed}
        except Exception:
            return {}

    async def _parse_output(self, question: str, draft_answer: str) -> str:
        """Post-process the raw LLM answer so that it strictly follows the
        answer-format rules defined in `OutputParserPrompt`.
        """
        try:
            llm = self.llm_provider.get_langchain_llm()
            parser_prompt = OUTPUT_PARSER_PROMPT
            prompt = parser_prompt.format(question=question, draft_answer=draft_answer)
            cleaned = await asyncio.to_thread(lambda: content_to_text(llm.invoke(prompt).content))
            return cleaned.strip()
        except Exception:
            return draft_answer.strip()

    async def answer_question(
        self,
        question: str,
        k: int = 10,
        document_id: str = "",
    ) -> tuple[str, List[Dict[str, Any]]]:
        """Answer a single question.

        Returns tuple of (answer, tool_call_log)."""

        system_prompt = WORKER_AGENT_PROMPT

        conversation: List[Dict[str, Any]] = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": question},
        ]

        available_tools = [t for t in tool_registry.get_tools_for_llm() if t["name"] in ("retrieve_context", "url_request")]

        tool_call_log: List[Dict[str, Any]] = []

        for iteration in range(self.max_iterations):
            temp = settings.AGENT_TEMPERATURE

            logger.info("Iteration %d: Sending conversation to LLM...", iteration + 1)
            response = await self.llm_provider.chat_completion_with_tools(
                messages=conversation, tools=available_tools, temperature=temp
            )
            msg = response.choices[0].message
            logger.info("LLM response received. Tool calls: %d", len(msg.tool_calls) if msg.tool_calls else 0)

            if msg.tool_calls:
                assistant_entry = {
                    "role": "assistant",
                    "content": msg.content,
                    "tool_calls": [
                        {
                            "id": tc.id,
                            "type": tc.type,
                            "function": {
                                "name": tc.function.name,
                                "arguments": tc.function.arguments,
                            },
                        }
                        for tc in msg.tool_calls
                    ],
                }
                conversation.append(assistant_entry)

                logger.info("Executing %d tools in parallel...", len(msg.tool_calls))
                
                tool_tasks = []
                tool_call_ids = []
                
                for tc in msg.tool_calls:
                    tool_name = tc.function.name
                    tool_args = self._safe_json_loads(tc.function.arguments)

                    if tool_name == "retrieve_context":
                        tool_args.setdefault("k", k)
                        if document_id:
                            # Server-side scoping: the LLM never supplies this.
                            tool_args["document_id"] = document_id

                    logger.debug("Preparing tool '%s' with args: %s", tool_name, tool_args)
                    
                    task = tool_registry.execute_tool(tool_name, **tool_args)
                    tool_tasks.append(task)
                    tool_call_ids.append(tc.id)
                
                tool_results = await asyncio.gather(*tool_tasks, return_exceptions=True)
                
                for i, (tc, tool_result) in enumerate(zip(msg.tool_calls, tool_results)):
                    tool_name = tc.function.name
                    
                    if isinstance(tool_result, Exception):
                        logger.warning("Tool '%s' failed: %s", tool_name, tool_result)
                        tool_call_log.append({
                            "tool": tool_name,
                            "arguments": self._safe_json_loads(tc.function.arguments),
                            "result": {"success": False, "error": str(tool_result)}
                        })
                        tool_content = f"Tool '{tool_name}' error: {str(tool_result)}"
                    else:
                        logger.debug("Tool '%s' success=%s", tool_name, tool_result.success)
                        tool_call_log.append({
                            "tool": tool_name,
                            "arguments": self._safe_json_loads(tc.function.arguments),
                            "result": tool_result.model_dump(),
                        })
                        tool_content = (
                            f"Tool '{tool_name}' result: {tool_result.result}"
                            if tool_result.success
                            else f"Tool '{tool_name}' error: {tool_result.error}"
                        )
                    
                    conversation.append({
                        "role": "tool",
                        "content": tool_content,
                        "tool_call_id": tc.id,
                    })
                
                logger.info("Completed %d tools in parallel", len(msg.tool_calls))
                continue
            else:
                logger.info("Final answer received from LLM")
                cleaned_answer = await self._parse_output(question, content_to_text(msg.content) or "")
                return cleaned_answer or "No answer", tool_call_log

        logger.warning("Max iterations reached without final answer")
        return "Max iterations reached", tool_call_log
