import React, { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { api } from "@/lib/api";
import { useProject } from "@/contexts/ProjectContext";
import { TrendingUp, BarChart3, Activity } from "lucide-react";

interface ClaimDataPoint {
  date: string;
  amount: number;
  cumulativeAmount: number;
  count: number;
}

interface TokenClaimsTrendChartProps {
  selectedToken?: string; // 'all' or specific token mint
  tokenSymbol?: string;
  className?: string;
}

export function TokenClaimsTrendChart({ 
  selectedToken = 'all', 
  tokenSymbol = 'All Tokens',
  className = "" 
}: TokenClaimsTrendChartProps) {
  const { currentProject, dataRefreshKey } = useProject();
  const [claimData, setClaimData] = useState<ClaimDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartType, setChartType] = useState<'area' | 'line'>('area');

  useEffect(() => {
    if (currentProject?.id) {
      fetchClaimTrends();
    }
  }, [currentProject?.id, selectedToken, dataRefreshKey]);

  const fetchClaimTrends = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        projectId: currentProject!.id,
      });

      if (selectedToken && selectedToken !== 'all') {
        params.append('tokenMint', selectedToken);
      }

      const data = await api.get<ClaimDataPoint[]>(`/metrics/claim-history-stats?${params.toString()}`);
      setClaimData(data || []);
    } catch (err) {
      console.error('Failed to fetch claim trends:', err);
      setError(err instanceof Error ? err.message : 'Failed to load claim data');
    } finally {
      setLoading(false);
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-white/20 rounded-lg p-3 shadow-xl">
          <p className="text-sm font-medium text-white mb-1">{label}</p>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-slate-400">Daily Claims:</span>
              <span className="text-sm font-mono text-green-400">
                {data.amount?.toLocaleString(undefined, { maximumFractionDigits: 0 })} {tokenSymbol}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-slate-400">Cumulative:</span>
              <span className="text-sm font-mono text-blue-400">
                {data.cumulativeAmount?.toLocaleString(undefined, { maximumFractionDigits: 0 })} {tokenSymbol}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-slate-400">Transactions:</span>
              <span className="text-sm font-mono text-purple-400">{data.count}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className={`bg-slate-900/50 border border-white/10 rounded-lg p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-slate-700 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-slate-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-slate-900/50 border border-white/10 rounded-lg p-6 ${className}`}>
        <div className="text-center">
          <Activity className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-red-400 mb-2">Failed to Load Chart</h3>
          <p className="text-sm text-slate-500 mb-4">{error}</p>
          <button
            onClick={fetchClaimTrends}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white text-sm transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (claimData.length === 0) {
    return (
      <div className={`bg-slate-900/50 border border-white/10 rounded-lg p-6 ${className}`}>
        <div className="text-center">
          <BarChart3 className="w-12 h-12 text-slate-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-400 mb-2">No Claim Data</h3>
          <p className="text-sm text-slate-600">
            {selectedToken === 'all' 
              ? 'No claims have been made yet across any tokens.' 
              : `No claims have been made for ${tokenSymbol} yet.`
            }
          </p>
        </div>
      </div>
    );
  }

  const totalClaimed = claimData[claimData.length - 1]?.cumulativeAmount || 0;
  const totalTransactions = claimData.reduce((sum, d) => sum + d.count, 0);
  const avgDailyClaims = claimData.length > 0 ? totalClaimed / claimData.length : 0;

  return (
    <div className={`bg-slate-900/50 border border-white/10 rounded-lg p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">
            Claims Trend - {tokenSymbol}
          </h3>
          <p className="text-sm text-slate-500">
            {totalTransactions} transactions • {totalClaimed.toLocaleString(undefined, { maximumFractionDigits: 0 })} total claimed
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setChartType(chartType === 'area' ? 'line' : 'area')}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded text-xs text-slate-400 transition-colors"
          >
            {chartType === 'area' ? 'Line' : 'Area'}
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <p className="text-xs text-slate-500 mb-1">Total Claimed</p>
          <p className="text-lg font-mono text-green-400">{totalClaimed.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-500 mb-1">Avg Daily</p>
          <p className="text-lg font-mono text-blue-400">{avgDailyClaims.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-500 mb-1">Transactions</p>
          <p className="text-lg font-mono text-purple-400">{totalTransactions}</p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'area' ? (
            <AreaChart data={claimData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <defs>
                <linearGradient id="claimsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="cumulativeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.5} />
              <XAxis 
                dataKey="date" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#9ca3af' }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#claimsGradient)"
                name="Daily Claims"
              />
              <Area
                type="monotone"
                dataKey="cumulativeAmount"
                stroke="#3b82f6"
                strokeWidth={1}
                fill="url(#cumulativeGradient)"
                name="Cumulative"
              />
            </AreaChart>
          ) : (
            <LineChart data={claimData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.5} />
              <XAxis 
                dataKey="date" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#9ca3af' }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: '#10b981', strokeWidth: 2, r: 3 }}
                activeDot={{ r: 4, stroke: '#10b981', strokeWidth: 2 }}
                name="Daily Claims"
              />
              <Line
                type="monotone"
                dataKey="cumulativeAmount"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                name="Cumulative"
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}