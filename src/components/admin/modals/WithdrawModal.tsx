"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { api } from "@/lib/api";
import { AlertCircle, Wallet, ArrowRight, ExternalLink, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

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

interface TokenOption {
    symbol: string;
    balance: number;
    mint: string;
}

interface TreasuryStatus {
    treasury: {
        tokens?: TokenOption[];
    };
}

export function WithdrawModal({ open, onClose, projectId, onSuccess }: WithdrawModalProps) {
    const [selectedToken, setSelectedToken] = useState<string>(""); // mint address
    const [availableTokens, setAvailableTokens] = useState<TokenOption[]>([]);
    const [amount, setAmount] = useState("");
    const [recipientAddress, setRecipientAddress] = useState("");
    const [note, setNote] = useState("");
    const [loading, setLoading] = useState(false);
    const [balanceLoading, setBalanceLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successData, setSuccessData] = useState<{ signature: string; amount: number; recipient: string } | null>(null);
    const [balanceInfo, setBalanceInfo] = useState<AvailableBalance | null>(null);

    // Load available tokens when modal opens
    useEffect(() => {
        if (open && projectId) {
            loadAvailableTokens();
            loadAvailableBalance();
        }
    }, [open, projectId]);

    async function loadAvailableTokens() {
        try {
            const data = await api.get<TreasuryStatus>(`/treasury/status?projectId=${projectId}`);
            if (data.treasury.tokens) {
                setAvailableTokens(data.treasury.tokens);
                // Auto-select first token (usually SOL)
                if (data.treasury.tokens.length > 0 && !selectedToken) {
                    setSelectedToken(data.treasury.tokens[0].mint);
                }
            }
        } catch (err) {
            console.error("Failed to load tokens:", err);
        }
    }

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
        setSuccessData(null);

        try {
            const token = availableTokens.find(t => t.mint === selectedToken);
            const isSOL = token?.symbol === 'SOL';
            
            // Choose endpoint based on token type
            const endpoint = isSOL
                ? `/treasury/withdraw-sol?projectId=${projectId}`
                : `/treasury/withdraw?projectId=${projectId}`;
            
            const response = await api.post<{ 
                success: boolean; 
                signature: string; 
                amount: number; 
                recipient: string;
                message?: string;
            }>(endpoint, {
                amount: parseFloat(amount),
                recipientAddress,
                note,
                tokenMint: isSOL ? undefined : selectedToken, // Only send tokenMint for SPL tokens
            });

            // Show success state with transaction signature
            setSuccessData({
                signature: response.signature,
                amount: parseFloat(amount),
                recipient: recipientAddress
            });

            // Show toast notification with Solscan link
            const selectedTokenData = availableTokens.find(t => t.mint === selectedToken);
            const solscanUrl = getSolscanUrl(response.signature);
            
            toast.success("Withdrawal Successful", {
                description: `Transferred ${parseFloat(amount)} ${selectedTokenData?.symbol || 'tokens'} to ${recipientAddress.slice(0, 8)}...${recipientAddress.slice(-8)}`,
                action: {
                    label: "View on Solscan",
                    onClick: () => window.open(solscanUrl, '_blank')
                },
                duration: 10000, // Show for 10 seconds
            });

            // Call onSuccess callback after a brief moment to show the success state
            setTimeout(() => {
                if (onSuccess) onSuccess();
            }, 500);

            // Reset form
            setAmount("");
            setRecipientAddress("");
            setNote("");
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Withdrawal failed";
            setError(errorMessage);
            
            // Also show error toast
            toast.error("Withdrawal Failed", {
                description: errorMessage,
                duration: 5000,
            });
        } finally {
            setLoading(false);
        }
    }

    function setMaxAmount() {
        if (balanceInfo) {
            setAmount(balanceInfo.available.toString());
        }
    }

    const selectedTokenData = availableTokens.find(t => t.mint === selectedToken);
    const isSOL = selectedTokenData?.symbol === 'SOL';

    // Helper to determine network from RPC URL
    const getSolscanUrl = (signature: string): string => {
        const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || '';
        
        // Detect network from RPC URL
        if (rpcUrl.includes('mainnet')) {
            return `https://solscan.io/tx/${signature}`;
        } else if (rpcUrl.includes('devnet')) {
            return `https://solscan.io/tx/${signature}?cluster=devnet`;
        } else if (rpcUrl.includes('testnet')) {
            return `https://solscan.io/tx/${signature}?cluster=testnet`;
        } else {
            // Default to devnet based on .env file
            return `https://solscan.io/tx/${signature}?cluster=devnet`;
        }
    };

    const handleClose = () => {
        setSuccessData(null);
        setError(null);
        onClose();
    };

    return (
        <Modal open={open} onClose={handleClose} title="Withdraw from Vault">
            <div className="space-y-6">
                {/* Success Alert with Solscan Link */}
                {successData && (
                    <div className="flex flex-col gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                        <div className="flex items-start gap-2 text-green-200">
                            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <div className="font-semibold mb-1">Withdrawal Successful!</div>
                                <div className="text-sm text-green-200/80">
                                    Transferred {successData.amount} tokens to{' '}
                                    <span className="font-mono text-xs">{successData.recipient.slice(0, 8)}...{successData.recipient.slice(-8)}</span>
                                </div>
                            </div>
                        </div>
                        <a
                            href={getSolscanUrl(successData.signature)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 rounded-lg text-green-200 text-sm font-medium transition-colors"
                        >
                            <ExternalLink className="w-4 h-4" />
                            View on Solscan
                        </a>
                    </div>
                )}

                {/* Token Selector */}
                <div>
                    <label className="block text-sm text-white/60 mb-2">Select Token</label>
                    <select
                        value={selectedToken}
                        onChange={(e) => setSelectedToken(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-purple-500/50 focus:outline-none"
                    >
                        {availableTokens.length === 0 && (
                            <option value="">Loading tokens...</option>
                        )}
                        {availableTokens.map((token) => (
                            <option key={token.mint} value={token.mint}>
                                {token.symbol} - {token.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} available
                            </option>
                        ))}
                    </select>
                    {isSOL && (
                        <p className="text-xs text-blue-400 mt-2">
                            💡 Minimum 0.001 SOL must remain in vault for rent exemption (Solana requirement).
                        </p>
                    )}
                </div>

                {/* Balance Info - Show for project tokens only, not SOL */}
                {!isSOL && balanceLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                    </div>
                ) : !isSOL && balanceInfo ? (
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
                    <label className="block text-sm text-white/60 mb-2">
                        Amount to Withdraw ({selectedTokenData?.symbol || 'Token'})
                    </label>
                    <div className="relative">
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:border-purple-500/50 focus:outline-none font-mono"
                            placeholder={isSOL ? "0.000" : "0.00"}
                            step={isSOL ? "0.001" : "0.01"}
                        />
                        {!isSOL && (
                            <button
                                type="button"
                                onClick={setMaxAmount}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-purple-400 hover:text-purple-300 font-medium"
                            >
                                MAX
                            </button>
                        )}
                    </div>
                    {!isSOL && balanceInfo && parseFloat(amount) > balanceInfo.available && (
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
                    {!successData ? (
                        <>
                            <Button variant="ghost" onClick={handleClose} disabled={loading}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleWithdraw}
                                disabled={loading || !amount || !recipientAddress || (!isSOL && balanceInfo ? parseFloat(amount) > balanceInfo.available : false)}
                                className="bg-purple-500 hover:bg-purple-600"
                            >
                                {loading ? (
                                    <span className="flex items-center gap-2">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        Processing...
                                    </span>
                                ) : (
                                    <>
                                        Withdraw Tokens
                                        <ArrowRight className="w-4 h-4 ml-2" />
                                    </>
                                )}
                            </Button>
                        </>
                    ) : (
                        <Button
                            onClick={handleClose}
                            className="bg-green-600 hover:bg-green-700 w-full"
                        >
                            Close
                        </Button>
                    )}
                </div>
            </div>
        </Modal>
    );
}
