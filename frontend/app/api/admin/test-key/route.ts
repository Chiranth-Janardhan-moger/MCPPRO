import { requireAdmin } from '@/lib/auth/admin';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const { provider, key } = await req.json();

    if (!provider || !key || typeof key !== 'string' || !key.trim()) {
      return Response.json(
        { success: false, message: 'Provider and a valid API key string are required.' },
        { status: 400 }
      );
    }

    const cleanKey = key.trim();
    const startTime = Date.now();

    switch (provider.toLowerCase()) {
      case 'google':
      case 'gemini': {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(cleanKey)}`,
          { signal: AbortSignal.timeout(8000) }
        );
        const latencyMs = Date.now() - startTime;
        if (res.ok) {
          return Response.json({ success: true, message: 'Google Gemini API key is valid!', latencyMs });
        }
        const data = await res.json().catch(() => ({}));
        return Response.json({
          success: false,
          message: data?.error?.message || `Google API returned status ${res.status}`,
          latencyMs,
        });
      }

      case 'openai': {
        const res = await fetch('https://api.openai.com/v1/models', {
          headers: { Authorization: `Bearer ${cleanKey}` },
          signal: AbortSignal.timeout(8000),
        });
        const latencyMs = Date.now() - startTime;
        if (res.ok) {
          return Response.json({ success: true, message: 'OpenAI API key is valid!', latencyMs });
        }
        const data = await res.json().catch(() => ({}));
        return Response.json({
          success: false,
          message: data?.error?.message || `OpenAI API returned status ${res.status}`,
          latencyMs,
        });
      }

      case 'anthropic': {
        const res = await fetch('https://api.anthropic.com/v1/models', {
          headers: {
            'x-api-key': cleanKey,
            'anthropic-version': '2023-06-01',
          },
          signal: AbortSignal.timeout(8000),
        });
        const latencyMs = Date.now() - startTime;
        if (res.ok || res.status === 200) {
          return Response.json({ success: true, message: 'Anthropic API key is valid!', latencyMs });
        }
        const data = await res.json().catch(() => ({}));
        return Response.json({
          success: false,
          message: data?.error?.message || `Anthropic API returned status ${res.status}`,
          latencyMs,
        });
      }

      case 'groq': {
        const res = await fetch('https://api.groq.com/openai/v1/models', {
          headers: { Authorization: `Bearer ${cleanKey}` },
          signal: AbortSignal.timeout(8000),
        });
        const latencyMs = Date.now() - startTime;
        if (res.ok) {
          return Response.json({ success: true, message: 'Groq API key is valid!', latencyMs });
        }
        const data = await res.json().catch(() => ({}));
        return Response.json({
          success: false,
          message: data?.error?.message || `Groq API returned status ${res.status}`,
          latencyMs,
        });
      }

      case 'openrouter': {
        const res = await fetch('https://openrouter.ai/api/v1/auth/key', {
          headers: { Authorization: `Bearer ${cleanKey}` },
          signal: AbortSignal.timeout(8000),
        });
        const latencyMs = Date.now() - startTime;
        if (res.ok) {
          return Response.json({ success: true, message: 'OpenRouter API key is valid!', latencyMs });
        }
        const data = await res.json().catch(() => ({}));
        return Response.json({
          success: false,
          message: data?.error?.message || `OpenRouter returned status ${res.status}`,
          latencyMs,
        });
      }

      case 'xai': {
        const res = await fetch('https://api.x.ai/v1/models', {
          headers: { Authorization: `Bearer ${cleanKey}` },
          signal: AbortSignal.timeout(8000),
        });
        const latencyMs = Date.now() - startTime;
        if (res.ok) {
          return Response.json({ success: true, message: 'xAI API key is valid!', latencyMs });
        }
        const data = await res.json().catch(() => ({}));
        return Response.json({
          success: false,
          message: data?.error?.message || `xAI API returned status ${res.status}`,
          latencyMs,
        });
      }

      case 'tavily': {
        const res = await fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ api_key: cleanKey, query: 'ping test', max_results: 1 }),
          signal: AbortSignal.timeout(8000),
        });
        const latencyMs = Date.now() - startTime;
        if (res.ok) {
          return Response.json({ success: true, message: 'Tavily Search API key is valid!', latencyMs });
        }
        const data = await res.json().catch(() => ({}));
        return Response.json({
          success: false,
          message: data?.error || data?.detail || `Tavily API returned status ${res.status}`,
          latencyMs,
        });
      }

      case 'browserbase':
      case 'browserbase_api_key': {
        const res = await fetch('https://api.browserbase.com/v1/sessions', {
          headers: { 'x-bb-api-key': cleanKey },
          signal: AbortSignal.timeout(8000),
        });
        const latencyMs = Date.now() - startTime;
        if (res.ok || res.status === 200) {
          return Response.json({ success: true, message: 'Browserbase API key is valid!', latencyMs });
        }
        const data = await res.json().catch(() => ({}));
        return Response.json({
          success: false,
          message: data?.message || data?.error || `Browserbase returned status ${res.status}`,
          latencyMs,
        });
      }

      case 'backend': {
        const backendUrl = (process.env.BACKEND_URL || 'http://127.0.0.1:8000').trim().replace(/\/$/, '');
        const res = await fetch(`${backendUrl}/docs`, {
          headers: { Authorization: `Bearer ${cleanKey}` },
          signal: AbortSignal.timeout(6000),
        });
        const latencyMs = Date.now() - startTime;
        if (res.ok || res.status === 200 || res.status === 404) {
          return Response.json({ success: true, message: 'Backend RAG service reachable!', latencyMs });
        }
        return Response.json({
          success: false,
          message: `Backend returned status ${res.status}`,
          latencyMs,
        });
      }

      default:
        return Response.json(
          { success: false, message: `Unknown provider '${provider}'` },
          { status: 400 }
        );
    }
  } catch (error: any) {
    const status = error.message === 'UNAUTHORIZED' ? 401 : error.message === 'FORBIDDEN' ? 403 : 500;
    return Response.json(
      { success: false, message: error.message || 'Key verification failed' },
      { status }
    );
  }
}
