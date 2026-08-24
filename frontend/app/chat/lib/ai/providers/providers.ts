import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createXai } from '@ai-sdk/xai';
import { createGroq } from '@ai-sdk/groq';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import type { LanguageModelV1 } from 'ai';
import {
  MODEL_CATALOG,
  availableModels,
  getProviderApiKey,
  resolveModel,
  type ModelInfo,
  type ProviderId,
} from '@/lib/ai/models';

import { getRequestContext } from '@/lib/request-context';

function getClientForProvider(provider: ProviderId, customKey?: string) {
  switch (provider) {
    case 'openai':
      return createOpenAI({
        apiKey: customKey || process.env.OPENAI_API_KEY,
        compatibility: 'strict',
      });
    case 'google':
      return createGoogleGenerativeAI({
        apiKey:
          customKey ||
          process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
          process.env.GEMINI_API_KEY,
      });
    case 'anthropic':
      return createAnthropic({
        apiKey: customKey || process.env.ANTHROPIC_API_KEY,
      });
    case 'groq':
      return createGroq({
        apiKey: customKey || process.env.GROQ_API_KEY,
      });
    case 'xai':
      return createXai({
        apiKey: customKey || process.env.XAI_API_KEY,
      });
    case 'openrouter':
      return createOpenRouter({
        apiKey: customKey || process.env.OPENROUTER_API_KEY,
      });
    default: {
      const never: never = provider;
      throw new Error(`Unknown provider: ${never}`);
    }
  }
}

function instantiate(info: ModelInfo, customKeys?: Record<string, string>): LanguageModelV1 {
  const customKey = customKeys?.[info.provider];
  const client = getClientForProvider(info.provider, customKey);
  if (info.provider === 'openrouter') {
    return (client as ReturnType<typeof createOpenRouter>).chat(info.id) as unknown as LanguageModelV1;
  }
  return (client as any)(info.id);
}

/**
 * Resolve a model id (or undefined for the default) to a live AI SDK
 * language model instance. Unknown ids route through OpenRouter when it is
 * configured, otherwise fall back to the curated default.
 */
export function getLanguageModel(modelId?: string | null): LanguageModelV1 {
  const context = getRequestContext();
  return instantiate(resolveModel(modelId), context.customApiKeys);
}

/** UI-facing list: `{value,label}[]` filtered to configured providers. */
export function listUiModels(): { value: string; label: string }[] {
  return availableModels().map((m) => ({ value: m.id, label: m.label }));
}

/** Static catalog for build-time/SSR consumers (metadata only). */
export function catalogModels(): ModelInfo[] {
  return MODEL_CATALOG;
}

export type { ProviderId };
export { getProviderApiKey };

/**
 * Back-compat export used by older call sites (`myProvider.languageModel(id)`).
 * Prefer `getLanguageModel` in new code.
 */
export const myProvider = {
  languageModel(modelId?: string): LanguageModelV1 {
    return getLanguageModel(modelId);
  },
};
