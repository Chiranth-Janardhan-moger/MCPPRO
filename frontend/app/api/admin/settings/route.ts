import { requireAdmin } from '@/lib/auth/admin';
import { getSystemSettings, updateSystemSettings } from '@/lib/services/admin-settings';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdmin();
    const settings = await getSystemSettings(true);
    const maskedKeys = Object.fromEntries(
      Object.entries(settings.api_keys || {}).map(([k, v]) => [
        k,
        typeof v === 'string' && v.length > 8 ? `${v.slice(0, 3)}...${v.slice(-4)}` : (v ? '***' : '')
      ])
    );
    return Response.json({ success: true, settings: { ...settings, api_keys: maskedKeys } });
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
