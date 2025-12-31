/**
 * TanStack Query Configuration
 * Global QueryClient with optimized defaults for the admin dashboard
 */

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 3 minutes before marking as stale (admin data doesn't change frequently)
      staleTime: 3 * 60 * 1000, // 3 minutes (was 30 seconds - increased for better performance)
      
      // Keep unused data in cache for 15 minutes
      gcTime: 15 * 60 * 1000, // 15 minutes (was cacheTime in v4)
      
      // Retry failed queries 1 time with exponential backoff
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Refetch on window focus for fresh data (but only if stale)
      refetchOnWindowFocus: true,
      
      // Refetch on reconnect
      refetchOnReconnect: true,
      
      // Don't refetch on mount if data is fresh (staleTime hasn't passed)
      refetchOnMount: false,
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,
    },
  },
});
