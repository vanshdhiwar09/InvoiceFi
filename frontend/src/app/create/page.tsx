'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { useWallet } from '@/lib/wallet/WalletContext';

export default function CreateInvoicePage() {
  const router = useRouter();
  const { isConnected } = useWallet();

  return (
    <AppShell activeRoute="create">
      <div className="space-y-6 max-w-3xl mx-auto">
        <div>
          <h1 className="text-2xl font-light text-[#0D1B2E] tracking-tight">
            Tokenize New Invoice
          </h1>
          <p className="text-sm text-[#647087] mt-1">
            Submit invoice metadata to mint an on-chain Soroban invoice token on Stellar Testnet.
          </p>
        </div>

        {!isConnected ? (
          <Card className="p-8 text-center space-y-4">
            <h3 className="text-base font-semibold text-[#0D1B2E]">Connect Wallet to Tokenize Invoices</h3>
            <p className="text-sm text-[#647087] max-w-md mx-auto">
              You must connect a supported Stellar wallet before creating and tokenizing invoices.
            </p>
          </Card>
        ) : (
          <EmptyState
            title="Invoice Tokenization Form Pending Phase 6D"
            description="Soroban smart contract invocation for create_invoice and private metadata hash recording will be implemented in Phase 6D."
            actionLabel="Return to Home"
            onAction={() => router.push('/')}
          />
        )}
      </div>
    </AppShell>
  );
}
