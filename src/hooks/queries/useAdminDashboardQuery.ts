/**
 * TanStack Query Hook: Admin Dashboard Data (Batch Endpoint)
 * Fetches all overview data in a single request for optimal performance
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
    
    enabled: !!projectId,
    
    // Keep previous data while fetching new data (prevents flicker)
    placeholderData: keepPreviousData,
    
    // Use global default (3 minutes) - overview metrics don't change frequently
  });
}
