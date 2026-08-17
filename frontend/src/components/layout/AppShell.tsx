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
  activeRoute?: 'home' | 'dashboard' | 'invoices' | 'create';
}

export const AppShell: React.FC<AppShellProps> = ({ children, activeRoute }) => {
  const pathname = usePathname();
  const [isWalletSheetOpen, setIsWalletSheetOpen] = useState(false);
  const { isConnected, walletName, publicKey } = useWallet();

  const currentRoute = activeRoute || (
    pathname === '/invoices' ? 'invoices' :
    pathname === '/create' ? 'create' : 'home'
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F8FB] text-[#0D1B2E]">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#E2E7EE] px-4 lg:px-8 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-4 lg:gap-6">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-[#4C3AFF] flex items-center justify-center text-white font-bold text-lg shadow-sm group-hover:bg-[#3C2ED4] transition-colors">
              I
            </div>
            <span className="font-semibold text-lg text-[#0D1B2E] tracking-tight">
              Invoice<span className="text-[#4C3AFF]">Fi</span>
            </span>
          </Link>

          {/* Persistent Network Badge per InvoiceFi_DESIGN.md §2 & §4.6 */}
          <BadgeNetwork network="TESTNET" />
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 bg-[#F5F8FB] p-1 rounded-full border border-[#E2E7EE]">
          <Link
            href="/"
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
              currentRoute === 'home' || currentRoute === 'dashboard'
                ? 'bg-white text-[#4C3AFF] shadow-xs'
                : 'text-[#647087] hover:text-[#0D1B2E]'
            }`}
          >
            Home
          </Link>
          <Link
            href="/invoices"
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
              currentRoute === 'invoices'
                ? 'bg-white text-[#4C3AFF] shadow-xs'
                : 'text-[#647087] hover:text-[#0D1B2E]'
            }`}
          >
            Invoices
          </Link>
          <Link
            href="/create"
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
              currentRoute === 'create'
                ? 'bg-white text-[#4C3AFF] shadow-xs'
                : 'text-[#647087] hover:text-[#0D1B2E]'
            }`}
          >
            Create
          </Link>
        </nav>

        {/* Right Action Bar (Connect Wallet & Connected Address) */}
        <div className="flex items-center gap-3">
          {isConnected ? (
            <button
              type="button"
              onClick={() => setIsWalletSheetOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#D7F0EA] border border-[#0F6E5C]/30 text-[#0F6E5C] text-xs font-medium hover:bg-[#D7F0EA]/80 transition-colors motion-fast"
            >
              <span className="w-2 h-2 rounded-full bg-[#0F6E5C]" />
              <span>{walletName}</span>
              <span className="font-mono font-semibold">{formatAddress(publicKey)}</span>
            </button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsWalletSheetOpen(true)}
            >
              Connect Wallet
            </Button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {children}
      </main>

      {/* Mobile Bottom Navigation Bar per InvoiceFi_DESIGN.md §3.6 */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#E2E7EE] px-6 py-2.5 flex items-center justify-around shadow-lg">
        <Link
          href="/"
          className={`flex flex-col items-center gap-1 text-xs font-medium ${
            currentRoute === 'home' || currentRoute === 'dashboard' ? 'text-[#4C3AFF]' : 'text-[#647087]'
          }`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Home
        </Link>
        <Link
          href="/create"
          className={`flex flex-col items-center gap-1 text-xs font-medium ${
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
          className={`flex flex-col items-center gap-1 text-xs font-medium ${
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
      <footer className="bg-white border-t border-[#E2E7EE] py-6 px-4 text-center text-xs text-[#647087] mb-12 md:mb-0">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} InvoiceFi — Stellar Invoice Tokenization Protocol</p>
          <div className="flex items-center gap-4">
            <span className="font-mono text-xs text-[#8894A6]">Level 4 Testnet MVP</span>
            <span className="text-[#E2E7EE]">|</span>
            <Link href="https://soroban-testnet.stellar.org" target="_blank" className="hover:text-[#4C3AFF] transition-colors">
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
