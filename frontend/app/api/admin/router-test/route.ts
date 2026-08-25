import { requireAdmin } from '@/lib/auth/admin';
import { classifyQueryContext } from '@/lib/ai/context-router';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const { query } = await req.json();

    if (!query || typeof query !== 'string') {
      return Response.json({ success: false, error: 'Query string is required' }, { status: 400 });
    }

    const decision = await classifyQueryContext(query);
    return Response.json({ success: true, decision });
  } catch (error: any) {
    const status = error.message === 'UNAUTHORIZED' ? 401 : error.message === 'FORBIDDEN' ? 403 : 500;
    return Response.json({ success: false, error: error.message }, { status });
  }
}
