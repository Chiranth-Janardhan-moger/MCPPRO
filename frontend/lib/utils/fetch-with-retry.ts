/**
 * Resilient fetch wrapper with exponential backoff.
 * Automatically retries transient cloud server cold-starts (HTTP 502, 503, 504).
 */
export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  maxRetries: number = 3,
  baseDelayMs: number = 800
): Promise<Response> {
  let attempt = 0;
  while (true) {
    try {
      const response = await fetch(input, init);
      if ([502, 503, 504].includes(response.status) && attempt < maxRetries) {
        attempt++;
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      return response;
    } catch (err: any) {
      if (attempt < maxRetries && err?.name !== 'AbortError') {
        attempt++;
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }
}
