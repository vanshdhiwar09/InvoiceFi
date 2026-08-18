'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusPill } from '@/components/ui/StatusPill';
import { Skeleton } from '@/components/ui/Skeleton';
import { useWallet } from '@/lib/wallet/WalletContext';
import { formatAddress } from '@/lib/wallet/walletAdapter';
import { Invoice, InvoiceLifecycleState } from '@/lib/invoices/types';
import {
  getInvoiceById,
  deriveInvoiceStatus,
  formatCurrency,
  formatDate,
  getInvoiceActions
} from '@/lib/invoices/invoiceService';

export interface InvoiceDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function InvoiceDetailPage({ params }: InvoiceDetailPageProps) {
  const resolvedParams = use(params);
  const invoiceId = resolvedParams.id;
  const router = useRouter();
  const { publicKey } = useWallet();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadInvoice() {
      setLoading(true);
      setError(null);
      try {
        const found = await getInvoiceById(invoiceId);
        if (isMounted) {
          if (found) {
            setInvoice(found);
          } else {
            setError(`Invoice "${invoiceId}" could not be found.`);
          }
        }
      } catch {
        if (isMounted) {
          setError('Failed to synchronize invoice data from the network.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadInvoice();

    return () => {
      isMounted = false;
    };
  }, [invoiceId]);

  const lifecycleSteps: InvoiceLifecycleState[] = [
    'Created',
    'Tokenized',
    'Funded',
    'Repaid',
    'Closed'
  ];

  const getStepIndex = (state: InvoiceLifecycleState): number => {
    const idx = lifecycleSteps.indexOf(state);
    return idx >= 0 ? idx : 0;
  };

  return (
    <AppShell activeRoute="invoices">
      <div className="space-y-8 max-w-4xl mx-auto">
        
        {/* Navigation Breadcrumb */}
        <div>
          <button
            type="button"
            onClick={() => router.push('/invoices')}
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#4C3AFF] hover:underline"
          >
            ← Back to Invoices
          </button>
        </div>

        {/* Loading Skeleton */}
        {loading ? (
          <div className="space-y-6">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : error || !invoice ? (
          /* Error State per Requirement */
          <Card className="p-8 text-center space-y-4 border-[#D6304A]/30 bg-[#FCE7EA]/30">
            <h2 className="text-lg font-semibold text-[#D6304A]">Invoice Data Synchronisation Issue</h2>
            <p className="text-sm text-[#647087] max-w-md mx-auto">
              {error || 'Unable to retrieve invoice identity.'}
            </p>
            <div>
              <Button variant="secondary" size="sm" onClick={() => router.push('/invoices')}>
                Return to Workspace
              </Button>
            </div>
          </Card>
        ) : (
          (() => {
            const status = deriveInvoiceStatus(invoice);
            const currentStepIdx = getStepIndex(invoice.lifecycleState);
            const actionHint = getInvoiceActions(invoice, publicKey || undefined);

            // Derived return calculation
            let returnPercentage = '';
            if (invoice.repaymentAmount && invoice.advanceAmount > 0) {
              const pct = (((invoice.repaymentAmount - invoice.advanceAmount) / invoice.advanceAmount) * 100).toFixed(1);
              returnPercentage = `+${pct}% Agreed Return`;
            }

            return (
              <div className="space-y-8">
                
                {/* Header Info */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E2E7EE]">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h1 className="font-mono text-2xl font-bold text-[#0D1B2E]">
                        {invoice.id}
                      </h1>
                      <StatusPill status={status} />
                    </div>
                    <p className="text-sm text-[#647087]">
                      Issued to <strong className="text-[#0D1B2E]">{invoice.clientName}</strong>
                    </p>
                  </div>

                  <div className="text-left sm:text-right">
                    <p className="text-xs text-[#647087]">Receivable Value</p>
                    <p className="font-mono tnum text-3xl font-bold text-[#0D1B2E]">
                      {formatCurrency(invoice.faceValue)}
                    </p>
                  </div>
                </div>

                {/* Contract Lifecycle Visualizer */}
                <Card className="p-6 space-y-4">
                  <h3 className="text-xs font-semibold text-[#647087] uppercase tracking-wider">
                    Soroban Lifecycle State Progression
                  </h3>

                  <div className="grid grid-cols-5 gap-2 text-center relative pt-2">
                    {lifecycleSteps.map((step, idx) => {
                      const isCompleted = idx <= currentStepIdx;
                      const isCurrent = idx === currentStepIdx;

                      return (
                        <div key={step} className="flex flex-col items-center space-y-2">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs font-bold transition-all ${
                              isCurrent
                                ? 'bg-[#4C3AFF] text-white ring-4 ring-[#DAD6FF]'
                                : isCompleted
                                ? 'bg-[#0F6E5C] text-white'
                                : 'bg-[#F5F8FB] text-[#8894A6] border border-[#E2E7EE]'
                            }`}
                          >
                            0{idx + 1}
                          </div>
                          <span
                            className={`text-xs font-medium ${
                              isCurrent
                                ? 'text-[#4C3AFF] font-semibold'
                                : isCompleted
                                ? 'text-[#0F6E5C]'
                                : 'text-[#8894A6]'
                            }`}
                          >
                            {step}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </Card>

                {/* Financial Breakdown Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="space-y-4">
                    <h3 className="text-sm font-semibold text-[#0D1B2E]">Financial Parameters</h3>
                    
                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between py-2 border-b border-[#F5F8FB]">
                        <span className="text-[#647087]">Face Amount</span>
                        <span className="font-mono tnum font-semibold text-[#0D1B2E]">
                          {formatCurrency(invoice.faceValue)}
                        </span>
                      </div>

                      <div className="flex justify-between py-2 border-b border-[#F5F8FB]">
                        <span className="text-[#647087]">Advance Target</span>
                        <span className="font-mono tnum font-semibold text-[#0D1B2E]">
                          {formatCurrency(invoice.advanceAmount)}
                        </span>
                      </div>

                      <div className="flex justify-between py-2 border-b border-[#F5F8FB]">
                        <span className="text-[#647087]">Currently Funded</span>
                        <span className="font-mono tnum font-semibold text-[#4C3AFF]">
                          {formatCurrency(invoice.fundedAmount)}
                        </span>
                      </div>

                      {invoice.repaymentAmount && (
                        <div className="flex justify-between py-2">
                          <span className="text-[#647087]">Repayment Value</span>
                          <div className="text-right">
                            <span className="font-mono tnum font-semibold text-[#0F6E5C] block">
                              {formatCurrency(invoice.repaymentAmount)}
                            </span>
                            {returnPercentage && (
                              <span className="text-[11px] font-mono text-[#0F6E5C]">
                                {returnPercentage}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>

                  <Card className="space-y-4">
                    <h3 className="text-sm font-semibold text-[#0D1B2E]">Terms & Verification</h3>
                    
                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between py-2 border-b border-[#F5F8FB]">
                        <span className="text-[#647087]">Issued Date</span>
                        <span className="font-medium text-[#0D1B2E]">
                          {formatDate(invoice.issuedDate)}
                        </span>
                      </div>

                      <div className="flex justify-between py-2 border-b border-[#F5F8FB]">
                        <span className="text-[#647087]">Due Date</span>
                        <span className="font-medium text-[#0D1B2E]">
                          {formatDate(invoice.dueDate)}
                        </span>
                      </div>

                      <div className="flex justify-between py-2 border-b border-[#F5F8FB]">
                        <span className="text-[#647087]">Creator Wallet</span>
                        <span className="font-mono font-semibold text-[#0D1B2E]">
                          {formatAddress(invoice.freelancerWallet)}
                        </span>
                      </div>

                      {invoice.investorWallet && (
                        <div className="flex justify-between py-2">
                          <span className="text-[#647087]">Investor Wallet</span>
                          <span className="font-mono font-semibold text-[#0F6E5C]">
                            {formatAddress(invoice.investorWallet)}
                          </span>
                        </div>
                      )}
                    </div>
                  </Card>
                </div>

                {/* On-Chain Contract Metadata (Rendered ONLY if contract values exist per Correction 6) */}
                {(invoice.contractId || invoice.stellarMemo || invoice.txHash) && (
                  <Card className="p-6 bg-[#F5F8FB] space-y-3 border border-[#E2E7EE]">
                    <h3 className="text-xs font-semibold text-[#647087] uppercase tracking-wider">
                      Stellar Soroban Contract Identity
                    </h3>

                    {invoice.contractId && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
                        <span className="text-[#647087]">Deployed Contract ID:</span>
                        <code className="font-mono text-[11px] text-[#0D1B2E] bg-white px-2.5 py-1 rounded border border-[#E2E7EE] select-all">
                          {invoice.contractId}
                        </code>
                      </div>
                    )}

                    {invoice.stellarMemo && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
                        <span className="text-[#647087]">Notice of Assignment Memo:</span>
                        <code className="font-mono text-[11px] text-[#0F6E5C] bg-white px-2.5 py-1 rounded border border-[#E2E7EE] select-all font-semibold">
                          {invoice.stellarMemo}
                        </code>
                      </div>
                    )}

                    {invoice.txHash && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
                        <span className="text-[#647087]">Stellar Transaction Hash:</span>
                        <code className="font-mono text-[11px] text-[#4C3AFF] bg-white px-2.5 py-1 rounded border border-[#E2E7EE] select-all">
                          {invoice.txHash}
                        </code>
                      </div>
                    )}
                  </Card>
                )}

                {/* Simulated Repayment Disclosure Container (per Correction 7) */}
                <div className="p-6 rounded-xl border-2 border-dashed border-[#B8860B] bg-[#F4EFE1]/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#B8860B]" />
                    <h4 className="text-xs font-semibold text-[#B8860B] uppercase tracking-wider">
                      Level 4 MVP Simulation Disclosure
                    </h4>
                  </div>
                  <p className="text-xs text-[#647087] leading-relaxed">
                    Simulated — Level 4 MVP, no real funds move. Notice of Assignment settlement triggers automated repayment state transition on Stellar Soroban Testnet.
                  </p>
                </div>

                {/* Role-Aware Action Bar Placeholder */}
                <Card className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-semibold uppercase text-[#4C3AFF] bg-[#DAD6FF]/60 px-2.5 py-0.5 rounded-full">
                        Role: {actionHint.role}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-[#0D1B2E]">
                      {actionHint.label}
                    </h3>
                    <p className="text-xs text-[#647087]">
                      {actionHint.description}
                    </p>
                  </div>

                  <div>
                    <Button
                      variant={actionHint.enabled ? 'primary' : 'secondary'}
                      size="md"
                      disabled={!actionHint.enabled}
                      onClick={() => alert(`Phase 6E Transaction Wiring: Action "${actionHint.actionKey}" will execute on Soroban Testnet.`)}
                    >
                      {actionHint.label}
                    </Button>
                  </div>
                </Card>

              </div>
            );
          })()
        )}

      </div>
    </AppShell>
  );
}
