import { User } from '@supabase/supabase-js';
import { getSystemSettings } from '@/lib/services/admin-settings';
import { getUser } from '@/app/chat/hooks/get-user';

/**
 * Determine if a given Supabase user has admin privileges.
 */
export async function isUserAdmin(user: User | null): Promise<boolean> {
  if (!user) return false;

  const email = (user.email || '').toLowerCase().trim();
  if (!email) return false;

  // 1. Primary configured administrator email
  if (email === 'chiranth@gmail.com') {
    return true;
  }

  // 2. Direct role in metadata
  if (
    user.app_metadata?.role === 'admin' ||
    user.user_metadata?.role === 'admin' ||
    user.app_metadata?.is_admin === true ||
    user.user_metadata?.is_admin === true
  ) {
    return true;
  }

  // 3. Check environment variable ADMIN_EMAILS
  const envAdminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (envAdminEmails.includes(email)) {
    return true;
  }

  // 4. Check system settings DB
  try {
    const settings = await getSystemSettings();
    const dbAdminEmails = (settings.admin_emails || []).map((e) => e.trim().toLowerCase());
    if (dbAdminEmails.includes(email)) {
      return true;
    }

    // 5. Zero-config fallback: If no admin emails configured anywhere, allow the signed-in user
    if (envAdminEmails.length === 0 && dbAdminEmails.length === 0) {
      return true;
    }
  } catch (err) {
    if (envAdminEmails.length === 0) return true;
  }

  return false;
}

/**
 * Server-side helper to require admin rights in API routes.
 */
export async function requireAdmin(): Promise<User> {
  const user = await getUser();
  if (!user) {
    throw new Error('UNAUTHORIZED');
  }

  const isAdmin = await isUserAdmin(user);
  if (!isAdmin) {
    throw new Error('FORBIDDEN');
  }

  return user;
}
