import { requireAdmin } from '@/lib/auth/admin';
import supabaseAdmin from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25MB

export async function GET() {
  try {
    await requireAdmin();
    const supabase = supabaseAdmin();
    const { data, error } = await supabase
      .from('user_documents')
      .select('*')
      .eq('is_global', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[admin/documents] Notice querying global documents:', error.message);
      return Response.json({ success: true, documents: [] });
    }

    return Response.json({ success: true, documents: data || [] });
  } catch (error: any) {
    const status = error.message === 'UNAUTHORIZED' ? 401 : error.message === 'FORBIDDEN' ? 403 : 500;
    return Response.json({ success: false, error: error.message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAdmin();

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return Response.json({ error: 'Expected multipart/form-data' }, { status: 400 });
    }

    const file = formData.get('file');
    const description = typeof formData.get('description') === 'string' ? formData.get('description') : '';

    if (!(file instanceof File)) {
      return Response.json({ error: 'file field is required' }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return Response.json({ error: 'File exceeds 25MB limit' }, { status: 413 });
    }

    // Forward to backend RAG ingestion
    const upstreamForm = new FormData();
    upstreamForm.append('file', file, file.name);

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

    if (!upstream.ok) {
      const errText = await upstream.text().catch(() => '');
      return Response.json(
        { error: `Backend ingestion failed: ${errText || upstream.status}` },
        { status: 502 }
      );
    }

    const result = await upstream.json();

    // Store record in user_documents with is_global = true
    const supabase = supabaseAdmin();
    const { data: docRecord, error: dbError } = await supabase
      .from('user_documents')
      .insert({
        user_id: user.id,
        file_name: file.name,
        status: result?.success ? 'ready' : 'failed',
        document_ref: result?.document_id ?? null,
        chunk_count: result?.chunks_processed ?? 0,
        file_size: file.size,
        is_global: true,
        uploaded_by_email: user.email,
        description: description || 'Fixed system knowledge base document',
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (dbError) {
      console.warn('[admin/documents] Metadata recording warning:', dbError.message);
    }

    return Response.json({
      success: true,
      document: docRecord || {
        file_name: file.name,
        is_global: true,
        chunk_count: result?.chunks_processed ?? 0,
      },
      chunks_processed: result?.chunks_processed,
    });
  } catch (error: any) {
    const status = error.message === 'UNAUTHORIZED' ? 401 : error.message === 'FORBIDDEN' ? 403 : 500;
    return Response.json({ success: false, error: error.message }, { status });
  }
}

export async function DELETE(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return Response.json({ error: 'Document id parameter is required' }, { status: 400 });
    }

    const supabase = supabaseAdmin();
    const { error } = await supabase.from('user_documents').delete().eq('id', id);

    if (error) {
      throw error;
    }

    return Response.json({ success: true, message: 'Global document deleted successfully' });
  } catch (error: any) {
    const status = error.message === 'UNAUTHORIZED' ? 401 : error.message === 'FORBIDDEN' ? 403 : 500;
    return Response.json({ success: false, error: error.message }, { status });
  }
}
