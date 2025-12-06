"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatTokenAmount } from "@/lib/formatters";
import { Button } from "@/components/ui/Button";
import { Plus, Users, MoreHorizontal, Search, Filter, StopCircle, Pause, Play, Trash2, Loader2 } from "lucide-react";
import { CreateVestingModal } from "@/components/vesting/CreateVestingModal";
import { PoolDetailsModal } from "@/components/admin/modals/PoolDetailsModal";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { cn } from "@/lib/utils";

import { Skeleton } from "@/components/ui/Skeleton";

// Define pool interface
interface Pool {
  id: string;
  name: string;
  vestingMode: string;
  state: string;
  totalAmount: number;
  start_time?: string;
  is_active?: boolean;
  startTime: string;  // Required by PoolDetailsModal
  endTime: string;    // Required by PoolDetailsModal
  vestingDuration: number;  // Required by PoolDetailsModal
  cliffDuration: number;    // Required by PoolDetailsModal
  streamflowId?: string;
  stats?: {
    userCount: number;
  };
  streamflow?: {
    vestedPercentage: number;
  };
  [key: string]: unknown; // allow for additional properties
}

export function PoolsView() {
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [poolToCancel, setPoolToCancel] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "paused" | "cancelled">("all");

  useEffect(() => {
    loadPools();
  }, []);

  const loadPools = async () => {
    setLoading(true);
    try {
      const data = await api.get<Pool[]>('/pools');
      setPools(data || []);
    } catch (error) {
      console.error("Failed to load pools:", error);
    } finally {
      setLoading(false);
    }
  };

  const confirmCancelPool = (poolId: string) => {
    setPoolToCancel(poolId);
    setCancelModalOpen(true);
  };

  const handleCancelPool = async () => {
    if (!poolToCancel) return;

    setCancelLoading(true);
    try {
      // Check if pool has started to determine action
      const pool = pools.find(p => p.id === poolToCancel);
      const poolStarted = pool?.start_time ? new Date(pool.start_time) <= new Date() : false;

      if (poolStarted) {
        // Pool has started - use cancel action via admin endpoint
        await api.patch(`/admin/pool/${poolToCancel}/state`, {
          action: 'cancel',
          reason: 'Cancelled by admin'
        });
      } else {
        // Pool hasn't started - use delete endpoint
        await api.delete(`/pools/${poolToCancel}`);
      }

      // Optimistic update
      setPools(currentPools => currentPools.filter(p => p.id !== poolToCancel));

      // Refresh list to be sure
      loadPools();

      setCancelModalOpen(false);
      setPoolToCancel(null);
    } catch (error) {
      console.error("Failed to cancel pool:", error);
      // Could add toast here
    } finally {
      setCancelLoading(false);
    }
  };

  const handlePoolClick = (pool: Pool) => {
    setSelectedPool(pool);
    setDetailsModalOpen(true);
  };

  const filteredPools = pools.filter(pool => {
    if (activeFilter === "all") return true;
    return (pool.state || 'active').toLowerCase() === activeFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Vesting Pools</h1>
          <p className="text-slate-400 text-sm mt-1">Manage distribution schedules and allocations</p>
        </div>

        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
            <input
              type="text"
              placeholder="Search pools..."
              className="w-full bg-slate-950 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50 transition-all"
            />
          </div>

          <div className="relative">
            <button
              onClick={() => setFilterOpen(!filterOpen)}
              className="p-2 bg-slate-950 border border-white/10 rounded-lg text-slate-400 hover:text-white hover:border-white/20 transition-all flex items-center gap-2 h-full"
            >
              <Filter className="w-4 h-4" />
              <span className="text-xs font-medium capitalize">{activeFilter === "all" ? "Filter" : activeFilter}</span>
            </button>

            {filterOpen && (
              <div className="absolute right-0 top-full mt-2 w-40 bg-slate-950 border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-1">
                  {(["all", "active", "paused", "cancelled"] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => {
                        setActiveFilter(filter);
                        setFilterOpen(false);
                      }}
                      className={cn(
                        "w-full text-left px-3 py-2 text-xs font-medium rounded-lg transition-colors capitalize",
                        activeFilter === filter ? "bg-purple-500/10 text-purple-400" : "text-slate-400 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Button onClick={() => setCreateModalOpen(true)} className="bg-white text-black hover:bg-slate-200 font-medium text-sm flex items-center gap-2 px-4 rounded-lg">
            <Plus className="w-4 h-4" /> Create Pool
          </Button>
        </div>
      </div>

      {/* Pools List - Technical View */}
      <div className="bg-slate-950 border border-white/10 rounded-xl overflow-x-auto pb-20 md:pb-0">
        <div className="min-w-[800px] grid grid-cols-12 gap-4 p-4 border-b border-white/5 bg-slate-900/30 text-xs font-mono text-slate-500 uppercase tracking-wider">
          <div className="col-span-4">Pool Name / ID</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2">Recipients</div>
          <div className="col-span-3">Allocation Progress</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>

        <div className="divide-y divide-white/5 min-w-[800px]">
          {loading ? (
            // Loading Skeletons
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="grid grid-cols-12 gap-4 p-4 items-center">
                <div className="col-span-4 flex items-center gap-3">
                  <Skeleton className="w-8 h-8 rounded bg-slate-900" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32 bg-slate-900" />
                    <Skeleton className="h-3 w-24 bg-slate-900" />
                  </div>
                </div>
                <div className="col-span-2">
                  <Skeleton className="h-6 w-20 rounded-full bg-slate-900" />
                </div>
                <div className="col-span-2">
                  <Skeleton className="h-4 w-12 bg-slate-900" />
                </div>
                <div className="col-span-3 space-y-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-3 w-16 bg-slate-900" />
                    <Skeleton className="h-3 w-8 bg-slate-900" />
                  </div>
                  <Skeleton className="h-1.5 w-full rounded-full bg-slate-900" />
                </div>
                <div className="col-span-1 flex justify-end">
                  <Skeleton className="h-8 w-8 rounded bg-slate-900" />
                </div>
              </div>
            ))
          ) : (
            <>
              {filteredPools.map((pool) => (
                <PoolRow
                  key={pool.id}
                  pool={pool}
                  onClick={() => handlePoolClick(pool)}
                  onCancel={() => confirmCancelPool(pool.id)}
                />
              ))}

              {filteredPools.length === 0 && (
                <div className="py-16 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 rounded-full bg-slate-900 border border-white/5 flex items-center justify-center mb-4">
                    <Users className="w-6 h-6 text-slate-600" />
                  </div>
                  <h3 className="text-slate-300 font-medium mb-1">No pools found</h3>
                  <p className="text-slate-500 text-sm max-w-xs mb-6">
                    {activeFilter !== "all" ? "Try changing your filters." : "Get started by creating your first vesting pool for token distribution."}
                  </p>
                  {activeFilter === "all" && (
                    <Button variant="outline" onClick={() => setCreateModalOpen(true)}>
                      Create Pool
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <CreateVestingModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        mode="snapshot"
        onModeChange={() => { }}
        onSuccess={loadPools}
      />

      <PoolDetailsModal
        open={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        pool={selectedPool}
        onUpdate={loadPools}
      />

      <ConfirmationModal
        open={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        onConfirm={handleCancelPool}
        title="Cancel Vesting Pool"
        description="This will permanently deactivate the pool and stop all future vesting streams. This action cannot be undone. Funds may need to be manually reclaimed."
        confirmText="Yes, Cancel Pool"
        variant="danger"
        loading={cancelLoading}
      />
    </div>
  );
}

function PoolRow({ pool, onClick, onCancel }: { pool: Pool, onClick: () => void, onCancel: () => void }) {
  const percentage = pool.streamflow?.vestedPercentage || 0;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [pauseLoading, setPauseLoading] = useState(false);

  // Check if pool has started
  const poolStarted = pool.start_time ? new Date(pool.start_time) <= new Date() : false;
  const isPaused = pool.is_active === false;

  // Close menu when clicking outside
  useEffect(() => {
    if (isMenuOpen) {
      const handleClick = () => setIsMenuOpen(false);
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [isMenuOpen]);

  const handlePauseResume = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    setPauseLoading(true);
    try {
      // Use the correct admin endpoint with action
      await api.patch(`/admin/pool/${pool.id}/state`, {
        action: isPaused ? 'resume' : 'pause'
      });
      // Refresh the pool list
      window.location.reload();
    } catch (error) {
      console.error('Failed to toggle pool state:', error);
    } finally {
      setPauseLoading(false);
    }
  };

  return (
    <div
      onClick={onClick}
      className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-white/[0.02] transition-colors group relative cursor-pointer"
    >
      {/* ... existing row content ... */}
      <div className="col-span-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 font-bold text-xs">
            {pool.name?.substring(0, 2).toUpperCase() || "NA"}
          </div>
          <div>
            <h3 className="font-medium text-slate-200 text-sm">{pool.name}</h3>
            <p className="text-xs font-mono text-slate-500 mt-0.5">{pool.vestingMode} • {pool.id?.slice(0, 6)}...</p>
          </div>
        </div>
      </div>

      <div className="col-span-2">
        <div className={cn(
          "inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-medium uppercase tracking-wide border",
          pool.state === 'active'
            ? "bg-green-500/5 text-green-400 border-green-500/20"
            : "bg-yellow-500/5 text-yellow-400 border-yellow-500/20"
        )}>
          <span className={cn("w-1.5 h-1.5 rounded-full", pool.state === 'active' ? "bg-green-400" : "bg-yellow-400")}></span>
          {pool.state === 'active' ? 'Active' : (pool.state === 'cancelled' ? 'Cancelled' : (pool.state || 'Active'))}
        </div>
      </div>

      <div className="col-span-2">
        <div className="flex items-center gap-1.5 text-sm text-slate-300">
          <Users className="w-3.5 h-3.5 text-slate-500" />
          {pool.stats?.userCount || 0}
        </div>
      </div>

      <div className="col-span-3">
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs">
            <span className="font-mono text-slate-400">{formatTokenAmount(pool.totalAmount)}</span>
            <span className="text-slate-500">{percentage}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500 rounded-full transition-all duration-500"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </div>

      <div className="col-span-1 text-right relative">
        <button
          onClick={(e) => {
            e.stopPropagation();
            // Calculate position to render fixed if needed, but simplified strategy:
            // Just use fixed positioning for the menu to break out of overflow container
            setIsMenuOpen(!isMenuOpen);
          }}
          className="p-1.5 text-slate-500 hover:text-white transition-colors rounded hover:bg-white/5"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>

        {isMenuOpen && (
          // Using portal-like strategy by rendering fixed with calculated position would be best,
          // but for simplicity in this stack, let's try fixed right alignment
          // Actually, right: 0 inside a relative parent in an overflow container still gets clipped.
          // The only way to break out of overflow-x-auto is position: fixed.
          <div
            className="absolute right-0 top-full mt-2 w-48 bg-slate-950 border border-white/10 rounded-xl shadow-xl z-[999] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            style={{ position: 'absolute', right: '100%', marginRight: '10px', top: '-10px' }}
          >
            <div className="p-1 space-y-1">
              <button
                onClick={handlePauseResume}
                disabled={pauseLoading}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-blue-400 hover:bg-blue-500/10 hover:text-blue-300 rounded-lg transition-colors disabled:opacity-50"
              >
                {pauseLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : isPaused ? (
                  <Play className="w-3.5 h-3.5" />
                ) : (
                  <Pause className="w-3.5 h-3.5" />
                )}
                {isPaused ? 'Resume Pool' : 'Pause Pool'}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuOpen(false);
                  onCancel();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-lg transition-colors"
              >
                {poolStarted ? (
                  <>
                    <StopCircle className="w-3.5 h-3.5" /> Cancel Pool
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" /> Delete Pool
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
