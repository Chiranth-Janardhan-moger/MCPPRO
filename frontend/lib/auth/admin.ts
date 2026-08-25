import { User } from '@supabase/supabase-js';
import { getSystemSettings } from '@/lib/services/admin-settings';
import { getUser } from '@/app/chat/hooks/get-user';

/**
 * Determine if a given Supabase user has admin privileges.
 * STRICT CHECK: Only returns true for verified administrator accounts.
 */
export async function isUserAdmin(user: User | null): Promise<boolean> {
  if (!user) return false;

  const email = (user.email || '').toLowerCase().trim();
  if (!email) return false;

  // 1. Primary administrator email
  if (email === 'chiranth@gmail.com') {
    return true;
  }

  // 2. Direct admin role in Supabase metadata
  if (
    user.app_metadata?.role === 'admin' ||
    user.user_metadata?.role === 'admin'
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

  // 4. Check system settings DB admin list
  try {
    const settings = await getSystemSettings();
    const dbAdminEmails = (settings.admin_emails || []).map((e) => e.trim().toLowerCase());
    if (dbAdminEmails.includes(email)) {
      return true;
    }
  } catch (err) {
    // DB lookup failed, do not grant admin
  }

  // Strictly non-admin for all other users
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
