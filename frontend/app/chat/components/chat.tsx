"use client";

import { useChat } from '@ai-sdk/react'; // Update import to support RSC and handle streamed UI components
import { Messages } from "./messages";
import { MultimodalInput } from "./multimodal-input";
import { ChatHeader } from "./chat-header";
import { Message } from "ai";
import { saveMessages } from "../actions";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { MODEL_CATALOG } from "@/lib/ai/models";
import { getUserApiKeys } from "@/components/global/api-keys-dialog";

interface ChatProps {
  id: string;
  initialMessages?: Message[];
}

interface ApiModelsResponse {
  defaultModel: string | null;
  models: {
    id: string;
    label: string;
    provider?: string;
    freeTier?: boolean;
    inputPricePerMTok?: number;
    outputPricePerMTok?: number;
  }[];
}

/** Static fallback derived from the curated catalog (client-safe). */
function staticUiModels() {
  return MODEL_CATALOG.map((m) => ({
    value: m.id,
    label: m.label,
    provider: m.provider,
    freeTier: m.freeTier,
    inputPricePerMTok: m.inputPricePerMTok,
    outputPricePerMTok: m.outputPricePerMTok,
  }));
}

export function Chat({ id, initialMessages = [] }: ChatProps) {
  const { data: modelsData } = useQuery<ApiModelsResponse>({
    queryKey: ['models'],
    queryFn: async () => {
      const res = await fetch('/api/models');
      if (!res.ok) throw new Error('failed to load models');
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const uiModels = useMemo(
    () =>
      modelsData?.models?.length
        ? modelsData.models.map((m) => ({
            value: m.id,
            label: m.label,
            provider: (m as { provider?: string }).provider,
            freeTier: m.freeTier,
            inputPricePerMTok: m.inputPricePerMTok,
            outputPricePerMTok: m.outputPricePerMTok,
          }))
        : staticUiModels(),
    [modelsData]
  );

  const [selectedModel, setSelectedModel] = useState<string>('');
  const activeModel = selectedModel || modelsData?.defaultModel || uiModels[0]?.value || 'gemini-2.5-flash';

  const { messages, input, setInput, handleInputChange, handleSubmit, status, data, append } = useChat({
    initialMessages,
    api: '/api/chat',
    onFinish: async (message) => {
      // Save the completed assistant message
      if (message.role === 'assistant') {
        await saveMessages([message], id);
      }
    },
    onError: async (error) => {
      console.error("Error fetching response:", error);
    },
    experimental_prepareRequestBody: (body) => {
      const customApiKeys = typeof window !== 'undefined' ? getUserApiKeys() : {};
      return {
        ...body,
        selectedModel: activeModel,
        customApiKeys,
      };
    },
  });

  // Custom submit handler to make chat feel snappy
  const customHandleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const content = input.trim();
    if (!content) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
    };

    // Append message to UI and send to API with active model and custom API keys
    append(userMessage, {
      body: {
        selectedModel: activeModel,
        customApiKeys: typeof window !== 'undefined' ? getUserApiKeys() : {},
      },
    });

    // Clear input
    setInput('');

    // Save message to DB in background
    saveMessages([userMessage], id);
  };

  return (
    <div className="relative flex-1 flex flex-col h-full bg-gradient-to-br from-blue-50/60 via-white to-sky-50/50 dark:from-zinc-950 dark:via-zinc-900 dark:to-blue-950/20">
      <ChatHeader chatId={id} />
      <div className="flex-1 overflow-auto">
        <Messages
          isLoading={status === 'submitted' || status === 'streaming'}
          messages={messages}
        />
      </div>
      <div className="sticky bottom-0 bg-gradient-to-t from-white via-white/90 to-transparent dark:from-zinc-950 dark:via-zinc-950/90 pt-4">
        <div className="mx-auto max-w-3xl px-4 pb-4">
          <MultimodalInput
            chatId={id}
            messages={messages}
            append={append}
            value={input}
            onChange={handleInputChange}
            handleSubmit={customHandleSubmit}
            isLoading={status === 'submitted'}
            models={uiModels}
            modelState={{
              selectedModel: activeModel,
              setSelectedModel,
            }}
          />
        </div>
      </div>
    </div>
  );
}
