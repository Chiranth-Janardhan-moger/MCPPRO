import { getUser } from '@/app/chat/hooks/get-user';

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:8000';

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return new Response(JSON.stringify({ error: 'Expected multipart/form-data' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return new Response(JSON.stringify({ error: 'file field is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return new Response(JSON.stringify({ error: 'File exceeds 25MB limit' }), {
      status: 413,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const upstreamForm = new FormData();
    upstreamForm.append('file', file, file.name);
    for (const key of ['k', 'use_ocr']) {
      const value = formData.get(key);
      if (typeof value === 'string') upstreamForm.append(key, value);
    }

    const backendUrl = (process.env.BACKEND_URL || 'http://127.0.0.1:8000').trim().replace(/\/$/, '');
    const headers: Record<string, string> = {};
    const token = process.env.BACKEND_BEARER_TOKEN || process.env.BEARER_TOKEN;
    if (token) headers.Authorization = `Bearer ${token.trim()}`;

    const upstream = await fetch(`${backendUrl}/documents/upload`, {
      method: 'POST',
      headers,
      body: upstreamForm,
      signal: AbortSignal.timeout(300_000),
    });

    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { 'Content-Type': upstream.headers.get('content-type') ?? 'application/json' },
    });
  } catch (error: any) {
    console.error('[api/rag/upload] error:', error);
    return new Response(
      JSON.stringify({ error: 'RAG backend unavailable', detail: String(error?.message ?? error) }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
