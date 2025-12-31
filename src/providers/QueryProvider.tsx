'use client';

/**
 * TanStack Query Provider
 * Wraps the app with QueryClientProvider
 */

import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* DevTools can be added separately if needed:
          npm install @tanstack/react-query-devtools --save-dev
          import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
      */}
    </QueryClientProvider>
  );
}
