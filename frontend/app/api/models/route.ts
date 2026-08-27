
import {
  MODEL_CATALOG,
  availableModels,
  getProviderApiKey,
  isProviderConfigured,
  type ModelInfo,
  type ProviderId,
} from '@/lib/ai/models';

export const revalidate = 0;

interface CacheEntry {
  at: number;
  discovered: ModelInfo[];
}

const CACHE_TTL_MS = 5 * 60 * 1000;
let cache: CacheEntry | null = null;

async function fetchJson(url: string, headers?: Record<string, string>) {
  const res = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json();
}

/** OpenRouter's public catalog needs no API key and includes pricing. */
async function discoverOpenRouter(): Promise<ModelInfo[]> {
  const data = await fetchJson('https://openrouter.ai/api/v1/models');
  return (data?.data ?? [])
    .filter((m: any) => typeof m.id === 'string')
    .map((m: any) => {
      const promptPrice = parseFloat(m.pricing?.prompt ?? '0');
      const completionPrice = parseFloat(m.pricing?.completion ?? '0');
      const isFree = m.id.endsWith(':free') || (promptPrice === 0 && completionPrice === 0);
      return {
        id: m.id,
        label: m.name ?? m.id,
        provider: 'openrouter' as ProviderId,
        description: m.description?.slice(0, 160),
        contextWindow: m.context_length,
        inputPricePerMTok: Number.isFinite(promptPrice) ? promptPrice * 1_000_000 : undefined,
        outputPricePerMTok: Number.isFinite(completionPrice) ? completionPrice * 1_000_000 : undefined,
        freeTier: isFree,
        capabilities: {
          tools: true,
          vision: m.architecture?.input_modalities?.includes('image') ?? false,
          reasoning: false,
          streaming: true,
        },
      };
    });
}

async function discoverOpenAI(): Promise<ModelInfo[]> {
  const key = getProviderApiKey('openai');
  if (!key) return [];
  const data = await fetchJson('https://api.openai.com/v1/models', {
    Authorization: `Bearer ${key}`,
  });
  return (data?.data ?? [])
    .filter((m: any) => typeof m.id === 'string' && /^(gpt|o\d)/.test(m.id))
    .map((m: any) => ({
      id: m.id,
      label: m.id,
      provider: 'openai' as ProviderId,
      capabilities: { tools: true, vision: true, reasoning: true, streaming: true },
    }));
}

async function discoverGoogle(): Promise<ModelInfo[]> {
  const key = getProviderApiKey('google');
  if (!key) return [];
  const data = await fetchJson(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`
  );
  return (data?.models ?? [])
    .filter(
      (m: any) =>
        Array.isArray(m?.supportedGenerationMethods) &&
        m.supportedGenerationMethods.includes('generateContent') &&
        typeof m.name === 'string'
    )
    .map((m: any) => ({
      id: m.name.replace(/^models\//, ''),
      label: m.displayName ?? m.name,
      provider: 'google' as ProviderId,
      description: m.description?.slice(0, 160),
      contextWindow: m.inputTokenLimit,
      capabilities: {
        tools: m.supportedGenerationMethods.includes('generateContent'),
        vision: true,
        reasoning: Boolean(m.thinking),
        streaming: true,
      },
    }));
}

async function discoverGroq(): Promise<ModelInfo[]> {
  const key = getProviderApiKey('groq');
  if (!key) return [];
  const data = await fetchJson('https://api.groq.com/openai/v1/models', {
    Authorization: `Bearer ${key}`,
  });
  return (data?.data ?? []).map((m: any) => ({
    id: m.id,
    label: m.id,
    provider: 'groq' as ProviderId,
    contextWindow: m.context_window,
    capabilities: { tools: true, vision: false, reasoning: false, streaming: true },
  }));
}

async function discoverModels(): Promise<ModelInfo[]> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.discovered;

  const results = await Promise.allSettled([
    discoverOpenRouter(),
    discoverOpenAI(),
    discoverGoogle(),
    discoverGroq(),
  ]);

  const discovered = results.flatMap((r) =>
    r.status === 'fulfilled' ? r.value : []
  );

  // Never cache a failed/empty discovery round: a transient network error
  // during server warm-up would otherwise poison the catalog for 5 minutes.
  if (discovered.length > 0) {
    cache = { at: Date.now(), discovered };
  }
  return discovered;
}

/**
 * GET /api/models
 * Returns the curated catalog (configured providers first) merged with live
 * provider listings (5-minute cache). Each entry carries capability and
 * pricing metadata where known.
 */
import { getSystemSettings } from '@/lib/services/admin-settings';

export async function GET() {
  try {
    const [discovered, curated, settings] = await Promise.all([
      discoverModels(),
      Promise.resolve(availableModels()),
      getSystemSettings(),
    ]);

    const seen = new Set(curated.map((m) => `${m.provider}:${m.id}`));
    const extras = discovered.filter((m) => !seen.has(`${m.provider}:${m.id}`));

    const providers = Object.fromEntries(
      (
        [
          'openai',
          'google',
          'anthropic',
          'groq',
          'xai',
          'openrouter',
        ] as ProviderId[]
      ).map((p) => [p, isProviderConfigured(p)])
    );

    const defaultModel = settings.default_model || curated[0]?.id || 'gemini-2.5-flash';

    return Response.json({
      defaultModel,
      providers,
      models: [...curated, ...extras],
      discoveredCount: extras.length,
      catalogSize: MODEL_CATALOG.length,
    });
  } catch (error) {
    console.error('[api/models] error:', error);
    // Never fail hard: fall back to the static catalog.
    return Response.json({
      defaultModel: availableModels()[0]?.id ?? 'gemini-2.5-flash',
      providers: {},
      models: availableModels(),
      discoveredCount: 0,
      catalogSize: MODEL_CATALOG.length,
    });
  }
}
