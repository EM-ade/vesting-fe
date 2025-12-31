/**
 * TanStack Query Hook: Vesting Pools
 * Fetches list of vesting pools for the current project
 */

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function usePoolsQuery(projectId: string | null) {
  return useQuery({
    queryKey: ['admin', projectId, 'pools'],
    
    queryFn: async () => {
      const response = await api.get<any[]>('/pools');
      return response || [];
    },
    
    enabled: !!projectId,
    
    // Keep previous data while fetching (prevents flicker)
    placeholderData: keepPreviousData,
    
    // Use global default (3 minutes) - pools don't change frequently
  });
}
