import { getUser } from '@/app/chat/hooks/get-user';

const BACKEND_URL =
  process.env.BACKEND_URL || 'http://127.0.0.1:8000';

export async function GET() {
  const user = await getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const headers: Record<string, string> = {};
    const token = process.env.BACKEND_BEARER_TOKEN || process.env.BEARER_TOKEN;
    if (token) headers.Authorization = `Bearer ${token}`;

    const upstream = await fetch(`${BACKEND_URL}/documents`, {
      headers,
      signal: AbortSignal.timeout(15_000),
    });

    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { 'Content-Type': upstream.headers.get('content-type') ?? 'application/json' },
    });
  } catch (error: any) {
    console.error('[api/rag/status] error:', error);
    return new Response(
      JSON.stringify({ error: 'RAG backend unavailable', detail: String(error?.message ?? error) }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
