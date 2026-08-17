'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { useWallet } from '@/lib/wallet/WalletContext';

export default function InvoicesPage() {
  const router = useRouter();
  const { isConnected } = useWallet();

  return (
    <AppShell activeRoute="invoices">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-light text-[#0D1B2E] tracking-tight">
              Invoice Marketplace
            </h1>
            <p className="text-sm text-[#647087] mt-1">
              Browse tokenized invoice pools available for funding on Stellar Testnet.
            </p>
          </div>
        </div>

        {!isConnected ? (
          <Card className="p-8 text-center space-y-4">
            <h3 className="text-base font-semibold text-[#0D1B2E]">Connect Wallet to View Marketplace</h3>
            <p className="text-sm text-[#647087] max-w-md mx-auto">
              Please connect your Freighter, Albedo, or xBull wallet using the top header button to access testnet pools.
            </p>
          </Card>
        ) : (
          <EmptyState
            title="Marketplace Pools Pending Phase 6C"
            description="Soroban invoice discovery & live testnet pool ingestion will be connected in Phase 6C."
            actionLabel="Return to Home"
            onAction={() => router.push('/')}
          />
        )}
      </div>
    </AppShell>
  );
}
