/**
 * TanStack Query Hook: Claims Data
 * Fetches claims list and statistics with filtering
 */

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface ClaimsData {
  claims: any[];
  stats: any;
}

export function useClaimsQuery(
  projectId: string | null,
  filter: 'all' | '24h' | '7d' = 'all',
  poolIds: string[] = []
) {
  return useQuery({
    queryKey: ['admin', projectId, 'claims', filter, poolIds.sort().join(',')],
    
    queryFn: async () => {
      if (!projectId) {
        throw new Error('Project ID is required');
      }

      const poolParams = poolIds.length > 0 ? `&poolIds=${poolIds.join(',')}` : '';
      
      // Fetch stats
      const statsUrl = `/claims/stats?projectId=${projectId}${poolParams}`;
      const stats = await api.get<any>(statsUrl);
      
      // Build claims endpoint based on filter
      let claimsEndpoint = `/claims?limit=100${poolParams}`;
      
      if (filter === '24h') {
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        claimsEndpoint += `&since=${yesterday}`;
      } else if (filter === '7d') {
        const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        claimsEndpoint += `&since=${lastWeek}`;
      }
      
      const claimsResponse = await api.get<any>(claimsEndpoint);
      
      return {
        claims: claimsResponse?.claims || [],
        stats: stats || null,
      };
    },
    
    enabled: !!projectId,
    
    // Keep previous data while fetching (prevents flicker)
    placeholderData: keepPreviousData,
    
    // Shorter cache for claims (1 minute) - more real-time data needed
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}
