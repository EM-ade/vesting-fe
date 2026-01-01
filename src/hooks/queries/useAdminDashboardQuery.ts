/**
 * TanStack Query Hook: Admin Dashboard Data (Batch Endpoint)
 * Fetches all overview data in a single request for optimal performance
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * - Uses batch endpoint to reduce network roundtrips (6 calls → 1 call)
 * - Implements keepPreviousData to prevent loading flickers
 * - 5-minute stale time (inherited from queryClient)
 * - Query key includes poolIds for proper cache invalidation
 */

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface DashboardBatchResponse {
  success: boolean;
  data: {
    treasury: any;
    pools: any[];
    claims: any;
    eligibleWallets: { count: number };
    activityLog: { activities: any[] };
  };
  timestamp: number;
}

export function useAdminDashboardQuery(
  projectId: string | null,
  poolIds: string[] = [],
  options?: {
    claimsLimit?: number;
    activityLimit?: number;
  }
) {
  const { claimsLimit = 8, activityLimit = 20 } = options || {};

  return useQuery({
    // OPTIMIZATION: Stable query key with sorted poolIds for consistent caching
    queryKey: ['admin', projectId, 'dashboard', poolIds.sort().join(',')],
    
    queryFn: async () => {
      if (!projectId) {
        throw new Error('Project ID is required');
      }

      const poolParams = poolIds.length > 0 ? `&poolIds=${poolIds.join(',')}` : '';
      const url = `/admin/dashboard-batch?projectId=${projectId}${poolParams}&claimsLimit=${claimsLimit}&activityLimit=${activityLimit}`;
      
      const response = await api.get<DashboardBatchResponse>(url);
      return response;
    },
    
    // Only run query when projectId is available
    enabled: !!projectId,
    
    // OPTIMIZATION: Keep previous data while fetching new data (prevents flicker)
    placeholderData: keepPreviousData,
    
    // OPTIMIZATION: Inherit 5-minute stale time from global config
    // Override only if you need different behavior for this specific query
    // staleTime: 5 * 60 * 1000, // Already set globally
    
    // OPTIMIZATION: Longer stale time for dashboard since it's expensive to compute
    staleTime: 5 * 60 * 1000, // 5 minutes - dashboard metrics change slowly
    
    // OPTIMIZATION: Cache for 30 minutes - dashboard data is valuable
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}
