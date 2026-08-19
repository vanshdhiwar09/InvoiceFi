import type {
  WalletId,
  NormalizedWalletError,
  WalletProviderInfo
} from './types';

export const SUPPORTED_WALLETS: WalletProviderInfo[] = [
  {
    id: 'freighter',
    name: 'Freighter',
    connectingText: 'Approve in Freighter…',
    iconName: 'freighter'
  },
  {
    id: 'albedo',
    name: 'Albedo',
    connectingText: 'Redirecting to Albedo…',
    iconName: 'albedo'
  },
  {
    id: 'xbull',
    name: 'xBull',
    connectingText: 'Opening xBull app…',
    iconName: 'xbull'
  }
];

/**
 * Normalizes raw wallet provider errors into human-readable categories & messages.
 */
export function normalizeWalletError(err: unknown, walletId: WalletId): NormalizedWalletError {
  const providerName = SUPPORTED_WALLETS.find(w => w.id === walletId)?.name || 'Wallet';
  const rawMsg = typeof err === 'string' ? err : (err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : String(err));
  const lowerMsg = rawMsg.toLowerCase();

  // Network Mismatch Check (Highest Priority)
  if (
    lowerMsg.includes('network') ||
    lowerMsg.includes('mainnet') ||
    lowerMsg.includes('testnet') ||
    lowerMsg.includes('mismatch') ||
    lowerMsg.includes('public global') ||
    lowerMsg.includes('switch your')
  ) {
    return {
      category: 'NETWORK_MISMATCH',
      message: `Switch your wallet to Stellar Testnet to continue.`,
      walletId,
      providerError: err
    };
  }

  // Provider Rejection Check
  if (
    lowerMsg.includes('reject') ||
    lowerMsg.includes('cancel') ||
    lowerMsg.includes('decline') ||
    lowerMsg.includes('denied') ||
    lowerMsg.includes('user closed') ||
    lowerMsg.includes('closed the window') ||
    lowerMsg.includes('closed') ||
    lowerMsg.includes('dismissed') ||
    lowerMsg.includes('refused') ||
    lowerMsg.includes('abort')
  ) {
    return {
      category: 'USER_REJECTED',
      message: `${providerName} request was rejected. You can try again.`,
      walletId,
      providerError: err
    };
  }

  if (
    lowerMsg.includes('not installed') ||
    lowerMsg.includes('not found') ||
    lowerMsg.includes('unavailable') ||
    lowerMsg.includes('missing') ||
    lowerMsg.includes('extension')
  ) {
    return {
      category: 'WALLET_NOT_FOUND',
      message: `${providerName} is not installed or available in this browser.`,
      walletId,
      providerError: err
    };
  }

  if (lowerMsg.includes('balance') || lowerMsg.includes('insufficient')) {
    return {
      category: 'INSUFFICIENT_BALANCE',
      message: `Insufficient XLM balance in ${providerName} to complete transaction.`,
      walletId,
      providerError: err
    };
  }

  return {
    category: 'CONNECTION_FAILED',
    message: `Unable to connect to ${providerName}: ${rawMsg}`,
    walletId,
    providerError: err
  };
}

/**
 * Formats a Stellar public key into shortened mono-address format (e.g. GABC...XYZ9).
 */
export function formatAddress(address: string | null): string {
  if (!address) return '';
  if (address.length <= 8) return address;
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}
