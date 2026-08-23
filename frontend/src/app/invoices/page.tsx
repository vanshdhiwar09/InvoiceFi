'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusPill } from '@/components/ui/StatusPill';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useWallet } from '@/lib/wallet/WalletContext';
import { formatAddress } from '@/lib/wallet/walletAdapter';
import { Invoice, InvoiceSummary } from '@/lib/invoices/types';
import {
  getInvoices,
  getInvoiceSummary,
  filterInvoices,
  deriveInvoiceStatus,
  formatCurrency,
  formatDate,
  mapSorobanStatusToLifecycleState,
  updateInvoiceToClosed,
  updateInvoiceToRepaid,
  updateInvoiceToFunded
} from '@/lib/invoices/invoiceService';
import { checkOnChainInvoiceStatus } from '@/lib/invoices/sorobanClient';

const ITEMS_PER_PAGE = 5;

export default function DashboardInvoicesPage() {
  const router = useRouter();
  const { isConnected, publicKey } = useWallet();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [currentPage, setCurrentPage] = useState<number>(1);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboardData() {
      setLoading(true);
      setError(null);
      try {
        const data = await getInvoices(publicKey || undefined);
        
        // Reconcile off-chain records with Authoritative Soroban Smart Contract State
        const reconciled = await Promise.all(
          data.map(async (inv) => {
            const targetOnChainId = inv.onChainId || Number(inv.id.replace('INV-', ''));
            if (!isNaN(targetOnChainId) && targetOnChainId > 0) {
              inv.onChainId = targetOnChainId;
              try {
                const check = await checkOnChainInvoiceStatus(targetOnChainId);
                if (check && check.invoiceData) {
                  const invData = check.invoiceData as { status?: number | string; investor?: string };
                  const canonicalState = mapSorobanStatusToLifecycleState(invData.status);
                  inv.lifecycleState = canonicalState;

                  if (invData.investor) {
                    inv.investorWallet = String(invData.investor);
                  }

                  if (canonicalState === 'Funded') {
                    inv.fundedAmount = inv.advanceAmount;
                    updateInvoiceToFunded(inv.id, inv.investorWallet || '', inv.advanceAmount);
                  } else if (canonicalState === 'Repaid') {
                    inv.fundedAmount = inv.advanceAmount;
                    updateInvoiceToRepaid(inv.id);
                  } else if (canonicalState === 'Closed') {
                    inv.fundedAmount = inv.advanceAmount;
                    updateInvoiceToClosed(inv.id);
                  }
                }
              } catch (rpcErr) {
                console.warn(`[Dashboard Reconciliation] RPC check skipped for INV-${targetOnChainId}:`, rpcErr);
              }
            }
            return inv;
          })
        );

        if (isMounted) {
          setInvoices(reconciled);
        }
      } catch {
        if (isMounted) {
          setError('Unable to load your invoices. Please verify wallet connection and try again.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadDashboardData();

    return () => {
      isMounted = false;
    };
  }, [publicKey]);

  // Reset pagination to page 1 whenever status filter changes
  const handleFilterChange = (tab: string) => {
    setStatusFilter(tab);
    setCurrentPage(1);
  };

  const summary: InvoiceSummary = getInvoiceSummary(invoices);
  const filteredInvoices = filterInvoices(invoices, statusFilter);

  // Pagination computations
  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / ITEMS_PER_PAGE));
  const validCurrentPage = Math.min(currentPage, totalPages);
  
  const startIndex = (validCurrentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, filteredInvoices.length);
  const paginatedInvoices = filteredInvoices.slice(startIndex, endIndex);

  const filterTabs = ['All', 'Created', 'Tokenized', 'Funded', 'Repaid', 'Closed', 'Overdue'];

  return (
    <AppShell activeRoute="invoices">
      <div className="space-y-8">
        
        {/* Compact Product Dashboard Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E2E7EE]">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-[#0D1B2E] tracking-tight">
              {isConnected ? 'Invoices' : 'Public Testnet Invoices'}
            </h1>
            <p className="text-sm text-[#647087]">
              {isConnected
                ? 'Track your invoices, funding, and settlement activity on Stellar Testnet.'
                : 'Browse invoices available on the Testnet. Connect your wallet to create invoices and access wallet-specific actions.'}
            </p>
          </div>

          {/* Connected vs Public Context Indicator */}
          {isConnected && publicKey ? (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F5F8FB] border border-[#E2E7EE] text-xs">
              <span className="w-2 h-2 rounded-full bg-[#0F6E5C]" />
              <span className="text-[#647087]">Wallet:</span>
              <span className="font-mono font-semibold text-[#0D1B2E]">{formatAddress(publicKey)}</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F5F8FB] border border-[#E2E7EE] text-xs">
              <span className="w-2 h-2 rounded-full bg-[#8894A6]" />
              <span className="text-[#647087]">View:</span>
              <span className="font-semibold text-[#0D1B2E]">Public Testnet Explorer</span>
            </div>
          )}
        </div>

        {/* Error Notice */}
        {error && (
          <div className="p-4 rounded-xl bg-[#FCE7EA] border border-[#D6304A]/30 text-[#D6304A] text-sm flex items-center justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-xs font-semibold underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Financial Summary Cards Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {loading ? (
            <>
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
            </>
          ) : (
            <>
              <Card className="space-y-2 overflow-hidden min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-[#647087] uppercase tracking-wider">Active Invoices</p>
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#4C3AFF]/10 text-[#4C3AFF] flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
                <p className="font-mono tnum text-xl sm:text-2xl lg:text-3xl font-bold text-[#0D1B2E] truncate">
                  {summary.activeInvoices}
                </p>
                <p className="text-[11px] text-[#647087]">Of {summary.totalInvoices} total registered</p>
              </Card>

              <Card className="space-y-2 overflow-hidden min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-[#647087] uppercase tracking-wider">Total Face Value</p>
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#0D1B2E]/10 text-[#0D1B2E] flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V6m0 8v2m0-10e-5a9 9 0 110 18 9 9 0 010-18z" />
                    </svg>
                  </div>
                </div>
                <p className="font-mono tnum text-xl sm:text-2xl lg:text-3xl font-bold text-[#0D1B2E] truncate" title={formatCurrency(summary.totalFaceValue)}>
                  {formatCurrency(summary.totalFaceValue)}
                </p>
                <p className="text-[11px] text-[#647087]">Gross receivables value</p>
              </Card>

              <Card className="space-y-2 overflow-hidden min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-[#647087] uppercase tracking-wider">Total Funded</p>
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#4C3AFF]/10 text-[#4C3AFF] flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                </div>
                <p className="font-mono tnum text-xl sm:text-2xl lg:text-3xl font-bold text-[#4C3AFF] truncate" title={formatCurrency(summary.totalFundedValue)}>
                  {formatCurrency(summary.totalFundedValue)}
                </p>
                <p className="text-[11px] text-[#647087]">Liquidity committed</p>
              </Card>

              <Card className="space-y-2 overflow-hidden min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-[#647087] uppercase tracking-wider">Total Repaid</p>
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#0F6E5C]/10 text-[#0F6E5C] flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                </div>
                <p className="font-mono tnum text-xl sm:text-2xl lg:text-3xl font-bold text-[#0F6E5C] truncate" title={formatCurrency(summary.totalRepaidValue)}>
                  {formatCurrency(summary.totalRepaidValue)}
                </p>
                <p className="text-[11px] text-[#647087]">Settled to date</p>
              </Card>
            </>
          )}
        </div>

        {/* Invoice Workspace Header & Filter Bar */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-[#0D1B2E]">
              Invoice Workspace
            </h2>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none bg-[#F5F8FB] p-1 rounded-xl border border-[#E2E7EE]">
              {filterTabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => handleFilterChange(tab)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                    statusFilter === tab
                      ? 'bg-white text-[#4C3AFF] shadow-2xs font-semibold'
                      : 'text-[#647087] hover:text-[#0D1B2E]'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Not Connected Banner Notice */}
          {!isConnected && (
            <Card className="p-6 bg-[#F5F8FB] border border-[#E2E7EE] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-[#0D1B2E]">Wallet Connection Required</h3>
                <p className="text-xs text-[#647087]">
                  Connect your Freighter, Albedo, or xBull wallet to interact with testnet invoice contracts.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                className="bg-[#4C3AFF] text-white whitespace-nowrap"
                onClick={() => {
                  const btn = document.querySelector('header button') as HTMLButtonElement;
                  if (btn) btn.click();
                }}
              >
                Connect Wallet
              </Button>
            </Card>
          )}

          {/* Loading Skeleton List */}
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
            </div>
          ) : filteredInvoices.length === 0 ? (
            /* Empty State */
            <EmptyState
              title="No invoices yet"
              description="Create your first invoice and start building your on-chain history."
              actionLabel="Create Invoice"
              onAction={() => router.push('/create')}
            />
          ) : (
            /* Invoice Cards Workspace List */
            <div className="space-y-4">
              <div className="space-y-4">
                {paginatedInvoices.map((inv) => {
                  const status = deriveInvoiceStatus(inv);
                  const progressPct = inv.faceValue > 0 ? Math.min(Math.round((inv.fundedAmount / inv.advanceAmount) * 100), 100) : 0;
                  
                  let returnLabel = '';
                  if (inv.repaymentAmount && inv.advanceAmount > 0) {
                    const retPct = (((inv.repaymentAmount - inv.advanceAmount) / inv.advanceAmount) * 100).toFixed(1);
                    returnLabel = `+${retPct}% Return`;
                  }

                  return (
                    <Card
                      key={inv.id}
                      interactive
                      onClick={() => router.push(`/invoices/${inv.id}`)}
                      className="p-5 sm:p-6 space-y-4 hover:border-[#4C3AFF]/40 transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#F5F8FB] pb-3">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm font-semibold text-[#0D1B2E]">
                            {inv.id}
                          </span>
                          <StatusPill status={status} />
                        </div>
                        <span className="text-xs text-[#647087]">
                          Due {formatDate(inv.dueDate)}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                        <div className="sm:col-span-5 space-y-1">
                          <p className="text-xs text-[#647087]">Client</p>
                          <p className="text-sm font-semibold text-[#0D1B2E]">{inv.clientName}</p>
                          {inv.description && (
                            <p className="text-xs text-[#8894A6] line-clamp-1">{inv.description}</p>
                          )}
                        </div>

                        <div className="sm:col-span-4 space-y-1.5">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-[#647087]">Funding Progress</span>
                            <span className="font-mono font-semibold text-[#0D1B2E]">{progressPct}%</span>
                          </div>
                          <div className="w-full bg-[#F5F8FB] h-2 rounded-full overflow-hidden border border-[#E2E7EE]">
                            <div
                              className="bg-[#4C3AFF] h-full rounded-full transition-all duration-500"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>

                        <div className="sm:col-span-3 text-left sm:text-right space-y-0.5">
                          <p className="text-xs text-[#647087]">Amount</p>
                          <p className="font-mono tnum text-lg font-bold text-[#0D1B2E]">
                            {formatCurrency(inv.faceValue)}
                          </p>
                          {returnLabel && (
                            <span className="text-[11px] font-mono text-[#0F6E5C] font-semibold">
                              {returnLabel}
                            </span>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>

              {/* PAGINATION CONTROLS BAR */}
              {filteredInvoices.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#E2E7EE]">
                  <p className="text-xs text-[#647087]">
                    Showing <span className="font-semibold text-[#0D1B2E]">{startIndex + 1}–{endIndex}</span> of{' '}
                    <span className="font-semibold text-[#0D1B2E]">{filteredInvoices.length}</span> invoices
                  </p>

                  <div className="flex items-center gap-1.5">
                    {/* Previous Button */}
                    <button
                      type="button"
                      disabled={validCurrentPage === 1}
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-[#E2E7EE] bg-white text-[#0D1B2E] hover:bg-[#F5F8FB] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      ← Prev
                    </button>

                    {/* Numeric Page Buttons */}
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                      const isActive = pageNum === validCurrentPage;
                      return (
                        <button
                          key={pageNum}
                          type="button"
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-8 h-8 rounded-lg text-xs font-semibold font-mono transition-all ${
                            isActive
                              ? 'bg-[#4C3AFF] text-white shadow-xs'
                              : 'bg-white border border-[#E2E7EE] text-[#647087] hover:bg-[#F5F8FB] hover:text-[#0D1B2E]'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}

                    {/* Next Button */}
                    <button
                      type="button"
                      disabled={validCurrentPage >= totalPages}
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-[#E2E7EE] bg-white text-[#0D1B2E] hover:bg-[#F5F8FB] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </AppShell>
  );
}
