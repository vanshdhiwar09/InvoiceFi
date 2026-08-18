'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BadgeNetwork } from '../ui/BadgeNetwork';
import { Button } from '../ui/Button';
import { WalletConnectSheet } from '../wallet/WalletConnectSheet';
import { useWallet } from '@/lib/wallet/WalletContext';
import { formatAddress } from '@/lib/wallet/walletAdapter';

export interface AppShellProps {
  children: React.ReactNode;
  hero?: React.ReactNode;
  activeRoute?: 'home' | 'dashboard' | 'invoices' | 'create';
}

export const AppShell: React.FC<AppShellProps> = ({ children, hero, activeRoute }) => {
  const pathname = usePathname();
  const [isWalletSheetOpen, setIsWalletSheetOpen] = useState(false);
  const { isConnected, walletName, publicKey } = useWallet();

  const currentRoute = activeRoute || (
    pathname === '/invoices' ? 'invoices' :
    pathname === '/create' ? 'create' : 'home'
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F8FB] text-[#0D1B2E]">
      {/* Stripe-Proportioned High-Legibility Top Navigation Bar (h-20) */}
      <header className="sticky top-0 z-40 h-20 bg-white/95 backdrop-blur-md border-b border-[#E2E7EE] px-4 sm:px-8 lg:px-12 flex items-center justify-between shadow-2xs">
        
        {/* Left: Brand Logo & Network Status Badge */}
        <div className="flex items-center gap-3 sm:gap-4 flex-1 justify-start min-w-0">
          <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group shrink-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#4C3AFF] flex items-center justify-center text-white font-bold text-lg sm:text-xl shadow-md group-hover:bg-[#3C2ED4] transition-all">
              I
            </div>
            <span className="font-semibold text-lg sm:text-xl text-[#0D1B2E] tracking-tight">
              Invoice<span className="text-[#4C3AFF]">Fi</span>
            </span>
          </Link>

          {/* Persistent Network Badge per InvoiceFi_DESIGN.md §2 & §4.6 */}
          <div className="hidden sm:block shrink-0">
            <BadgeNetwork network="TESTNET" />
          </div>
        </div>

        {/* Center: Perfectly Centered Balanced Navigation Segment */}
        <nav className="hidden md:flex items-center gap-1 bg-[#F1F5F9] p-1.5 rounded-full border border-[#E2E7EE] shadow-2xs shrink-0 mx-auto">
          <Link
            href="/"
            className={`px-5 py-1.5 sm:px-6 sm:py-2 rounded-full text-xs sm:text-sm font-semibold transition-all ${
              currentRoute === 'home' || currentRoute === 'dashboard'
                ? 'bg-white text-[#4C3AFF] shadow-xs'
                : 'text-[#647087] hover:text-[#0D1B2E]'
            }`}
          >
            Home
          </Link>
          <Link
            href="/invoices"
            className={`px-5 py-1.5 sm:px-6 sm:py-2 rounded-full text-xs sm:text-sm font-semibold transition-all ${
              currentRoute === 'invoices'
                ? 'bg-white text-[#4C3AFF] shadow-xs'
                : 'text-[#647087] hover:text-[#0D1B2E]'
            }`}
          >
            Invoices
          </Link>
          <Link
            href="/create"
            className={`px-5 py-1.5 sm:px-6 sm:py-2 rounded-full text-xs sm:text-sm font-semibold transition-all ${
              currentRoute === 'create'
                ? 'bg-white text-[#4C3AFF] shadow-xs'
                : 'text-[#647087] hover:text-[#0D1B2E]'
            }`}
          >
            Create
          </Link>
        </nav>

        {/* Right: Wallet Action Bar */}
        <div className="flex items-center gap-3 flex-1 justify-end shrink-0">
          {isConnected ? (
            <button
              type="button"
              onClick={() => setIsWalletSheetOpen(true)}
              className="inline-flex items-center gap-2 sm:gap-2.5 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-[#D7F0EA] border border-[#0F6E5C]/30 text-[#0F6E5C] text-xs sm:text-sm font-semibold hover:bg-[#D7F0EA]/80 transition-colors shadow-2xs"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-[#0F6E5C]" />
              <span className="hidden sm:inline">{walletName}</span>
              <span className="font-mono font-semibold">{formatAddress(publicKey)}</span>
            </button>
          ) : (
            <Button
              variant="primary"
              size="md"
              className="bg-[#4C3AFF] hover:bg-[#3C2ED4] text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl font-semibold text-xs sm:text-sm shadow-md"
              onClick={() => setIsWalletSheetOpen(true)}
            >
              Connect Wallet
            </Button>
          )}
        </div>
      </header>

      {/* Full-Bleed Hero Slot (Spans 100% Viewport Width directly below header) */}
      {hero && <div className="w-full">{hero}</div>}

      {/* Main Content Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        {children}
      </main>

      {/* Mobile Bottom Navigation Bar per InvoiceFi_DESIGN.md §3.6 */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#E2E7EE] px-6 py-3 flex items-center justify-around shadow-lg">
        <Link
          href="/"
          className={`flex flex-col items-center gap-1 text-xs font-semibold ${
            currentRoute === 'home' || currentRoute === 'dashboard' ? 'text-[#4C3AFF]' : 'text-[#647087]'
          }`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Home
        </Link>
        <Link
          href="/invoices"
          className={`flex flex-col items-center gap-1 text-xs font-semibold ${
            currentRoute === 'invoices' ? 'text-[#4C3AFF]' : 'text-[#647087]'
          }`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Invoices
        </Link>
        <Link
          href="/create"
          className={`flex flex-col items-center gap-1 text-xs font-semibold ${
            currentRoute === 'create' ? 'text-[#4C3AFF]' : 'text-[#647087]'
          }`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
          </svg>
          Create
        </Link>
        <button
          type="button"
          onClick={() => setIsWalletSheetOpen(true)}
          className={`flex flex-col items-center gap-1 text-xs font-semibold ${
            isConnected ? 'text-[#0F6E5C]' : 'text-[#647087] hover:text-[#4C3AFF]'
          }`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          {isConnected ? formatAddress(publicKey) : 'Wallet'}
        </button>
      </div>

      {/* Footer */}
      <footer className="bg-[#070A14] text-[#94A3B8] border-t border-[#1E293B] py-8 px-4 text-center text-xs mb-12 md:mb-0">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} InvoiceFi — Stellar Invoice Tokenization Protocol</p>
          <div className="flex items-center gap-4">
            <span className="font-mono text-xs text-[#647087]">Level 4 Testnet MVP</span>
            <span className="text-[#334155]">|</span>
            <Link href="https://soroban-testnet.stellar.org" target="_blank" className="hover:text-white transition-colors">
              Soroban RPC
            </Link>
          </div>
        </div>
      </footer>

      {/* Wallet Connect Sheet Overlay */}
      <WalletConnectSheet
        isOpen={isWalletSheetOpen}
        onClose={() => setIsWalletSheetOpen(false)}
      />
    </div>
  );
};
