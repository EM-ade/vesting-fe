import React from "react";
import { TrendingUp, TrendingDown, Activity, Users, Clock, AlertTriangle } from "lucide-react";

export interface TokenMetric {
  tokenMint: string;
  tokenSymbol: string;
  totalAllocated: number;
  totalClaimed: number;
  remainingNeeded: number;
  activePools: number;
  healthScore: number;
  projectedDays: number;
  recommendations: string[];
}

interface MultiTokenMetricsProps {
  tokenMetrics: Record<string, TokenMetric>;
  crossTokenMetrics: {
    totalTokenTypes: number;
    totalUsers: number;
    totalPools: number;
    totalAllocated: number;
    totalClaimed: number;
  };
  loading?: boolean;
}

export function MultiTokenMetrics({ tokenMetrics, crossTokenMetrics, loading = false }: MultiTokenMetricsProps) {
  const tokens = Object.values(tokenMetrics);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-slate-900/50 border border-white/10 rounded-lg p-4 animate-pulse">
            <div className="h-4 bg-slate-700 rounded mb-2"></div>
            <div className="h-8 bg-slate-700 rounded mb-3"></div>
            <div className="space-y-2">
              <div className="h-3 bg-slate-700 rounded w-3/4"></div>
              <div className="h-3 bg-slate-700 rounded w-1/2"></div>
              <div className="h-3 bg-slate-700 rounded w-2/3"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (tokens.length === 0) {
    return (
      <div className="bg-slate-900/50 border border-white/10 rounded-lg p-8 text-center">
        <Activity className="w-12 h-12 text-slate-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-400 mb-2">No Token Pools Active</h3>
        <p className="text-sm text-slate-600">Create your first vesting pool to see token metrics here.</p>
      </div>
    );
  }

  const getHealthColor = (score: number) => {
    if (score >= 80) return "text-red-400 bg-red-500/10";
    if (score >= 50) return "text-yellow-400 bg-yellow-500/10";
    if (score >= 20) return "text-blue-400 bg-blue-500/10";
    return "text-green-400 bg-green-500/10";
  };

  const getHealthIcon = (score: number) => {
    if (score >= 80) return <TrendingDown className="w-4 h-4" />;
    if (score >= 50) return <Activity className="w-4 h-4" />;
    return <TrendingUp className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Cross-Token Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-slate-900/30 border border-white/5 rounded-lg p-3">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Token Types</p>
          <p className="text-lg font-bold text-white">{crossTokenMetrics.totalTokenTypes}</p>
        </div>
        <div className="bg-slate-900/30 border border-white/5 rounded-lg p-3">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Total Pools</p>
          <p className="text-lg font-bold text-white">{crossTokenMetrics.totalPools}</p>
        </div>
        <div className="bg-slate-900/30 border border-white/5 rounded-lg p-3">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Total Users</p>
          <p className="text-lg font-bold text-white">{crossTokenMetrics.totalUsers.toLocaleString()}</p>
        </div>
        <div className="bg-slate-900/30 border border-white/5 rounded-lg p-3">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Total Allocated</p>
          <p className="text-lg font-bold text-purple-400">{crossTokenMetrics.totalAllocated.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="bg-slate-900/30 border border-white/5 rounded-lg p-3">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Total Claimed</p>
          <p className="text-lg font-bold text-green-400">{crossTokenMetrics.totalClaimed.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
      </div>

      {/* Individual Token Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tokens.map((token) => (
          <div
            key={token.tokenMint}
            className="bg-slate-900/50 border border-white/10 rounded-lg p-4 hover:bg-slate-900/70 transition-colors"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  {token.tokenSymbol.slice(0, 2)}
                </div>
                <div>
                  <h3 className="font-semibold text-white">{token.tokenSymbol}</h3>
                  <p className="text-xs text-slate-500">{token.activePools} pools</p>
                </div>
              </div>
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getHealthColor(token.healthScore)}`}>
                {getHealthIcon(token.healthScore)}
                {token.healthScore}%
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <p className="text-xs text-slate-500 mb-1">Allocated</p>
                <p className="text-sm font-mono text-purple-400">{token.totalAllocated.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Claimed</p>
                <p className="text-sm font-mono text-green-400">{token.totalClaimed.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Remaining</p>
                <p className="text-sm font-mono text-orange-400">{token.remainingNeeded.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Est. Days
                </p>
                <p className="text-sm font-mono text-blue-400">{token.projectedDays > 999 ? '999+' : token.projectedDays}</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>Progress</span>
                <span>{token.healthScore}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5">
                <div
                  className="bg-gradient-to-r from-green-500 to-blue-500 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(token.healthScore, 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Recommendations */}
            {token.recommendations.length > 0 && (
              <div className="bg-blue-500/5 border border-blue-500/10 rounded p-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-3 h-3 text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    {token.recommendations.slice(0, 2).map((rec, idx) => (
                      <p key={idx} className="text-xs text-blue-300/80 leading-tight">{rec}</p>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}