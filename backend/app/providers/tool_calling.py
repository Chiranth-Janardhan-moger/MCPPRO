"""Shared helpers that give every LangChain chat provider uniform
OpenAI-style tool calling.

The agent loop (`worker_mcppro_agent`) speaks the OpenAI wire format:
messages are OpenAI dicts and responses expose ``choices[0].message``.
LangChain chat models natively return ``AIMessage`` objects. This module
converts between the two shapes so any provider with ``bind_tools`` support
(Gemini, Anthropic, Groq, ...) can drive the same agent loop.
"""

from __future__ import annotations

import json
from types import SimpleNamespace
from typing import Any, Dict, List

from langchain_core.messages import (
    AIMessage,
    HumanMessage,
    SystemMessage,
    ToolMessage,
)


def content_to_text(content: Any) -> str:
    """Normalize LangChain message content to plain text.

    Newer provider integrations return content as a list of typed parts
    (e.g. ``[{"type": "text", "text": "..."}]``); older ones return str.
    """
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for part in content:
            if isinstance(part, dict):
                if part.get("type") == "text" or "text" in part:
                    parts.append(str(part.get("text", "")))
                else:
                    parts.append(json.dumps(part))
            else:
                parts.append(str(part))
        return "".join(parts)
    return str(content)


def to_langchain_messages(messages: List[Dict[str, Any]]):
    """Convert OpenAI-format message dicts into LangChain messages."""
    lc_messages = []
    for msg in messages:
        role = msg.get("role")
        content = msg.get("content")

        if role == "system":
            lc_messages.append(SystemMessage(content=content or ""))
        elif role == "user":
            lc_messages.append(HumanMessage(content=content or ""))
        elif role == "assistant":
            tool_calls = []
            for tc in msg.get("tool_calls") or []:
                function = tc.get("function", {})
                try:
                    args = json.loads(function.get("arguments") or "{}")
                except Exception:
                    args = {}
                tool_calls.append(
                    {
                        "name": function.get("name", ""),
                        "args": args,
                        "id": tc.get("id"),
                        "type": "tool_call",
                    }
                )
            if tool_calls:
                lc_messages.append(
                    AIMessage(content=content or "", tool_calls=tool_calls)
                )
            else:
                lc_messages.append(AIMessage(content=content or ""))
        elif role == "tool":
            lc_messages.append(
                ToolMessage(
                    content=content or "",
                    tool_call_id=msg.get("tool_call_id", ""),
                )
            )
    return lc_messages


def openai_tool_schema(tool: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize a registry tool definition into an OpenAI function schema."""
    if "function" in tool and isinstance(tool["function"], dict):
        return {"type": "function", "function": tool["function"]}
    return {
        "type": "function",
        "function": {
            "name": tool["name"],
            "description": tool.get("description", ""),
            "parameters": tool.get("parameters", {"type": "object", "properties": {}}),
        },
    }


def wrap_ai_message(ai_message: AIMessage) -> SimpleNamespace:
    """Wrap a LangChain AIMessage in the OpenAI response shape the agent
    loop expects (``response.choices[0].message.tool_calls``)."""
    tool_calls = []
    for idx, tc in enumerate(getattr(ai_message, "tool_calls", None) or []):
        tool_calls.append(
            SimpleNamespace(
                id=tc.get("id") or f"call_{idx}",
                type="function",
                function=SimpleNamespace(
                    name=tc.get("name", ""),
                    arguments=json.dumps(tc.get("args", {})),
                ),
            )
        )

    message = SimpleNamespace(
        content=content_to_text(ai_message.content),
        tool_calls=tool_calls or None,
    )
    return SimpleNamespace(choices=[SimpleNamespace(message=message)])
