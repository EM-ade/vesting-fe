"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { formatTokenAmount } from "@/lib/formatters";
import {
  Copy,
  RefreshCw,
  AlertTriangle,
  ArrowDownToLine,
  X,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import { useProject } from "@/contexts/ProjectContext";
import { useWallet } from "@solana/wallet-adapter-react";
import { toast } from "sonner";
import { withAdminAuth } from "@/lib/adminAuth";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { fadeInUp, staggerContainer, cardVariants } from "@/lib/animations";

type TreasuryStatus = {
  treasury: {
    address: string;
    balance: number;
    tokenMint: string;
    tokens?: { symbol: string; balance: number; mint: string }[];
  };
  allocations: {
    totalAllocated: number;
    totalClaimed: number;
    remainingNeeded: number;
  };
  tokenBreakdown?: Array<{
    tokenMint: string;
    tokenSymbol: string;
    balance: number;
    totalAllocated: number;
    totalClaimed: number;
    locked: number;
    available: number;
  }>;
  status: {
    health: "healthy" | "warning" | "critical";
    buffer: number;
    bufferPercentage: number;
    sufficientFunds: boolean;
  };
  streamflow?: {
    deployed: boolean;
    poolBalance: number;
  };
  recommendations: string[];
};

type PoolBreakdown = {
  success: boolean;
  pools: Array<{
    id: string;
    name: string;
    description: string;
    tokenMint: string;
    tokenSymbol: string;
    totalAllocated: number;
    totalClaimed: number;
    remainingNeeded: number;
    userCount: number;
    vestingDuration: number;
    cliffDuration: number;
    startTime: string;
    endTime: string;
    vestingMode: string;
  }>;
  tokenBreakdown: Array<{
    tokenMint: string;
    tokenSymbol: string;
    totalAllocated: number;
    totalClaimed: number;
    remainingNeeded: number;
    poolCount: number;
  }>;
  summary: {
    totalPools: number;
    totalAllocated: number;
    totalClaimed: number;
    totalUsers: number;
    uniqueTokens: number;
  };
};

interface AvailableBalance {
  totalBalance: number;
  lockedInPools: number;
  available: number;
  vaultAddress: string;
}

export function TreasuryWidget() {
  const wallet = useWallet();
  const { currentProject, dataRefreshKey } = useProject();
  const { publicKey } = wallet;
  const queryClient = useQueryClient();
  const [treasuryStatus, setTreasuryStatus] = useState<TreasuryStatus | null>(
    null
  );
  const [poolBreakdown, setPoolBreakdown] = useState<PoolBreakdown | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawRecipient, setWithdrawRecipient] = useState("");
  const [withdrawNote, setWithdrawNote] = useState("");
  const [withdrawTokenMint, setWithdrawTokenMint] = useState("");
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [balanceInfo, setBalanceInfo] = useState<AvailableBalance | null>(null);
  const [expandedTokens, setExpandedTokens] = useState<Set<string>>(new Set());
  const [showPoolBreakdown, setShowPoolBreakdown] = useState(false);

  // Use tokens from backend if available, otherwise create default with project symbol
  const tokens =
    treasuryStatus?.treasury.tokens && treasuryStatus.treasury.tokens.length > 0
      ? treasuryStatus.treasury.tokens
      : [
          {
            symbol: currentProject?.symbol || "Token",
            balance: treasuryStatus?.treasury.balance || 0,
            mint: treasuryStatus?.treasury.tokenMint || "",
          },
        ];

  const activeToken = tokens[0] || { symbol: "N/A", balance: 0, mint: "" };

  // Check if currently selected token for withdrawal is SOL
  const selectedWithdrawToken = tokens.find(
    (t) => t.mint === withdrawTokenMint
  );
  const isSOLWithdraw = selectedWithdrawToken?.symbol === "SOL";

  useEffect(() => {
    if (currentProject) {
      fetchTreasuryStatus();
      fetchPoolBreakdown();
      const interval = setInterval(() => {
        fetchTreasuryStatus();
        fetchPoolBreakdown();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [currentProject?.id, dataRefreshKey]);

  useEffect(() => {
    // Default recipient to connected wallet
    if (publicKey && !withdrawRecipient) {
      setWithdrawRecipient(publicKey.toBase58());
    }
  }, [publicKey, withdrawRecipient]);

  useEffect(() => {
    // Default withdraw token to active token
    if (activeToken && !withdrawTokenMint) {
      setWithdrawTokenMint(activeToken.mint);
    }
  }, [activeToken, withdrawTokenMint]);

  // Refresh available balance when token selection changes
  useEffect(() => {
    if (currentProject?.id && withdrawTokenMint) {
      api
        .get<AvailableBalance>(
          `/treasury/available?projectId=${currentProject.id}&tokenMint=${withdrawTokenMint}`
        )
        .then(setBalanceInfo)
        .catch(() => {
          // Non-fatal: keep previous balanceInfo
        });
    }
  }, [currentProject?.id, withdrawTokenMint]);

  async function fetchTreasuryStatus() {
    try {
      setLoading(true);
      setError(null);
      
      // Add timeout to prevent infinite hangs
      const TIMEOUT_MS = 30000; // 30 seconds
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Treasury data took too long to load. Please check your connection and try again.')), TIMEOUT_MS)
      );

      const fetchPromise = api.get<TreasuryStatus>(
        `/treasury/status${
          currentProject?.id ? `?projectId=${currentProject.id}` : ""
        }`
      );

      const data = await Promise.race([fetchPromise, timeoutPromise]);
      setTreasuryStatus(data);

      // Also fetch available balance for withdrawal (for selected token) - non-blocking
      // Only fetch if we have a token selected (avoid empty tokenMint parameter)
      if (currentProject?.id && withdrawTokenMint) {
        api.get<AvailableBalance>(
          `/treasury/available?projectId=${currentProject.id}&tokenMint=${withdrawTokenMint}`
        )
        .then(balance => setBalanceInfo(balance))
        .catch(err => {
          console.warn('Failed to fetch available balance:', err);
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch treasury status";
      setError(errorMessage);
      console.error('Treasury status fetch error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchPoolBreakdown() {
    if (!currentProject?.id) return;

    try {
      const data = await api.get<PoolBreakdown>(
        `/treasury/pools?projectId=${currentProject.id}`
      );
      setPoolBreakdown(data);
    } catch (err) {
      console.warn("Failed to fetch pool breakdown:", err);
      // Non-fatal error, keep existing poolBreakdown
    }
  }

  const copyAddress = () => {
    if (treasuryStatus?.treasury.address) {
      navigator.clipboard.writeText(treasuryStatus.treasury.address);
      toast.success("Address copied to clipboard");
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (!withdrawRecipient) {
      toast.error("Please enter a recipient address");
      return;
    }

    if (!currentProject?.id) {
      toast.error("No project selected");
      return;
    }

    if (!withdrawTokenMint) {
      toast.error("Please select a token");
      return;
    }

    setWithdrawLoading(true);
    try {
      // Choose endpoint based on token type
      const endpoint = isSOLWithdraw
        ? "/treasury/withdraw-sol"
        : "/treasury/withdraw";

      // Sign admin message with wallet (proves you own the admin wallet)
      const requestBody = await withAdminAuth(wallet, {
        amount: parseFloat(withdrawAmount),
        recipientAddress: withdrawRecipient,
        note: withdrawNote,
        tokenMint: isSOLWithdraw ? undefined : withdrawTokenMint, // Only send tokenMint for SPL tokens
        projectId: currentProject?.id, // Include projectId in body for middleware
      });

      const response = await api.post<{ success: boolean; signature: string }>(
        endpoint,
        requestBody
      );

      toast.success("Withdrawal Successful", {
        description: (
          <div className="flex flex-col gap-2 mt-1">
            <p className="text-xs text-slate-400">
              Transaction verified and confirmed.
            </p>
            <a
              href={`https://solscan.io/tx/${response.signature}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
            >
              View on Solscan <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        ),
        duration: 8000,
      });
      setWithdrawOpen(false);
      setWithdrawAmount("");
      setWithdrawNote("");
      setWithdrawRecipient("");
      fetchTreasuryStatus();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Withdrawal failed";
      toast.error(errorMessage);
      console.error("Withdrawal error:", err);
    } finally {
      setWithdrawLoading(false);
    }
  };

  // Show loading skeleton while fetching (but not if we have stale data)
  if (loading && !treasuryStatus) {
    return (
      <motion.div 
        className="bg-slate-950 border border-white/10 rounded-xl p-6 space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="h-6 w-40 bg-white/5 rounded animate-pulse" />
          <div className="h-8 w-8 bg-white/5 rounded animate-pulse" />
        </div>
        
        {/* Metrics skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <motion.div 
              key={i} 
              className="bg-white/5 rounded-lg p-4 space-y-3"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1, duration: 0.3 }}
            >
              <div className="h-4 w-24 bg-white/10 rounded animate-pulse" />
              <div className="h-8 w-32 bg-white/10 rounded animate-pulse" />
            </motion.div>
          ))}
        </div>
        
        {/* Chart skeleton */}
        <div className="h-48 bg-white/5 rounded-lg animate-pulse" />
        
        <p className="text-center text-white/40 text-xs">Loading treasury data...</p>
      </motion.div>
    );
  }

  // Show error state with retry option
  if (error || !treasuryStatus) {
    return (
      <div className="bg-slate-950 border border-red-500/20 rounded-xl p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">Failed to Load Treasury</h3>
        <p className="text-white/60 mb-6 max-w-md mx-auto text-sm">
          {error || "Unable to fetch treasury status. This may be due to network issues or RPC timeout."}
        </p>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" size="sm" onClick={fetchTreasuryStatus}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              // Invalidate all admin queries to force refetch
              queryClient.invalidateQueries({ queryKey: ['admin', currentProject?.id] });
            }}
          >
            Refresh Data
          </Button>
        </div>
        <p className="text-xs text-white/40 mt-4">
          Tip: Treasury data requires blockchain queries which may take longer on slow connections.
        </p>
      </div>
    );
  }

  const { treasury, allocations, status, recommendations } = treasuryStatus;
  const bufferPercentage = status.bufferPercentage;

  return (
    <motion.div 
      className="bg-slate-950 border border-white/10 rounded-xl overflow-hidden flex flex-col h-full"
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
    >
      <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-900/30">
        <div>
          <h2 className="font-medium text-white">Treasury Status</h2>
          <p className="text-xs text-slate-500">Project Vault & Allocations</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchTreasuryStatus}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4 text-white" />
          </button>
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${
              status.health === "healthy"
                ? "bg-green-500/5 border-green-500/20 text-green-400"
                : status.health === "warning"
                ? "bg-yellow-500/5 border-yellow-500/20 text-yellow-400"
                : "bg-red-500/5 border-red-500/20 text-red-400"
            }`}
          >
            <div
              className={`w-1.5 h-1.5 rounded-full ${
                status.health === "healthy"
                  ? "bg-green-400"
                  : status.health === "warning"
                  ? "bg-yellow-400"
                  : "bg-red-400"
              }`}
            />
            {status.health === "healthy"
              ? "Healthy"
              : status.health === "warning"
              ? "Warning"
              : "Low Balance"}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6 flex-1">
        {/* Assets List */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Vault Assets
            </p>
            <div
              className="flex items-center gap-2 group cursor-pointer"
              onClick={copyAddress}
            >
              <code className="px-2 py-1 bg-slate-900 border border-white/10 rounded text-xs font-mono text-slate-400 group-hover:text-slate-300 group-hover:border-white/20 transition-colors">
                {treasury.address.slice(0, 4)}...{treasury.address.slice(-4)}
              </code>
              <Copy className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition-colors" />
            </div>
          </div>

          <motion.div 
            className="space-y-2"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {tokens.map((token, index) => (
              <motion.div
                key={token.mint}
                className="bg-white/[0.02] border border-white/5 rounded-lg p-3 flex justify-between items-center"
                variants={cardVariants}
                whileHover="hover"
                transition={{ delay: index * 0.05 }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold text-xs">
                    {token.symbol[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">
                      {token.symbol}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono">
                      {token.mint.slice(0, 4)}...{token.mint.slice(-4)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono text-white font-medium">
                    {token.balance.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 6,
                    })}
                  </p>
                  <p className="text-[10px] text-slate-500">Total Balance</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <motion.div 
            className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-lg"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <p className="text-xs font-medium text-blue-400 mb-2 flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3" /> Recommendations
            </p>
            <ul className="space-y-1">
              {recommendations.map((rec, idx) => (
                <li
                  key={idx}
                  className="text-[11px] text-blue-300/80 pl-3 relative before:content-['-'] before:absolute before:left-0 before:text-blue-500/50"
                >
                  {rec}
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </div>

      {/* Withdraw Section */}
      <div className="p-4 border-t border-white/5 bg-slate-900/30">
        {!withdrawOpen ? (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs h-9 text-white hover:bg-purple-500/10 hover:text-purple-400 border border-white/10 hover:border-purple-500/30"
            onClick={() => setWithdrawOpen(true)}
          >
            <ArrowDownToLine className="w-3.5 h-3.5 mr-2" /> Withdraw Tokens
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-white">
                Withdraw Tokens
              </span>
              <button
                onClick={() => setWithdrawOpen(false)}
                className="text-slate-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <select
                value={withdrawTokenMint}
                onChange={(e) => setWithdrawTokenMint(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-purple-500/50 focus:outline-none"
              >
                {tokens.map((token) => (
                  <option key={token.mint} value={token.mint}>
                    {token.symbol} (
                    {token.balance.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 6,
                    })}{" "}
                    available)
                  </option>
                ))}
              </select>
              <div className="relative">
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="Amount"
                  className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-purple-500/50 focus:outline-none"
                />
                {/* Available balance hint */}
                <div className="mt-1 text-xs text-slate-500">
                  Available:{" "}
                  {isSOLWithdraw
                    ? selectedWithdrawToken?.balance.toLocaleString(undefined, {
                        maximumFractionDigits: 6,
                      }) || "0"
                    : balanceInfo?.available.toLocaleString(undefined, {
                        maximumFractionDigits: 6,
                      }) || "Loading..."}{" "}
                  {selectedWithdrawToken?.symbol}
                </div>
              </div>
              <input
                type="text"
                value={withdrawRecipient}
                onChange={(e) => setWithdrawRecipient(e.target.value)}
                placeholder="Recipient address"
                className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-purple-500/50 focus:outline-none font-mono"
              />
              <input
                type="text"
                value={withdrawNote}
                onChange={(e) => setWithdrawNote(e.target.value)}
                placeholder="Note (optional)"
                className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-purple-500/50 focus:outline-none"
              />
            </div>

            <Button
              onClick={handleWithdraw}
              loading={withdrawLoading}
              disabled={
                !withdrawAmount ||
                !withdrawRecipient ||
                (isSOLWithdraw
                  ? parseFloat(withdrawAmount) >
                    (selectedWithdrawToken?.balance || 0)
                  : balanceInfo
                  ? parseFloat(withdrawAmount) > balanceInfo.available
                  : false)
              }
              className="w-full bg-purple-500 hover:bg-purple-600 text-sm h-9"
            >
              Confirm Withdrawal
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
