import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContext {
  userId?: string;
  selectedModel?: string;
  customApiKeys?: Record<string, string>;
}

const storage = new AsyncLocalStorage<RequestContext>();

/**
 * Run `fn` with a per-request context. Values are visible to any code in the
 * async call chain (including dynamic model resolvers) without mutating
 * global state, so concurrent requests cannot leak settings into each other.
 */
export function runWithRequestContext<T>(
  context: RequestContext,
  fn: () => T
): T {
  return storage.run(context, fn);
}

/** Read the current request context (empty object outside a request). */
export function getRequestContext(): RequestContext {
  return storage.getStore() ?? {};
}
