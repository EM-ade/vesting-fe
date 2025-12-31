/**
 * TanStack Query Hook: Treasury Status
 * Fetches treasury balance and allocation data
 */

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useTreasuryQuery(projectId: string | null, poolIds: string[] = []) {
  return useQuery({
    queryKey: ['admin', projectId, 'treasury', poolIds.sort().join(',')],
    
    queryFn: async () => {
      if (!projectId) {
        throw new Error('Project ID is required');
      }

      const poolParams = poolIds.length > 0 ? `&poolIds=${poolIds.join(',')}` : '';
      const url = `/treasury/status?projectId=${projectId}${poolParams}`;
      
      const response = await api.get<any>(url);
      return response;
    },
    
    enabled: !!projectId,
    
    // Keep previous data while fetching (prevents flicker)
    placeholderData: keepPreviousData,
    
    // Use global default (3 minutes) - treasury balance doesn't change frequently
  });
}

export function useAvailableBalanceQuery(projectId: string | null) {
  return useQuery({
    queryKey: ['admin', projectId, 'treasury', 'available'],
    
    queryFn: async () => {
      if (!projectId) {
        throw new Error('Project ID is required');
      }

      const url = `/treasury/available?projectId=${projectId}`;
      const response = await api.get<any>(url);
      return response;
    },
    
    enabled: !!projectId,
    // Use global default (3 minutes) - available balance doesn't change frequently
  });
}
