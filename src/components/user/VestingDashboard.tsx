"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import { Connection } from "@solana/web3.js";
import { WalletConnectButton } from "./WalletConnectButton";
import { apiClient } from "@/lib/apiClient";
import { RetryPrompt } from "@/components/ui/RetryPrompt";
import { useSimpleClaim } from "@/hooks/useSimpleClaim";
import { DEMO_WALLET, DEMO_SUMMARY, DEMO_HISTORY } from "@/lib/demoData";
import { VestingTokenCard } from "./VestingTokenCard";

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
  nextUnlockTime: number;
  pools: Pool[];
}

interface SummaryData {
  tokens: TokenData[];
  totalClaimable: number;
  totalLocked: number;
  totalClaimed: number;
  totalVested: number;
}

interface ClaimHistoryItem {
  id: string;
  date: string;
  amount: number;
  transactionSignature: string;
  status: string;
  poolName: string;
}

type Tab = "overview" | "history";

export function VestingDashboard() {
  const [wallet, setWallet] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [history, setHistory] = useState<ClaimHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [successToast, setSuccessToast] = useState<{
    message: string;
    signature: string;
  } | null>(null);

  // Track which token is being claimed. Null means no modal.
  const [claimingToken, setClaimingToken] = useState<TokenData | null>(null);

  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const isInitialLoad = useRef(true);
  const [demoMode, setDemoMode] = useState(false);

  const RPC_URL =
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
  const connection = useMemo(() => new Connection(RPC_URL), [RPC_URL]);

  const loadSummary = useCallback(async () => {
    if (!wallet) {
      setSummary(null);
      return;
    }

    if (demoMode) {
      setLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 500));
      // Wrap demo data to match new structure if necessary, or assume demo data is updated
      // For now, sticking to a basic cast or simple mock transformation if DEMO_SUMMARY is old
      // Assuming DEMO_SUMMARY is updated or we handle it.
      // Let's create a mock structure if DEMO_SUMMARY is old style
      const mockTokens = [
        {
          tokenMint: "MockMint123",
          tokenSymbol: "$GARG",
          ...DEMO_SUMMARY,
        },
      ];
      setSummary({ ...DEMO_SUMMARY, tokens: mockTokens } as any);
      setLoading(false);
      setLastUpdated(new Date());
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get<SummaryData>(
        `/user/vesting/summary-all?wallet=${wallet}`,
        {
          timeout: 30000,
          retries: 1,
          retryDelay: 1000,
          cache: "no-store",
        }
      );
      setLastUpdated(new Date());

      // Polyfill for legacy/flat response structure (backward compatibility)
      // If response lacks 'tokens' but has 'pools', wrap it in a default token
      const anyResponse = response as any;
      if (anyResponse && !anyResponse.tokens && anyResponse.pools) {
        const defaultToken: TokenData = {
          tokenMint: "default-garg-mint",
          tokenSymbol: "$GARG",
          totalClaimable: anyResponse.totalClaimable || 0,
          totalLocked: anyResponse.totalLocked || 0,
          totalClaimed: anyResponse.totalClaimed || 0,
          totalVested: anyResponse.totalVested || 0,
          nextUnlockTime: anyResponse.nextUnlockTime || 0,
          pools: anyResponse.pools.map((p: any) => ({
            poolId: p.poolId,
            poolName: p.poolName,
            claimable: p.claimable ?? p.balances?.unlocked ?? 0,
            locked: p.locked ?? p.balances?.locked ?? 0,
            claimed: p.claimed ?? p.balances?.totalClaimed ?? 0,
            share: p.share ?? p.userShare?.percentage ?? 0,
            nftCount: p.nftCount ?? 0,
            status: p.status ?? p.poolState ?? "active",
          })),
        };

        setSummary({
          tokens: [defaultToken],
          totalClaimable: anyResponse.totalClaimable || 0,
          totalLocked: anyResponse.totalLocked || 0,
          totalClaimed: anyResponse.totalClaimed || 0,
          totalVested: anyResponse.totalVested || 0,
        });
      } else {
        setSummary(response);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      if (!error.message.includes("404")) {
        setError(error);
      }
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [wallet, demoMode]);

  const loadHistory = useCallback(async () => {
    if (!wallet) {
      setHistory([]);
      return;
    }

    if (demoMode) {
      setHistory(DEMO_HISTORY);
      return;
    }

    try {
      const response = await apiClient.get<ClaimHistoryItem[]>(
        `/user/vesting/claim-history?wallet=${wallet}`,
        {
          timeout: 30000,
          retries: 1,
          retryDelay: 1000,
          cache: "no-store",
        }
      );
      setHistory(response ?? []);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      if (!error.message.includes("404")) {
        setError(error);
        console.error("[HISTORY] Error loading claim history:", err);
      }
    }
  }, [wallet, demoMode]);

  const loadHistoryWithTimestamp = useCallback(async () => {
    await loadHistory();
    setLastUpdated(new Date());
  }, [loadHistory]);

  useEffect(() => {
    const handleRefreshSummary = () => {
      void loadSummary();
    };
    window.addEventListener("refresh-summary", handleRefreshSummary);
    return () => {
      window.removeEventListener("refresh-summary", handleRefreshSummary);
    };
  }, [loadSummary]);

  useEffect(() => {
    void loadSummary();
    void loadHistoryWithTimestamp();

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadHistory();
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [loadSummary, loadHistory, loadHistoryWithTimestamp]);

  const handleWalletChange = useCallback((newWallet: string | null) => {
    setWallet(newWallet);
    setSummary(null);
    setHistory([]);
    setError(null);
    setLastUpdated(null);
    isInitialLoad.current = true;
    setDemoMode(false);
  }, []);

  const toggleDemoMode = useCallback(() => {
    const newDemoMode = !demoMode;
    setDemoMode(newDemoMode);

    if (newDemoMode) {
      setWallet(DEMO_WALLET);
      setSummary(null);
      setHistory([]);
      setError(null);
    } else {
      setWallet(null);
      setSummary(null);
      setHistory([]);
      setError(null);
    }
  }, [demoMode]);

  const formatNumber = (num: number) => {
    return num.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatCountdown = (seconds: number) => {
    if (seconds <= 0) return "Fully unlocked";
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  const formatDateTime = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  // Skeleton loader component matching DashboardSkeleton pattern
  const SkeletonLoader = ({ height = "h-12" }: { height?: string }) => (
    <div
      className={`${height} animate-pulse rounded-xl bg-slate-800/50 border border-white/5`}
    />
  );

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col bg-gradient-to-b from-[#0c0b25] via-[#0c0b25] to-[#08071a] px-4 py-8 text-white">
      {/* Success Toast */}
      {successToast && (
        <div className="fixed top-4 right-4 z-50 max-w-md animate-in slide-in-from-top-5 fade-in">
          <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-4 shadow-lg backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-500/20">
                <svg
                  className="h-5 w-5 text-green-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-green-400">
                  {successToast.message}
                </p>
                <a
                  href={`https://solscan.io/tx/${successToast.signature}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 text-xs text-green-400/80 hover:text-green-400 underline"
                >
                  View transaction →
                </a>
              </div>
              <button
                onClick={() => setSuccessToast(null)}
                className="shrink-0 text-white/60 hover:text-white transition-colors"
              >
                <svg
                  className="h-5 w-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Image
              src="/WhatsApp Image 2025-10-04 at 12.46.50 PM.jpeg"
              alt="Lil Gargs"
              width={48}
              height={48}
              className="h-12 w-12 shrink-0 rounded-full border-2 border-purple-500/50"
            />
            <h1 className="text-xl sm:text-2xl font-bold truncate">
              Lil Gargs Vesting
            </h1>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={toggleDemoMode}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                demoMode
                  ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/50 hover:bg-yellow-500/30"
                  : "bg-purple-500/20 text-purple-300 border border-purple-500/50 hover:bg-purple-500/30"
              }`}
            >
              {demoMode ? "✨ Exit Demo" : "👁️ View Demo"}
            </button>
            <WalletConnectButton onWalletChange={handleWalletChange} />
          </div>
        </div>

        {demoMode && (
          <div className="rounded-xl border-2 border-yellow-500/50 bg-yellow-500/10 p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg
                  className="h-6 w-6 text-yellow-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-yellow-300 mb-1">
                  Demo Mode Active
                </h3>
                <p className="text-xs text-yellow-200/80">
                  You&apos;re viewing sample data. No wallet connection
                  required.
                </p>
              </div>
            </div>
          </div>
        )}

        {wallet && !demoMode && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <span className="text-xs text-white/40">
              Last updated:{" "}
              {lastUpdated ? lastUpdated.toLocaleTimeString() : "Never"}
            </span>
            <button
              onClick={() => {
                void loadSummary();
                void loadHistoryWithTimestamp();
              }}
              disabled={loading}
              className="w-full sm:w-auto rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 transition-colors hover:bg-white/10 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-6">
          <RetryPrompt
            error={error}
            retrying={loading}
            retryCount={retryCount}
            onRetry={() => {
              setRetryCount((prev) => prev + 1);
              void loadSummary();
              void loadHistory();
            }}
            onDismiss={() => setError(null)}
          />
        </div>
      )}

      {!wallet && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white/60">
          <p>Connect your wallet to view your vesting rewards</p>
        </div>
      )}

      {wallet &&
        !loading &&
        summary &&
        (!summary.tokens || summary.tokens.length === 0) && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white/60">
            <p>No active vesting pools found for this wallet.</p>
          </div>
        )}

      {wallet && loading && !summary && (
        <div className="space-y-6">
          <SkeletonLoader height="h-40" />
          <SkeletonLoader height="h-32" />
          <SkeletonLoader height="h-32" />
        </div>
      )}

      {wallet && summary && summary.tokens && summary.tokens.length > 0 && (
        <div className="space-y-6">
          <div className="flex gap-2 border-b border-white/10">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === "overview"
                  ? "border-b-2 border-purple-500 text-white"
                  : "text-white/60 hover:text-white"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === "history"
                  ? "border-b-2 border-purple-500 text-white"
                  : "text-white/60 hover:text-white"
              }`}
            >
              History
            </button>
          </div>

          {activeTab === "overview" && (
            <div className="grid grid-cols-1 gap-6">
              {loading && !summary ? (
                <>
                  <SkeletonLoader height="h-40" />
                  <SkeletonLoader height="h-40" />
                </>
              ) : (
                summary.tokens.map((token) => (
                  <VestingTokenCard
                    key={token.tokenMint}
                    token={token}
                    onClaim={(t) => setClaimingToken(t)}
                    formatNumber={formatNumber}
                    formatCountdown={formatCountdown}
                  />
                ))
              )}
            </div>
          )}

          {activeTab === "history" && (
            <div className="space-y-4">
              {loading ? (
                <>
                  <SkeletonLoader height="h-24" />
                  <SkeletonLoader height="h-24" />
                </>
              ) : (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-white/80">
                    Claim Transactions
                  </h3>
                  {history.length === 0 ? (
                    <p className="text-xs text-white/50">
                      No claim transactions yet.
                    </p>
                  ) : (
                    history.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-2xl bg-white/5 border border-white/10 p-4 hover:bg-white/8 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-semibold text-green-400">
                                Claimed
                              </span>
                            </div>
                            <p className="text-lg font-bold text-white mb-1">
                              +{formatNumber(item.amount)}
                            </p>
                            <p className="text-xs text-white/60">
                              {item.poolName}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-white/60 mb-2">
                              {formatDateTime(item.date)}
                            </div>
                            <a
                              href={`https://solscan.io/tx/${item.transactionSignature}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300"
                            >
                              View Tx ↗
                            </a>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Claim Modal */}
      {claimingToken && summary && (
        <ClaimModal
          token={claimingToken}
          onClose={() => setClaimingToken(null)}
          onSuccess={(message, signature) => {
            setSuccessToast({ message, signature });
            if (!demoMode) {
              apiClient.clearCache(`vesting-summary-${wallet}`);
              apiClient.clearCache(`claim-history-${wallet}`);
            }
            void loadSummary();
            void loadHistoryWithTimestamp();
            setClaimingToken(null);
          }}
          wallet={wallet || ""}
          connection={connection}
          demoMode={demoMode}
        />
      )}
    </div>
  );
}

interface ClaimModalProps {
  token: TokenData;
  onClose: () => void;
  onSuccess: (message: string, signature: string) => void;
  wallet: string;
  connection: Connection;
  demoMode?: boolean;
}

function ClaimModal({ token, onClose, onSuccess, demoMode }: ClaimModalProps) {
  const [amount, setAmount] = useState<string>("");
  const [claimStep, setClaimStep] = useState<
    "input" | "signing" | "processing"
  >("input");
  const [localError, setLocalError] = useState<string | null>(null);
  const {
    executeClaim,
    loading,
    status,
    progress,
    error: claimError,
    reset,
  } = useSimpleClaim();

  useEffect(() => {
    setLocalError(null);
  }, [token]);

  const handleQuickAmount = (percentage: number) => {
    const value = (token.totalClaimable * percentage) / 100;
    setAmount(value.toFixed(2));
  };

  const handleClaim = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setLocalError("Please enter a valid amount");
      return;
    }

    const claimAmount = parseFloat(amount);
    const MIN_CLAIM_AMOUNT = 0.001;
    if (claimAmount < MIN_CLAIM_AMOUNT) {
      setLocalError(`Minimum claim amount is ${MIN_CLAIM_AMOUNT} tokens`);
      return;
    }

    if (claimAmount > token.totalClaimable) {
      setLocalError(
        `Amount exceeds available balance of ${token.totalClaimable.toFixed(2)}`
      );
      return;
    }

    setLocalError(null);
    setClaimStep("signing");

    if (demoMode) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      onSuccess(
        `Demo: Successfully claimed ${claimAmount.toLocaleString()} ${
          token.tokenSymbol
        }`,
        "DemoTxSignature...123abc"
      );
      return;
    }

    try {
      // Pass tokenMint to executeClaim
      const result = await executeClaim(claimAmount, token.tokenMint);

      if (result) {
        onSuccess(
          `Successfully claimed ${result.amountClaimed.toLocaleString()} ${
            token.tokenSymbol
          }`,
          result.signature
        );
      } else {
        setLocalError("Transaction failed. Please try again.");
        setClaimStep("input");
      }
    } catch (err) {
      let errorMessage = "Something went wrong. Please try again.";
      if (err instanceof Error) {
        const msg = err.message.toLowerCase();
        if (msg.includes("user rejected") || msg.includes("user cancelled")) {
          errorMessage = "You cancelled the transaction.";
        } else if (msg.includes("insufficient funds")) {
          errorMessage = "Insufficient SOL for transaction fee.";
        }
      }
      setLocalError(errorMessage);
      setClaimStep("input");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0c0b25] p-6 shadow-xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">
            Claim {token.tokenSymbol}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
            disabled={loading}
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {claimStep === "input" && (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm text-white/60">Amount to count</label>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-lg font-bold text-white placeholder-white/20 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-white/40">
                  {token.tokenSymbol}
                </div>
              </div>
              <div className="flex justify-between text-xs text-white/40">
                <span>
                  Available: {token.totalClaimable.toFixed(2)}{" "}
                  {token.tokenSymbol}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              {[25, 50, 75, 100].map((pct) => (
                <button
                  key={pct}
                  onClick={() => handleQuickAmount(pct)}
                  className="flex-1 rounded-lg border border-white/10 bg-white/5 py-2 text-xs font-semibold text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                >
                  {pct}%
                </button>
              ))}
            </div>

            {(localError || claimError) && (
              <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-400 border border-red-500/20">
                {localError || claimError?.message}
              </div>
            )}

            <button
              onClick={handleClaim}
              disabled={loading}
              className="w-full rounded-xl bg-purple-600 py-3.5 font-bold text-white transition-all hover:bg-purple-700 hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 shadow-lg shadow-purple-900/20"
            >
              {loading ? "Preparing..." : "Claim Tokens"}
            </button>
          </div>
        )}

        {(claimStep === "signing" || claimStep === "processing") && (
          <div className="py-8 text-center space-y-4">
            <div className="relative mx-auto h-16 w-16">
              <div className="absolute inset-0 rounded-full border-4 border-white/10"></div>
              <div className="absolute inset-0 rounded-full border-4 border-purple-500 border-t-transparent animate-spin"></div>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {status === "signing_fee"
                  ? "Sign Fee Transaction"
                  : status === "confirming_fee"
                  ? "Confirming Fee..."
                  : status === "processing_claim"
                  ? "Processing Claim..."
                  : status === "confirming_claim"
                  ? "Verifying Claim..."
                  : "Please Wait..."}
              </h3>
              <p className="text-sm text-white/60 max-w-[200px] mx-auto mt-2">
                {status === "signing_fee"
                  ? "Please approve the transaction in your wallet"
                  : "Do not close this window"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
