import supabaseAdmin from '@/lib/supabase/admin';

export interface SystemApiKeys {
  openai?: string;
  anthropic?: string;
  google?: string;
  gemini?: string;
  groq?: string;
  xai?: string;
  openrouter?: string;
  tavily?: string;
  browserbase_api_key?: string;
  browserbase_project_id?: string;
  backend_token?: string;
  [key: string]: string | undefined;
}

export interface RouterConfig {
  enabled: boolean;
  provider: 'google' | 'groq' | 'openai' | 'openrouter';
  model: string;
  api_key?: string;
  system_knowledge_description?: string;
}

export interface FeatureFlags {
  allow_user_uploads: boolean;
}

export interface SystemSettings {
  api_keys: SystemApiKeys;
  default_model: string;
  routing: RouterConfig;
  features: FeatureFlags;
  admin_emails: string[];
  updated_at?: string;
  updated_by?: string;
}

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  api_keys: {
    openai: '',
    anthropic: '',
    google: process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || '',
    gemini: process.env.GEMINI_API_KEY || '',
    groq: process.env.GROQ_API_KEY || '',
    xai: process.env.XAI_API_KEY || '',
    openrouter: process.env.OPENROUTER_API_KEY || '',
    tavily: process.env.TAVILY_API_KEY || '',
    browserbase_api_key: process.env.BROWSERBASE_API_KEY || '',
    browserbase_project_id: process.env.BROWSERBASE_PROJECT_ID || '',
    backend_token: process.env.BACKEND_BEARER_TOKEN || process.env.BEARER_TOKEN || '',
  },
  default_model: 'gemini-3.6-flash',
  routing: {
    enabled: true,
    provider: 'google',
    model: 'gemini-2.5-flash',
    api_key: '',
    system_knowledge_description: 'Corporate policies, standard operating procedures, documentation, user manuals, and fixed knowledge base documents.',
  },
  features: {
    allow_user_uploads: true,
  },
  admin_emails: [],
};

// In-memory cache to minimize Supabase roundtrips on high-frequency chat streams
let cachedSettings: SystemSettings | null = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 30_000; // 30 seconds

/**
 * Fetch system settings from Supabase with in-memory caching and resilient fallback.
 */
export async function getSystemSettings(forceRefresh = false): Promise<SystemSettings> {
  const now = Date.now();
  if (!forceRefresh && cachedSettings && now < cacheExpiry) {
    return cachedSettings;
  }

  try {
    const supabase = supabaseAdmin();
    const { data, error } = await supabase
      .from('app_system_settings')
      .select('value, updated_at, updated_by')
      .eq('key', 'global')
      .maybeSingle();

    if (error) {
      // If table doesn't exist yet, return defaults merged with current env vars
      console.warn('[admin-settings] Notice fetching settings (using defaults):', error.message);
      return getDefaultWithEnv();
    }

    if (data?.value) {
      const merged: SystemSettings = {
        api_keys: {
          ...DEFAULT_SYSTEM_SETTINGS.api_keys,
          ...(data.value.api_keys || {}),
        },
        default_model: data.value.default_model || DEFAULT_SYSTEM_SETTINGS.default_model,
        routing: {
          ...DEFAULT_SYSTEM_SETTINGS.routing,
          ...(data.value.routing || {}),
        },
        features: {
          ...DEFAULT_SYSTEM_SETTINGS.features,
          ...(data.value.features || {}),
        },
        admin_emails: Array.isArray(data.value.admin_emails)
          ? data.value.admin_emails
          : DEFAULT_SYSTEM_SETTINGS.admin_emails,
        updated_at: data.updated_at,
        updated_by: data.updated_by,
      };

      cachedSettings = merged;
      cacheExpiry = now + CACHE_TTL_MS;
      return merged;
    }

    // No row found: initialize default row
    const defaults = getDefaultWithEnv();
    try {
      await supabase.from('app_system_settings').upsert({
        key: 'global',
        value: defaults,
        updated_at: new Date().toISOString(),
        updated_by: 'system_init',
      });
    } catch {
      // Ignore if table not created
    }

    cachedSettings = defaults;
    cacheExpiry = now + CACHE_TTL_MS;
    return defaults;
  } catch (err: any) {
    console.warn('[admin-settings] Error loading settings, falling back to defaults:', err?.message);
    return getDefaultWithEnv();
  }
}

function getDefaultWithEnv(): SystemSettings {
  return {
    ...DEFAULT_SYSTEM_SETTINGS,
    api_keys: {
      openai: process.env.OPENAI_API_KEY || '',
      anthropic: process.env.ANTHROPIC_API_KEY || '',
      google: process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || '',
      gemini: process.env.GEMINI_API_KEY || '',
      groq: process.env.GROQ_API_KEY || '',
      xai: process.env.XAI_API_KEY || '',
      openrouter: process.env.OPENROUTER_API_KEY || '',
      tavily: process.env.TAVILY_API_KEY || '',
      backend_token: process.env.BACKEND_BEARER_TOKEN || process.env.BEARER_TOKEN || '',
    },
    admin_emails: (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  };
}

/**
 * Save updated system settings to Supabase and refresh cache.
 */
export async function updateSystemSettings(
  updates: Partial<SystemSettings>,
  updatedByEmail?: string
): Promise<{ success: boolean; settings?: SystemSettings; error?: string }> {
  try {
    const current = await getSystemSettings(true);
    const updated: SystemSettings = {
      api_keys: {
        ...current.api_keys,
        ...(updates.api_keys || {}),
      },
      default_model: updates.default_model || current.default_model,
      routing: {
        ...current.routing,
        ...(updates.routing || {}),
      },
      features: {
        ...current.features,
        ...(updates.features || {}),
      },
      admin_emails: updates.admin_emails ?? current.admin_emails,
      updated_at: new Date().toISOString(),
      updated_by: updatedByEmail || 'admin',
    };

    const supabase = supabaseAdmin();
    const { error } = await supabase.from('app_system_settings').upsert({
      key: 'global',
      value: updated,
      updated_at: updated.updated_at,
      updated_by: updated.updated_by,
    });

    if (error) {
      throw new Error(`Database error saving settings: ${error.message}`);
    }

    cachedSettings = updated;
    cacheExpiry = Date.now() + CACHE_TTL_MS;
    return { success: true, settings: updated };
  } catch (err: any) {
    console.error('[admin-settings] Update error:', err);
    return { success: false, error: err?.message || 'Failed to update settings' };
  }
}

/**
 * Resolve effective API key for a provider taking into account custom user key,
 * admin-configured system key, and environment variables.
 */
export async function getEffectiveApiKey(
  provider: string,
  userCustomKey?: string
): Promise<string | undefined> {
  if (userCustomKey?.trim()) {
    return userCustomKey.trim();
  }

  const settings = await getSystemSettings();
  const normalizedProvider = provider.toLowerCase();
  
  const systemKey =
    settings.api_keys[normalizedProvider] ||
    (normalizedProvider === 'google' ? settings.api_keys.gemini : undefined);

  if (systemKey && systemKey.trim() && !systemKey.startsWith('dummy')) {
    return systemKey.trim();
  }

  // Fallback to env vars
  switch (normalizedProvider) {
    case 'openai':
      return process.env.OPENAI_API_KEY;
    case 'anthropic':
      return process.env.ANTHROPIC_API_KEY;
    case 'google':
      return process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
    case 'gemini':
      return process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    case 'groq':
      return process.env.GROQ_API_KEY;
    case 'xai':
      return process.env.XAI_API_KEY;
    case 'openrouter':
      return process.env.OPENROUTER_API_KEY;
    default:
      return undefined;
  }
}

/**
 * Get effective Tavily API key for web search.
 */
export async function getEffectiveTavilyKey(userKey?: string): Promise<string> {
  if (userKey?.trim()) return userKey.trim();
  const settings = await getSystemSettings();
  if (settings.api_keys.tavily?.trim()) return settings.api_keys.tavily.trim();
  return process.env.TAVILY_API_KEY || '';
}

/**
 * Check if standard users are allowed to upload documents.
 */
export async function isUserUploadAllowed(): Promise<boolean> {
  const settings = await getSystemSettings();
  return settings.features.allow_user_uploads ?? true;
}
