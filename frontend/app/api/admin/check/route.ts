import { getUser } from '@/app/chat/hooks/get-user';
import { isUserAdmin } from '@/lib/auth/admin';
import { isUserUploadAllowed } from '@/lib/services/admin-settings';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return Response.json({
        authenticated: false,
        isAdmin: false,
        allowUserUploads: await isUserUploadAllowed(),
      });
    }

    const isAdmin = await isUserAdmin(user);
    const allowUserUploads = await isUserUploadAllowed();

    return Response.json({
      authenticated: true,
      isAdmin,
      email: user.email,
      userId: user.id,
      allowUserUploads,
    });
  } catch (error: any) {
    return Response.json(
      { authenticated: false, isAdmin: false, error: error.message },
      { status: 500 }
    );
  }
}
