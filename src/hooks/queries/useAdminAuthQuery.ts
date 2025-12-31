/**
 * TanStack Query Hook: Admin Authentication
 * Checks if the connected wallet is an admin for the current project
 */

import { useQuery } from '@tanstack/react-query';
import { useWallet } from '@solana/wallet-adapter-react';
import { api } from '@/lib/api';

interface AdminAuthResponse {
  success: boolean;
  isAdmin: boolean;
}

export function useAdminAuthQuery(projectId: string | null) {
  const { publicKey, connected } = useWallet();
  const walletAddress = publicKey?.toBase58();

  return useQuery({
    queryKey: ['admin', projectId || 'none', 'auth', walletAddress || 'none'],
    
    queryFn: async () => {
      if (!connected || !publicKey || !walletAddress) {
        return { success: false, isAdmin: false };
      }

      // If no project selected, allow access (user can create a project)
      if (!projectId) {
        return { success: true, isAdmin: true };
      }

      const url = `/config/check-admin?wallet=${walletAddress}&projectId=${projectId}`;
      const response = await api.get<AdminAuthResponse>(url);
      
      return response;
    },
    
    enabled: connected && !!publicKey,
    staleTime: 5 * 60 * 1000, // 5 minutes - auth doesn't change frequently
    retry: 1,
  });
}
