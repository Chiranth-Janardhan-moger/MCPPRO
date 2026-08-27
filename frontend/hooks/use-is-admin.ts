import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createSupabaseBrowser } from '@/lib/supabase/client';

export interface AdminCheckState {
  authenticated: boolean;
  isAdmin: boolean;
  userEmail?: string;
  userId?: string;
  allowUserUploads: boolean;
}

export function useIsAdmin() {
  const queryClient = useQueryClient();

  // Listen to Supabase auth state changes in real-time
  useEffect(() => {
    const supabase = createSupabaseBrowser();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        event === 'SIGNED_IN' ||
        event === 'SIGNED_OUT' ||
        event === 'TOKEN_REFRESHED' ||
        event === 'USER_UPDATED' ||
        event === 'INITIAL_SESSION'
      ) {
        queryClient.invalidateQueries({ queryKey: ['admin-check'] });
        queryClient.invalidateQueries({ queryKey: ['user'] });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient]);

  const { data, isLoading, error, refetch } = useQuery<AdminCheckState>({
    queryKey: ['admin-check'],
    queryFn: async () => {
      // 1. Direct local Supabase auth check (instant on client)
      const supabase = createSupabaseBrowser();
      const { data: sessionData } = await supabase.auth.getSession();
      const sessionUser = sessionData?.session?.user;

      let user: any = sessionUser;
      if (!user) {
        const { data: authData } = await supabase.auth.getUser();
        user = authData?.user;
      }

      const email = (user?.email || '').toLowerCase().trim();
      const isClientAdmin =
        email === 'chiranth@gmail.com' ||
        user?.app_metadata?.role === 'admin' ||
        user?.user_metadata?.role === 'admin' ||
        user?.user_metadata?.is_admin === true;

      // 2. Server verification endpoint with no-cache headers
      let serverData: any = {};
      try {
        const res = await fetch('/api/admin/check', {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
        });
        if (res.ok) {
          serverData = await res.json();
        }
      } catch (err) {
        console.warn('[use-is-admin] Server check warning:', err);
      }

      // Must be authenticated to be admin
      const isAuthenticated = Boolean(user) || Boolean(serverData?.authenticated);
      const isAdmin = isAuthenticated && (isClientAdmin || Boolean(serverData?.isAdmin));

      return {
        authenticated: isAuthenticated,
        isAdmin,
        userEmail: email || serverData?.email,
        userId: user?.id || serverData?.userId,
        allowUserUploads: serverData?.allowUserUploads ?? true,
      };
    },
    staleTime: 5 * 1000,
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
