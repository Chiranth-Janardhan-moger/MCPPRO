import { requireAdmin } from '@/lib/auth/admin';
import { getSystemSettings, updateSystemSettings } from '@/lib/services/admin-settings';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdmin();
    const settings = await getSystemSettings(true);
    return Response.json({ success: true, settings });
  } catch (error: any) {
    const status = error.message === 'UNAUTHORIZED' ? 401 : error.message === 'FORBIDDEN' ? 403 : 500;
    return Response.json({ success: false, error: error.message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAdmin();
    const body = await req.json();

    const result = await updateSystemSettings(body, user.email || 'admin');
    if (!result.success) {
      return Response.json({ success: false, error: result.error }, { status: 400 });
    }

    return Response.json({ success: true, settings: result.settings });
  } catch (error: any) {
    const status = error.message === 'UNAUTHORIZED' ? 401 : error.message === 'FORBIDDEN' ? 403 : 500;
    return Response.json({ success: false, error: error.message }, { status });
  }
}
