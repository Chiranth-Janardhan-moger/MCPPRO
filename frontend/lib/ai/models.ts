export type ProviderId =
  | 'openai'
  | 'google'
  | 'anthropic'
  | 'groq'
  | 'xai'
  | 'openrouter';

export interface ModelCapabilities {
  tools: boolean;
  vision: boolean;
  reasoning: boolean;
  streaming: boolean;
}

export interface ModelInfo {
  id: string;
  label: string;
  provider: ProviderId;
  description?: string;
  contextWindow?: number;
  maxOutputTokens?: number;
  /** USD per 1M input tokens */
  inputPricePerMTok?: number;
  /** USD per 1M output tokens */
  outputPricePerMTok?: number;
  /** Has a free tier or is free on OpenRouter */
  freeTier?: boolean;
  capabilities: ModelCapabilities;
}

const TOOLS_STREAM: ModelCapabilities = {
  tools: true,
  vision: true,
  reasoning: false,
  streaming: true,
};

const FULL: ModelCapabilities = {
  tools: true,
  vision: true,
  reasoning: true,
  streaming: true,
};

/**
 * Curated catalog of well-known models. This is the fallback/source of
 * metadata; `/api/models` merges live provider listings into it at runtime.
 * IDs must match what each provider SDK accepts.
 */
export const MODEL_CATALOG: ModelInfo[] = [
  // ---------- Google Gemini ----------
  {
    id: 'gemini-3.7-flash',
    label: 'Gemini 3.7 Flash',
    provider: 'google',
    description: 'Latest Flash: complex coding + agentic workflows',
    contextWindow: 1_048_576,
    maxOutputTokens: 65_536,
    inputPricePerMTok: 0.35,
    outputPricePerMTok: 2.1,
    freeTier: true,
    capabilities: FULL,
  },
  {
    id: 'gemini-3.6-flash',
    label: 'Gemini 3.6 Flash',
    provider: 'google',
    description: 'Fast multimodal workhorse with a free tier',
    contextWindow: 1_048_576,
    maxOutputTokens: 65_536,
    inputPricePerMTok: 0.35,
    outputPricePerMTok: 2.1,
    freeTier: true,
    capabilities: FULL,
  },
  {
    id: 'gemini-3.5-flash-lite',
    label: 'Gemini 3.5 Flash-Lite',
    provider: 'google',
    description: 'Cheapest fast Gemini; high-throughput tasks',
    contextWindow: 1_048_576,
    inputPricePerMTok: 0.25,
    outputPricePerMTok: 1.5,
    freeTier: true,
    capabilities: TOOLS_STREAM,
  },
  {
    id: 'gemini-3.1-pro-preview',
    label: 'Gemini 3.1 Pro',
    provider: 'google',
    description: 'Frontier reasoning; complex agentic planning',
    contextWindow: 1_048_576,
    maxOutputTokens: 65_536,
    inputPricePerMTok: 2,
    outputPricePerMTok: 12,
    capabilities: FULL,
  },
  {
    id: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    provider: 'google',
    description: 'Previous-gen balanced model (stable)',
    contextWindow: 1_048_576,
    maxOutputTokens: 65_536,
    inputPricePerMTok: 0.3,
    outputPricePerMTok: 2.5,
    freeTier: true,
    capabilities: FULL,
  },
  {
    id: 'gemini-2.5-pro',
    label: 'Gemini 2.5 Pro',
    provider: 'google',
    description: 'Previous-gen pro reasoning model (stable)',
    contextWindow: 1_048_576,
    maxOutputTokens: 65_536,
    inputPricePerMTok: 1.25,
    outputPricePerMTok: 10,
    freeTier: true,
    capabilities: FULL,
  },

  // ---------- OpenAI ----------
  {
    id: 'gpt-5',
    label: 'GPT-5',
    provider: 'openai',
    description: 'Flagship OpenAI model with reasoning modes',
    contextWindow: 400_000,
    maxOutputTokens: 128_000,
    inputPricePerMTok: 1.25,
    outputPricePerMTok: 10,
    capabilities: FULL,
  },
  {
    id: 'gpt-5-mini',
    label: 'GPT-5 mini',
    provider: 'openai',
    description: 'Faster, cheaper GPT-5 variant',
    contextWindow: 400_000,
    maxOutputTokens: 128_000,
    inputPricePerMTok: 0.25,
    outputPricePerMTok: 2,
    capabilities: FULL,
  },
  {
    id: 'gpt-4.1',
    label: 'GPT-4.1',
    provider: 'openai',
    description: 'Long-context general model',
    contextWindow: 1_047_576,
    maxOutputTokens: 32_768,
    inputPricePerMTok: 2,
    outputPricePerMTok: 8,
    capabilities: TOOLS_STREAM,
  },
  {
    id: 'gpt-4.1-mini',
    label: 'GPT-4.1 mini',
    provider: 'openai',
    description: 'Affordable long-context workhorse',
    contextWindow: 1_047_576,
    maxOutputTokens: 32_768,
    inputPricePerMTok: 0.4,
    outputPricePerMTok: 1.6,
    capabilities: TOOLS_STREAM,
  },
  {
    id: 'gpt-4o',
    label: 'GPT-4o',
    provider: 'openai',
    description: 'Reliable multimodal classic',
    contextWindow: 128_000,
    maxOutputTokens: 16_384,
    inputPricePerMTok: 2.5,
    outputPricePerMTok: 10,
    capabilities: TOOLS_STREAM,
  },
  {
    id: 'gpt-4o-mini',
    label: 'GPT-4o mini',
    provider: 'openai',
    description: 'Cheap default for utility calls',
    contextWindow: 128_000,
    maxOutputTokens: 16_384,
    inputPricePerMTok: 0.15,
    outputPricePerMTok: 0.6,
    capabilities: TOOLS_STREAM,
  },
  {
    id: 'o4-mini',
    label: 'o4-mini',
    provider: 'openai',
    description: 'Compact reasoning model',
    contextWindow: 200_000,
    maxOutputTokens: 100_000,
    inputPricePerMTok: 1.1,
    outputPricePerMTok: 4.4,
    capabilities: { ...FULL, vision: true },
  },

  // ---------- Anthropic (verified Aug 2026 lineup) ----------
  {
    id: 'claude-sonnet-5',
    label: 'Claude Sonnet 5',
    provider: 'anthropic',
    description:
      'Production default; near-Opus quality. Intro $2/$10 through Aug 31, 2026',
    contextWindow: 1_000_000,
    maxOutputTokens: 128_000,
    inputPricePerMTok: 3,
    outputPricePerMTok: 15,
    capabilities: FULL,
  },
  {
    id: 'claude-opus-4-8',
    label: 'Claude Opus 4.8',
    provider: 'anthropic',
    description: 'Highest Opus tier for complex reasoning and agentic runs',
    contextWindow: 200_000,
    maxOutputTokens: 128_000,
    inputPricePerMTok: 5,
    outputPricePerMTok: 25,
    capabilities: FULL,
  },
  {
    id: 'claude-fable-5',
    label: 'Claude Fable 5',
    provider: 'anthropic',
    description: 'Frontier Mythos tier — most capable Claude',
    contextWindow: 1_000_000,
    maxOutputTokens: 128_000,
    inputPricePerMTok: 5,
    outputPricePerMTok: 25,
    capabilities: FULL,
  },
  {
    id: 'claude-haiku-4-5',
    label: 'Claude Haiku 4.5',
    provider: 'anthropic',
    description: 'Fastest tier for high-volume, latency-sensitive tasks',
    contextWindow: 200_000,
    maxOutputTokens: 64_000,
    inputPricePerMTok: 1,
    outputPricePerMTok: 5,
    capabilities: FULL,
  },

  // ---------- Groq (fast open models) ----------
  {
    id: 'llama-3.3-70b-versatile',
    label: 'Llama 3.3 70B (Groq)',
    provider: 'groq',
    description: 'Ultra-fast Llama on Groq LPU',
    contextWindow: 131_072,
    maxOutputTokens: 32_768,
    inputPricePerMTok: 0.59,
    outputPricePerMTok: 0.79,
    freeTier: true,
    capabilities: TOOLS_STREAM,
  },
  {
    id: 'openai/gpt-oss-120b',
    label: 'GPT-OSS 120B (Groq)',
    provider: 'groq',
    description: 'Open-weight reasoning model, very fast',
    contextWindow: 131_072,
    inputPricePerMTok: 0.15,
    outputPricePerMTok: 0.75,
    freeTier: true,
    capabilities: FULL,
  },
  {
    id: 'meta-llama/llama-4-maverick-17b-128e-instruct',
    label: 'Llama 4 Maverick (Groq)',
    provider: 'groq',
    description: 'Llama 4 MoE on Groq',
    contextWindow: 131_072,
    capabilities: TOOLS_STREAM,
  },

  // ---------- xAI (verified Aug 2026 lineup; grok-4/3 retired) ----------
  {
    id: 'grok-4.6',
    label: 'Grok 4.6',
    provider: 'xai',
    description: 'xAI flagship — best for long-running agents',
    contextWindow: 500_000,
    inputPricePerMTok: 2,
    outputPricePerMTok: 6,
    capabilities: FULL,
  },
  {
    id: 'grok-4.5',
    label: 'Grok 4.5',
    provider: 'xai',
    description: 'Frontier tier, 500K context',
    contextWindow: 500_000,
    inputPricePerMTok: 2,
    outputPricePerMTok: 6,
    capabilities: FULL,
  },
  {
    id: 'grok-4.3',
    label: 'Grok 4.3',
    provider: 'xai',
    description: 'Primary chat/coding model, 1M context, best value',
    contextWindow: 1_000_000,
    maxOutputTokens: 64_000,
    inputPricePerMTok: 1.25,
    outputPricePerMTok: 2.5,
    capabilities: FULL,
  },
  {
    id: 'grok-code-fast-1',
    label: 'Grok Code Fast',
    provider: 'xai',
    description: 'Fast agentic coding at the lowest xAI price',
    contextWindow: 256_000,
    maxOutputTokens: 32_000,
    inputPricePerMTok: 1,
    outputPricePerMTok: 2,
    capabilities: FULL,
  },

  // ---------- OpenRouter (free highlights) ----------
  {
    id: 'deepseek/deep-chat-v1:free',
    label: 'DeepSeek V3 (free)',
    provider: 'openrouter',
    description: 'Free tier community model via OpenRouter',
    freeTier: true,
    capabilities: TOOLS_STREAM,
  },
  {
    id: 'meta-llama/llama-3.3-70b-instruct:free',
    label: 'Llama 3.3 70B (free)',
    provider: 'openrouter',
    description: 'Free Llama 3.3 via OpenRouter',
    freeTier: true,
    capabilities: TOOLS_STREAM,
  },
];

export const DEFAULT_MODEL_ID = 'gemini-3.6-flash';

/** Env var name holding each provider's API key. */
export const PROVIDER_KEY_ENV: Record<ProviderId, string> = {
  openai: 'OPENAI_API_KEY',
  google: 'GOOGLE_GENERATIVE_AI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  groq: 'GROQ_API_KEY',
  xai: 'XAI_API_KEY',
  openrouter: 'OPENROUTER_API_KEY',
};

export function getProviderApiKey(provider: ProviderId): string | undefined {
  const key = process.env[PROVIDER_KEY_ENV[provider]];
  return key && !key.startsWith('dummy') ? key : undefined;
}

export function isProviderConfigured(provider: ProviderId): boolean {
  return Boolean(getProviderApiKey(provider));
}

export function getModelInfo(id: string): ModelInfo | undefined {
  return MODEL_CATALOG.find((m) => m.id === id);
}

/** Curated models from configured providers only, default first. */
export function availableModels(): ModelInfo[] {
  const configured = MODEL_CATALOG.filter((m) =>
    isProviderConfigured(m.provider)
  );
  if (configured.length === 0) return MODEL_CATALOG;
  const sorted = [...configured].sort(
    (a, b) => Number(b.freeTier ?? false) - Number(a.freeTier ?? false)
  );
  if (!sorted.some((m) => m.id === DEFAULT_MODEL_ID)) return sorted;
  return sorted.sort((a, b) =>
    a.id === DEFAULT_MODEL_ID ? -1 : b.id === DEFAULT_MODEL_ID ? 1 : 0
  );
}

/** Resolve any requested id to a usable ModelInfo, falling back sensibly. */
export function resolveModel(requested?: string | null): ModelInfo {
  if (requested) {
    const info = getModelInfo(requested);
    if (info && isProviderConfigured(info.provider)) return info;
    // Unknown ids are allowed through for providers that accept dynamic ids
    // (OpenRouter hosts hundreds); route by prefix when possible.
    if (info) return info;
    if (
      requested.includes('/') &&
      isProviderConfigured('openrouter')
    ) {
      return {
        id: requested,
        label: requested,
        provider: 'openrouter',
        capabilities: TOOLS_STREAM,
      };
    }
  }
  const fallback =
    getModelInfo(DEFAULT_MODEL_ID) &&
    isProviderConfigured('google')
      ? getModelInfo(DEFAULT_MODEL_ID)!
      : availableModels()[0] ?? getModelInfo('gpt-4o-mini')!;
  return fallback;
}
