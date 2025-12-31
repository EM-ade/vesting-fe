"use client";

import { useState, useCallback } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { Transaction, VersionedTransaction } from "@solana/web3.js";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface ClaimResponse {
  success: boolean;
  transaction: string; // base64 encoded transaction
  lastValidBlockHeight: number;
  claimDetails: {
    amountToClaim: number;
    totalAvailable: number;
    poolBreakdown: Array<{
      poolId: string;
      poolName: string;
      amountToClaim: number;
      availableFromPool: number;
      vestingId: string;
    }>;
  };
  feeDetails: {
    amountSol: number;
    amountLamports: number;
  };
}

interface ClaimResult {
  signature: string;
  amountClaimed: number;
  feePaid: number;
  pools: Array<{
    poolId: string;
    poolName: string;
    amountClaimed: number;
  }>;
}

export function useSimpleClaim() {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string>("");

  const executeClaim = useCallback(
    async (
      amountToClaim: number,
      tokenMint?: string
    ): Promise<ClaimResult | null> => {
      if (!publicKey || !signTransaction) {
        throw new Error("Wallet not connected");
      }

      setLoading(true);
      setError(null);
      setProgress(0);
      setStatus("Initiating claim...");

      try {
        // Step 1: Request claim transaction from backend
        console.log("[CLAIM] Step 1: Requesting claim transaction...");
        setProgress(20);

        const response = await api.post<ClaimResponse>("/user/vesting/claim", {
          userWallet: publicKey.toBase58(),
          amountToClaim,
          tokenMint,
        });

        if (!response.success || !response.transaction) {
          throw new Error("Invalid response from claim endpoint");
        }

        console.log("[CLAIM] Transaction received:", {
          amountToClaim: response.claimDetails.amountToClaim,
          feeInSOL: response.feeDetails.amountSol,
          pools: response.claimDetails.poolBreakdown.length,
        });

        setProgress(40);
        setStatus("Sign the transaction in your wallet...");

        // Step 2: Deserialize transaction (try VersionedTransaction first, fallback to legacy)
        console.log("[CLAIM] Step 2: Preparing transaction...");

        const transactionBuffer = Buffer.from(response.transaction, "base64");
        
        let transaction: Transaction | VersionedTransaction;
        let blockhash: string;
        
        try {
          // Try deserializing as VersionedTransaction
          transaction = VersionedTransaction.deserialize(transactionBuffer);
          console.log("[CLAIM] Transaction is VersionedTransaction (already partially signed by vault)");
          
          // DO NOT update blockhash - transaction is already partially signed by vault
          // Updating blockhash would invalidate the vault's signature
          blockhash = transaction.message.recentBlockhash;
          console.log("[CLAIM] Using existing blockhash from transaction:", blockhash);
        } catch (err) {
          // Fallback to legacy Transaction
          console.log("[CLAIM] Transaction is legacy Transaction");
          transaction = Transaction.from(transactionBuffer);
          
          // Update with fresh blockhash for legacy transactions
          const { blockhash: newBlockhash } = await connection.getLatestBlockhash("confirmed");
          blockhash = newBlockhash;
          transaction.recentBlockhash = blockhash;
          console.log("[CLAIM] Updated blockhash for legacy transaction:", blockhash);
        }

        console.log("[CLAIM] Transaction ready to sign");

        setProgress(50);

        // Step 3: Sign transaction
        console.log("[CLAIM] Step 3: Signing transaction...");
        const signedTx = await signTransaction(transaction);

        console.log("[CLAIM] Transaction signed");

        setProgress(60);
        setStatus("Sending transaction...");

        // Step 4: Send transaction
        console.log("[CLAIM] Step 4: Sending transaction...");

        const signature = await connection.sendRawTransaction(
          signedTx.serialize(),
          {
            skipPreflight: false,
            maxRetries: 3,
          }
        );

        console.log("[CLAIM] Transaction sent:", signature);

        setProgress(75);
        setStatus("Confirming transaction...");

        // Step 5: Confirm transaction
        console.log("[CLAIM] Step 5: Waiting for confirmation...");

        const confirmation = await connection.confirmTransaction(
          {
            signature,
            blockhash,
            lastValidBlockHeight: response.lastValidBlockHeight,
          },
          "confirmed"
        );

        if (confirmation.value.err) {
          throw new Error("Transaction failed to confirm");
        }

        console.log("[CLAIM] Transaction confirmed!");

        setProgress(90);
        setStatus("Recording claim...");

        // Step 6: Record claim in database
        console.log("[CLAIM] Step 6: Recording claim in database...");

        await api.post("/user/vesting/complete-claim", {
          userWallet: publicKey.toBase58(),
          signature: signature,
          poolBreakdown: response.claimDetails.poolBreakdown,
        });

        console.log("[CLAIM] Claim recorded successfully");

        setProgress(100);
        setStatus("Claim completed successfully!");

        // Return result
        const result: ClaimResult = {
          signature,
          amountClaimed: response.claimDetails.amountToClaim,
          feePaid: response.feeDetails.amountSol,
          pools: response.claimDetails.poolBreakdown.map((p) => ({
            poolId: p.poolId,
            poolName: p.poolName,
            amountClaimed: p.amountToClaim,
          })),
        };

        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Claim failed");
        console.error("[CLAIM] Error:", error);
        
        // Provide user-friendly error messages with toast notifications
        let errorMessage = error.message || "Claim failed";
        
        // Rate limit errors (429)
        if (errorMessage.includes('wait 10 seconds') || errorMessage.includes('Duplicate request')) {
          errorMessage = "Please wait 10 seconds before claiming again";
          toast.warning("⏱️ Rate Limit", {
            description: errorMessage + ". This prevents accidental double-claims.",
            duration: 5000,
          });
        }
        // RPC connection errors (500)
        else if (errorMessage.includes('fetch failed') || errorMessage.includes('blockhash') || errorMessage.includes('recent blockhash')) {
          errorMessage = "RPC connection error. Please try again in a moment.";
          toast.error("⚠️ Network Error", {
            description: "The Solana RPC connection is temporarily unavailable. Please try again.",
            duration: 5000,
          });
        }
        // Generic errors
        else {
          toast.error("❌ Claim Failed", {
            description: errorMessage,
            duration: 5000,
          });
        }
        
        setError(new Error(errorMessage));
        setStatus("Claim failed");
        setProgress(0);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [publicKey, signTransaction, connection]
  );

  const reset = useCallback(() => {
    setError(null);
    setProgress(0);
    setStatus("");
  }, []);

  return {
    executeClaim,
    loading,
    error,
    status,
    progress,
    reset,
  };
}
