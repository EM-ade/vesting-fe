import { useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, VersionedTransaction } from '@solana/web3.js';
import { apiClient } from '../lib/apiClient';

interface ClaimInitResponse {
  success: boolean;
  step: string;
  transaction: string; // base64 encoded transaction (Fee + ATA + Transfer)
  lastValidBlockHeight: number;
  feeDetails: {
    amountUsd: number;
    amountSol: number;
    amountLamports: number;
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
  transactionSignature: string;
}

export type ClaimStatus =
  | 'idle'
  | 'preparing'
  | 'signing'
  | 'submitting'
  | 'confirming'
  | 'recording'
  | 'success'
  | 'error';

export function useClaimWithFee() {
  const { publicKey, signTransaction } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [status, setStatus] = useState<ClaimStatus>('idle');
  const [progress, setProgress] = useState(0);

  const executeClaim = useCallback(
    async (amountToClaim?: number): Promise<ClaimResult | null> => {
      if (!publicKey || !signTransaction) {
        const error = new Error('Wallet not connected or does not support signing');
        setError(error);
        console.error('[CLAIM] Error:', error);
        return null;
      }

      setLoading(true);
      setError(null);
      setStatus('preparing');
      setProgress(10);

      try {
        console.log('[CLAIM] Step 1: Initiating claim...');

        // Step 1: Call /claim endpoint to get the constructed transaction
        const initResponse = await apiClient.post<ClaimInitResponse>(
          '/user/vesting/claim',
          {
            userWallet: publicKey.toString(),
            amountToClaim,
          }
        );

        if (!initResponse || !initResponse.transaction) {
          throw new Error('Invalid response from claim endpoint');
        }

        console.log('[CLAIM] Claim initiated:', {
          amountToClaim: initResponse.claimDetails.amountToClaim,
          feeInSOL: initResponse.feeDetails.amountSol,
          pools: initResponse.claimDetails.poolBreakdown,
        });

        setProgress(30);
        setStatus('signing');

        // Step 2: Deserialize and Sign the transaction
        console.log('[CLAIM] Step 2: Signing transaction...');

        // Create connection
        const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
        const connection = new Connection(rpcUrl, 'confirmed');

        // Deserialize the versioned transaction from the backend
        const transactionBuffer = Buffer.from(initResponse.transaction, 'base64');
        const transaction = VersionedTransaction.deserialize(transactionBuffer);

        // Sign with user's wallet
        // The transaction is already partially signed by the backend (Vault)
        const signedTx = await signTransaction(transaction);
        console.log('[CLAIM] Transaction signed by user');

        setProgress(50);
        setStatus('submitting');

        // Step 3: Submit the transaction to the network
        console.log('[CLAIM] Step 3: Submitting transaction...');

        const signature = await connection.sendRawTransaction(signedTx.serialize(), {
          skipPreflight: false,
          maxRetries: 3
        });

        console.log('[CLAIM] Transaction submitted:', signature);

        setProgress(70);
        setStatus('confirming');

        // Wait for confirmation
        console.log('[CLAIM] Waiting for confirmation...');
        const latestBlockhash = await connection.getLatestBlockhash();

        await connection.confirmTransaction({
          signature,
          blockhash: latestBlockhash.blockhash,
          lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
        }, 'confirmed');

        console.log('[CLAIM] Transaction confirmed!');

        setProgress(90);
        setStatus('recording');

        // Step 4: Record the claim in the backend
        console.log('[CLAIM] Step 4: Recording claim...');

        const recordResponse = await apiClient.post<ClaimResult>(
          '/user/vesting/complete-claim',
          {
            userWallet: publicKey.toString(),
            signature,
            poolBreakdown: initResponse.claimDetails.poolBreakdown,
          }
        );

        console.log('[CLAIM] Claim recorded:', recordResponse);

        setProgress(100);
        setStatus('success');

        return {
          totalAmountClaimed: initResponse.claimDetails.amountToClaim,
          poolBreakdown: initResponse.claimDetails.poolBreakdown,
          transactionSignature: signature
        };

      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to execute claim');
        console.error('[CLAIM] Error:', error);
        setError(error);
        setStatus('error');
        setProgress(0);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [publicKey, signTransaction]
  );

  return {
    executeClaim,
    loading,
    error,
    status,
    progress,
  };
}
