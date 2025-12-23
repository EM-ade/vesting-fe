import { useState, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, VersionedTransaction } from "@solana/web3.js";
import { apiClient } from "../lib/apiClient";

interface ClaimInitResponse {
  success: boolean;
  step: string;
  feeTransaction: string; // base64 encoded fee payment transaction
  feeDetails: {
    amountUsd: number;
    amountSol: number;
    amountLamports: number;
    feeWallet: string;
  };
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
}

interface PoolBreakdownItem {
  poolId: string;
  poolName: string;
  amountToClaim: number;
  availableFromPool: number;
  vestingId: string;
}

interface ClaimResult {
  totalAmountClaimed: number;
  poolBreakdown: PoolBreakdownItem[];
  feePaid: number;
  feeTransactionSignature: string;
  tokenTransactionSignature: string;
}

export type ClaimStatus =
  | "idle"
  | "preparing"
  | "signing_fee"
  | "confirming_fee"
  | "processing_claim"
  | "confirming_claim"
  | "success"
  | "error";

interface TransactionStatusResponse {
  success: boolean;
  status: "pending" | "confirmed" | "failed";
  message: string;
  signature: string;
  confirmations?: number;
  slot?: number;
  recordedInDatabase?: boolean;
  error?: string;
}

export function useClaimWithFee() {
  const { publicKey, signTransaction, sendTransaction } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [status, setStatus] = useState<ClaimStatus>("idle");
  const [progress, setProgress] = useState(0);

  const executeClaim = useCallback(
    async (
      amountToClaim?: number,
      tokenMint?: string
    ): Promise<ClaimResult | null> => {
      if (!publicKey || !signTransaction || !sendTransaction) {
        const error = new Error(
          "Wallet not connected or does not support signing"
        );
        setError(error);
        console.error("[CLAIM] Error:", error);
        return null;
      }

      setLoading(true);
      setError(null);
      setStatus("preparing");
      setProgress(10);

      try {
        console.log("[CLAIM] Step 1: Initiating claim...");

        // Step 1: Call /claim endpoint to get fee transaction
        const initResponse = await apiClient.post<ClaimInitResponse>(
          "/user/vesting/claim",
          {
            userWallet: publicKey.toString(),
            amountToClaim,
            tokenMint,
          }
        );

        if (!initResponse || !initResponse.feeTransaction) {
          throw new Error("Invalid response from claim endpoint");
        }

        console.log("[CLAIM] Claim initiated:", {
          amountToClaim: initResponse.claimDetails.amountToClaim,
          feeInSOL: initResponse.feeDetails.amountSol,
          feeInUSD: initResponse.feeDetails.amountUsd,
          pools: initResponse.claimDetails.poolBreakdown,
        });

        setProgress(25);
        setStatus("signing_fee");

        // Step 2: Sign and send fee payment transaction
        console.log("[CLAIM] Step 2: Signing fee payment transaction...");

        // Create connection using hardcoded RPC
        const rpcUrl =
          process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
          "https://api.devnet.solana.com";
        const connection = new Connection(rpcUrl, "confirmed");

        // Deserialize the versioned transaction from the backend
        const feeTransactionBuffer = Buffer.from(
          initResponse.feeTransaction,
          "base64"
        );
        const feeTransaction =
          VersionedTransaction.deserialize(feeTransactionBuffer);

        console.log("[CLAIM] Fee transaction details:", {
          from: publicKey.toString(),
          to: initResponse.feeDetails.feeWallet,
          amount: `${initResponse.feeDetails.amountSol} SOL ($${initResponse.feeDetails.amountUsd})`,
          lamports: initResponse.feeDetails.amountLamports,
          instructions: feeTransaction.message.compiledInstructions.length,
          blockhash:
            feeTransaction.message.recentBlockhash.substring(0, 8) + "...",
        });

        // Get a fresh blockhash to avoid "Blockhash not found" errors
        console.log("[CLAIM] Getting fresh blockhash...");
        const { blockhash, lastValidBlockHeight } =
          await connection.getLatestBlockhash("confirmed");

        // Update the transaction with fresh blockhash
        feeTransaction.message.recentBlockhash = blockhash;

        console.log("[CLAIM] Updated with fresh blockhash:", {
          blockhash: blockhash.substring(0, 8) + "...",
          lastValidBlockHeight,
        });

        const signedFeeTx = await signTransaction(feeTransaction);
        console.log("[CLAIM] Fee transaction signed, sending...");

        setProgress(40);
        setStatus("confirming_fee");

        const feeSignature = await connection.sendRawTransaction(
          signedFeeTx.serialize(),
          {
            skipPreflight: false,
            maxRetries: 3,
          }
        );
        console.log("[CLAIM] Fee payment sent:", feeSignature);

        // Wait for fee transaction confirmation with timeout
        console.log("[CLAIM] Waiting for fee payment confirmation...");
        const confirmStrategy = {
          signature: feeSignature,
          blockhash: blockhash,
          lastValidBlockHeight: lastValidBlockHeight,
        };

        await connection.confirmTransaction(confirmStrategy, "confirmed");
        console.log("[CLAIM] Fee payment confirmed!");

        setProgress(60);
        setStatus("processing_claim");

        // Step 3: Call /complete-claim with fee signature
        console.log("[CLAIM] Step 3: Completing claim...");
        const completeResponse = await apiClient.post<ClaimResult>(
          "/user/vesting/complete-claim",
          {
            userWallet: publicKey.toString(),
            feeSignature,
            poolBreakdown: initResponse.claimDetails.poolBreakdown,
          }
        );

        console.log("[CLAIM] Complete response:", completeResponse);

        if (!completeResponse || !completeResponse.totalAmountClaimed) {
          throw new Error("Invalid response from complete-claim endpoint");
        }

        setProgress(80);
        setStatus("confirming_claim");

        // Poll transaction status until confirmed
        const tokenSignature = completeResponse.tokenTransactionSignature;
        await pollTransactionStatus(tokenSignature);

        setProgress(100);
        setStatus("success");
        console.log("[CLAIM] Claim completed successfully:", completeResponse);
        return completeResponse;
      } catch (err: any) {
        console.error("[CLAIM] Error:", err);

        let customError =
          err instanceof Error ? err : new Error("Failed to execute claim");

        // Parse common Solana errors
        const msg = customError.message.toLowerCase();
        if (msg.includes("user rejected") || msg.includes("user cancelled")) {
          customError = new Error("Transaction cancelled by user");
        } else if (
          msg.includes("0x1") ||
          msg.includes("insufficient lamports") ||
          msg.includes("insufficient funds")
        ) {
          customError = new Error(
            "Insufficient SOL balance for transaction fees"
          );
        } else if (msg.includes("blockhash not found")) {
          customError = new Error(
            "Network busy. Please try again (Blockhash expired)"
          );
        } else if (msg.includes("simulation failed")) {
          // Try to extract logs or reason if available
          customError = new Error(
            "Transaction simulation failed. This might be due to insufficient funds or network issues."
          );
        }

        setError(customError);
        setStatus("error");
        setProgress(0);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [publicKey, signTransaction, sendTransaction]
  );

  // Poll transaction status endpoint
  const pollTransactionStatus = async (
    signature: string,
    maxAttempts = 10
  ): Promise<void> => {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const statusResponse = await apiClient.get<TransactionStatusResponse>(
          `/user/vesting/claim-status/${signature}`
        );

        console.log(
          `[CLAIM-STATUS] Attempt ${attempt + 1}/${maxAttempts}:`,
          statusResponse.status
        );

        if (statusResponse.status === "confirmed") {
          console.log("[CLAIM-STATUS] Transaction confirmed!");
          return;
        }

        if (statusResponse.status === "failed") {
          throw new Error(
            statusResponse.error || "Transaction failed on-chain"
          );
        }

        // Wait 3 seconds before next poll
        if (attempt < maxAttempts - 1) {
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }
      } catch (err) {
        console.error("[CLAIM-STATUS] Polling error:", err);
        // Continue polling even if status check fails
        if (attempt < maxAttempts - 1) {
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }
      }
    }

    // If we reach here, transaction might still be pending
    console.warn(
      "[CLAIM-STATUS] Max polling attempts reached, transaction may still be processing"
    );
  };

  return {
    executeClaim,
    loading,
    error,
    status,
    progress,
  };
}
