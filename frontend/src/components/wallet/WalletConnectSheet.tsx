'use client';

import React from 'react';
import Link from 'next/link';
import { SheetModal } from '../ui/SheetModal';
import { ButtonWallet } from '../ui/ButtonWallet';
import { useWallet } from '@/lib/wallet/WalletContext';
import { SUPPORTED_WALLETS, formatAddress } from '@/lib/wallet/walletAdapter';

export interface WalletConnectSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

const WalletIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 7H5C3.89543 7 3 7.89543 3 9V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V9C21 7.89543 20.1046 7 19 7Z" />
    <path d="M16 13H14" />
    <path d="M19 7V5C19 3.89543 18.1046 3 17 3H7C5.89543 3 5 3.89543 5 5V7" />
  </svg>
);

const InfoIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16V12" strokeLinecap="round" />
    <path d="M12 8H12.01" strokeLinecap="round" />
  </svg>
);

export const WalletConnectSheet: React.FC<WalletConnectSheetProps> = ({
  isOpen,
  onClose
}) => {
  const {
    isConnected,
    isConnecting,
    connectingWalletId,
    walletId,
    walletName,
    publicKey,
    error,
    connect,
    disconnect
  } = useWallet();

  const handleWalletSelect = async (targetWalletId: (typeof SUPPORTED_WALLETS)[number]['id']) => {
    const success = await connect(targetWalletId);
    if (success) {
      onClose();
    }
  };

  return (
    <SheetModal
      isOpen={isOpen}
      onClose={onClose}
    >
      <div className="relative p-7 overflow-hidden">
        {/* Header Atmosphere Gradient Background - Seamlessly clipped by SheetModal overflow-hidden */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-[#4C3AFF]/10 via-purple-500/5 to-transparent pointer-events-none" />

        {/* Modal Header */}
        <div className="relative flex items-center justify-between mb-5 pr-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#DAD6FF]/60 flex items-center justify-center text-[#4C3AFF] shadow-xs ring-1 ring-[#7669FF]/30">
              <WalletIcon />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-[#0D1B2E] tracking-tight">
                {isConnected ? 'Connected Wallet' : 'Connect Wallet'}
              </h3>
            </div>
          </div>
        </div>

        {/* Modal Content */}
        <div className="relative z-10 space-y-4">
          <p className="text-sm text-[#647087] leading-relaxed mb-6">
            {isConnected
              ? 'Your Stellar wallet is currently connected to Soroban Testnet:'
              : 'Choose how you want to connect to the Stellar Testnet to manage your invoices:'}
          </p>

          {isConnected ? (
            /* Connected Wallet Details Card */
            <div className="p-4 bg-[#F5F8FB] border border-[#0F6E5C]/30 rounded-xl space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#0F6E5C] bg-[#D7F0EA] px-2.5 py-0.5 rounded-full">
                  {walletName || 'Connected'}
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#5B6B85]">
                  Stellar Testnet
                </span>
              </div>

              <div>
                <p className="text-xs text-[#647087]">Stellar Account Address</p>
                <p className="font-mono text-sm font-semibold text-[#0D1B2E] mt-0.5 select-all">
                  {formatAddress(publicKey)}
                </p>
                <p className="font-mono text-[11px] text-[#8894A6] truncate mt-1">
                  {publicKey}
                </p>
              </div>

              <div className="pt-3 border-t border-[#E2E7EE] flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    disconnect();
                    onClose();
                  }}
                  className="text-xs font-medium text-[#D6304A] hover:underline"
                >
                  Disconnect Wallet
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Top-Level Normalized Error Alert Banner */}
              {error && (
                <div className="p-3.5 rounded-xl bg-[#FCE7EA] border border-[#D6304A]/30 text-[#D6304A] text-xs font-medium space-y-1 shadow-2xs">
                  <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-[11px] text-[#D6304A]">
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0" />
                    </svg>
                    {error.category === 'NETWORK_MISMATCH' ? 'Network Mismatch' : 'Connection Failure'}
                  </div>
                  <p className="text-xs text-[#D6304A] leading-relaxed">
                    {error.message}
                  </p>
                </div>
              )}

              {/* Wallet Row Priority Stack: 1. Freighter, 2. Albedo, 3. xBull */}
              <div className="flex flex-col gap-3">
                {SUPPORTED_WALLETS.map(w => {
                  const isRowConnecting = isConnecting && connectingWalletId === w.id;
                  const isRowConnected = isConnected && walletId === w.id;
                  const isRowError = error && error.walletId === w.id;
                  const rowError = isRowError ? error.message : null;

                  return (
                    <ButtonWallet
                      key={w.id}
                      walletId={w.id}
                      name={w.name}
                      connectingText={w.connectingText}
                      isConnecting={isRowConnecting}
                      isConnected={isRowConnected}
                      error={rowError}
                      disabled={isConnecting && !isRowConnecting}
                      onClick={() => handleWalletSelect(w.id)}
                    />
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="relative z-10 mt-6 pt-4 border-t border-[#E2E7EE] flex items-center justify-center gap-2 text-xs text-[#647087]">
          <InfoIcon />
          <span>
            New to Stellar?{' '}
            <Link
              href="https://stellar.org/wallets"
              target="_blank"
              className="text-[#4C3AFF] font-medium hover:underline transition-colors"
            >
              Learn more about wallets
            </Link>
          </span>
        </div>
      </div>
    </SheetModal>
  );
};
