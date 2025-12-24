export function cn(...inputs: Array<string | false | null | undefined>) {
  return inputs.filter(Boolean).join(" ");
}

/**
 * Get Solscan URL for a transaction signature based on current network
 */
export function getSolscanUrl(signature: string): string {
  const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || '';
  
  // Detect network from RPC URL
  if (rpcUrl.includes('mainnet')) {
    return `https://solscan.io/tx/${signature}`;
  } else if (rpcUrl.includes('devnet')) {
    return `https://solscan.io/tx/${signature}?cluster=devnet`;
  } else if (rpcUrl.includes('testnet')) {
    return `https://solscan.io/tx/${signature}?cluster=testnet`;
  } else {
    // Default to devnet
    return `https://solscan.io/tx/${signature}?cluster=devnet`;
  }
}

/**
 * Get network name from RPC URL
 */
export function getNetworkName(): string {
  const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || '';
  
  if (rpcUrl.includes('mainnet')) {
    return 'mainnet-beta';
  } else if (rpcUrl.includes('devnet')) {
    return 'devnet';
  } else if (rpcUrl.includes('testnet')) {
    return 'testnet';
  } else {
    return 'devnet';
  }
}
