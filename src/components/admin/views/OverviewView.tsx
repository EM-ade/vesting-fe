"use client";

import { useEffect, useState } from "react";
import { useProject } from "@/contexts/ProjectContext";
import { api } from "@/lib/api";
import { formatTokenAmount } from "@/lib/formatters";
import { TrendingUp, Users, Wallet, Activity, ArrowUpRight } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatDistanceToNow } from "date-fns";

type OverviewMetrics = {
  totalValueLocked: number;
  totalClaimed: number;
  activePoolsCount: number;
  totalUsers: number;
  treasuryBalance: number;
};

type ClaimStats = {
  total: number;
  last24h: number;
  last7d: number;
  totalAmount: number;
  uniqueUsers: number;
};

type ActivityLogItem = {
  id: string;
  action: string;
  admin_wallet?: string;
  timestamp: string;
  details?: Record<string, unknown>;
};

type ChartData = {
  name: string;
  claims: number;
  date: string;
};

type RecentClaim = {
  id: string;
  wallet: string;
  amount: number;
  created_at: string;
  tx: string;
};

import { Skeleton } from "@/components/ui/Skeleton";

export function OverviewView() {
  const { currentProject } = useProject();
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentClaim[]>([]);
  const [claimStats, setClaimStats] = useState<ClaimStats | null>(null);
  const [eligibleWallets, setEligibleWallets] = useState<number>(0);
  const [activityLog, setActivityLog] = useState<ActivityLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMetrics = async () => {
      if (!currentProject?.id) return;
      setLoading(true);
      try {
        const [treasury, pools, historyStats, claims, claimsStatsRes, eligibleWalletsRes, activityLogRes] = await Promise.all([
          api.get<{ allocations: { totalAllocated: number; totalClaimed: number }; metrics: { claimCount: number }; treasury: { balance: number } }>(`/treasury/status?projectId=${currentProject?.id}`),
          api.get<Array<{ id: number; name: string; is_active: boolean }>>('/pools'),
          api.get<ChartData[]>('/metrics/claim-history-stats'),
          api.get<{ claims: RecentClaim[] }>('/claims?limit=5'),
          api.get<ClaimStats>('/claims/stats').catch(() => null),
          api.get<{ count: number }>('/metrics/eligible-wallets').catch(() => ({ count: 0 })),
          api.get<{ activities: ActivityLogItem[] }>('/metrics/activity-log?limit=10').catch(() => ({ activities: [] }))
        ]);

        setMetrics({
          totalValueLocked: treasury.allocations.totalAllocated,
          totalClaimed: treasury.allocations.totalClaimed,
          activePoolsCount: pools.length,
          totalUsers: treasury.metrics.claimCount,
          treasuryBalance: treasury.treasury.balance
        });

        // Safely map history stats
        const historyData = Array.isArray(historyStats) ? historyStats.map((item: { date?: string; count?: number }) => ({
            name: item.date ? new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Unknown',
            claims: item.count || 0,
            date: item.date || ''
        })) : [];
        
        setChartData(historyData);
        
        // Safely set recent activity
        setRecentActivity(Array.isArray(claims.claims) ? claims.claims : []);
        
        // Set new widgets data with safety checks
        if (claimsStatsRes) {
          console.log("Claims stats loaded:", claimsStatsRes);
          setClaimStats(claimsStatsRes);
        }
        setEligibleWallets(eligibleWalletsRes?.count || 0);
        setActivityLog(Array.isArray(activityLogRes?.activities) ? activityLogRes.activities : []);
      } catch (error) {
        console.error("Failed to load overview:", error);
        // Set empty defaults on error
        setMetrics({
            totalValueLocked: 0,
            totalClaimed: 0,
            activePoolsCount: 0,
            totalUsers: 0,
            treasuryBalance: 0
        });
      } finally {
        setLoading(false);
      }
    };

    if (currentProject?.id) {
      loadMetrics();
    }
  }, [currentProject?.id]);

  if (loading) return (
    <div className="space-y-8 animate-pulse">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48 bg-slate-900" />
        <Skeleton className="h-4 w-32 bg-slate-900" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32 rounded-xl bg-slate-900 border border-white/5" />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-[400px] rounded-xl border border-white/10 bg-slate-900/50 p-6">
          <div className="flex items-center justify-between mb-8">
            <Skeleton className="h-4 w-32 bg-slate-800" />
          </div>
          <div className="flex items-end gap-4 h-[280px] px-4 pb-4">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <Skeleton key={i} className="w-full bg-slate-800/50 rounded-t" style={{ height: `${Math.random() * 60 + 20}%` }} />
            ))}
          </div>
        </div>

        <div className="h-[400px] rounded-xl border border-white/10 bg-slate-900/50 flex flex-col">
          <div className="p-6 border-b border-white/5">
            <Skeleton className="h-4 w-24 bg-slate-800" />
          </div>
          <div className="flex-1 p-4 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="w-8 h-8 rounded-full bg-slate-800" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-3/4 bg-slate-800" />
                  <Skeleton className="h-2 w-1/2 bg-slate-800" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard Overview</h1>
        <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          SYSTEM OPERATIONAL
        </div>
      </div>
      
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          label="Total Value Locked" 
          value={formatTokenAmount(metrics?.totalValueLocked || 0)} 
          trend="+12.5%"
          icon={<Wallet className="w-4 h-4 text-slate-400" />}
        />
        <MetricCard 
          label="Total Claimed" 
          value={formatTokenAmount(metrics?.totalClaimed || 0)} 
          trend="+5.2%"
          icon={<TrendingUp className="w-4 h-4 text-slate-400" />}
        />
        <MetricCard 
          label="Active Pools" 
          value={metrics?.activePoolsCount.toString() || "0"} 
          icon={<Activity className="w-4 h-4 text-slate-400" />}
        />
        <MetricCard 
          label="Treasury Balance" 
          value={formatTokenAmount(metrics?.treasuryBalance || 0)} 
          icon={<Users className="w-4 h-4 text-slate-400" />}
        />
      </div>

      {/* Chart & Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2 bg-slate-950 border border-white/10 rounded-xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <ArrowUpRight className="w-4 h-4 text-slate-500" />
          </div>
          <h3 className="text-sm font-medium text-slate-400 mb-6 uppercase tracking-wider">Claim Activity</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorClaim" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#475569" 
                  tick={{fontSize: 10, fontFamily: 'monospace'}} 
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis 
                  stroke="#475569" 
                  tick={{fontSize: 10, fontFamily: 'monospace'}} 
                  tickLine={false}
                  axisLine={false}
                  dx={-10}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    border: '1px solid #1e293b', 
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontFamily: 'monospace'
                  }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="claims" 
                  stroke="#8b5cf6" 
                  strokeWidth={2} 
                  fillOpacity={1} 
                  fill="url(#colorClaim)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity List */}
        <div className="bg-slate-950 border border-white/10 rounded-xl p-0 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-white/5">
            <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Recent Events</h3>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[300px]">
            {recentActivity.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">No recent activity</div>
            ) : (
              <div className="divide-y divide-white/5">
                {recentActivity.map((claim) => (
                  <div key={claim.id} className="p-4 hover:bg-white/[0.02] transition-colors flex items-center gap-3 group">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500 group-hover:bg-purple-400 transition-colors" />
                    <div className="flex-1">
                      <p className="text-sm text-slate-300">
                        User <span className="font-mono text-xs text-slate-500">{claim.wallet.slice(0, 4)}...{claim.wallet.slice(-4)}</span> claimed <span className="text-white">{formatTokenAmount(claim.amount)}</span>
                      </p>
                      <p className="text-xs text-slate-600 font-mono mt-0.5">
                        {formatDistanceToNow(new Date(claim.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <a 
                      href={`https://solscan.io/tx/${claim.tx}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-1.5 text-slate-600 hover:text-white hover:bg-white/5 rounded transition-colors"
                    >
                      <ArrowUpRight className="w-3 h-3" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="p-4 border-t border-white/5 bg-slate-900/30">
            <button className="w-full text-xs text-slate-500 hover:text-white transition-colors uppercase tracking-wider font-medium">
              View All Activity
            </button>
          </div>
        </div>
      </div>

      {/* New Widgets Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Claims Statistics Widget */}
        {claimStats && (
          <div className="bg-slate-950 border border-white/10 rounded-xl p-6">
            <h3 className="text-sm font-medium text-slate-400 mb-6 uppercase tracking-wider">Claims Statistics</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-slate-500 text-xs mb-1">Total Claims</div>
                <div className="text-2xl font-bold text-white">{(claimStats.total || 0).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-slate-500 text-xs mb-1">Last 24h</div>
                <div className="text-2xl font-bold text-green-400">{(claimStats.last24h || 0).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-slate-500 text-xs mb-1">Last 7d</div>
                <div className="text-2xl font-bold text-blue-400">{(claimStats.last7d || 0).toLocaleString()}</div>
              </div>
            </div>
            <div className="mt-6 pt-6 border-t border-white/5 grid grid-cols-2 gap-4">
              <div>
                <div className="text-slate-500 text-xs mb-1">Total Amount</div>
                <div className="text-lg font-bold text-purple-400">{formatTokenAmount(claimStats.totalAmount || 0)}</div>
              </div>
              <div>
                <div className="text-slate-500 text-xs mb-1">Unique Users</div>
                <div className="text-lg font-bold text-orange-400">{(claimStats.uniqueUsers || 0).toLocaleString()}</div>
              </div>
            </div>
          </div>
        )}

        {/* Eligible Wallets Widget */}
        <div className="bg-slate-950 border border-white/10 rounded-xl p-6">
          <h3 className="text-sm font-medium text-slate-400 mb-6 uppercase tracking-wider">Eligible Wallets</h3>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-4xl font-bold text-white mb-2">{eligibleWallets.toLocaleString()}</div>
              <div className="text-slate-500 text-sm">Active vesting recipients</div>
            </div>
            <div className="p-4 bg-purple-500/10 rounded-full border border-purple-500/20">
              <Users className="w-8 h-8 text-purple-400" />
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-white/5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">With active vestings</span>
              <span className="text-green-400 font-medium">✓ Verified</span>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Log Widget */}
      {activityLog.length > 0 && (
        <div className="bg-slate-950 border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Recent Activity Log</h3>
            <button className="text-xs text-slate-500 hover:text-white transition-colors">
              View All →
            </button>
          </div>
          <div className="space-y-3">
            {activityLog.slice(0, 8).map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/[0.02] transition-colors">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-300">
                    <span className="font-medium text-white">{formatActivityAction(activity.action)}</span>
                    {activity.admin_wallet && (
                      <span className="text-slate-500 ml-2">
                        by <span className="font-mono text-xs">{activity.admin_wallet.slice(0, 6)}...{activity.admin_wallet.slice(-4)}</span>
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function formatActivityAction(action: string): string {
  const actionMap: Record<string, string> = {
    'create_pool': 'Pool Created',
    'update_pool': 'Pool Updated',
    'pause_pool': 'Pool Paused',
    'resume_pool': 'Pool Resumed',
    'cancel_pool': 'Pool Cancelled',
    'update_allocations': 'Allocations Updated',
    'treasury_withdrawal': 'Treasury Withdrawal',
    'snapshot_triggered': 'Snapshot Triggered',
    'deploy_streamflow': 'Deployed to Streamflow',
  };
  return actionMap[action] || action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function MetricCard({ label, value, icon, trend }: { label: string; value: string; icon: React.ReactNode; trend?: string }) {
  return (
    <div className="bg-slate-950 border border-white/10 p-6 rounded-xl hover:border-purple-500/20 transition-all group relative overflow-hidden">
      <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
      
      <div className="flex justify-between items-start mb-4 relative z-10">
        <h4 className="text-sm font-medium text-slate-500">{label}</h4>
        <div className="p-2 bg-slate-900 rounded-lg border border-white/5 text-slate-400 group-hover:text-purple-400 group-hover:border-purple-500/20 transition-colors">
          {icon}
        </div>
      </div>
      
      <div className="flex items-baseline gap-3 relative z-10">
        <span className="text-2xl font-bold text-slate-100 tracking-tight">{value}</span>
        {trend && (
          <span className="text-xs font-mono font-medium text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded">
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}
