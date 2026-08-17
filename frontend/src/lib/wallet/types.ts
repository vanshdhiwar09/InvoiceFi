export type WalletId = 'freighter' | 'albedo' | 'xbull';

export type ErrorCategory =
  | 'USER_REJECTED'
  | 'WALLET_NOT_FOUND'
  | 'NETWORK_MISMATCH'
  | 'CONNECTION_FAILED'
  | 'INSUFFICIENT_BALANCE'
  | 'UNKNOWN';

export interface NormalizedWalletError {
  category: ErrorCategory;
  message: string;
  providerError?: unknown;
}

export interface WalletProviderInfo {
  id: WalletId;
  name: string;
  connectingText: string;
  iconName: string;
}

export interface WalletState {
  isConnected: boolean;
  isConnecting: boolean;
  walletId: WalletId | null;
  walletName: string | null;
  publicKey: string | null;
  error: NormalizedWalletError | null;
}
