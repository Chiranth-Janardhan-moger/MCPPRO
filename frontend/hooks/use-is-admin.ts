'use client';

import { useQuery } from '@tanstack/react-query';
import { createSupabaseBrowser } from '@/lib/supabase/client';

export interface AdminCheckState {
  authenticated: boolean;
  isAdmin: boolean;
  userEmail?: string;
  userId?: string;
  allowUserUploads: boolean;
}

export function useIsAdmin() {
  const { data, isLoading, error, refetch } = useQuery<AdminCheckState>({
    queryKey: ['admin-check'],
    queryFn: async () => {
      // 1. Direct local Supabase auth check (instant on client)
      const supabase = createSupabaseBrowser();
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;

      const email = (user?.email || '').toLowerCase().trim();
      const isClientAdmin =
        email === 'chiranth@gmail.com' ||
        user?.app_metadata?.role === 'admin' ||
        user?.user_metadata?.role === 'admin' ||
        user?.user_metadata?.is_admin === true;

      // 2. Server verification endpoint
      let serverData: any = {};
      try {
        const res = await fetch('/api/admin/check');
        if (res.ok) {
          serverData = await res.json();
        }
      } catch (err) {
        console.warn('[use-is-admin] Server check warning:', err);
      }

      const isAdmin = isClientAdmin || Boolean(serverData?.isAdmin);
      const isAuthenticated = Boolean(user) || Boolean(serverData?.authenticated);

      return {
        authenticated: isAuthenticated,
        isAdmin,
        userEmail: email || serverData?.email,
        userId: user?.id || serverData?.userId,
        allowUserUploads: serverData?.allowUserUploads ?? true,
      };
    },
    staleTime: 30 * 1000,
  });

  return {
    isAdmin: Boolean(data?.isAdmin),
    isAuthenticated: Boolean(data?.authenticated),
    userEmail: data?.userEmail,
    allowUserUploads: data?.allowUserUploads ?? true,
    isLoading,
    error,
    refetch,
  };
}
