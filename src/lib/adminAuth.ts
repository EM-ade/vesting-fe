/**
 * Admin Authentication Utility
 * Signs messages with wallet to prove ownership for admin actions
 */

import { WalletContextState } from '@solana/wallet-adapter-react';
import bs58 from 'bs58';

export interface AdminAuthPayload {
  adminWallet: string;
  signature: string;
  message: string;
  timestamp: number;
}

/**
 * Sign an admin authentication message
 * This proves you own the admin wallet without needing the private key
 * 
 * @param wallet - Wallet context from useWallet()
 * @returns Admin authentication payload to include in API requests
 */
export async function signAdminMessage(
  wallet: WalletContextState
): Promise<AdminAuthPayload> {
  const { publicKey, signMessage } = wallet;

  if (!publicKey) {
    throw new Error('Wallet not connected');
  }

  if (!signMessage) {
    throw new Error('Wallet does not support message signing');
  }

  const walletAddress = publicKey.toBase58();
  const timestamp = Date.now();
  
  // Create the message to sign (must match backend format)
  const message = `Authenticate as admin\nWallet: ${walletAddress}\nTimestamp: ${timestamp}`;
  
  // Sign the message
  const messageBytes = new TextEncoder().encode(message);
  const signatureBytes = await signMessage(messageBytes);
  const signature = bs58.encode(signatureBytes);

  return {
    adminWallet: walletAddress,
    signature,
    message,
    timestamp,
  };
}

/**
 * Add admin authentication to request body
 * Use this before making admin API calls
 * 
 * @example
 * const auth = await signAdminMessage(wallet);
 * const response = await api.post('/treasury/withdraw', {
 *   ...auth,
 *   amount: 100,
 *   recipientAddress: '...'
 * });
 */
export async function withAdminAuth<T extends Record<string, any>>(
  wallet: WalletContextState,
  requestBody: T
): Promise<T & AdminAuthPayload> {
  const auth = await signAdminMessage(wallet);
  return {
    ...requestBody,
    ...auth,
  };
}

/**
 * Merge pre-signed admin auth payload with request body
 * Use this when you already have a cached auth payload
 * 
 * @example
 * const authPayload = await getAuthPayload(); // from context
 * const response = await api.post('/treasury/withdraw', 
 *   mergeAdminAuth(authPayload, { amount: 100, recipientAddress: '...' })
 * );
 */
export function mergeAdminAuth<T extends Record<string, any>>(
  authPayload: AdminAuthPayload,
  requestBody: T
): T & AdminAuthPayload {
  return {
    ...requestBody,
    ...authPayload,
  };
}
