/**
 * Zustand Store - UI State Only
 * After TanStack Query migration, Zustand only handles client-side UI state
 * All server state (data fetching) is now handled by TanStack Query
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface UIState {
  // Sidebar state
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  // Active tab/view (if needed for client-side routing state)
  activeTab: string;
  setActiveTab: (tab: string) => void;

  // Filter states (for pools, claims, etc.)
  poolsFilter: 'all' | 'active' | 'paused' | 'cancelled';
  setPoolsFilter: (filter: 'all' | 'active' | 'paused' | 'cancelled') => void;

  claimsFilter: 'all' | '24h' | '7d';
  setClaimsFilter: (filter: 'all' | '24h' | '7d') => void;

  // Modal states (if you want to persist modal open/close across refreshes)
  createPoolModalOpen: boolean;
  setCreatePoolModalOpen: (open: boolean) => void;

  // Selected items (for multi-select, etc.)
  selectedPoolIds: string[];
  setSelectedPoolIds: (ids: string[]) => void;
  togglePoolSelection: (id: string) => void;
  clearPoolSelection: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      // Initial state
      sidebarOpen: true,
      activeTab: 'overview',
      poolsFilter: 'all',
      claimsFilter: 'all',
      createPoolModalOpen: false,
      selectedPoolIds: [],

      // Sidebar actions
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      // Tab actions
      setActiveTab: (tab) => set({ activeTab: tab }),

      // Filter actions
      setPoolsFilter: (filter) => set({ poolsFilter: filter }),
      setClaimsFilter: (filter) => set({ claimsFilter: filter }),

      // Modal actions
      setCreatePoolModalOpen: (open) => set({ createPoolModalOpen: open }),

      // Selection actions
      setSelectedPoolIds: (ids) => set({ selectedPoolIds: ids }),
      togglePoolSelection: (id) => {
        const { selectedPoolIds } = get();
        if (selectedPoolIds.includes(id)) {
          set({ selectedPoolIds: selectedPoolIds.filter((pid) => pid !== id) });
        } else {
          set({ selectedPoolIds: [...selectedPoolIds, id] });
        }
      },
      clearPoolSelection: () => set({ selectedPoolIds: [] }),
    }),
    {
      name: 'vesting-ui-state',
      storage: createJSONStorage(() => localStorage), // UI state can use localStorage
      partialize: (state) => ({
        // Only persist specific UI state
        sidebarOpen: state.sidebarOpen,
        poolsFilter: state.poolsFilter,
        claimsFilter: state.claimsFilter,
        // Don't persist modals or selections
      }),
    }
  )
);
