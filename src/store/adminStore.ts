/**
 * Zustand store for admin dashboard data
 * Persists data across component unmounts/remounts to eliminate loading stutters on tab switches
 * Now with persist middleware for instant-feel UI on page load/refresh
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Types
type OverviewMetrics = {
  totalValueLocked: number;
  totalClaimed: number;
  activePoolsCount: number;
  totalUsers: number;
  treasuryBalance: number;
};

type RecentClaim = {
  id: string;
  wallet: string;
  amount: number;
  created_at: string;
  timestamp?: string;
  signature: string;
  pool_id?: number;
  pool_name?: string;
  status?: string;
  token_mint?: string;
};

type ActivityLogItem = {
  id: string;
  action: string;
  admin_wallet?: string;
  timestamp: string;
  created_at?: string;
  details?: Record<string, unknown>;
};

type Pool = {
  id: string;
  name: string;
  isActive?: boolean;
  vestingMode?: string;
  state?: string;
  totalAmount?: number;
  startTime?: string;
  start_time?: string;
  endTime?: string;
  vestingDuration?: number;
  cliffDuration?: number;
  streamflowId?: string;
  stats?: {
    userCount?: number;
  };
  streamflow?: {
    vestedPercentage?: number;
  };
  [key: string]: any; // Allow additional properties from API
};

type ClaimStats = {
  totalClaims: number;
  totalAmount: number;
  uniqueUsers: number;
  last24h?: number;
  last7d?: number;
};

type TreasuryData = {
  balance: number;
  allocated: number;
  claimed: number;
  available: number;
  tokenBreakdown?: Array<{
    tokenMint: string;
    tokenSymbol: string;
    balance: number;
    totalAllocated: number;
    totalClaimed: number;
  }>;
};

// Store State
interface AdminStoreState {
  // Overview Data
  overviewMetrics: OverviewMetrics | null;
  recentActivity: RecentClaim[];
  activityLog: ActivityLogItem[];
  eligibleWallets: number;
  overviewLoading: boolean;
  overviewLastFetch: number | null;

  // Pools Data
  pools: Pool[];
  poolsLoading: boolean;
  poolsLastFetch: number | null;

  // Claims Data
  claims: RecentClaim[];
  claimsStats: ClaimStats | null;
  claimsLoading: boolean;
  claimsLastFetch: number | null;

  // Treasury Data
  treasury: TreasuryData | null;
  treasuryLoading: boolean;
  treasuryLastFetch: number | null;

  // Shared
  availablePools: Pool[];
  currentProjectId: string | null;

  // Actions
  setOverviewMetrics: (metrics: OverviewMetrics) => void;
  setRecentActivity: (activity: RecentClaim[]) => void;
  setActivityLog: (log: ActivityLogItem[]) => void;
  setEligibleWallets: (count: number) => void;
  setOverviewLoading: (loading: boolean) => void;

  setPools: (pools: Pool[]) => void;
  setPoolsLoading: (loading: boolean) => void;

  setClaims: (claims: RecentClaim[]) => void;
  setClaimsStats: (stats: ClaimStats) => void;
  setClaimsLoading: (loading: boolean) => void;

  setTreasury: (treasury: TreasuryData) => void;
  setTreasuryLoading: (loading: boolean) => void;

  setAvailablePools: (pools: Pool[]) => void;
  setCurrentProjectId: (id: string | null) => void;

  // Clear data when project changes
  clearProjectData: () => void;

  // Helper to check if refetch is needed (based on TTL)
  shouldRefetch: (lastFetch: number | null, ttl?: number) => boolean;
}

const DEFAULT_TTL = 30000; // 30 seconds
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes - data older than this is considered stale

// Create the store WITHOUT persist first
const createAdminStore = (set: any, get: any): AdminStoreState => ({
      // Initial State
      overviewMetrics: null,
      recentActivity: [],
      activityLog: [],
      eligibleWallets: 0,
      overviewLoading: false,
      overviewLastFetch: null,

      pools: [],
      poolsLoading: false,
      poolsLastFetch: null,

      claims: [],
      claimsStats: null,
      claimsLoading: false,
      claimsLastFetch: null,

      treasury: null,
      treasuryLoading: false,
      treasuryLastFetch: null,

      availablePools: [],
      currentProjectId: null,

      // Overview Actions
      setOverviewMetrics: (metrics: any) => set({ overviewMetrics: metrics, overviewLastFetch: Date.now() }),
      setRecentActivity: (activity: any[]) => set({ recentActivity: activity }),
      setActivityLog: (log: any[]) => set({ activityLog: log }),
      setEligibleWallets: (count: number) => set({ eligibleWallets: count }),
      setOverviewLoading: (loading: boolean) => set({ overviewLoading: loading }),

      // Pools Actions
      setPools: (pools: any[]) => set({ pools, poolsLastFetch: Date.now() }),
      setPoolsLoading: (loading: boolean) => set({ poolsLoading: loading }),

      // Claims Actions
      setClaims: (claims: any[]) => set({ claims, claimsLastFetch: Date.now() }),
      setClaimsStats: (stats: any) => set({ claimsStats: stats }),
      setClaimsLoading: (loading: boolean) => set({ claimsLoading: loading }),

      // Treasury Actions
      setTreasury: (treasury: any) => set({ treasury, treasuryLastFetch: Date.now() }),
      setTreasuryLoading: (loading: boolean) => set({ treasuryLoading: loading }),

      // Shared Actions
      setAvailablePools: (pools: any[]) => set({ availablePools: pools }),
      setCurrentProjectId: (id: string | null) => {
        const currentId = get().currentProjectId;
        if (currentId !== id) {
          // Project changed, clear all data immediately
          set({
            currentProjectId: id,
            overviewMetrics: null,
            recentActivity: [],
            activityLog: [],
            eligibleWallets: 0,
            overviewLastFetch: null,
            pools: [],
            poolsLastFetch: null,
            claims: [],
            claimsStats: null,
            claimsLastFetch: null,
            treasury: null,
            treasuryLastFetch: null,
            availablePools: [],
          });
        }
      },

      clearProjectData: () => set({
        overviewMetrics: null,
        recentActivity: [],
        activityLog: [],
        eligibleWallets: 0,
        overviewLastFetch: null,
        pools: [],
        poolsLastFetch: null,
        claims: [],
        claimsStats: null,
        claimsLastFetch: null,
        treasury: null,
        treasuryLastFetch: null,
        availablePools: [],
      }),

      shouldRefetch: (lastFetch: number | null, ttl: number = DEFAULT_TTL) => {
        if (!lastFetch) return true;
        return Date.now() - lastFetch > ttl;
      },
});

// Custom storage that includes project ID in the key
const projectAwareStorage: any = {
  getItem: (name: string): string | null => {
    const projectId = typeof window !== 'undefined' 
      ? localStorage.getItem('selectedProjectId') 
      : null;
    
    if (!projectId) {
      return sessionStorage.getItem(name);
    }
    
    const projectKey = `${name}-${projectId}`;
    return sessionStorage.getItem(projectKey);
  },
  setItem: (name: string, value: string): void => {
    const projectId = typeof window !== 'undefined' 
      ? localStorage.getItem('selectedProjectId') 
      : null;
    
    if (!projectId) {
      sessionStorage.setItem(name, value);
      return;
    }
    
    const projectKey = `${name}-${projectId}`;
    sessionStorage.setItem(projectKey, value);
  },
  removeItem: (name: string): void => {
    const projectId = typeof window !== 'undefined' 
      ? localStorage.getItem('selectedProjectId') 
      : null;
    
    if (!projectId) {
      sessionStorage.removeItem(name);
      return;
    }
    
    const projectKey = `${name}-${projectId}`;
    sessionStorage.removeItem(projectKey);
  },
};

export const useAdminStore = create<AdminStoreState>()(
  persist(createAdminStore, {
    name: 'admin-dashboard-storage',
    storage: createJSONStorage(() => projectAwareStorage),
    partialize: (state) => ({
      // Only persist data that should be cached, not loading states
      overviewMetrics: state.overviewMetrics,
      recentActivity: state.recentActivity,
      activityLog: state.activityLog,
      eligibleWallets: state.eligibleWallets,
      overviewLastFetch: state.overviewLastFetch,
      pools: state.pools,
      poolsLastFetch: state.poolsLastFetch,
      claims: state.claims,
      claimsStats: state.claimsStats,
      claimsLastFetch: state.claimsLastFetch,
      treasury: state.treasury,
      treasuryLastFetch: state.treasuryLastFetch,
      availablePools: state.availablePools,
      currentProjectId: state.currentProjectId,
    }),
    version: 1,
    migrate: (persistedState: any, version: number) => {
      // Check if cached data is too old and clear it
      const now = Date.now();
      if (persistedState.overviewLastFetch && now - persistedState.overviewLastFetch > CACHE_EXPIRY) {
        persistedState.overviewMetrics = null;
        persistedState.recentActivity = [];
        persistedState.activityLog = [];
        persistedState.eligibleWallets = 0;
        persistedState.overviewLastFetch = null;
      }
      if (persistedState.poolsLastFetch && now - persistedState.poolsLastFetch > CACHE_EXPIRY) {
        persistedState.pools = [];
        persistedState.poolsLastFetch = null;
      }
      if (persistedState.claimsLastFetch && now - persistedState.claimsLastFetch > CACHE_EXPIRY) {
        persistedState.claims = [];
        persistedState.claimsStats = null;
        persistedState.claimsLastFetch = null;
      }
      if (persistedState.treasuryLastFetch && now - persistedState.treasuryLastFetch > CACHE_EXPIRY) {
        persistedState.treasury = null;
        persistedState.treasuryLastFetch = null;
      }
      return persistedState;
    },
  })
);
