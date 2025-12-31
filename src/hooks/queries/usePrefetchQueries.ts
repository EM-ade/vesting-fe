/**
 * Prefetching Hook
 * Preloads data for likely navigation paths to improve perceived performance
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function usePrefetchDashboard(projectId: string | null, poolIds: string[] = []) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!projectId) return;

    // Prefetch dashboard data
    const poolParams = poolIds.length > 0 ? `&poolIds=${poolIds.join(',')}` : '';
    const url = `/admin/dashboard-batch?projectId=${projectId}${poolParams}&claimsLimit=8&activityLimit=20`;

    queryClient.prefetchQuery({
      queryKey: ['admin', projectId, 'dashboard', poolIds.sort().join(',')],
      queryFn: () => api.get(url),
      staleTime: 30 * 1000,
    });
  }, [projectId, poolIds.join(','), queryClient]);
}

export function usePrefetchPools(projectId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!projectId) return;

    // Prefetch pools data
    queryClient.prefetchQuery({
      queryKey: ['admin', projectId, 'pools'],
      queryFn: () => api.get('/pools'),
      staleTime: 30 * 1000,
    });
  }, [projectId, queryClient]);
}

export function usePrefetchClaims(projectId: string | null, poolIds: string[] = []) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!projectId) return;

    const poolParams = poolIds.length > 0 ? `&poolIds=${poolIds.join(',')}` : '';

    // Prefetch claims data
    queryClient.prefetchQuery({
      queryKey: ['admin', projectId, 'claims', 'all', poolIds.sort().join(',')],
      queryFn: async () => {
        const statsUrl = `/metrics/claims-stats?projectId=${projectId}${poolParams}`;
        const claimsUrl = `/claims?limit=100${poolParams}`;

        const [stats, claimsResponse] = await Promise.all([
          api.get<any>(statsUrl),
          api.get<any>(claimsUrl)
        ]);

        return {
          claims: (claimsResponse as any)?.claims || [],
          stats: stats || null,
        };
      },
      staleTime: 30 * 1000,
    });
  }, [projectId, poolIds.join(','), queryClient]);
}

export function usePrefetchTreasury(projectId: string | null, poolIds: string[] = []) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!projectId) return;

    const poolParams = poolIds.length > 0 ? `&poolIds=${poolIds.join(',')}` : '';
    const url = `/treasury/status?projectId=${projectId}${poolParams}`;

    // Prefetch treasury data
    queryClient.prefetchQuery({
      queryKey: ['admin', projectId, 'treasury', poolIds.sort().join(',')],
      queryFn: () => api.get(url),
      staleTime: 30 * 1000,
    });
  }, [projectId, poolIds.join(','), queryClient]);
}

/**
 * Prefetch all admin tabs at once
 * Use this on the overview page to load all tabs in background
 */
export function usePrefetchAllTabs(projectId: string | null, poolIds: string[] = []) {
  usePrefetchDashboard(projectId, poolIds);
  usePrefetchPools(projectId);
  usePrefetchClaims(projectId, poolIds);
  usePrefetchTreasury(projectId, poolIds);
}
