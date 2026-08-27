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
  // ---------- Anthropic Claude ----------
  {
    id: 'claude-3-7-sonnet-20250219',
    label: 'Claude 3.7 Sonnet',
    provider: 'anthropic',
    description: 'Hybrid reasoning and instant response frontier model',
    contextWindow: 200_000,
    maxOutputTokens: 64_000,
    inputPricePerMTok: 3,
    outputPricePerMTok: 15,
    capabilities: FULL,
  },
  {
    id: 'claude-3-5-sonnet-20241022',
    label: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    description: 'Industry standard for coding, analysis, and multimodal reasoning',
    contextWindow: 200_000,
    maxOutputTokens: 8_192,
    inputPricePerMTok: 3,
    outputPricePerMTok: 15,
    capabilities: FULL,
  },
  {
    id: 'claude-3-5-haiku-20241022',
    label: 'Claude 3.5 Haiku',
    provider: 'anthropic',
    description: 'Ultra-fast, high-capability intelligence at low cost',
    contextWindow: 200_000,
    maxOutputTokens: 8_192,
    inputPricePerMTok: 0.8,
    outputPricePerMTok: 4,
    capabilities: FULL,
  },
  {
    id: 'claude-3-opus-20240229',
    label: 'Claude 3 Opus',
    provider: 'anthropic',
    description: 'Deep complex reasoning and nuanced analysis',
    contextWindow: 200_000,
    maxOutputTokens: 4_096,
    inputPricePerMTok: 15,
    outputPricePerMTok: 75,
    capabilities: FULL,
  },
  {
    id: 'claude-sonnet-5',
    label: 'Claude Sonnet 5',
    provider: 'anthropic',
    description: 'Next-generation reasoning and agentic workflows',
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

  // ---------- OpenAI ----------
  {
    id: 'gpt-4o',
    label: 'GPT-4o',
    provider: 'openai',
    description: 'High-intelligence flagship multimodal model',
    contextWindow: 128_000,
    maxOutputTokens: 16_384,
    inputPricePerMTok: 2.5,
    outputPricePerMTok: 10,
    capabilities: FULL,
  },
  {
    id: 'gpt-4o-mini',
    label: 'GPT-4o mini',
    provider: 'openai',
    description: 'Fast, lightweight, and cost-efficient multimodal model',
    contextWindow: 128_000,
    maxOutputTokens: 16_384,
    inputPricePerMTok: 0.15,
    outputPricePerMTok: 0.6,
    capabilities: FULL,
  },
  {
    id: 'o3-mini',
    label: 'o3-mini',
    provider: 'openai',
    description: 'Advanced STEM and coding reasoning model',
    contextWindow: 200_000,
    maxOutputTokens: 100_000,
    inputPricePerMTok: 1.1,
    outputPricePerMTok: 4.4,
    capabilities: FULL,
  },
  {
    id: 'o1',
    label: 'o1',
    provider: 'openai',
    description: 'Full-scale reasoning model for complex thinking',
    contextWindow: 200_000,
    maxOutputTokens: 100_000,
    inputPricePerMTok: 15,
    outputPricePerMTok: 60,
    capabilities: FULL,
  },
  {
    id: 'o1-mini',
    label: 'o1-mini',
    provider: 'openai',
    description: 'Fast mathematical and code reasoning',
    contextWindow: 128_000,
    maxOutputTokens: 65_536,
    inputPricePerMTok: 1.1,
    outputPricePerMTok: 4.4,
    capabilities: FULL,
  },
  {
    id: 'gpt-4.5-preview',
    label: 'GPT-4.5 Preview',
    provider: 'openai',
    description: 'Largest knowledge base and highest nuance',
    contextWindow: 128_000,
    maxOutputTokens: 16_384,
    inputPricePerMTok: 75,
    outputPricePerMTok: 150,
    capabilities: FULL,
  },
  {
    id: 'gpt-4-turbo',
    label: 'GPT-4 Turbo',
    provider: 'openai',
    description: 'Reliable high-accuracy previous-gen flagship',
    contextWindow: 128_000,
    maxOutputTokens: 4_096,
    inputPricePerMTok: 10,
    outputPricePerMTok: 30,
    capabilities: TOOLS_STREAM,
  },

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
    description: 'Balanced multimodal model (stable)',
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
    description: 'Pro reasoning model (stable)',
    contextWindow: 1_048_576,
    maxOutputTokens: 65_536,
    inputPricePerMTok: 1.25,
    outputPricePerMTok: 10,
    freeTier: true,
    capabilities: FULL,
  },

  // ---------- Groq ----------
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
    id: 'llama-3.1-8b-instant',
    label: 'Llama 3.1 8B (Groq)',
    provider: 'groq',
    description: 'Sub-second lightweight inference',
    contextWindow: 131_072,
    maxOutputTokens: 8_192,
    inputPricePerMTok: 0.05,
    outputPricePerMTok: 0.08,
    freeTier: true,
    capabilities: TOOLS_STREAM,
  },
  {
    id: 'mixtral-8x7b-32768',
    label: 'Mixtral 8x7B (Groq)',
    provider: 'groq',
    description: 'MoE architecture with high throughput',
    contextWindow: 32_768,
    maxOutputTokens: 32_768,
    inputPricePerMTok: 0.24,
    outputPricePerMTok: 0.24,
    freeTier: true,
    capabilities: TOOLS_STREAM,
  },

  // ---------- xAI Grok ----------
  {
    id: 'grok-3',
    label: 'Grok 3',
    provider: 'xai',
    description: 'xAI flagship deep reasoning and STEM frontier model',
    contextWindow: 131_072,
    maxOutputTokens: 16_384,
    inputPricePerMTok: 3,
    outputPricePerMTok: 15,
    capabilities: FULL,
  },
  {
    id: 'grok-3-mini',
    label: 'Grok 3 Mini',
    provider: 'xai',
    description: 'High-speed reasoning model for coding and logic',
    contextWindow: 131_072,
    maxOutputTokens: 16_384,
    inputPricePerMTok: 0.8,
    outputPricePerMTok: 4,
    capabilities: FULL,
  },
  {
    id: 'grok-2-1212',
    label: 'Grok 2',
    provider: 'xai',
    description: 'xAI frontier model with real-time reasoning',
    contextWindow: 131_072,
    maxOutputTokens: 8_192,
    inputPricePerMTok: 2,
    outputPricePerMTok: 10,
    capabilities: FULL,
  },
  {
    id: 'grok-2-vision-1212',
    label: 'Grok 2 Vision',
    provider: 'xai',
    description: 'Multimodal vision and diagram reasoning',
    contextWindow: 32_768,
    maxOutputTokens: 8_192,
    inputPricePerMTok: 2,
    outputPricePerMTok: 10,
    capabilities: FULL,
  },
  {
    id: 'grok-beta',
    label: 'Grok Beta',
    provider: 'xai',
    description: 'Original high-throughput Grok model',
    contextWindow: 131_072,
    maxOutputTokens: 8_192,
    inputPricePerMTok: 5,
    outputPricePerMTok: 15,
    capabilities: FULL,
  },

  // ---------- Groq (Free Tier LPUs) ----------
  {
    id: 'deepseek-r1-distill-llama-70b',
    label: 'DeepSeek R1 Distill 70B (Groq)',
    provider: 'groq',
    description: 'Ultra-fast DeepSeek R1 reasoning on Groq LPU',
    contextWindow: 128_000,
    maxOutputTokens: 8_192,
    inputPricePerMTok: 0.59,
    outputPricePerMTok: 0.79,
    freeTier: true,
    capabilities: FULL,
  },

  // ---------- OpenRouter (Free & Paid) ----------
  {
    id: 'deepseek/deepseek-r1:free',
    label: 'DeepSeek R1 (free)',
    provider: 'openrouter',
    description: 'Open-weights reasoning model with full chain-of-thought',
    contextWindow: 64_000,
    freeTier: true,
    capabilities: FULL,
  },
  {
    id: 'deepseek/deepseek-chat:free',
    label: 'DeepSeek V3 (free)',
    provider: 'openrouter',
    description: 'High-capability 671B MoE model',
    contextWindow: 64_000,
    freeTier: true,
    capabilities: TOOLS_STREAM,
  },
  {
    id: 'meta-llama/llama-3.3-70b-instruct:free',
    label: 'Llama 3.3 70B (free)',
    provider: 'openrouter',
    description: 'Free tier Llama 3.3 on OpenRouter',
    contextWindow: 131_072,
    freeTier: true,
    capabilities: TOOLS_STREAM,
  },
  {
    id: 'meta-llama/llama-3.1-8b-instruct:free',
    label: 'Llama 3.1 8B (free)',
    provider: 'openrouter',
    description: 'Fast lightweight free Llama model',
    contextWindow: 131_072,
    freeTier: true,
    capabilities: TOOLS_STREAM,
  },
  {
    id: 'meta-llama/llama-3.3-70b-instruct',
    label: 'Llama 3.3 70B (OpenRouter)',
    provider: 'openrouter',
    description: 'High performance open-weights frontier model via OpenRouter',
    contextWindow: 128_000,
    freeTier: false,
    capabilities: FULL,
  },
  {
    id: 'meta-llama/llama-3.1-8b-instruct',
    label: 'Llama 3.1 8B (OpenRouter)',
    provider: 'openrouter',
    description: 'Ultra fast, efficient model via OpenRouter',
    contextWindow: 128_000,
    freeTier: false,
    capabilities: FULL,
  },
  {
    id: 'deepseek/deepseek-chat',
    label: 'DeepSeek V3 (OpenRouter)',
    provider: 'openrouter',
    description: 'DeepSeek V3 671B flagship model via OpenRouter',
    contextWindow: 64_000,
    freeTier: false,
    capabilities: FULL,
  },
  {
    id: 'qwen/qwen-2.5-72b-instruct:free',
    label: 'Qwen 2.5 72B (free)',
    provider: 'openrouter',
    description: 'Powerful multilingual & coding model',
    contextWindow: 32_768,
    freeTier: true,
    capabilities: TOOLS_STREAM,
  },
  {
    id: 'mistralai/mistral-7b-instruct:free',
    label: 'Mistral 7B (free)',
    provider: 'openrouter',
    description: 'Fast, compact instruction-tuned model',
    contextWindow: 32_768,
    freeTier: true,
    capabilities: TOOLS_STREAM,
  },
  {
    id: 'anthropic/claude-3.7-sonnet',
    label: 'Claude 3.7 Sonnet (OpenRouter)',
    provider: 'openrouter',
    description: 'Anthropic flagship via OpenRouter API',
    contextWindow: 200_000,
    inputPricePerMTok: 3,
    outputPricePerMTok: 15,
    freeTier: false,
    capabilities: FULL,
  },
  {
    id: 'anthropic/claude-3.5-sonnet',
    label: 'Claude 3.5 Sonnet (OpenRouter)',
    provider: 'openrouter',
    description: 'Anthropic 3.5 Sonnet via OpenRouter API',
    contextWindow: 200_000,
    inputPricePerMTok: 3,
    outputPricePerMTok: 15,
    freeTier: false,
    capabilities: FULL,
  },
  {
    id: 'openai/gpt-4o',
    label: 'GPT-4o (OpenRouter)',
    provider: 'openrouter',
    description: 'OpenAI GPT-4o via OpenRouter API',
    contextWindow: 128_000,
    inputPricePerMTok: 2.5,
    outputPricePerMTok: 10,
    freeTier: false,
    capabilities: FULL,
  },
  {
    id: 'openai/o3-mini',
    label: 'o3-mini (OpenRouter)',
    provider: 'openrouter',
    description: 'OpenAI STEM reasoning model via OpenRouter',
    contextWindow: 200_000,
    inputPricePerMTok: 1.1,
    outputPricePerMTok: 4.4,
    freeTier: false,
    capabilities: FULL,
  },
  {
    id: 'deepseek/deepseek-r1',
    label: 'DeepSeek R1 (OpenRouter)',
    provider: 'openrouter',
    description: 'Full-rate DeepSeek R1 reasoning on OpenRouter',
    contextWindow: 64_000,
    inputPricePerMTok: 0.55,
    outputPricePerMTok: 2.19,
    freeTier: false,
    capabilities: FULL,
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

/** Curated models: always expose the full catalog so users can select any model */
export function availableModels(): ModelInfo[] {
  const sorted = [...MODEL_CATALOG].sort(
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
    if (info) return info;
    // Unknown ids are allowed through for providers that accept dynamic ids
    // (OpenRouter hosts hundreds); route by prefix when possible.
    if (requested.includes('/')) {
      return {
        id: requested,
        label: requested,
        provider: 'openrouter',
        capabilities: TOOLS_STREAM,
      };
    }
  }
  const fallback =
    getModelInfo(DEFAULT_MODEL_ID) ??
    availableModels()[0] ??
    MODEL_CATALOG[0];
  return fallback;
}
