/**
 * TanStack Query Hook: Project Details
 * Fetches detailed information about a specific project
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useProjectDetailsQuery(projectId: string | null) {
  return useQuery({
    queryKey: ['projects', projectId, 'details'],
    
    queryFn: async () => {
      if (!projectId) {
        throw new Error('Project ID is required');
      }

      const response = await api.get<any>(`/projects/${projectId}`);
      return response;
    },
    
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes - project details don't change often
  });
}
