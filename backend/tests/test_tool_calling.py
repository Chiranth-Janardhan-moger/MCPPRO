"""Unit tests for the provider tool-calling adapter (no network)."""

import json

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage

from app.providers.tool_calling import (
    openai_tool_schema,
    to_langchain_messages,
    wrap_ai_message,
)


def _openai_conversation():
    return [
        {"role": "system", "content": "You are a helpful agent."},
        {"role": "user", "content": "What is the revenue?"},
        {
            "role": "assistant",
            "content": None,
            "tool_calls": [
                {
                    "id": "call_1",
                    "type": "function",
                    "function": {
                        "name": "retrieve_context",
                        "arguments": json.dumps({"questions": ["revenue"], "k": 5}),
                    },
                }
            ],
        },
        {
            "role": "tool",
            "content": "Revenue was 4.2B",
            "tool_call_id": "call_1",
        },
    ]


class TestToLangchainMessages:
    def test_converts_all_roles(self):
        msgs = to_langchain_messages(_openai_conversation())
        assert isinstance(msgs[0], SystemMessage)
        assert isinstance(msgs[1], HumanMessage)
        assert isinstance(msgs[2], AIMessage)
        assert isinstance(msgs[3], ToolMessage)

    def test_assistant_tool_calls_are_parsed(self):
        msgs = to_langchain_messages(_openai_conversation())
        ai = msgs[2]
        assert len(ai.tool_calls) == 1
        tc = ai.tool_calls[0]
        assert tc["name"] == "retrieve_context"
        assert tc["args"] == {"questions": ["revenue"], "k": 5}
        assert tc["id"] == "call_1"

    def test_tool_message_keeps_call_id(self):
        msgs = to_langchain_messages(_openai_conversation())
        assert msgs[3].tool_call_id == "call_1"
        assert msgs[3].content == "Revenue was 4.2B"

    def test_malformed_tool_arguments_do_not_crash(self):
        messages = [
            {
                "role": "assistant",
                "content": "",
                "tool_calls": [
                    {
                        "id": "call_2",
                        "type": "function",
                        "function": {"name": "t", "arguments": "{not json"},
                    }
                ],
            }
        ]
        msgs = to_langchain_messages(messages)
        assert msgs[0].tool_calls[0]["args"] == {}


class TestWrapAiMessage:
    def test_wraps_tool_calls_in_openai_shape(self):
        ai = AIMessage(
            content="",
            tool_calls=[
                {"name": "retrieve_context", "args": {"k": 3}, "id": "call_9", "type": "tool_call"}
            ],
        )
        wrapped = wrap_ai_message(ai)
        msg = wrapped.choices[0].message
        assert msg.tool_calls is not None
        tc = msg.tool_calls[0]
        assert tc.id == "call_9"
        assert tc.function.name == "retrieve_context"
        assert json.loads(tc.function.arguments) == {"k": 3}

    def test_plain_answer_has_no_tool_calls(self):
        wrapped = wrap_ai_message(AIMessage(content="42"))
        msg = wrapped.choices[0].message
        assert msg.content == "42"
        assert msg.tool_calls is None


class TestOpenAIToolSchema:
    def test_normalizes_registry_format(self):
        schema = openai_tool_schema(
            {
                "name": "retrieve_context",
                "description": "Retrieve chunks",
                "parameters": {"type": "object", "properties": {}},
            }
        )
        assert schema["type"] == "function"
        assert schema["function"]["name"] == "retrieve_context"

    def test_passes_through_openai_format(self):
        original = {"type": "function", "function": {"name": "x", "parameters": {}}}
        assert openai_tool_schema(original) == original
