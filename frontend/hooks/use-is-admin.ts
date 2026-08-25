'use client';

import { useQuery } from '@tanstack/react-query';

interface AdminCheckResponse {
  authenticated: boolean;
  isAdmin: boolean;
  email?: string;
  userId?: string;
  allowUserUploads?: boolean;
  error?: string;
}

export function useIsAdmin() {
  const { data, isLoading, error, refetch } = useQuery<AdminCheckResponse>({
    queryKey: ['admin-check'],
    queryFn: async () => {
      const res = await fetch('/api/admin/check');
      if (!res.ok) throw new Error('Failed to verify admin status');
      return res.json();
    },
    staleTime: 60 * 1000, // 1 minute
  });

  return {
    isAdmin: Boolean(data?.isAdmin),
    isAuthenticated: Boolean(data?.authenticated),
    userEmail: data?.email,
    allowUserUploads: data?.allowUserUploads ?? true,
    isLoading,
    error,
    refetch,
  };
}
