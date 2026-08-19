'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  WalletId,
  NormalizedWalletError,
  WalletState
} from './types';
import {
  ensureStellarWalletsKitInitialized,
  WALLET_KIT_ID_MAP,
  SUPPORTED_WALLETS,
  normalizeWalletError
} from './walletAdapter';
import { trackWalletConnected } from '@/lib/analytics';

const STORAGE_KEY = 'invoicefi_connected_wallet_id';

interface WalletContextType extends WalletState {
  connectingWalletId: WalletId | null;
  connect: (walletId: WalletId) => Promise<boolean>;
  disconnect: () => Promise<void>;
  clearError: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [walletId, setWalletId] = useState<WalletId | null>(null);
  const [walletName, setWalletName] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [connectingWalletId, setConnectingWalletId] = useState<WalletId | null>(null);
  const [error, setError] = useState<NormalizedWalletError | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const disconnect = useCallback(async () => {
    try {
      if (typeof window !== 'undefined') {
        const Kit = ensureStellarWalletsKitInitialized();
        await Kit.disconnect();
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (err) {
      console.warn('[WalletContext] Disconnect warning:', err);
    } finally {
      setAddress(null);
      setWalletId(null);
      setWalletName(null);
      setIsConnecting(false);
      setConnectingWalletId(null);
      setError(null);
    }
  }, []);

  const connect = useCallback(async (targetWalletId: WalletId): Promise<boolean> => {
    setIsConnecting(true);
    setConnectingWalletId(targetWalletId);
    setError(null);

    const providerInfo = SUPPORTED_WALLETS.find(w => w.id === targetWalletId);
    const kitId = WALLET_KIT_ID_MAP[targetWalletId];

    try {
      const Kit = ensureStellarWalletsKitInitialized();
      Kit.setWallet(kitId);

      const { address: cleanAddress } = await Kit.fetchAddress();

      if (!cleanAddress || typeof cleanAddress !== 'string' || cleanAddress.trim() === '') {
        throw new Error(`No public key returned by ${providerInfo?.name || targetWalletId}`);
      }

      const formatted = cleanAddress.trim();
      setAddress(formatted);
      setWalletId(targetWalletId);
      setWalletName(providerInfo?.name || targetWalletId);

      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, targetWalletId);
      }

      // Track successful wallet connection event (Phase 6H)
      trackWalletConnected(targetWalletId);

      return true;
    } catch (err: unknown) {
      console.error(`[WalletContext] Connection failed for ${targetWalletId}:`, err);
      const normalizedErr = normalizeWalletError(err, targetWalletId);
      setError(normalizedErr);
      return false;
    } finally {
      setIsConnecting(false);
      setConnectingWalletId(null);
    }
  }, []);

  // Session restoration on client mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedWalletId = localStorage.getItem(STORAGE_KEY) as WalletId | null;
    if (savedWalletId && WALLET_KIT_ID_MAP[savedWalletId]) {
      const restore = async () => {
        const success = await connect(savedWalletId);
        if (!success) {
          localStorage.removeItem(STORAGE_KEY);
        }
      };
      restore();
    }
  }, [connect]);

  return (
    <WalletContext.Provider
      value={{
        isConnected: Boolean(address),
        isConnecting,
        connectingWalletId,
        walletId,
        walletName,
        publicKey: address,
        error,
        connect,
        disconnect,
        clearError
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export function useWallet(): WalletContextType {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
