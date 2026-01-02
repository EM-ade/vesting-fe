"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { api, ValidationResult } from "@/lib/api";
import {
  Calendar as CalendarIcon,
  Coins,
  Users,
  CheckCircle2,
  AlertCircle,
  Info,
  ArrowRight,
  Wallet,
  Plus,
  Trash2,
  HelpCircle,
  Clock,
  ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useProject } from "@/contexts/ProjectContext";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { mergeAdminAuth } from "@/lib/adminAuth";
import { useAdminAuth } from "@/contexts/AdminAuthContext";

// ... (existing types) ...
interface TokenInfo {
  symbol: string;
  mint: string;
  decimals: number;
  balance?: number;
  isNative?: boolean;
}

export type VestingMode = "snapshot" | "dynamic" | "manual";

type AllocationType = "PERCENTAGE" | "FIXED";

type RuleForm = {
  id: string;
  name: string;
  nftContract: string;
  threshold: number;
  allocationType: AllocationType;
  allocationValue: number;
  enabled: boolean;
};

type ManualAllocation = {
  id: string;
  wallet: string;
  allocationType: "PERCENTAGE" | "FIXED";
  allocationValue: number;
  note?: string;
};

type CreateVestingModalProps = {
  open: boolean;
  onClose: () => void;
  mode: VestingMode;
  onModeChange: (mode: VestingMode) => void;
  onSuccess?: () => void;
};

const KNOWN_TOKENS: Record<string, { symbol: string; decimals: number }> = {
  "So11111111111111111111111111111111111111112": { symbol: "SOL", decimals: 9 },
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": { symbol: "USDC", decimals: 6 },
  "2FcDPDTvdURqtyuH6WSBFs33hupeuYJAWy625KyXrWid": { symbol: "GARG", decimals: 9 },
};

function generateId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

const DEFAULT_RULE: RuleForm = {
  id: generateId(),
  name: "OG Holders",
  nftContract: "",
  threshold: 1,
  allocationType: "PERCENTAGE",
  allocationValue: 50,
  enabled: true,
};

export function CreateVestingModal({ open, onClose, mode, onModeChange, onSuccess }: CreateVestingModalProps) {
  const { currentProject } = useProject();
  const { connection } = useConnection();
  const wallet = useWallet();
  const { publicKey, sendTransaction } = wallet;
  const [currentMode, setCurrentMode] = useState<VestingMode>(mode);
  const [poolName, setPoolName] = useState("");
  const [amount, setAmount] = useState("");
  const [cycleStart, setCycleStart] = useState("");
  const [cycleEnd, setCycleEnd] = useState("");
  const [cliffTime, setCliffTime] = useState("");
  const [rules, setRules] = useState<RuleForm[]>([DEFAULT_RULE]);
  const [manualAllocations, setManualAllocations] = useState<ManualAllocation[]>([]);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkWallets, setBulkWallets] = useState("");
  const [bulkAllocationType, setBulkAllocationType] = useState<"PERCENTAGE" | "FIXED">("FIXED");
  const [bulkAllocationValue, setBulkAllocationValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [skipStreamflow, setSkipStreamflow] = useState(false);
  const [activeStep, setActiveStep] = useState(1);
  const [claimFeeUSD, setClaimFeeUSD] = useState<number>(0.50); // Default $0.50
  const [fundingStatus, setFundingStatus] = useState<string | null>(null);
  const [solPrice, setSolPrice] = useState<number>(200); // Default SOL price, will be fetched
  
  // Use session-based admin auth (already authorized at login)
  const adminAuth = useAdminAuth();

  // Token Selection State (Mock for now, simulating multiple tokens)
  const [selectedToken, setSelectedToken] = useState<TokenInfo | null>(null);
  const [isTokenDropdownOpen, setIsTokenDropdownOpen] = useState(false);

  // Available tokens (mock data + current project token)
  const [availableTokens, setAvailableTokens] = useState<TokenInfo[]>([]);
  const [loadingTokens, setLoadingTokens] = useState(false);

  // Funding source selection
  const [fundingSource, setFundingSource] = useState<'wallet' | 'treasury'>('wallet');
  const [treasuryBalance, setTreasuryBalance] = useState<number | null>(null);
  const [loadingTreasuryBalance, setLoadingTreasuryBalance] = useState(false);

  // Fetch treasury balance for selected token
  const fetchTreasuryBalance = async (tokenMint: string) => {
    if (!currentProject?.id) return;

    setLoadingTreasuryBalance(true);
    try {
      const response = await api.get<{ balance: number }>(
        `/treasury/balance?projectId=${currentProject.id}&tokenMint=${tokenMint}`
      );
      setTreasuryBalance(response.balance || 0);
    } catch (err) {
      console.error('Failed to fetch treasury balance:', err);
      setTreasuryBalance(0);
    } finally {
      setLoadingTreasuryBalance(false);
    }
  };

  // Fetch treasury tokens
  const fetchTreasuryTokens = async () => {
    if (!currentProject?.id) return;

    setLoadingTokens(true);
    try {
      const response = await api.get<{ tokens: TokenInfo[] }>(
        `/treasury/tokens?projectId=${currentProject.id}`
      );
      
      const tokens = response.tokens || [];
      setAvailableTokens(tokens);
    } catch (err) {
      console.error('Failed to fetch treasury tokens:', err);
      setAvailableTokens([]);
    } finally {
      setLoadingTokens(false);
    }
  };

  // Fetch tokens from the CONNECTED WALLET
  const fetchWalletTokens = async () => {
    if (!publicKey) return;

    setLoadingTokens(true);
    try {
      const { value: accounts } = await connection.getParsedTokenAccountsByOwner(publicKey, {
        programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
      });

      const tokens: TokenInfo[] = accounts.map((account) => {
        const info = account.account.data.parsed.info;
        return {
          mint: info.mint,
          symbol: "Unknown", // We'll try to match known tokens
          decimals: info.tokenAmount.decimals,
          balance: info.tokenAmount.uiAmount,
        };
      }).filter(t => t.balance && t.balance > 0);

      // Add SOL balance
      const solBalance = await connection.getBalance(publicKey);
      if (solBalance > 0) {
        tokens.unshift({
          mint: "So11111111111111111111111111111111111111112",
          symbol: "SOL",
          decimals: 9,
          balance: solBalance / LAMPORTS_PER_SOL,
          isNative: true,
        });
      }

      // Enrich with known symbols
      const enrichedTokens = tokens.map(t => {
        const known = KNOWN_TOKENS[t.mint];
        if (known) {
          return { ...t, symbol: known.symbol };
        }
        // Try to match with project token
        if (currentProject?.mint_address && t.mint === currentProject.mint_address) {
          return { ...t, symbol: currentProject.symbol || "Project Token" };
        }
        return t;
      });

      // Sort: Known tokens first, then by balance
      enrichedTokens.sort((a, b) => {
        const aKnown = KNOWN_TOKENS[a.mint] || (currentProject?.mint_address === a.mint) ? 1 : 0;
        const bKnown = KNOWN_TOKENS[b.mint] || (currentProject?.mint_address === b.mint) ? 1 : 0;
        if (aKnown !== bKnown) return bKnown - aKnown;
        return (b.balance || 0) - (a.balance || 0);
      });

      setAvailableTokens(enrichedTokens);

      // Default select first token
      if (enrichedTokens.length > 0 && !selectedToken) {
        setSelectedToken(enrichedTokens[0]);
      }
    } catch (err) {
      console.error("Failed to fetch wallet tokens:", err);
    } finally {
      setLoadingTokens(false);
    }
  };

  // Fetch SOL price on component mount
  useEffect(() => {
    const fetchSolPrice = async () => {
      try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
        const data = await response.json();
        if (data?.solana?.usd) {
          setSolPrice(data.solana.usd);
          console.log('SOL Price fetched:', data.solana.usd);
        }
      } catch (error) {
        console.error('Failed to fetch SOL price:', error);
        // Keep default $200 if fetch fails
      }
    };

    fetchSolPrice();
  }, []);

  // Fetch tokens based on funding source when modal opens or source changes
  useEffect(() => {
    if (open) {
      if (fundingSource === 'wallet' && publicKey) {
        fetchWalletTokens();
      } else if (fundingSource === 'treasury' && currentProject?.id) {
        fetchTreasuryTokens();
      }
    }
  }, [open, fundingSource, publicKey, currentProject?.id, connection]);


  useEffect(() => {
    if (!open) return;
    setCurrentMode(mode);
    setPoolName("");
    setAmount("");
    setCycleStart("");
    setCycleEnd("");
    setCliffTime("");
    setRules([{ ...DEFAULT_RULE, id: generateId() }]);
    setManualAllocations([]);
    setBulkMode(false);
    setBulkWallets("");
    setBulkAllocationType("FIXED");
    setBulkAllocationValue(0);
    setError(null);
    setValidation(null);
    setSkipStreamflow(false);
    setActiveStep(1);
    // Reset to default token
    setSelectedToken(null);
    // Reset funding source
    setFundingSource('wallet');
    setTreasuryBalance(null);
  }, [open, mode]);

  // Fetch treasury balance when token or funding source changes
  useEffect(() => {
    if (fundingSource === 'treasury' && selectedToken && currentProject?.id) {
      fetchTreasuryBalance(selectedToken.mint);
    }
  }, [fundingSource, selectedToken?.mint, currentProject?.id]);

  // ... (validation and helper functions unchanged) ...
  async function validatePool() {
    try {
      setLoading(true);
      setError(null);
      const start = Math.floor(new Date(cycleStart).getTime() / 1000);
      const validationResult = await api.post<ValidationResult>("/pools/validate", {
        start_time: new Date(start * 1000).toISOString(),
        total_pool_amount: Number(amount),
        vesting_mode: currentMode,
        manual_allocations: currentMode === "manual" ? manualAllocations.filter(a => a.wallet).map(a => ({
          allocationType: a.allocationType,
          allocationValue: a.allocationValue,
        })) : undefined,
        rules: (currentMode === "snapshot" || currentMode === "dynamic") ? rules.map(r => ({
          name: r.name,
          nftContract: r.nftContract,
          threshold: r.threshold,
          allocationType: r.allocationType,
          allocationValue: r.allocationValue,
          enabled: r.enabled,
        })) : undefined,
      });
      setValidation(validationResult);
      return validationResult;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Validation failed");
      return null;
    } finally {
      setLoading(false);
    }
  }

  function updateRule(index: number, key: keyof RuleForm, value: RuleForm[typeof key]) {
    setRules((prev) => prev.map((rule, idx) => (idx === index ? { ...rule, [key]: value } : rule)));
  }

  function addRule() {
    setRules((prev) => [...prev, { ...DEFAULT_RULE, id: generateId(), name: "New Rule" }]);
  }

  function removeRule(index: number) {
    setRules((prev) => prev.filter((_, idx) => idx !== index));
  }

  function parseBulkWallets() {
    const wallets = bulkWallets.split('\n').map(w => w.trim()).filter(w => w.length > 0);
    const valuePerWallet = bulkAllocationType === "PERCENTAGE" ? bulkAllocationValue / wallets.length : bulkAllocationValue;
    const newAllocations: ManualAllocation[] = wallets.map(wallet => ({
      id: generateId(),
      wallet,
      allocationType: bulkAllocationType,
      allocationValue: valuePerWallet,
      note: "",
    }));
    setManualAllocations(prev => [...prev, ...newAllocations]);
    setBulkWallets("");
    setBulkMode(false);
  }

  async function handleCreate() {
    console.log("[CreateVestingModal] Debug:", {
      publicKey: publicKey?.toBase58(),
      currentProject,
      vaultKey: currentProject?.vault_public_key
    });

    if (!publicKey || !currentProject?.vault_public_key) {
      setError("Wallet not connected or project vault not found. Please ensure a project is selected.");
      return;
    }

    setLoading(true);
    setError(null);
    setFundingStatus('Preparing transaction...');

    const updateStatus = (message: string) => {
      setFundingStatus(message);
    };

    try {
      const start = cycleStart ? new Date(cycleStart).getTime() / 1000 : Math.floor(Date.now() / 1000);
      const end = new Date(cycleEnd).getTime() / 1000;
      const durationSeconds = end - start;
      const cliffSeconds = cliffTime ? Math.floor(new Date(cliffTime).getTime() / 1000) : undefined;

      const payloadRules = rules.map((rule) => ({
        name: rule.name,
        nftContract: rule.nftContract,
        threshold: rule.threshold,
        allocationType: rule.allocationType,
        allocationValue: rule.allocationValue,
        enabled: rule.enabled,
      }));

      if (!amount || Number(amount) <= 0) throw new Error("Invalid pool amount");
      if (end <= start) throw new Error("End time must be after start time");

      if (currentMode === "manual" && (!manualAllocations.length)) throw new Error("Add at least one wallet");
      if (currentMode !== "manual" && !payloadRules.length) throw new Error("Add at least one rule");

      // 1. Transfer tokens + SOL from User Wallet to Project Vault (Treasury)
      // Unless skipping Streamflow (testing mode) OR using treasury funding (tokens already there)
      if (!skipStreamflow && selectedToken && fundingSource === 'wallet') {
        try {
          updateStatus(`💰 Funding treasury with ${amount} ${selectedToken.symbol}...`);

          // Import dynamically to avoid SSR issues
          const { Transaction, SystemProgram } = await import("@solana/web3.js");
          const { createTransferInstruction, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, TOKEN_PROGRAM_ID } = await import("@solana/spl-token");

          const vaultPubkey = new PublicKey(currentProject.vault_public_key);
          // Add 0.5% buffer for Streamflow fees
          const amountWithBuffer = Number(amount) * 1.005;
          const amountBaseUnits = Math.floor(amountWithBuffer * Math.pow(10, selectedToken.decimals));

          console.log(`[FUNDING] Preparing to transfer ${amount} ${selectedToken.symbol} + 0.5% buffer = ${amountWithBuffer} (${amountBaseUnits} base units)`);
          console.log(`[FUNDING] From: ${publicKey.toBase58()}`);
          console.log(`[FUNDING] To: ${vaultPubkey.toBase58()}`);

          const transaction = new Transaction();

          if (selectedToken.isNative) {
            // For native SOL pools, we need to send:
            // 1. Pool amount + 0.5% buffer (will be locked in Streamflow)
            // 2. 0.015 SOL minimum for Streamflow rent + fees (stays in vault)
            // This ensures vault has enough SOL to pay Streamflow's 0.00025 fee and rent
            
            const vaultBalance = await connection.getBalance(vaultPubkey);
            const vaultBalanceSOL = vaultBalance / LAMPORTS_PER_SOL;
            const requiredExtraSOL = 0.015; // Streamflow needs this EXTRA to stay in vault
            
            // Calculate total SOL to send
            const poolSOL = amountWithBuffer; // Pool amount with 0.5% buffer (gets locked)
            const extraSOL = Math.max(0, requiredExtraSOL - vaultBalanceSOL); // Extra for fees (stays in vault)
            const totalSOL = poolSOL + extraSOL;
            
            console.log(`[FUNDING] Native SOL pool - Total transfer: ${totalSOL} SOL`);
            console.log(`[FUNDING]   - Pool amount + buffer: ${poolSOL} SOL (will be locked in Streamflow)`);
            console.log(`[FUNDING]   - Extra for Streamflow fees: ${extraSOL} SOL (stays in vault for rent/fees)`);
            console.log(`[FUNDING]   - Vault current balance: ${vaultBalanceSOL} SOL`);
            
            updateStatus(`💰 Funding treasury with ${totalSOL.toFixed(4)} SOL (pool + deployment fees)...`);
            
            transaction.add(
              SystemProgram.transfer({
                fromPubkey: publicKey,
                toPubkey: vaultPubkey,
                lamports: Math.ceil(totalSOL * LAMPORTS_PER_SOL),
              })
            );
          } else {
            // For SPL tokens, check if we need to add SOL for Streamflow deployment fees
            try {
              const vaultBalance = await connection.getBalance(vaultPubkey);
              const vaultBalanceSOL = vaultBalance / LAMPORTS_PER_SOL;
              const requiredSOL = 0.015;
              
              console.log(`[FUNDING] Vault SOL balance: ${vaultBalanceSOL} SOL`);
              
              if (vaultBalanceSOL < requiredSOL) {
                const solToSend = requiredSOL - vaultBalanceSOL;
                console.log(`[FUNDING] Adding SOL transfer: ${solToSend} SOL`);
                updateStatus(`💰 Funding treasury with ${solToSend.toFixed(4)} SOL for deployment fees...`);
                
                transaction.add(
                  SystemProgram.transfer({
                    fromPubkey: publicKey,
                    toPubkey: vaultPubkey,
                    lamports: Math.ceil(solToSend * LAMPORTS_PER_SOL),
                  })
                );
              }
            } catch (solCheckErr) {
              console.warn('[FUNDING] Failed to check vault SOL balance, proceeding without SOL transfer:', solCheckErr);
            }
            // SPL Token Transfer
            const mintPubkey = new PublicKey(selectedToken.mint);
            console.log(`[FUNDING] Token mint: ${mintPubkey.toBase58()}`);

            updateStatus(`🔍 Checking vault token account...`);
            const fromAta = await getAssociatedTokenAddress(mintPubkey, publicKey);
            const toAta = await getAssociatedTokenAddress(mintPubkey, vaultPubkey);

            console.log(`[FUNDING] From ATA: ${fromAta.toBase58()}`);
            console.log(`[FUNDING] To ATA: ${toAta.toBase58()}`);

            // Check if destination ATA exists (it might not if this is the first transfer)
            const toAccountInfo = await connection.getAccountInfo(toAta);

            if (!toAccountInfo) {
              updateStatus(`🏗️ Creating vault token account (~0.002 SOL rent)...`);
              console.log(`[FUNDING] Vault token account doesn't exist - creating it (rent paid by user)`);
              // Create ATA for the vault, paid by the user
              transaction.add(
                createAssociatedTokenAccountInstruction(
                  publicKey, // payer (user pays rent ~0.002 SOL)
                  toAta, // account to create
                  vaultPubkey, // owner of the new account
                  mintPubkey, // token mint
                  TOKEN_PROGRAM_ID
                )
              );
            } else {
              console.log(`[FUNDING] Vault token account already exists`);
            }

            // Add transfer instruction
            console.log(`[FUNDING] Adding token transfer instruction`);
            transaction.add(
              createTransferInstruction(
                fromAta,
                toAta,
                publicKey,
                amountBaseUnits,
                [],
                TOKEN_PROGRAM_ID
              )
            );
          }

          // Send transaction
          updateStatus(`📝 Please approve the transaction in your wallet...`);
          console.log(`[FUNDING] Sending transaction...`);
          const signature = await sendTransaction(transaction, connection);
          console.log(`[FUNDING] Transaction sent: ${signature}`);

          // Wait for confirmation
          updateStatus(`⏳ Confirming transaction...`);
          const latestBlockhash = await connection.getLatestBlockhash();
          await connection.confirmTransaction({
            signature,
            blockhash: latestBlockhash.blockhash,
            lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
          }, 'confirmed');

          updateStatus(`✅ Tokens transferred successfully!`);
          console.log(`[FUNDING] ✅ Transaction confirmed: https://solscan.io/tx/${signature}`);
        } catch (fundingError) {
          console.error(`[FUNDING] ❌ Failed to transfer tokens:`, fundingError);
          throw new Error(`Failed to transfer tokens to treasury: ${fundingError instanceof Error ? fundingError.message : 'Unknown error'}`);
        }
      } else if (fundingSource === 'treasury') {
        console.log('[FUNDING] Using treasury funding - skipping wallet transfer, tokens already in treasury');
        updateStatus(`✅ Using existing treasury balance (${amount} ${selectedToken?.symbol})...`);
      }



      updateStatus(`📦 Creating vesting pool...`);

      // Validate token selection before creating pool
      if (!selectedToken) {
        throw new Error('Please select a token in Step 1 before creating the pool');
      }

      // Get auth payload from session context
      const authPayload = await adminAuth.getAuthPayload();
      
      // Get the funding transaction signature if we just funded the treasury
      const fundingTxSignature = (window as any).__lastFundingTx || null;
      if (fundingTxSignature) {
        console.log(`[POOL CREATE] Including funding tx signature: ${fundingTxSignature}`);
      }

      const poolData = mergeAdminAuth(authPayload, {
        name: poolName || `Vesting - ${new Date().toLocaleDateString()}`,
        total_pool_amount: Number(amount),
        vesting_duration_days: durationSeconds / 86400,
        cliff_duration_days: cliffSeconds ? (cliffSeconds - start) / 86400 : 0,
        start_time: new Date(start * 1000).toISOString(),
        end_time: new Date(end * 1000).toISOString(),
        is_active: true,
        vesting_mode: currentMode,
        rules: payloadRules,
        manual_allocations: currentMode === "manual" ? manualAllocations.map(a => ({
          wallet: a.wallet,
          allocationType: a.allocationType,
          allocationValue: a.allocationValue
        })) : undefined,
        skipStreamflow,
        token_mint: selectedToken.mint, // Now guaranteed to exist
        claim_fee_lamports: Math.floor((claimFeeUSD / solPrice) * LAMPORTS_PER_SOL), // Convert USD to lamports
        funding_source: fundingSource, // ✅ NEW: Tell backend where to get tokens from ('wallet' or 'treasury')
        funding_tx_signature: fundingTxSignature, // ✅ NEW: Send funding tx so backend can verify it
      });

      // Add better error message for insufficient funds
      if (fundingStatus && fundingStatus.includes('Fund treasury')) {
        throw new Error('Treasury needs to be funded with SOL before creating pool. Click "Fund Treasury" to add ~0.015 SOL for Streamflow fees.');
      }

      // Create the pool with signed authentication
      await api.post("/pools", poolData);

      updateStatus(`✨ Pool created successfully!`);

      // Remove status after 2 seconds
      setTimeout(() => {
        const status = document.getElementById('funding-status');
        if (status) status.remove();
      }, 2000);

      onModeChange(currentMode);
      if (onSuccess) onSuccess();
      setFundingStatus(null);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Creation failed");
      setFundingStatus(null);
    } finally {
      setLoading(false);
    }
  }

  const steps = [
    { id: 1, title: "Configuration", icon: Coins },
    { id: 2, title: "Schedule", icon: CalendarIcon },
    { id: 3, title: "Allocations", icon: Users },
    { id: 4, title: "Review", icon: CheckCircle2 },
  ];

  const renderStepContent = () => {
    switch (activeStep) {
      case 1:
        return (
          <div className="space-y-6">
            {/* Vesting Mode Selection */}
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Vesting Mode</label>
              <div className="grid grid-cols-3 gap-3">
                {(["snapshot", "dynamic", "manual"] as VestingMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setCurrentMode(m)}
                    className={cn(
                      "p-4 rounded-xl border text-left transition-all",
                      currentMode === m
                        ? "bg-purple-500/10 border-purple-500 text-white"
                        : "bg-slate-900 border-white/10 text-slate-400 hover:border-white/20"
                    )}
                  >
                    <div className="font-medium capitalize mb-1">{m}</div>
                    <div className="text-[10px] opacity-60 leading-relaxed">
                      {m === "snapshot" && "One-time mint based on holder list"}
                      {m === "dynamic" && "Auto-adjusts as NFTs change hands"}
                      {m === "manual" && "Specific wallet list and amounts"}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Token Selection & Amount */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Pool Name</label>
                <input
                  type="text"
                  value={poolName}
                  onChange={(e) => setPoolName(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:border-purple-500/50 focus:outline-none font-mono"
                  placeholder={`Vesting - ${new Date().toLocaleDateString()}`}
                />
              </div>

              {/* Funding Source Selector - MOVED TO TOP */}
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Funding Source</label>
                <div className="grid grid-cols-2 gap-3">
                  {/* Wallet Funding */}
                  <button
                    type="button"
                    onClick={() => {
                      setFundingSource('wallet');
                      setSelectedToken(null);
                      setAvailableTokens([]);
                    }}
                    className={cn(
                      "p-4 rounded-xl border text-left transition-all",
                      fundingSource === 'wallet'
                        ? "bg-purple-500/10 border-purple-500 text-white"
                        : "bg-slate-900 border-white/10 text-slate-400 hover:border-white/20"
                    )}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <Wallet className="w-5 h-5" />
                      <span className="font-medium">Your Wallet</span>
                    </div>
                    <div className="text-[10px] opacity-70 leading-relaxed">
                      Transfer tokens from your connected wallet
                    </div>
                  </button>

                  {/* Treasury Funding */}
                  <button
                    type="button"
                    onClick={() => {
                      setFundingSource('treasury');
                      setSelectedToken(null);
                      setAvailableTokens([]);
                    }}
                    className={cn(
                      "p-4 rounded-xl border text-left transition-all",
                      fundingSource === 'treasury'
                        ? "bg-green-500/10 border-green-500 text-white"
                        : "bg-slate-900 border-white/10 text-slate-400 hover:border-white/20"
                    )}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <Coins className="w-5 h-5" />
                      <span className="font-medium">Treasury</span>
                    </div>
                    <div className="text-[10px] opacity-70 leading-relaxed">
                      Use tokens already in project treasury
                    </div>
                  </button>
                </div>
              </div>

              <div className="relative">
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                  Funding Token {fundingSource === 'treasury' ? '(from Treasury)' : '(from Your Wallet)'}
                </label>

                {/* Custom Dropdown for Token Selection */}
                <div
                  className="p-4 bg-slate-900 rounded-xl border border-white/10 flex items-center justify-between cursor-pointer hover:border-white/20 transition-all"
                  onClick={() => !loadingTokens && setIsTokenDropdownOpen(!isTokenDropdownOpen)}
                >
                  {loadingTokens ? (
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-800 animate-pulse" />
                        <div className="space-y-2">
                          <div className="h-4 w-24 bg-slate-800 rounded animate-pulse" />
                          <div className="h-3 w-32 bg-slate-800 rounded animate-pulse" />
                        </div>
                      </div>
                      <ChevronDown className="w-3 h-3 text-slate-500" />
                    </div>
                  ) : selectedToken ? (
                    <>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center text-purple-400 font-bold">
                          {selectedToken.symbol ? selectedToken.symbol[0] : "?"}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-white flex items-center gap-2">
                            {selectedToken.symbol} Token
                            <ChevronDown className={`w-3 h-3 text-slate-500 transition-transform ${isTokenDropdownOpen ? 'rotate-180' : ''}`} />
                          </div>
                          <div className="text-xs text-slate-500 font-mono">{selectedToken.mint.slice(0, 6)}...{selectedToken.mint.slice(-4)}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-500">Balance</div>
                        <div className="text-sm font-mono text-white">{selectedToken.balance?.toFixed(2) || '0'}</div>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center">
                          <Wallet className="w-5 h-5 text-slate-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-400">No tokens found</div>
                          <div className="text-xs text-slate-600">Fund your vault first</div>
                        </div>
                      </div>
                      <ChevronDown className="w-3 h-3 text-slate-500" />
                    </div>
                  )}
                </div>

                {/* Dropdown Menu */}
                {isTokenDropdownOpen && availableTokens.length > 0 && (
                  <div className="absolute top-full left-0 w-full mt-2 bg-slate-900 border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden max-h-60 overflow-y-auto">
                    {availableTokens.map((token) => (
                      <div
                        key={token.mint}
                        className="p-3 hover:bg-white/5 flex items-center justify-between cursor-pointer transition-colors"
                        onClick={() => {
                          setSelectedToken(token);
                          setIsTokenDropdownOpen(false);
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">
                            {token.symbol[0]}
                          </div>
                          <div>
                            <div className="text-sm text-white font-medium">{token.symbol}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{token.mint.slice(0, 8)}...</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-slate-500">Balance</div>
                          <div className="text-sm font-mono text-white">{token.balance?.toFixed(2) || '0'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>


              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Total Pool Size</label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl pl-4 pr-12 py-3 text-white placeholder:text-slate-600 focus:border-purple-500/50 focus:outline-none font-mono text-lg"
                    placeholder="0.00"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">
                    {selectedToken?.symbol || ""}
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-2">Total tokens to be distributed across all recipients.</p>
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Start Date</label>
                <div className="relative group">
                  <input
                    type="datetime-local"
                    value={cycleStart}
                    onChange={(e) => setCycleStart(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-purple-500/50 focus:outline-none [color-scheme:dark]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">End Date</label>
                <div className="relative group">
                  <input
                    type="datetime-local"
                    value={cycleEnd}
                    onChange={(e) => setCycleEnd(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-purple-500/50 focus:outline-none [color-scheme:dark]"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Cliff (Optional)</label>
              <div className="relative">
                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="datetime-local"
                  value={cliffTime}
                  onChange={(e) => setCliffTime(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:border-purple-500/50 focus:outline-none [color-scheme:dark]"
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">Tokens remain fully locked until this date, then unlock linearly.</p>
            </div>

            {/* Claim Fee Configuration */}
            <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-4">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                  <Coins className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white mb-1">Pool Claim Fee</h4>
                  <p className="text-xs text-slate-400">
                    Additional fee charged to users when claiming from this pool. This fee goes to your project vault 
                    <span className="text-purple-400 font-medium"> (on top of platform fees)</span>.
                  </p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Fee Amount (USD)</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">
                      $
                    </div>
                    <input
                      type="number"
                      step="0.10"
                      min="0"
                      value={claimFeeUSD}
                      onChange={(e) => setClaimFeeUSD(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl pl-8 pr-16 py-3 text-white placeholder:text-slate-600 focus:border-purple-500/50 focus:outline-none font-mono"
                      placeholder="0.50"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">
                      USD
                    </div>
                  </div>
                  <div className="mt-2 p-2 bg-slate-900/50 rounded-lg border border-slate-700/50">
                    <p className="text-xs text-slate-400">
                      <span className="font-medium text-white">Current pool fee:</span> ${claimFeeUSD.toFixed(2)} USD
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      ≈ {(claimFeeUSD / solPrice).toFixed(4)} SOL <span className="text-slate-600">(at ${solPrice}/SOL)</span>
                    </p>
                  </div>
                </div>

                {/* Quick presets */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setClaimFeeUSD(0.25)}
                    className="flex-1 px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-white/10 rounded-lg text-xs text-white transition-colors"
                  >
                    $0.25
                  </button>
                  <button
                    type="button"
                    onClick={() => setClaimFeeUSD(0.50)}
                    className="flex-1 px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-white/10 rounded-lg text-xs text-white transition-colors"
                  >
                    $0.50
                  </button>
                  <button
                    type="button"
                    onClick={() => setClaimFeeUSD(1.00)}
                    className="flex-1 px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-white/10 rounded-lg text-xs text-white transition-colors"
                  >
                    $1.00
                  </button>
                  <button
                    type="button"
                    onClick={() => setClaimFeeUSD(2.00)}
                    className="flex-1 px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-white/10 rounded-lg text-xs text-white transition-colors"
                  >
                    $2.00
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            {currentMode === "manual" ? (
              <div className="space-y-4">
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setBulkMode(!bulkMode)}>
                    {bulkMode ? "Switch to Single" : "Bulk Import"}
                  </Button>
                  {!bulkMode && (
                    <Button size="sm" onClick={() => setManualAllocations(prev => [...prev, { id: generateId(), wallet: "", allocationType: "FIXED", allocationValue: 0 }])}>
                      <Plus className="w-4 h-4 mr-1" /> Add Wallet
                    </Button>
                  )}
                </div>

                {bulkMode ? (
                  <div className="bg-slate-900 p-4 rounded-xl border border-white/10 space-y-4">
                    <textarea
                      value={bulkWallets}
                      onChange={(e) => setBulkWallets(e.target.value)}
                      placeholder="Paste wallet addresses (one per line)..."
                      className="w-full h-32 bg-slate-950 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none font-mono"
                    />
                    <div className="flex gap-4">
                      <input
                        type="number"
                        value={bulkAllocationValue}
                        onChange={(e) => setBulkAllocationValue(Number(e.target.value))}
                        className="bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-white text-sm w-32"
                        placeholder="Amount"
                      />
                      <Button onClick={parseBulkWallets} disabled={!bulkWallets} className="flex-1">Process Import</Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {manualAllocations.map((alloc, idx) => (
                      <div key={alloc.id} className="flex items-center gap-2 bg-slate-900 p-3 rounded-xl border border-white/10">
                        <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs text-slate-500">
                          {idx + 1}
                        </div>
                        <input
                          value={alloc.wallet}
                          onChange={e => {
                            const newAlloc = [...manualAllocations];
                            newAlloc[idx].wallet = e.target.value;
                            setManualAllocations(newAlloc);
                          }}
                          placeholder="Wallet Address"
                          className="flex-1 bg-transparent border-none text-sm text-white focus:ring-0 placeholder:text-slate-600 font-mono"
                        />
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={alloc.allocationValue}
                            onChange={e => {
                              const newAlloc = [...manualAllocations];
                              newAlloc[idx].allocationValue = Number(e.target.value);
                              setManualAllocations(newAlloc);
                            }}
                            placeholder={alloc.allocationType === "PERCENTAGE" ? "%" : "Amount"}
                            className="w-20 bg-slate-950 border border-white/10 rounded-lg px-2 py-1 text-sm text-white text-right"
                          />
                          <select
                            value={alloc.allocationType}
                            onChange={e => {
                              const newAlloc = [...manualAllocations];
                              newAlloc[idx].allocationType = e.target.value as "PERCENTAGE" | "FIXED";
                              setManualAllocations(newAlloc);
                            }}
                            className="bg-slate-950 border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-purple-500/50"
                          >
                            <option value="FIXED">Fixed</option>
                            <option value="PERCENTAGE">%</option>
                          </select>
                        </div>
                        <button onClick={() => setManualAllocations(prev => prev.filter((_, i) => i !== idx))} className="text-slate-500 hover:text-red-400">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {manualAllocations.length === 0 && (
                      <div className="text-center py-8 text-slate-500 text-sm border border-dashed border-white/10 rounded-xl">
                        No allocations added yet.
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {rules.map((rule, idx) => (
                  <div key={rule.id} className="bg-slate-900 p-4 rounded-xl border border-white/10 space-y-4">
                    <div className="flex justify-between items-center">
                      <input
                        value={rule.name}
                        onChange={e => updateRule(idx, "name", e.target.value)}
                        className="bg-transparent text-sm font-medium text-white focus:outline-none"
                      />
                      <button onClick={() => removeRule(idx)} className="text-slate-500 hover:text-red-400">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-slate-500">NFT Mint</label>
                        <input
                          value={rule.nftContract}
                          onChange={e => updateRule(idx, "nftContract", e.target.value)}
                          className="w-full mt-1 bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono"
                          placeholder="Collection Address"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500">Min. Held</label>
                        <input
                          type="number"
                          value={rule.threshold}
                          onChange={e => updateRule(idx, "threshold", Number(e.target.value))}
                          className="w-full mt-1 bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <Button variant="outline" className="w-full border-dashed" onClick={addRule}>
                  <Plus className="w-4 h-4 mr-2" /> Add New Rule
                </Button>
              </div>
            )}
          </div>
        );
      case 4:
        return (
          <div className="space-y-6">
            <div className="bg-slate-900 rounded-xl border border-white/10 p-6 space-y-4">
              <h3 className="text-white font-medium">Summary</h3>
              <div className="grid grid-cols-2 gap-y-4 text-sm">
                <div className="text-slate-500">Token</div>
                <div className="text-right text-white font-medium">{selectedToken?.symbol || "-"}</div>

                <div className="text-slate-500">Total Pool</div>
                <div className="text-right text-white font-mono">{amount} {selectedToken?.symbol || ""}</div>

                <div className="text-slate-500">Mode</div>
                <div className="text-right text-white capitalize">{currentMode}</div>

                <div className="text-slate-500">Duration</div>
                <div className="text-right text-white">
                  {cycleStart && cycleEnd ?
                    Math.ceil((new Date(cycleEnd).getTime() - new Date(cycleStart).getTime()) / (1000 * 60 * 60 * 24)) + " days"
                    : "-"}
                </div>

                <div className="text-slate-500">Allocations</div>
                <div className="text-right text-white">
                  {currentMode === "manual"
                    ? `${manualAllocations.length} recipients`
                    : `${rules.length} rules configured`}
                </div>
              </div>
            </div>

            <label className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors">
              <input
                type="checkbox"
                checked={skipStreamflow}
                onChange={e => setSkipStreamflow(e.target.checked)}
                className="w-5 h-5 rounded bg-slate-950 border-white/20 text-purple-500 focus:ring-purple-500"
              />
              <div>
                <div className="text-sm font-medium text-white">Skip Streamflow Deployment</div>
                <div className="text-xs text-slate-500">Create DB record only (for testing/manual setup)</div>
              </div>
            </label>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <>
      {/* Funding Status Toast (SECURITY: Using React state instead of innerHTML to prevent XSS) */}
      {fundingStatus && (
        <div className="fixed top-4 right-4 bg-slate-900 border border-purple-500/50 rounded-xl p-4 z-50 shadow-2xl">
          <div className="text-sm text-white">{fundingStatus}</div>
        </div>
      )}
      
      <Modal open={open} onClose={onClose} title="Create Vesting Pool" widthClassName="max-w-6xl h-[800px] w-full mx-4 md:mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">

        {/* Main Form Section */}
        <div className="lg:col-span-2 flex flex-col h-full overflow-y-auto">
          {/* Stepper */}
          <div className="flex justify-between mb-8 px-2">
            {steps.map((step) => (
              <div
                key={step.id}
                className={cn(
                  "flex flex-col items-center gap-2 cursor-pointer transition-colors",
                  activeStep === step.id ? "text-purple-400" : activeStep > step.id ? "text-green-400" : "text-slate-600"
                )}
                onClick={() => setActiveStep(step.id)}
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all",
                  activeStep === step.id ? "bg-purple-500/20 border-2 border-purple-500" :
                    activeStep > step.id ? "bg-green-500/20 border-2 border-green-500" : "bg-slate-900 border-2 border-slate-700"
                )}>
                  {activeStep > step.id ? <CheckCircle2 className="w-4 h-4" /> : step.id}
                </div>
                <span className="text-xs font-medium">{step.title}</span>
              </div>
            ))}
          </div>

          {/* Step Content */}
          <div className="flex-1 overflow-y-auto px-1 custom-scrollbar">
            {renderStepContent()}
          </div>

          {/* Navigation Footer */}
          <div className="pt-6 mt-auto flex justify-between border-t border-white/5">
            <Button variant="ghost" onClick={activeStep === 1 ? onClose : () => setActiveStep(prev => prev - 1)}>
              {activeStep === 1 ? "Cancel" : "Back"}
            </Button>
            <Button
              onClick={activeStep === 4 ? handleCreate : () => setActiveStep(prev => prev + 1)}
              disabled={loading || (activeStep === 1 && !selectedToken)}
            >
              {activeStep === 4 ? (loading ? "Creating..." : "Create Pool") : "Next Step"}
              {activeStep !== 4 && <ArrowRight className="w-4 h-4 ml-2" />}
            </Button>
          </div>
        </div>

        {/* Tutorial / Info Sidebar */}
        <div className="hidden lg:flex flex-col h-full border-l border-white/10 pl-8">
          <div className="bg-slate-900/50 rounded-2xl p-6 border border-white/5 flex-1">
            <div className="flex items-center gap-2 text-purple-400 mb-4">
              <HelpCircle className="w-5 h-5" />
              <h3 className="font-medium">Guide</h3>
            </div>

            <div className="space-y-6 text-sm text-slate-400">
              {activeStep === 1 && (
                <>
                  <p>Select the funding token and vesting strategy.</p>
                  <div className="p-3 bg-slate-950 rounded-lg border border-white/5 text-xs">
                    <strong className="text-slate-200 block mb-1">Multi-Token Support</strong>
                    You can now select different tokens from your treasury for each pool.
                  </div>
                  <ul className="list-disc pl-4 space-y-2 mt-4">
                    <li><strong className="text-slate-200">Snapshot:</strong> One-time distribution to a fixed list of holders.</li>
                    <li><strong className="text-slate-200">Dynamic:</strong> Continuous distribution that tracks NFT ownership changes.</li>
                  </ul>
                </>
              )}

              {activeStep === 2 && (
                <>
                  <p>Define the release schedule:</p>
                  <div className="p-3 bg-slate-950 rounded-lg border border-white/5 text-xs font-mono">
                    Start ➔ Cliff (Optional) ➔ Linear Unlock ➔ End
                  </div>
                  <p>The calendar inputs use your local timezone but support browser-native dark mode styling.</p>
                </>
              )}

              {activeStep === 3 && (
                <>
                  {currentMode === "manual" ? (
                    <p>Add wallets manually or use bulk paste. For bulk paste, format as one address per line.</p>
                  ) : (
                    <p>Set up NFT gating rules. Users holding the specified NFT collection will automatically qualify.</p>
                  )}
                </>
              )}

              {activeStep === 4 && (
                <>
                  <p>Review your configuration carefully.</p>
                  
                  {!skipStreamflow && (
                    <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-200 text-xs mb-3">
                      <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold mb-1">Treasury Funding Required</p>
                        <p className="mb-2">You will be asked to fund the treasury with:</p>
                        {selectedToken?.isNative ? (
                          <ul className="list-disc list-inside space-y-1 ml-2">
                            <li><span className="font-mono font-bold">{amount ? (Number(amount) * 1.005).toLocaleString() : '0'} SOL</span> (pool + 0.25% Streamflow fee + 0.25% buffer)</li>
                            <li><span className="font-mono font-bold">+0.015 SOL</span> (rent deposit for Streamflow deployment)</li>
                            <li className="font-semibold text-blue-300">Total: {amount ? ((Number(amount) * 1.005) + 0.015).toFixed(4) : '0'} SOL</li>
                          </ul>
                        ) : (
                          <ul className="list-disc list-inside space-y-1 ml-2">
                            <li><span className="font-mono font-bold">{amount ? (Number(amount) * 1.005).toLocaleString() : '0'}</span> tokens (pool + 0.25% Streamflow fee + 0.25% buffer)</li>
                            <li><span className="font-mono font-bold">~0.015 SOL</span> (rent deposit for Streamflow deployment)</li>
                          </ul>
                        )}
                        <p className="mt-2 text-slate-400 italic">The 0.5% extra covers Streamflow&apos;s 0.25% protocol fee plus a safety buffer.</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-200 text-xs">
                    <Info className="w-4 h-4 flex-shrink-0" />
                    Once created, snapshot pools cannot be modified. Dynamic rules can be adjusted later.
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        </div>
      </Modal>
    </>
  );
}
