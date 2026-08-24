import { describe, it, expect } from 'vitest';
import { runWithRequestContext, getRequestContext } from '@/lib/request-context';

describe('request context (AsyncLocalStorage)', () => {
  it('stores and returns values inside the context', () => {
    const result = runWithRequestContext({ selectedModel: 'gpt-4o' }, () =>
      getRequestContext()
    );
    expect(result.selectedModel).toBe('gpt-4o');
  });

  it('returns empty context outside a request', () => {
    expect(getRequestContext()).toEqual({});
  });

  it('isolates concurrent contexts (no cross-request leakage)', async () => {
    const results: string[] = [];

    await Promise.all([
      runWithRequestContext({ selectedModel: 'model-a' }, async () => {
        await new Promise((r) => setTimeout(r, 10));
        results.push(getRequestContext().selectedModel!);
      }),
      runWithRequestContext({ selectedModel: 'model-b' }, async () => {
        await new Promise((r) => setTimeout(r, 5));
        results.push(getRequestContext().selectedModel!);
      }),
    ]);

    // Each async chain must observe only its own model.
    expect(results.sort()).toEqual(['model-a', 'model-b']);
  });
});
