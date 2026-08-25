import { getUser } from '@/app/chat/hooks/get-user';
import { isUserAdmin } from '@/lib/auth/admin';
import { isUserUploadAllowed } from '@/lib/services/admin-settings';
import supabaseAdmin from '@/lib/supabase/admin';

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const isAdmin = await isUserAdmin(user);
  const uploadsAllowed = await isUserUploadAllowed();

  if (!uploadsAllowed && !isAdmin) {
    return new Response(
      JSON.stringify({
        error: 'File uploads are currently restricted by the administrator. You can search and query all fixed documents in the System Knowledge Base.',
      }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
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

  const isGlobal = isAdmin && formData.get('is_global') === 'true';

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

    const responseData = await upstream.json();

    // Record metadata in user_documents
    try {
      const supabase = supabaseAdmin();
      await supabase.from('user_documents').insert({
        user_id: user.id,
        file_name: file.name,
        status: responseData?.success ? 'ready' : 'failed',
        document_ref: responseData?.document_id ?? null,
        chunk_count: responseData?.chunks_processed ?? 0,
        file_size: file.size,
        is_global: isGlobal,
        uploaded_by_email: user.email,
        description: isGlobal ? 'Fixed System Knowledge Base' : 'User Document',
      });
    } catch (metaErr) {
      console.warn('[api/rag/upload] Metadata insertion warning:', metaErr);
    }

    return new Response(JSON.stringify(responseData), {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[api/rag/upload] error:', error);
    return new Response(
      JSON.stringify({ error: 'RAG backend unavailable', detail: String(error?.message ?? error) }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
