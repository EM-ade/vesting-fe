import { useState, useEffect } from "react";
import { CircularProgress } from "@/components/ui/CircularProgress";
import { ChevronDown } from "lucide-react";

interface Pool {
  poolId: string;
  poolName: string;
  claimable: number;
  locked: number;
  claimed: number;
  share: number;
  nftCount: number;
  status: string;
}

interface TokenData {
  tokenMint: string;
  tokenSymbol: string;
  totalClaimable: number;
  totalLocked: number;
  totalClaimed: number;
  totalVested: number;
  vestedPercentage: number; // You might need to calculate this or get from backend
  nextUnlockTime: number;
  pools: Pool[];
}

interface VestingTokenCardProps {
  token: TokenData;
  onClaim: (token: TokenData) => void;
  formatNumber: (num: number) => string;
  formatCountdown: (seconds: number) => string;
}

export function VestingTokenCard({
  token,
  onClaim,
  formatNumber,
  formatCountdown,
}: VestingTokenCardProps) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [animatedPercentage, setAnimatedPercentage] = useState(0);
  const [liveCountdown, setLiveCountdown] = useState(0);

  // Calculate vested percentage if not provided (it might not be in the backend 'tokens' object directly based on controller readout?)
  // Controller returns: totalClaimable, totalLocked, totalClaimed, totalVested.
  // Percentage = totalVested / (totalVested + totalLocked) * 100? Or just totalVested / TotalAllocation?
  // Let's safe guard.
  const totalAllocation = token.totalVested + token.totalLocked;
  const vestedPct =
    totalAllocation > 0 ? (token.totalVested / totalAllocation) * 100 : 0;

  useEffect(() => {
    const target = vestedPct;
    const duration = 1500;
    const steps = 60;
    const increment = target / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setAnimatedPercentage(target);
        clearInterval(timer);
      } else {
        setAnimatedPercentage(current);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [vestedPct]);

  // Live countdown
  useEffect(() => {
    setLiveCountdown(
      Math.max(0, token.nextUnlockTime - Math.floor(Date.now() / 1000))
    );
    const timer = setInterval(() => {
      setLiveCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [token.nextUnlockTime]);

  const poolStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return {
          text: "Active",
          cls: "bg-green-500/15 text-green-400 border-green-500/30",
        };
      case "paused":
        return {
          text: "Paused",
          cls: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
        };
      case "cancelled":
        return {
          text: "Cancelled",
          cls: "bg-red-500/15 text-red-400 border-red-500/30",
        };
      case "fully_vested":
        return {
          text: "Fully Vested",
          cls: "bg-purple-500/15 text-purple-300 border-purple-500/30",
        };
      default:
        return {
          text: status,
          cls: "bg-white/10 text-white/80 border-white/20",
        };
    }
  };

  const poolProgressPct = (p: Pool) => {
    const total = (p.claimable ?? 0) + (p.locked ?? 0) + (p.claimed ?? 0);
    if (total <= 0) return 0;
    return ((p.claimed + p.claimable) / total) * 100;
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-6 hover:border-white/20 transition-colors">
      <div className="flex flex-col md:flex-row items-center gap-6">
        {/* Progress & Symbol */}
        <div className="relative shrink-0">
          <CircularProgress
            percentage={animatedPercentage}
            label={token.tokenSymbol || "TOKEN"} // Fallback symbol
            size={120}
            strokeWidth={8}
          />
        </div>

        {/* Stats */}
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          <div>
            <p className="text-sm text-white/60 mb-1">Total Claimable</p>
            <p className="text-2xl font-bold text-white">
              {formatNumber(token.totalClaimable)} {token.tokenSymbol}
            </p>
          </div>
          <div>
            <p className="text-sm text-white/60 mb-1">Locked Amount</p>
            <p className="text-xl font-semibold text-white/90">
              {formatNumber(token.totalLocked)}
            </p>
          </div>
          <div>
            <p className="text-sm text-white/60 mb-1">Total Claimed</p>
            <p className="text-white/90 font-medium">
              {formatNumber(token.totalClaimed)}
            </p>
          </div>
          <div>
            <p className="text-sm text-white/60 mb-1">Next Unlock</p>
            <p className="text-white/90 font-medium">
              {formatCountdown(liveCountdown)}
            </p>
          </div>
        </div>

        {/* Action */}
        <div className="shrink-0 w-full md:w-auto">
          <button
            onClick={() => onClaim(token)}
            disabled={token.totalClaimable <= 0}
            className="w-full md:w-auto rounded-lg bg-purple-600 px-6 py-3 font-semibold text-white transition-all hover:bg-purple-700 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 disabled:hover:bg-purple-600 shadow-lg shadow-purple-900/20"
          >
            Claim {token.tokenSymbol}
          </button>
        </div>
      </div>

      {/* Pools Toggle */}
      <div className="border-t border-white/5 pt-4">
        <button
          onClick={() => setShowBreakdown(!showBreakdown)}
          className="flex items-center gap-2 text-sm text-purple-300 hover:text-purple-200 transition-colors"
        >
          <span>
            {showBreakdown
              ? "Hide Pools"
              : `View Pools (${token.pools.length})`}
          </span>
          <ChevronDown
            className={`w-4 h-4 transition-transform ${
              showBreakdown ? "rotate-180" : ""
            }`}
          />
        </button>

        {showBreakdown && (
          <div className="mt-4 space-y-3 animate-in slide-in-from-top-2 fade-in duration-300">
            {token.pools.map((pool) => {
              const total =
                (pool.claimable ?? 0) +
                (pool.locked ?? 0) +
                (pool.claimed ?? 0);
              const isFullyVested = pool.locked <= 0 && total > 0;
              const derivedStatus = isFullyVested
                ? "fully_vested"
                : pool.status === "active"
                ? "active"
                : pool.status;
              const badge = poolStatusBadge(derivedStatus);
              const progress = poolProgressPct(pool);
              const isDisabled =
                pool.status === "paused" || pool.status === "cancelled";

              return (
                <div
                  key={pool.poolId}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border p-4 text-sm ${
                    isDisabled
                      ? "border-white/5 bg-white/2 opacity-60"
                      : "border-white/10 bg-black/20"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`px-2 py-1 rounded text-xs font-semibold border ${badge.cls} shrink-0`}
                    >
                      {badge.text}
                    </div>
                    <div>
                      <p className="font-semibold text-white">
                        {pool.poolName}
                      </p>
                      <div className="text-xs text-white/60 mt-1 space-x-2">
                        <span>
                          Claimable:{" "}
                          <span className="text-white">
                            {formatNumber(pool.claimable)}
                          </span>
                        </span>
                        <span>•</span>
                        <span>Locked: {formatNumber(pool.locked)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <div className="text-xs text-white/50">Vested</div>
                      <div className="font-mono text-white/90">
                        {progress.toFixed(0)}%
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
