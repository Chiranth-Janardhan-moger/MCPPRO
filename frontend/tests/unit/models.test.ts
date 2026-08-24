import { describe, it, expect, beforeEach } from 'vitest';
import {
  MODEL_CATALOG,
  DEFAULT_MODEL_ID,
  getModelInfo,
  resolveModel,
  availableModels,
  isProviderConfigured,
} from '@/lib/ai/models';

describe('model catalog', () => {
  it('contains no duplicate ids', () => {
    const ids = MODEL_CATALOG.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every model has required metadata', () => {
    for (const m of MODEL_CATALOG) {
      expect(m.label.length).toBeGreaterThan(0);
      expect(m.capabilities).toHaveProperty('tools');
      expect(m.capabilities).toHaveProperty('streaming');
    }
  });

  it('does not ship shut-down Gemini models', () => {
    // Google shut these down; they must never reappear in the catalog.
    const dead = ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-2.0-pro-exp-02-05'];
    for (const id of dead) {
      expect(getModelInfo(id)).toBeUndefined();
    }
  });

  it('includes current Gemini stable models', () => {
    expect(getModelInfo('gemini-3.6-flash')).toBeDefined();
    expect(getModelInfo('gemini-3.5-flash-lite')).toBeDefined();
    expect(getModelInfo('gemini-3.1-pro-preview')).toBeDefined();
  });
});

describe('resolveModel', () => {
  beforeEach(() => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
  });

  it('falls back to catalog default when nothing requested/configured', () => {
    const resolved = resolveModel(undefined);
    expect(MODEL_CATALOG.some((m) => m.id === resolved.id)).toBe(true);
  });

  it('routes unknown namespaced ids through OpenRouter when configured', () => {
    process.env.OPENROUTER_API_KEY = 'test-key';
    const resolved = resolveModel('some-vendor/some-model:free');
    expect(resolved.provider).toBe('openrouter');
    expect(resolved.id).toBe('some-vendor/some-model:free');
  });

  it('keeps known ids even when key missing (server errors surface at call time)', () => {
    const resolved = resolveModel('gpt-4o');
    expect(resolved.id).toBe('gpt-4o');
  });
});

describe('availableModels', () => {
  it('returns full catalog when no providers configured (dev visibility)', () => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    const models = availableModels();
    expect(models.length).toBe(MODEL_CATALOG.length);
  });

  it('isProviderConfigured rejects dummy keys', () => {
    process.env.OPENAI_API_KEY = 'dummy_key_for_build';
    expect(isProviderConfigured('openai')).toBe(false);
    process.env.OPENAI_API_KEY = 'sk-real';
    expect(isProviderConfigured('openai')).toBe(true);
    delete process.env.OPENAI_API_KEY;
  });
});
