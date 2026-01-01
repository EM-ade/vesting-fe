"use client";

import { useState } from "react";
import { useProject } from "@/contexts/ProjectContext";
import { formatTokenAmount } from "@/lib/formatters";
import {
  TrendingUp,
  Users,
  Wallet,
  Activity,
  ArrowUpRight,
  Plus,
  Clock,
  CheckCircle,
  RefreshCw,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { CreateVestingModal } from "@/components/vesting/CreateVestingModal";
import { Button } from "@/components/ui/Button";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { useAdminDashboardQuery, usePoolsQuery } from "@/hooks/queries";
import { usePrefetchAllTabs } from "@/hooks/queries/usePrefetchQueries";

type OverviewMetrics = {
  totalValueLocked: number;
  totalClaimed: number;
  activePoolsCount: number;
  totalUsers: number;
  treasuryBalance: number;
};

type ClaimStats = {
  uniqueUsers: number;
};

type ActivityLogItem = {
  id: string;
  action: string;
  admin_wallet?: string;
  wallet?: string; // For claim events - the claimer's wallet
  timestamp: string;
  created_at?: string;
  details?: Record<string, unknown>;
  signature?: string; // Transaction signature for Solscan link
};

type RecentClaim = {
  id: string;
  wallet: string;
  amount: number;
  created_at: string;
  timestamp?: string;
  signature: string;
};

type DashboardData = {
  metrics: OverviewMetrics;
  recentActivity: RecentClaim[];
  eligibleWallets: number;
  activityLog: ActivityLogItem[];
  availablePools: Array<{ id: string; name: string }>;
};

export function OverviewView() {
  const { currentProject, refreshData: refreshProject } = useProject();
  const [selectedPoolIds, setSelectedPoolIds] = useState<string[]>([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // TanStack Query: Dashboard data with automatic caching and zero-flicker
  const { 
    data: dashboardData, 
    isLoading, 
    isFetching,
    isError,
    error,
    refetch 
  } = useAdminDashboardQuery(currentProject?.id || null, selectedPoolIds);

  // TanStack Query: Available pools for filter dropdown
  const { data: availablePools = [] } = usePoolsQuery(currentProject?.id || null);

  // Prefetch other tabs in background for instant navigation
  usePrefetchAllTabs(currentProject?.id || null, selectedPoolIds);

  // Extract data from batch response
  const metrics = dashboardData?.data?.treasury ? {
    totalValueLocked: dashboardData.data.treasury.allocations?.totalAllocated || 0,
    totalClaimed: dashboardData.data.treasury.allocations?.totalClaimed || 0,
    activePoolsCount: dashboardData.data.pools?.filter((p: any) => p.is_active).length || 0,
    totalUsers: dashboardData.data.treasury.metrics?.claimCount || 0,
    treasuryBalance: dashboardData.data.treasury.treasury?.balance || 0,
  } : null;

  const recentActivity = dashboardData?.data?.claims?.claims || [];
  // Use recent claims as activity log (same data structure as Claims Management tab)
  const activityLog = recentActivity.slice(0, 10); // Show last 10 claims as activity
  const eligibleWallets = dashboardData?.data?.eligibleWallets?.count || 0;

  const poolOptions = availablePools.map((p: any) => ({
    label: p.name,
    value: p.id.toString(),
  }));

  // Show skeleton immediately on initial load OR when changing projects
  // This gives instant feedback on navigation
  // ANTI-FLICKER FIX: Only show skeleton if we're loading AND have no cached data
  // TanStack Query provides cached data immediately, so we can show stale data while refetching
  if (isLoading && !dashboardData) {
    return <DashboardSkeleton />;
  }

  // Show error state with retry if load failed and no cached data
  if (isError && !dashboardData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-4 px-4">
        <div className="text-center max-w-md space-y-4">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-xl font-bold text-white">Failed to Load Dashboard</h3>
          <p className="text-white/60 text-sm leading-relaxed">
            {error instanceof Error ? error.message : 'Unable to fetch dashboard data. This may be due to a slow network connection or server timeout.'}
          </p>
          <div className="flex gap-3 justify-center mt-6">
            <Button 
              onClick={() => refetch()} 
              className="bg-purple-500 hover:bg-purple-600"
            >
              <ArrowUpRight className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
          <p className="text-xs text-white/40 mt-4">
            Tip: Check your internet connection or try refreshing in a few moments.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Subtle loading indicator when refreshing with cached data */}
      {isFetching && dashboardData && (
        <div className="fixed top-4 right-4 z-50 bg-purple-500/90 backdrop-blur-sm text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-in slide-in-from-top duration-300">
          <RefreshCw className="w-3 h-3 animate-spin" />
          <span className="text-sm font-medium">Refreshing...</span>
        </div>
      )}
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-space text-white">
            Dashboard Overview
          </h1>
          <p className="text-gray-400 mt-1">
            Monitor and manage your vesting operations
          </p>
        </div>
        <div className="flex items-center gap-4">
          <MultiSelect
            options={poolOptions}
            selected={selectedPoolIds}
            onChange={setSelectedPoolIds}
            placeholder="Filter by Pool..."
            className="w-64"
          />
          <Button
            onClick={() => setCreateModalOpen(true)}
            className="bg-purple-500 hover:bg-purple-600 text-white h-9"
          >
            <Plus className="w-4 h-4" /> Create Pool
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          label="Total Value Locked"
          value={formatTokenAmount(metrics?.totalValueLocked || 0)}
          icon={<Wallet className="w-4 h-4 text-purple-400" />}
          gradient="from-purple-500/10 to-blue-500/5"
        />
        <MetricCard
          label="Total Claimed"
          value={formatTokenAmount(metrics?.totalClaimed || 0)}
          icon={<TrendingUp className="w-4 h-4 text-green-400" />}
          gradient="from-green-500/10 to-emerald-500/5"
        />
        <MetricCard
          label="Active Pools"
          value={metrics?.activePoolsCount.toString() || "0"}
          icon={<Activity className="w-4 h-4 text-blue-400" />}
        />
        <MetricCard
          label="Treasury Balance"
          value={formatTokenAmount(metrics?.treasuryBalance || 0)}
          icon={<Users className="w-4 h-4 text-orange-400" />}
        />
      </div>

      {/* Main Content Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Admin Activity Log (Expanded) */}
        <div className="lg:col-span-2 bg-slate-950 border border-white/10 rounded-xl overflow-hidden flex flex-col h-[600px]">
          <div className="p-6 border-b border-white/10 flex justify-between items-center bg-slate-900/30">
            <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" /> Recent Activity Log
            </h3>
            <span className="text-xs text-slate-500">Real-time updates</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
            {activityLog && activityLog.length > 0 ? (
              activityLog.map((claim: RecentClaim) => (
                <div
                  key={claim.id}
                  className="group flex items-start gap-4 p-4 rounded-lg hover:bg-white/[0.02] border border-transparent hover:border-white/5 transition-all"
                >
                  <div className="mt-1.5 w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <p className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">
                        Claim Completed
                      </p>
                      <span className="text-[10px] text-slate-500 font-mono bg-slate-900 px-2 py-0.5 rounded border border-white/5">
                        {claim.timestamp || claim.created_at
                          ? formatDistanceToNow(
                              new Date(
                                claim.timestamp || claim.created_at || ""
                              ),
                              { addSuffix: true }
                            )
                          : "just now"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      {/* Claimer's wallet */}
                      <span className="text-xs text-slate-500">
                        By{" "}
                        <span className="text-slate-400 font-mono">
                          {claim.wallet.slice(0, 4)}...
                          {claim.wallet.slice(-4)}
                        </span>
                      </span>
                      {/* Amount */}
                      <span className="text-xs text-green-400 font-medium border-l border-slate-800 pl-3">
                        +{formatTokenAmount(claim.amount)}
                      </span>
                      {/* Solscan link */}
                      <a
                        href={`https://solscan.io/tx/${claim.signature}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-400 hover:text-purple-300 hover:underline text-[10px] flex items-center gap-1 border-l border-slate-800 pl-3"
                      >
                        <ArrowUpRight className="w-3 h-3" />
                        View on Solscan
                      </a>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <Activity className="w-10 h-10 mb-4 opacity-20" />
                <p>No activity recorded yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Stacked Widgets */}
        <div className="space-y-6">
          {/* Eligible Wallets Card */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-white/10 rounded-xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-10">
              <Users className="w-24 h-24" />
            </div>
            <h3 className="text-sm font-medium text-slate-400 mb-4 uppercase tracking-wider">
              Eligible Wallets
            </h3>
            <div className="flex items-end gap-3 mb-4">
              <span className="text-4xl font-bold text-white tracking-tight">
                {eligibleWallets.toLocaleString()}
              </span>
              <span className="text-sm text-slate-500 mb-1.5">recipients</span>
            </div>
            <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 w-full animate-pulse"
                style={{ width: "100%" }}
              ></div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-green-400 bg-green-500/5 py-1.5 px-3 rounded-lg border border-green-500/10 w-fit">
              <CheckCircle className="w-3 h-3" /> All active & verified
            </div>
          </div>

          {/* Recent Claims List */}
          <div className="bg-slate-950 border border-white/10 rounded-xl overflow-hidden flex flex-col h-[380px]">
            <div className="p-4 border-b border-white/10 bg-slate-900/30">
              <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wider">
                Recent Claims
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {recentActivity.length ? (
                <div className="divide-y divide-white/5">
                  {recentActivity.map((claim: any, i: number) => (
                    <div
                      key={i}
                      className="p-4 hover:bg-white/[0.02] transition-colors flex justify-between items-center group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-500/10 rounded-lg text-green-400 group-hover:bg-green-500/20 transition-colors">
                          <ArrowUpRight className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-mono text-slate-300">
                            {claim.wallet?.slice(0, 4)}...
                            {claim.wallet?.slice(-4)}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            {claim.created_at || claim.timestamp
                              ? formatDistanceToNow(
                                  new Date(
                                    claim.created_at || claim.timestamp || ""
                                  ),
                                  { addSuffix: true }
                                )
                              : "just now"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-white">
                          +{formatTokenAmount(claim.amount)}
                        </p>
                        <a
                          href={`https://solscan.io/tx/${claim.signature}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-purple-400 hover:text-purple-300 hover:underline"
                        >
                          View TX
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-500">
                  No recent claims
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <CreateVestingModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        mode="snapshot"
        onModeChange={() => {}}
        onSuccess={() => {
          setCreateModalOpen(false);
          refreshProject();
          refetch(); // Refresh TanStack Query cache
        }}
      />
    </div>
  );
}

function formatActivityAction(action: string): string {
  const actionMap: Record<string, string> = {
    create_pool: "Pool Created",
    update_pool: "Pool Updated",
    pause_pool: "Pool Paused",
    resume_pool: "Pool Resumed",
    cancel_pool: "Pool Cancelled",
    update_allocations: "Allocations Updated",
    treasury_withdrawal: "Treasury Withdrawal",
    snapshot_triggered: "Snapshot Triggered",
    deploy_streamflow: "Deployed to Streamflow",
    claim_completed: "Claim Completed", // Add claim event
    claim: "Claim Completed",
  };
  return (
    actionMap[action] ||
    action.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
  );
}

function MetricCard({
  label,
  value,
  icon,
  trend,
  gradient,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  trend?: string;
  gradient?: string;
}) {
  return (
    <div
      className={`bg-slate-950 border border-white/10 p-6 rounded-xl hover:border-purple-500/20 transition-all group relative overflow-hidden ${
        gradient ? `bg-gradient-to-br ${gradient}` : ""
      }`}
    >
      <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full transform translate-x-8 -translate-y-8 group-hover:scale-110 transition-transform blur-xl" />
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className="p-2 bg-slate-900/50 rounded-lg border border-white/5 backdrop-blur-sm">
            {icon}
          </div>
          {trend && (
            <span className="text-xs text-green-400 font-medium bg-green-500/10 px-2.5 py-1 rounded-full border border-green-500/10">
              {trend}
            </span>
          )}
        </div>
        <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
          {label}
        </h3>
        <p className="text-2xl font-bold text-white font-mono tracking-tight">
          {value}
        </p>
      </div>
    </div>
  );
}
