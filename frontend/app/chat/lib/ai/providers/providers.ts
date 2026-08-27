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

function getClientForProvider(provider: ProviderId, customKey?: string, systemKeys?: Record<string, string>) {
  const effectiveKey =
    customKey ||
    systemKeys?.[provider] ||
    (provider === 'google' ? systemKeys?.gemini : undefined);

  switch (provider) {
    case 'openai':
      return createOpenAI({
        apiKey: effectiveKey || process.env.OPENAI_API_KEY,
        compatibility: 'strict',
      });
    case 'google':
      return createGoogleGenerativeAI({
        apiKey:
          effectiveKey ||
          process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
          process.env.GEMINI_API_KEY,
      });
    case 'anthropic':
      return createAnthropic({
        apiKey: effectiveKey || process.env.ANTHROPIC_API_KEY,
      });
    case 'groq':
      return createGroq({
        apiKey: effectiveKey || process.env.GROQ_API_KEY,
      });
    case 'xai':
      return createXai({
        apiKey: effectiveKey || process.env.XAI_API_KEY,
      });
    case 'openrouter':
      return createOpenRouter({
        apiKey: effectiveKey || process.env.OPENROUTER_API_KEY,
      });
    default: {
      const never: never = provider;
      throw new Error(`Unknown provider: ${never}`);
    }
  }
}

function instantiate(info: ModelInfo, customKeys?: Record<string, string>, systemKeys?: Record<string, string>): LanguageModelV1 {
  const customKey = customKeys?.[info.provider];
  const client: any = getClientForProvider(info.provider, customKey, systemKeys);
  if (info.provider === 'openrouter') {
    return (typeof client === 'function' ? client(info.id) : client.chat(info.id)) as unknown as LanguageModelV1;
  }
  return client(info.id);
}

export function getLanguageModel(
  modelId?: string | null,
  customKeys?: Record<string, string>,
  systemKeys?: Record<string, string>
): LanguageModelV1 {
  const context = getRequestContext();
  const cKeys = customKeys || context.customApiKeys;
  const sKeys = systemKeys || context.systemApiKeys;
  return instantiate(resolveModel(modelId), cKeys, sKeys);
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
