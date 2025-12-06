"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { formatTokenAmount } from "@/lib/formatters";
import { Copy, RefreshCw, AlertTriangle, ArrowDownToLine, X } from "lucide-react";
import { useProject } from "@/contexts/ProjectContext";
import { useWallet } from "@solana/wallet-adapter-react";
import { toast } from "sonner";

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

interface AvailableBalance {
  totalBalance: number;
  lockedInPools: number;
  available: number;
  vaultAddress: string;
}

export function TreasuryWidget() {
  const { currentProject } = useProject();
  const { publicKey } = useWallet();
  const [treasuryStatus, setTreasuryStatus] = useState<TreasuryStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTokenIndex, setActiveTokenIndex] = useState(0);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawRecipient, setWithdrawRecipient] = useState("");
  const [withdrawNote, setWithdrawNote] = useState("");
  const [withdrawTokenMint, setWithdrawTokenMint] = useState("");
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [balanceInfo, setBalanceInfo] = useState<AvailableBalance | null>(null);

  // Mock data for multi-token support if backend doesn't provide it yet
  const tokens = treasuryStatus?.treasury.tokens || [
    { symbol: treasuryStatus?.treasury.tokenMint ? "Token" : "GARG", balance: treasuryStatus?.treasury.balance || 0, mint: treasuryStatus?.treasury.tokenMint || "" }
  ];

  const activeToken = tokens[activeTokenIndex] || tokens[0];

  useEffect(() => {
    if (currentProject) {
      fetchTreasuryStatus();
      const interval = setInterval(fetchTreasuryStatus, 30000);
      return () => clearInterval(interval);
    }
  }, [currentProject?.id]);

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

  async function fetchTreasuryStatus() {
    try {
      setError(null);
      const data = await api.get<TreasuryStatus>(`/treasury/status${currentProject?.id ? `?projectId=${currentProject.id}` : ''}`);
      setTreasuryStatus(data);

      // Also fetch available balance for withdrawal
      if (currentProject?.id) {
        const balance = await api.get<AvailableBalance>(`/treasury/available?projectId=${currentProject.id}`);
        setBalanceInfo(balance);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch treasury status");
    } finally {
      setLoading(false);
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
      const response = await api.post<{ success: boolean; signature: string }>("/treasury/withdraw", {
        amount: parseFloat(withdrawAmount),
        recipientAddress: withdrawRecipient,
        note: withdrawNote,
        tokenMint: withdrawTokenMint,
      });

      toast.success(`Withdrawal successful! ${response.signature}`);
      setWithdrawOpen(false);
      setWithdrawAmount("");
      setWithdrawNote("");
      fetchTreasuryStatus();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Withdrawal failed";
      toast.error(errorMessage);
      console.error("Withdrawal error:", err);
    } finally {
      setWithdrawLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-950 border border-white/10 rounded-xl p-6 animate-pulse h-[400px]" />
    );
  }

  if (error || !treasuryStatus) {
    return (
      <div className="bg-slate-950 border border-red-500/20 rounded-xl p-6 flex flex-col items-center justify-center text-center">
        <AlertTriangle className="w-10 h-10 text-red-500 mb-4" />
        <p className="text-red-400 mb-4">{error || "Failed to load treasury status"}</p>
        <Button variant="outline" size="sm" onClick={fetchTreasuryStatus}>
          Retry Connection
        </Button>
      </div>
    );
  }

  const { treasury, allocations, status, recommendations } = treasuryStatus;
  const bufferPercentage = status.bufferPercentage;

  return (
    <div className="bg-slate-950 border border-white/10 rounded-xl overflow-hidden flex flex-col h-full">
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
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${status.health === "healthy"
            ? "bg-green-500/5 border-green-500/20 text-green-400"
            : status.health === "warning"
              ? "bg-yellow-500/5 border-yellow-500/20 text-yellow-400"
              : "bg-red-500/5 border-red-500/20 text-red-400"
            }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${status.health === "healthy" ? "bg-green-400" : status.health === "warning" ? "bg-yellow-400" : "bg-red-400"
              }`} />
            {status.health === "healthy" ? "Healthy" : status.health === "warning" ? "Warning" : "Critical"}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6 flex-1">
        {/* Main Balance */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Available Balance</p>
          </div>
          <div className="flex items-end gap-3">
            <span className="text-3xl font-bold text-white tracking-tight">{formatTokenAmount(activeToken.balance)}</span>
            <span className="text-sm text-slate-500 font-mono mb-1.5">{activeToken.symbol}</span>
          </div>

          <div className="flex items-center gap-2 mt-2 group cursor-pointer" onClick={copyAddress}>
            <code className="px-2 py-1 bg-slate-900 border border-white/10 rounded text-xs font-mono text-slate-400 group-hover:text-slate-300 group-hover:border-white/20 transition-colors">
              {treasury.address}
            </code>
            <Copy className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition-colors" />
          </div>
        </div>

        {/* All Tokens List */}
        {tokens.length > 1 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">All Tokens</p>
            <div className="space-y-1">
              {tokens.map((token, idx) => (
                <div
                  key={token.mint}
                  className={`flex justify-between items-center p-2 rounded-lg border transition-colors cursor-pointer ${activeTokenIndex === idx
                    ? "bg-purple-500/10 border-purple-500/30"
                    : "bg-slate-900/50 border-white/5 hover:border-white/10"
                    }`}
                  onClick={() => setActiveTokenIndex(idx)}
                >
                  <span className="text-xs font-medium text-slate-300">{token.symbol}</span>
                  <span className="text-xs font-mono text-slate-400">{formatTokenAmount(token.balance)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-white/[0.02] border border-white/5 rounded-lg">
            <p className="text-xs text-slate-500 mb-1">Total Allocated</p>
            <p className="text-sm font-mono text-slate-200">{formatTokenAmount(allocations.totalAllocated, false)}</p>
          </div>
          <div className="p-3 bg-white/[0.02] border border-white/5 rounded-lg">
            <p className="text-xs text-slate-500 mb-1">Total Claimed</p>
            <p className="text-sm font-mono text-slate-200">{formatTokenAmount(allocations.totalClaimed, false)}</p>
          </div>
        </div>

        {/* Locked/Available for Withdrawal */}
        {balanceInfo && (
          <div className="p-3 bg-purple-500/5 border border-purple-500/20 rounded-lg space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Locked in Pools</span>
              <span className="text-yellow-400 font-mono">{formatTokenAmount(balanceInfo.lockedInPools)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-white font-medium">Available to Withdraw</span>
              <span className="text-green-400 font-mono font-medium">{formatTokenAmount(balanceInfo.available)}</span>
            </div>
          </div>
        )}

        {/* Buffer Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">Treasury Buffer</span>
            <span className={status.health === "critical" ? "text-red-400" : "text-slate-300"}>{bufferPercentage}%</span>
          </div>
          <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${status.health === "healthy"
                ? "bg-green-500"
                : status.health === "warning"
                  ? "bg-yellow-500"
                  : "bg-red-500"
                }`}
              style={{ width: `${Math.min(bufferPercentage, 100)}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-600">
            Required: {formatTokenAmount(allocations.remainingNeeded, false)} • Available: {formatTokenAmount(status.buffer, false)}
          </p>
        </div>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-lg">
            <p className="text-xs font-medium text-blue-400 mb-2 flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3" /> Recommendations
            </p>
            <ul className="space-y-1">
              {recommendations.map((rec, idx) => (
                <li key={idx} className="text-[11px] text-blue-300/80 pl-3 relative before:content-['-'] before:absolute before:left-0 before:text-blue-500/50">
                  {rec}
                </li>
              ))}
            </ul>
          </div>
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
              <span className="text-xs font-medium text-white">Withdraw Tokens</span>
              <button onClick={() => setWithdrawOpen(false)} className="text-slate-500 hover:text-white">
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
                    {token.symbol} ({formatTokenAmount(token.balance)} available)
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="Amount"
                className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-purple-500/50 focus:outline-none"
              />
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
              disabled={!withdrawAmount || !withdrawRecipient || (balanceInfo ? parseFloat(withdrawAmount) > balanceInfo.available : false)}
              className="w-full bg-purple-500 hover:bg-purple-600 text-sm h-9"
            >
              Confirm Withdrawal
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
