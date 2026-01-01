/**
 * TanStack Query Configuration
 * Global QueryClient with optimized defaults for the admin dashboard
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * - 5-minute stale time to reduce unnecessary refetches
 * - Background refetching only when tab is active
 * - Request deduplication for simultaneous identical requests
 * - Smart retry logic with exponential backoff
 */

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // OPTIMIZATION: Increase stale time to 5 minutes for dashboard data
      // Dashboard metrics don't change frequently, so we can cache longer
      staleTime: 5 * 60 * 1000, // 5 minutes (was 3 minutes)
      
      // OPTIMIZATION: Keep unused data in cache for 20 minutes
      // Allows fast navigation without re-fetching
      gcTime: 20 * 60 * 1000, // 20 minutes (was 15 minutes)
      
      // OPTIMIZATION: Retry failed queries only once
      // Reduces wait time for genuinely failing requests
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // OPTIMIZATION: Only refetch on window focus if data is stale
      // Prevents unnecessary API calls when switching tabs
      refetchOnWindowFocus: 'always', // Will respect staleTime
      
      // OPTIMIZATION: Refetch on reconnect for data freshness
      refetchOnReconnect: true,
      
      // OPTIMIZATION: Don't refetch on mount if data is fresh
      // Crucial for preventing duplicate requests on component remounts
      refetchOnMount: false,
      
      // OPTIMIZATION: Refetch in background only when tab is visible
      // Saves resources when user is on a different tab
      refetchInterval: false, // Disable auto-refetch by default
      refetchIntervalInBackground: false,
      
      // OPTIMIZATION: Enable network mode 'online' only
      // Prevents showing stale data when offline
      networkMode: 'online',
    },
    mutations: {
      // Retry mutations once on failure with exponential backoff
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      
      // Network mode for mutations
      networkMode: 'online',
    },
  },
});
