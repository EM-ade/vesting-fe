"use client";

import { useState } from "react";
import { useProject } from "@/contexts/ProjectContext";
import { api } from "@/lib/api";
import { CreateVestingModal } from "@/components/vesting/CreateVestingModal";
import { Button } from "@/components/ui/Button";
import {
  Plus,
  Search,
  Filter,
  Download,
  RefreshCw,
  ExternalLink,
  Calendar,
  DollarSign,
  Users,
  TrendingUp,
} from "lucide-react";
import { formatTokenAmount } from "@/lib/formatters";
import { formatDistanceToNow } from "date-fns";
import { MultiSelect, MultiSelectOption } from "@/components/ui/MultiSelect";
import { useClaimsQuery, usePoolsQuery } from "@/hooks/queries";
import { motion, AnimatePresence } from "framer-motion";
import { staggerContainer, listItemVariants, cardVariants } from "@/lib/animations";

// Using the same type as the Zustand store
interface Claim {
  id: string;
  wallet: string;
  amount: number;
  created_at: string;
  timestamp?: string;
  signature: string;
  pool_id?: number;
  pool_name?: string;
  status?: string;
  token_mint?: string;
}

interface ClaimStats {
  totalClaims: number;
  totalAmount: number;
  uniqueUsers: number;
  last24h?: number;
  last7d?: number;
}

export function ClaimsManagementView() {
  const { currentProject, refreshData } = useProject();
  const [filter, setFilter] = useState<"all" | "24h" | "7d">("all");
  const [searchWallet, setSearchWallet] = useState("");
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Pool Filtering State
  const [selectedPoolIds, setSelectedPoolIds] = useState<string[]>([]);

  // TanStack Query: Claims data with automatic caching
  const { 
    data: claimsData, 
    isLoading, 
    isFetching,
    refetch 
  } = useClaimsQuery(currentProject?.id || null, filter, selectedPoolIds);

  // TanStack Query: Available pools for filter dropdown
  const { data: availablePools = [] } = usePoolsQuery(currentProject?.id || null);

  const claims = claimsData?.claims || [];
  const stats = claimsData?.stats;

  const poolOptions: MultiSelectOption[] = availablePools.map((p: any) => ({
    label: p.name,
    value: p.id.toString(),
  }));

  // Wallet search - for now just refreshes with normal filters
  // TODO: Implement backend wallet-specific search endpoint if needed
  async function searchByWallet() {
    if (!searchWallet.trim()) {
      refetch();
      return;
    }
    // For now, just log the search - backend doesn't have wallet-specific endpoint yet
    console.log("Wallet search requested for:", searchWallet);
    alert("Wallet-specific search not yet implemented. Use the table filter instead.");
  }

  async function handleFlagClaim(claimId: string, reason: string) {
    try {
      await api.post(`/claims/${claimId}/flag`, { reason });
      alert("Claim flagged successfully");
      refetch();
    } catch (error) {
      console.error("Failed to flag claim:", error);
      alert("Failed to flag claim");
    }
  }

  function exportToCsv() {
    const headers = ["Timestamp", "Wallet", "Pool", "Amount", "Signature"];
    const rows = claims.map((c: Claim) => {
      let dateStr = "N/A";
      try {
        if (c.timestamp) {
          const date = new Date(c.timestamp);
          if (!isNaN(date.getTime())) {
            dateStr = date.toLocaleString();
          }
        }
      } catch (e) {}

      return [
        dateStr,
        c.wallet || 'N/A',
        c.pool_name || c.pool_id,
        c.amount,
        c.signature,
      ];
    });

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `claims-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Claims Management</h1>
          <p className="text-gray-400 mt-1">
            Monitor and manage all token claims
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setCreateModalOpen(true)}
            className="bg-purple-500 hover:bg-purple-600 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Pool
          </Button>
          <button
            onClick={exportToCsv}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-5 gap-4"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <motion.div 
            className="bg-gray-800/50 rounded-lg p-4 border border-gray-700"
            variants={cardVariants}
            whileHover="hover"
          >
            <div className="text-gray-400 text-sm mb-1">Total Claims</div>
            <div className="text-2xl font-bold text-white">
              {(stats.totalClaims || 0).toLocaleString()}
            </div>
          </motion.div>
          <motion.div 
            className="bg-gray-800/50 rounded-lg p-4 border border-gray-700"
            variants={cardVariants}
            whileHover="hover"
          >
            <div className="text-gray-400 text-sm mb-1">Last 24h</div>
            <div className="text-2xl font-bold text-green-400">
              {(stats.last24h || 0).toLocaleString()}
            </div>
          </motion.div>
          <motion.div 
            className="bg-gray-800/50 rounded-lg p-4 border border-gray-700"
            variants={cardVariants}
            whileHover="hover"
          >
            <div className="text-gray-400 text-sm mb-1">Last 7d</div>
            <div className="text-2xl font-bold text-blue-400">
              {(stats.last7d || 0).toLocaleString()}
            </div>
          </motion.div>
          <motion.div 
            className="bg-gray-800/50 rounded-lg p-4 border border-gray-700"
            variants={cardVariants}
            whileHover="hover"
          >
            <div className="text-gray-400 text-sm mb-1">Total Amount</div>
            <div className="text-2xl font-bold text-purple-400">
              {(stats.totalAmount || 0).toLocaleString()}
            </div>
          </motion.div>
          <motion.div 
            className="bg-gray-800/50 rounded-lg p-4 border border-gray-700"
            variants={cardVariants}
            whileHover="hover"
          >
            <div className="text-gray-400 text-sm mb-1">Unique Users</div>
            <div className="text-2xl font-bold text-orange-400">
              {(stats.uniqueUsers || 0).toLocaleString()}
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Filters & Search */}
      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Pool Filter */}
          <div className="w-64">
            <MultiSelect
              options={poolOptions}
              selected={selectedPoolIds}
              onChange={setSelectedPoolIds}
              placeholder="Filter by Pool..."
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === "all"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => setFilter("24h")}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === "24h"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              Last 24h
            </button>
            <button
              onClick={() => setFilter("7d")}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === "7d"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              Last 7d
            </button>
          </div>

          {/* Search */}
          <div className="flex-1 flex gap-2">
            <input
              type="text"
              placeholder="Search by wallet address..."
              value={searchWallet}
              onChange={(e) => setSearchWallet(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && searchByWallet()}
              className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={searchByWallet}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
            >
              Search
            </button>
            {searchWallet && (
              <button
                onClick={() => {
                  setSearchWallet("");
                  refetch();
                }}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-white transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Claims Table */}
      <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700 bg-gray-900/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Wallet
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Pool
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-gray-400"
                  >
                    Loading claims...
                  </td>
                </tr>
              ) : !Array.isArray(claims) || claims.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-gray-400"
                  >
                    No claims found
                  </td>
                </tr>
              ) : (
                Array.isArray(claims) &&
                claims.map((claim, index) => (
                  <motion.tr
                    key={claim.id}
                    className="hover:bg-gray-700/30 transition-colors"
                    variants={listItemVariants}
                    initial="hidden"
                    animate="visible"
                    custom={index}
                    transition={{ delay: index * 0.05 }}
                  >
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {claim.timestamp &&
                      !isNaN(new Date(claim.timestamp).getTime())
                        ? new Date(claim.timestamp).toLocaleString()
                        : "N/A"}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-300">
                      {claim.wallet
                        ? `${claim.wallet.slice(0, 8)}...${claim.wallet.slice(-8)}`
                        : "N/A"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {claim.pool_name ||
                        (claim.pool_id
                          ? `Pool #${claim.pool_id}`
                          : "Unknown Pool")}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-green-400 font-medium">
                      {(claim.amount || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          claim.status === "completed"
                            ? "bg-green-900/50 text-green-400"
                            : "bg-yellow-900/50 text-yellow-400"
                        }`}
                      >
                        {claim.status || "unknown"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => setSelectedClaim(claim)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-white text-xs transition-colors"
                        >
                          View
                        </button>
                        <button
                          onClick={() => {
                            const reason = prompt(
                              "Enter reason for flagging this claim:"
                            );
                            if (reason) handleFlagClaim(claim.id, reason);
                          }}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-white text-xs transition-colors"
                        >
                          Flag
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Claim Details Modal */}
      {selectedClaim && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setSelectedClaim(null)}
        >
          <div
            className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 border border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-white mb-4">Claim Details</h2>
            <div className="space-y-3">
              <div>
                <div className="text-gray-400 text-sm">Claim ID</div>
                <div className="text-white font-mono text-sm">
                  {selectedClaim.id}
                </div>
              </div>
              <div>
                <div className="text-gray-400 text-sm">Wallet Address</div>
                <div className="text-white font-mono text-sm break-all">
                  {selectedClaim.wallet}
                </div>
              </div>
              <div>
                <div className="text-gray-400 text-sm">Pool</div>
                <div className="text-white">
                  {selectedClaim.pool_name || `Pool #${selectedClaim.pool_id}`}
                </div>
              </div>
              <div>
                <div className="text-gray-400 text-sm">Amount</div>
                <div className="text-green-400 font-bold text-lg">
                  {selectedClaim.amount.toLocaleString()} tokens
                </div>
              </div>
              <div>
                <div className="text-gray-400 text-sm">
                  Transaction Signature
                </div>
                <div className="text-white font-mono text-sm break-all">
                  {selectedClaim.signature}
                </div>
                <a
                  href={`https://solscan.io/tx/${selectedClaim.signature}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 text-sm mt-1 inline-block"
                >
                  View on Solscan →
                </a>
              </div>
              <div>
                <div className="text-gray-400 text-sm">Timestamp</div>
                <div className="text-white">
                  {selectedClaim.timestamp &&
                  !isNaN(new Date(selectedClaim.timestamp).getTime())
                    ? new Date(selectedClaim.timestamp).toLocaleString()
                    : "N/A"}
                </div>
              </div>
              <div>
                <div className="text-gray-400 text-sm">Status</div>
                <div>
                  <span
                    className={`px-2 py-1 rounded text-sm font-medium ${
                      selectedClaim.status === "completed"
                        ? "bg-green-900/50 text-green-400"
                        : "bg-yellow-900/50 text-yellow-400"
                    }`}
                  >
                    {selectedClaim.status}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setSelectedClaim(null)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const reason = prompt(
                    "Enter reason for flagging this claim:"
                  );
                  if (reason) {
                    handleFlagClaim(selectedClaim.id, reason);
                    setSelectedClaim(null);
                  }
                }}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white transition-colors"
              >
                Flag Claim
              </button>
            </div>
          </div>
        </div>
      )}

      <CreateVestingModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        mode="snapshot"
        onModeChange={() => {}}
        onSuccess={() => {
          setCreateModalOpen(false);
          refreshData();
        }}
      />
    </div>
  );
}
