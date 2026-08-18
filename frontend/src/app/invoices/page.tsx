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
  formatDate
} from '@/lib/invoices/invoiceService';

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
        if (isMounted) {
          setInvoices(data);
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

  const filterTabs = ['All', 'Open', 'Funding', 'Funded', 'Repaid', 'Overdue'];

  return (
    <AppShell activeRoute="invoices">
      <div className="space-y-8">
        
        {/* Compact Product Dashboard Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E2E7EE]">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-[#0D1B2E] tracking-tight">
              Dashboard
            </h1>
            <p className="text-sm text-[#647087]">
              Track your invoices, funding, and settlement activity on Stellar Testnet.
            </p>
          </div>

          {/* Connected Wallet Context Indicator */}
          {isConnected && publicKey && (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F5F8FB] border border-[#E2E7EE] text-xs">
              <span className="w-2 h-2 rounded-full bg-[#0F6E5C]" />
              <span className="text-[#647087]">Wallet:</span>
              <span className="font-mono font-semibold text-[#0D1B2E]">{formatAddress(publicKey)}</span>
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {loading ? (
            <>
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
            </>
          ) : (
            <>
              <Card className="space-y-2">
                <p className="text-xs font-medium text-[#647087] uppercase tracking-wider">Active Invoices</p>
                <p className="font-mono tnum text-2xl sm:text-3xl font-bold text-[#0D1B2E]">
                  {summary.activeInvoices}
                </p>
                <p className="text-[11px] text-[#647087]">Of {summary.totalInvoices} total registered</p>
              </Card>

              <Card className="space-y-2">
                <p className="text-xs font-medium text-[#647087] uppercase tracking-wider">Total Face Value</p>
                <p className="font-mono tnum text-2xl sm:text-3xl font-bold text-[#0D1B2E]">
                  {formatCurrency(summary.totalFaceValue)}
                </p>
                <p className="text-[11px] text-[#647087]">Gross receivables value</p>
              </Card>

              <Card className="space-y-2">
                <p className="text-xs font-medium text-[#647087] uppercase tracking-wider">Total Funded</p>
                <p className="font-mono tnum text-2xl sm:text-3xl font-bold text-[#4C3AFF]">
                  {formatCurrency(summary.totalFundedValue)}
                </p>
                <p className="text-[11px] text-[#647087]">Liquidity committed</p>
              </Card>

              <Card className="space-y-2">
                <p className="text-xs font-medium text-[#647087] uppercase tracking-wider">Total Repaid</p>
                <p className="font-mono tnum text-2xl sm:text-3xl font-bold text-[#0F6E5C]">
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
