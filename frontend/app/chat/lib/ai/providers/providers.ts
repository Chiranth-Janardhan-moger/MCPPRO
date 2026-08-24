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

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  compatibility: 'strict',
});

const google = createGoogleGenerativeAI({
  apiKey:
    process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY,
});

const xai = createXai({ apiKey: process.env.XAI_API_KEY });

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

function instantiate(info: ModelInfo): LanguageModelV1 {
  switch (info.provider) {
    case 'openai':
      return openai(info.id);
    case 'google':
      return google(info.id);
    case 'anthropic':
      return anthropic(info.id);
    case 'groq':
      return groq(info.id);
    case 'xai':
      return xai(info.id);
    case 'openrouter':
      return openrouter.chat(info.id) as unknown as LanguageModelV1;
    default: {
      const never: never = info.provider;
      throw new Error(`Unknown provider: ${never}`);
    }
  }
}

/**
 * Resolve a model id (or undefined for the default) to a live AI SDK
 * language model instance. Unknown ids route through OpenRouter when it is
 * configured, otherwise fall back to the curated default.
 */
export function getLanguageModel(modelId?: string | null): LanguageModelV1 {
  return instantiate(resolveModel(modelId));
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
