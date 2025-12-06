"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { api } from "@/lib/api";
import { AlertCircle, Wallet, ArrowRight } from "lucide-react";

interface WithdrawModalProps {
    open: boolean;
    onClose: () => void;
    projectId: string;
    onSuccess?: () => void;
}

interface AvailableBalance {
    totalBalance: number;
    lockedInPools: number;
    available: number;
    vaultAddress: string;
}

export function WithdrawModal({ open, onClose, projectId, onSuccess }: WithdrawModalProps) {
    const [amount, setAmount] = useState("");
    const [recipientAddress, setRecipientAddress] = useState("");
    const [note, setNote] = useState("");
    const [loading, setLoading] = useState(false);
    const [balanceLoading, setBalanceLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [balanceInfo, setBalanceInfo] = useState<AvailableBalance | null>(null);

    // Load available balance when modal opens
    useState(() => {
        if (open && projectId) {
            loadAvailableBalance();
        }
    });

    async function loadAvailableBalance() {
        setBalanceLoading(true);
        setError(null);
        try {
            const data = await api.get<AvailableBalance>(`/treasury/available?projectId=${projectId}`);
            setBalanceInfo(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load balance");
        } finally {
            setBalanceLoading(false);
        }
    }

    async function handleWithdraw() {
        if (!amount || parseFloat(amount) <= 0) {
            setError("Please enter a valid amount");
            return;
        }

        if (!recipientAddress) {
            setError("Please enter a recipient address");
            return;
        }

        if (!projectId) {
            setError("Project ID is required");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Pass projectId in query params to match backend expectation
            await api.post(`/treasury/withdraw?projectId=${projectId}`, {
                amount: parseFloat(amount),
                recipientAddress,
                note,
            });

            if (onSuccess) onSuccess();
            onClose();

            // Reset form
            setAmount("");
            setRecipientAddress("");
            setNote("");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Withdrawal failed");
        } finally {
            setLoading(false);
        }
    }

    function setMaxAmount() {
        if (balanceInfo) {
            setAmount(balanceInfo.available.toString());
        }
    }

    return (
        <Modal open={open} onClose={onClose} title="Withdraw Tokens">
            <div className="space-y-6">
                {/* Balance Info */}
                {balanceLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                    </div>
                ) : balanceInfo ? (
                    <div className="bg-slate-900 rounded-xl p-4 space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Total Balance</span>
                            <span className="text-white font-mono">{balanceInfo.totalBalance.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Locked in Pools</span>
                            <span className="text-yellow-400 font-mono">-{balanceInfo.lockedInPools.toLocaleString()}</span>
                        </div>
                        <div className="h-px bg-white/10"></div>
                        <div className="flex justify-between">
                            <span className="text-white font-medium">Available</span>
                            <span className="text-green-400 font-mono text-lg">{balanceInfo.available.toLocaleString()}</span>
                        </div>
                    </div>
                ) : null}

                {/* Amount Input */}
                <div>
                    <label className="block text-sm text-white/60 mb-2">Amount to Withdraw</label>
                    <div className="relative">
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:border-purple-500/50 focus:outline-none font-mono"
                            placeholder="0.00"
                            step="0.01"
                        />
                        <button
                            onClick={setMaxAmount}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-purple-400 hover:text-purple-300 font-medium"
                        >
                            MAX
                        </button>
                    </div>
                    {balanceInfo && parseFloat(amount) > balanceInfo.available && (
                        <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Amount exceeds available balance
                        </p>
                    )}
                </div>

                {/* Recipient Address */}
                <div>
                    <label className="block text-sm text-white/60 mb-2">Recipient Address</label>
                    <div className="relative">
                        <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            value={recipientAddress}
                            onChange={(e) => setRecipientAddress(e.target.value)}
                            className="w-full bg-slate-950 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-slate-600 focus:border-purple-500/50 focus:outline-none font-mono text-sm"
                            placeholder="Solana wallet address..."
                        />
                    </div>
                </div>

                {/* Note (Optional) */}
                <div>
                    <label className="block text-sm text-white/60 mb-2">Note (Optional)</label>
                    <input
                        type="text"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:border-purple-500/50 focus:outline-none"
                        placeholder="Purpose of withdrawal..."
                    />
                </div>

                {/* Error Message */}
                {error && (
                    <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-400 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        {error}
                    </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-4 border-t border-white/5">
                    <Button variant="ghost" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleWithdraw}
                        loading={loading}
                        disabled={!amount || !recipientAddress || (balanceInfo ? parseFloat(amount) > balanceInfo.available : false)}
                        className="bg-purple-500 hover:bg-purple-600"
                    >
                        Withdraw Tokens
                        <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
