/**
 * Prefetching Hook - HYBRID STRATEGY
 * Preloads data for likely navigation paths to improve perceived performance
 * 
 * STRATEGY:
 * 1. Immediate: Prefetch Overview + Pools (most common views)
 * 2. Delayed: Prefetch Claims + Treasury after 2 seconds idle
 * 3. On-Demand: Export functions for hover-based prefetching
 * 
 * PERFORMANCE: Stale times match main queries (5 minutes) for consistency
 */

import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// PERFORMANCE FIX: Match stale times with main queries (5 minutes)
const PREFETCH_STALE_TIME = 5 * 60 * 1000; // 5 minutes

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
      staleTime: PREFETCH_STALE_TIME,
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
      staleTime: PREFETCH_STALE_TIME,
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
      staleTime: PREFETCH_STALE_TIME,
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
      staleTime: PREFETCH_STALE_TIME,
    });
  }, [projectId, poolIds.join(','), queryClient]);
}

/**
 * HYBRID STRATEGY: Immediate + Delayed Prefetching
 * 
 * Immediate: Dashboard + Pools (most common)
 * Delayed (2s): Claims + Treasury (secondary priority)
 */
export function useHybridPrefetch(projectId: string | null, poolIds: string[] = []) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!projectId) return;

    // PHASE 1: Immediate prefetch (high priority)
    // Prefetch dashboard and pools right away
    const poolParams = poolIds.length > 0 ? `&poolIds=${poolIds.join(',')}` : '';
    
    // Dashboard
    const dashboardUrl = `/admin/dashboard-batch?projectId=${projectId}${poolParams}&claimsLimit=8&activityLimit=20`;
    queryClient.prefetchQuery({
      queryKey: ['admin', projectId, 'dashboard', poolIds.sort().join(',')],
      queryFn: () => api.get(dashboardUrl),
      staleTime: PREFETCH_STALE_TIME,
    });

    // Pools
    queryClient.prefetchQuery({
      queryKey: ['admin', projectId, 'pools'],
      queryFn: () => api.get('/pools'),
      staleTime: PREFETCH_STALE_TIME,
    });

    // PHASE 2: Delayed prefetch (lower priority)
    // Prefetch claims and treasury after 2 seconds to avoid initial load congestion
    const delayedTimer = setTimeout(() => {
      // Claims
      const statsUrl = `/metrics/claims-stats?projectId=${projectId}${poolParams}`;
      const claimsUrl = `/claims?limit=100${poolParams}`;
      
      queryClient.prefetchQuery({
        queryKey: ['admin', projectId, 'claims', 'all', poolIds.sort().join(',')],
        queryFn: async () => {
          const [stats, claimsResponse] = await Promise.all([
            api.get<any>(statsUrl),
            api.get<any>(claimsUrl)
          ]);
          return {
            claims: (claimsResponse as any)?.claims || [],
            stats: stats || null,
          };
        },
        staleTime: PREFETCH_STALE_TIME,
      });

      // Treasury
      const treasuryUrl = `/treasury/status?projectId=${projectId}${poolParams}`;
      queryClient.prefetchQuery({
        queryKey: ['admin', projectId, 'treasury', poolIds.sort().join(',')],
        queryFn: () => api.get(treasuryUrl),
        staleTime: PREFETCH_STALE_TIME,
      });
    }, 2000); // 2 second delay

    return () => clearTimeout(delayedTimer);
  }, [projectId, poolIds.join(','), queryClient]);
}

/**
 * On-demand prefetch functions for hover-based loading
 * Export these so sidebar can call them on hover
 */
export function usePrefetchHandlers(projectId: string | null, poolIds: string[] = []) {
  const queryClient = useQueryClient();

  const prefetchPools = useCallback(() => {
    if (!projectId) return;
    queryClient.prefetchQuery({
      queryKey: ['admin', projectId, 'pools'],
      queryFn: () => api.get('/pools'),
      staleTime: PREFETCH_STALE_TIME,
    });
  }, [projectId, queryClient]);

  const prefetchClaims = useCallback(() => {
    if (!projectId) return;
    const poolParams = poolIds.length > 0 ? `&poolIds=${poolIds.join(',')}` : '';
    const statsUrl = `/metrics/claims-stats?projectId=${projectId}${poolParams}`;
    const claimsUrl = `/claims?limit=100${poolParams}`;
    
    queryClient.prefetchQuery({
      queryKey: ['admin', projectId, 'claims', 'all', poolIds.sort().join(',')],
      queryFn: async () => {
        const [stats, claimsResponse] = await Promise.all([
          api.get<any>(statsUrl),
          api.get<any>(claimsUrl)
        ]);
        return {
          claims: (claimsResponse as any)?.claims || [],
          stats: stats || null,
        };
      },
      staleTime: PREFETCH_STALE_TIME,
    });
  }, [projectId, poolIds.join(','), queryClient]);

  const prefetchTreasury = useCallback(() => {
    if (!projectId) return;
    const poolParams = poolIds.length > 0 ? `&poolIds=${poolIds.join(',')}` : '';
    const url = `/treasury/status?projectId=${projectId}${poolParams}`;
    
    queryClient.prefetchQuery({
      queryKey: ['admin', projectId, 'treasury', poolIds.sort().join(',')],
      queryFn: () => api.get(url),
      staleTime: PREFETCH_STALE_TIME,
    });
  }, [projectId, poolIds.join(','), queryClient]);

  return {
    prefetchPools,
    prefetchClaims,
    prefetchTreasury,
  };
}

/**
 * LEGACY: Prefetch all admin tabs at once (aggressive strategy)
 * Note: Consider using useHybridPrefetch instead for better performance
 */
export function usePrefetchAllTabs(projectId: string | null, poolIds: string[] = []) {
  usePrefetchDashboard(projectId, poolIds);
  usePrefetchPools(projectId);
  usePrefetchClaims(projectId, poolIds);
  usePrefetchTreasury(projectId, poolIds);
}
