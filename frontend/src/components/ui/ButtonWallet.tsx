import React from 'react';
import { WalletId } from '@/lib/wallet/types';

export interface ButtonWalletProps {
  walletId: WalletId;
  name: string;
  connectingText: string;
  isConnecting?: boolean;
  isConnected?: boolean;
  error?: string | null;
  onClick: () => void;
  disabled?: boolean;
}

const WALLET_METADATA: Record<WalletId, { description: string; color: string; abbreviation: string; popular?: boolean }> = {
  freighter: {
    description: 'Browser extension',
    color: '#141A3D',
    abbreviation: 'FR',
    popular: true
  },
  albedo: {
    description: 'Web-based signer',
    color: '#0F6E5C',
    abbreviation: 'AL'
  },
  xbull: {
    description: 'Stellar native wallet',
    color: '#4C3AFF',
    abbreviation: 'XB'
  }
};

const SparkleIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-[#4C3AFF]">
    <path d="M12 3L14.5 9.5L21 12L14.5 14.5L12 21L9.5 14.5L3 12L9.5 9.5L12 3Z" />
  </svg>
);

export const ButtonWallet: React.FC<ButtonWalletProps> = ({
  walletId,
  name,
  connectingText,
  isConnecting = false,
  isConnected = false,
  error,
  onClick,
  disabled = false
}) => {
  const meta = WALLET_METADATA[walletId] || {
    description: 'Stellar wallet',
    color: '#4C3AFF',
    abbreviation: walletId.slice(0, 2).toUpperCase()
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isConnecting}
      className={`group relative w-full flex flex-col gap-2.5 p-4 rounded-xl transition-all duration-300 ease-out border text-left overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4C3AFF] focus-visible:ring-offset-2 ${
        isConnected
          ? 'border-[#0F6E5C] bg-[#D7F0EA]/20 shadow-xs'
          : error
          ? 'border-[#D6304A]/50 bg-[#FCE7EA]/20'
          : 'border-[#E2E7EE] bg-white hover:border-[#4C3AFF]/40 hover:bg-gradient-to-r hover:from-indigo-50/30 hover:via-white hover:to-purple-50/30 hover:shadow-md hover:-translate-y-0.5'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      {/* Background Shimmer Effect on Hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#4C3AFF]/5 to-transparent -translate-x-full group-hover:animate-shimmer transition-opacity duration-300 opacity-0 group-hover:opacity-100 pointer-events-none" />

      <div className="relative flex items-center justify-between w-full z-10">
        <div className="flex items-center gap-3.5">
          {/* Stylized Logo Wrapper */}
          <div className="relative p-0.5 rounded-xl transition-transform duration-300 group-hover:scale-105">
            <div
              className="absolute inset-0 rounded-xl opacity-20 blur-sm transition-opacity duration-300 group-hover:opacity-40"
              style={{ backgroundColor: meta.color }}
            />
            <div
              className="relative w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-inner"
              style={{
                background: `linear-gradient(135deg, ${meta.color}, ${meta.color}dd)`
              }}
            >
              {meta.abbreviation}
            </div>
          </div>

          {/* Text Content */}
          <div className="flex flex-col text-left">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-[#0D1B2E] group-hover:text-[#4C3AFF] transition-colors">
                {name}
              </span>
              {meta.popular && !isConnected && !isConnecting && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#DAD6FF]/60 text-[#4C3AFF] border border-[#7669FF]/30 uppercase tracking-wider">
                  <SparkleIcon />
                  Popular
                </span>
              )}
            </div>
            <span className="text-xs text-[#647087] mt-0.5">
              {isConnecting ? connectingText : meta.description}
            </span>
          </div>
        </div>

        {/* Action Indicator Button */}
        <div className="flex items-center gap-2">
          {isConnecting ? (
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#B5730B] text-white shadow-sm">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : isConnected ? (
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#0F6E5C] text-white shadow-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#D6304A] text-white shadow-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
          ) : (
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#F5F8FB] text-[#647087] border border-[#E2E7EE] group-hover:bg-[#4C3AFF] group-hover:text-white group-hover:border-[#4C3AFF] group-hover:shadow-[0_0_15px_rgba(76,58,255,0.4)] transition-all duration-300">
              <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
          )}
        </div>
      </div>

      {error && (
        <p className="text-xs text-[#D6304A] font-medium pt-2 border-t border-[#D6304A]/20">
          {error}
        </p>
      )}
    </button>
  );
};
