'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusPill } from '@/components/ui/StatusPill';
import { WalletConnectSheet } from '@/components/wallet/WalletConnectSheet';
import { useWallet } from '@/lib/wallet/WalletContext';
import { formatAddress } from '@/lib/wallet/walletAdapter';
import { getInvoices, formatCurrency, formatDate, INVOICE_CONTRACT_ID } from '@/lib/invoices/invoiceService';
import { Invoice, InvoiceLifecycleState } from '@/lib/invoices/types';

interface ActivityItem {
  id: string;
  invoiceId: string;
  type: string;
  lifecycleState: InvoiceLifecycleState;
  amount?: number;
  date: string;
  explorerUrl?: string;
}

export default function DashboardPage() {
  const { isConnected, publicKey } = useWallet();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isWalletSheetOpen, setIsWalletSheetOpen] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setIsLoading(true);
      try {
        const data = await getInvoices(publicKey || undefined);
        if (isMounted) {
          setInvoices(data);
        }
      } catch (err) {
        console.error('Failed to load dashboard invoices:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [publicKey]);

  // Filter invoices associated with connected wallet (freelancer or investor)
  const userInvoices = useMemo(() => {
    if (!publicKey) return [];
    const pubLower = publicKey.toLowerCase();
    return invoices.filter(inv => {
      const isFreelancer = inv.freelancerWallet?.toLowerCase() === pubLower;
      const isInvestor = inv.investorWallet?.toLowerCase() === pubLower;
      return isFreelancer || isInvestor;
    });
  }, [invoices, publicKey]);

  // Derive stat card metrics
  const stats = useMemo(() => {
    const totalCount = userInvoices.length;
    let totalFace = 0;
    let tokenizedCount = 0;
    let tokenizedAdvance = 0;
    let fundedCount = 0;
    let fundedCapital = 0;
    let closedCount = 0;
    let closedCapital = 0;

    userInvoices.forEach(inv => {
      totalFace += inv.faceValue || 0;
      if (inv.lifecycleState === 'Tokenized') {
        tokenizedCount++;
        tokenizedAdvance += inv.advanceAmount || 0;
      }
      if (inv.lifecycleState === 'Funded') {
        fundedCount++;
        fundedCapital += inv.fundedAmount || inv.advanceAmount || 0;
      }
      if (inv.lifecycleState === 'Closed' || inv.lifecycleState === 'Repaid') {
        closedCount++;
        closedCapital += inv.repaymentAmount || inv.faceValue || 0;
      }
    });

    return {
      totalCount,
      totalFace,
      tokenizedCount,
      tokenizedAdvance,
      fundedCount,
      fundedCapital,
      closedCount,
      closedCapital
    };
  }, [userInvoices]);

  // Generate recent activity timeline from user invoices
  const activityList = useMemo<ActivityItem[]>(() => {
    const list: ActivityItem[] = [];

    userInvoices.forEach(inv => {
      const targetExplorer = `https://stellar.expert/explorer/testnet/contract/${INVOICE_CONTRACT_ID}`;

      // 1. Creation event
      list.push({
        id: `${inv.id}-created`,
        invoiceId: inv.id,
        type: 'Invoice Created',
        lifecycleState: 'Created',
        amount: inv.faceValue,
        date: inv.issuedDate,
        explorerUrl: targetExplorer
      });

      // 2. Tokenization event
      if (inv.lifecycleState !== 'Created') {
        list.push({
          id: `${inv.id}-tokenized`,
          invoiceId: inv.id,
          type: 'Invoice Tokenized on Soroban',
          lifecycleState: 'Tokenized',
          amount: inv.advanceAmount,
          date: inv.issuedDate,
          explorerUrl: targetExplorer
        });
      }

      // 3. Funding event
      if (inv.lifecycleState === 'Funded' || inv.lifecycleState === 'Repaid' || inv.lifecycleState === 'Closed') {
        list.push({
          id: `${inv.id}-funded`,
          invoiceId: inv.id,
          type: 'Invoice Funded',
          lifecycleState: 'Funded',
          amount: inv.fundedAmount || inv.advanceAmount,
          date: inv.issuedDate,
          explorerUrl: targetExplorer
        });
      }

      // 4. Repayment / Closure event
      if (inv.lifecycleState === 'Repaid' || inv.lifecycleState === 'Closed') {
        list.push({
          id: `${inv.id}-closed`,
          invoiceId: inv.id,
          type: inv.lifecycleState === 'Closed' ? 'Investor Returns Claimed' : 'Simulated Repayment Executed',
          lifecycleState: inv.lifecycleState,
          amount: inv.repaymentAmount || inv.faceValue,
          date: inv.dueDate,
          explorerUrl: targetExplorer
        });
      }
    });

    // Sort by date descending
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [userInvoices]);

  return (
    <AppShell activeRoute="dashboard">
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E2E7EE]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#5B6B85]/10 text-[#5B6B85] border border-[#5B6B85]/20">
                Stellar Testnet • Level 4 Soroban MVP
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-[#0D1B2E] tracking-tight">
              My Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-[#647087]">
              Your InvoiceFi activity on Stellar Testnet.
            </p>
          </div>

          {/* Connected Wallet Identity Badge */}
          {isConnected && publicKey && (
            <div className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white border border-[#E2E7EE] shadow-2xs self-start sm:self-auto">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0F6E5C]" />
              <div className="text-xs">
                <span className="text-[#647087] block text-[10px] uppercase font-semibold">Wallet</span>
                <span className="font-mono font-semibold text-[#0D1B2E]">{formatAddress(publicKey)}</span>
              </div>
            </div>
          )}
        </div>

        {!isConnected ? (
          /* Disconnected Pre-Wallet Onboarding View */
          <Card className="p-8 sm:p-12 text-center max-w-2xl mx-auto space-y-6 bg-white border border-[#E2E7EE] rounded-2xl shadow-sm my-12">
            <div className="w-16 h-16 rounded-full bg-[#DAD6FF]/60 flex items-center justify-center text-[#4C3AFF] mx-auto ring-1 ring-[#7669FF]/30">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0D1B2E]">Connect your wallet</h2>
              <p className="text-xs sm:text-sm text-[#647087] max-w-md mx-auto leading-relaxed">
                Connect a Stellar wallet (Freighter, Albedo, or xBull) to view your InvoiceFi tokenization, funding, and repayment activity.
              </p>
            </div>
            <div className="pt-2">
              <Button
                variant="primary"
                size="lg"
                onClick={() => setIsWalletSheetOpen(true)}
                className="bg-[#4C3AFF] hover:bg-[#3C2ED4] text-white px-8 py-3 rounded-xl text-xs sm:text-sm font-semibold shadow-md"
              >
                Connect Wallet
              </Button>
            </div>
          </Card>
        ) : isLoading ? (
          /* Skeleton Loading Cards */
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {[1, 2, 3, 4].map(idx => (
                <Card key={idx} className="p-5 bg-white border border-[#E2E7EE] rounded-xl animate-pulse">
                  <div className="h-3 w-20 bg-[#E2E7EE] rounded mb-3" />
                  <div className="h-7 w-16 bg-[#E2E7EE] rounded mb-2" />
                  <div className="h-3 w-24 bg-[#E2E7EE] rounded" />
                </Card>
              ))}
            </div>
            <Card className="p-6 bg-white border border-[#E2E7EE] rounded-xl animate-pulse">
              <div className="h-4 w-32 bg-[#E2E7EE] rounded mb-4" />
              <div className="space-y-3">
                <div className="h-12 w-full bg-[#F5F8FB] rounded-lg" />
                <div className="h-12 w-full bg-[#F5F8FB] rounded-lg" />
              </div>
            </Card>
          </div>
        ) : (
          /* Connected Wallet Dashboard Content */
          <div className="space-y-10">
            {/* Top 4 Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {/* Stat 1: Total Invoices */}
              <Card className="p-5 sm:p-6 bg-white border border-[#E2E7EE] rounded-xl shadow-2xs hover:border-[#4C3AFF]/30 transition-colors">
                <div className="flex items-center justify-between text-xs text-[#647087] mb-2 font-medium">
                  <span>Total Invoices</span>
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#4C3AFF]/10 text-[#4C3AFF] flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-[#0D1B2E] font-mono tracking-tight">
                  {stats.totalCount}
                </div>
                <div className="mt-2 text-xs text-[#647087] font-mono font-medium">
                  {formatCurrency(stats.totalFace)} total
                </div>
              </Card>

              {/* Stat 2: Tokenized */}
              <Card className="p-5 sm:p-6 bg-white border border-[#E2E7EE] rounded-xl shadow-2xs hover:border-[#7669FF]/30 transition-colors">
                <div className="flex items-center justify-between text-xs text-[#647087] mb-2 font-medium">
                  <span>Tokenized</span>
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#7669FF]/10 text-[#7669FF] flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-[#4C3AFF] font-mono tracking-tight">
                  {stats.tokenizedCount}
                </div>
                <div className="mt-2 text-xs text-[#647087] font-mono font-medium">
                  {formatCurrency(stats.tokenizedAdvance)} advance
                </div>
              </Card>

              {/* Stat 3: Funded */}
              <Card className="p-5 sm:p-6 bg-white border border-[#E2E7EE] rounded-xl shadow-2xs hover:border-[#0F6E5C]/30 transition-colors">
                <div className="flex items-center justify-between text-xs text-[#647087] mb-2 font-medium">
                  <span>Funded</span>
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#0F6E5C]/10 text-[#0F6E5C] flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V6m0 8v2m0-10e-5a9 9 0 110 18 9 9 0 010-18z" />
                    </svg>
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-[#0F6E5C] font-mono tracking-tight">
                  {stats.fundedCount}
                </div>
                <div className="mt-2 text-xs text-[#647087] font-mono font-medium">
                  {formatCurrency(stats.fundedCapital)} capital
                </div>
              </Card>

              {/* Stat 4: Closed / Settled */}
              <Card className="p-5 sm:p-6 bg-white border border-[#E2E7EE] rounded-xl shadow-2xs hover:border-[#0E8F5A]/30 transition-colors">
                <div className="flex items-center justify-between text-xs text-[#647087] mb-2 font-medium">
                  <span>Closed & Settled</span>
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#0E8F5A]/10 text-[#0E8F5A] flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-[#0E8F5A] font-mono tracking-tight">
                  {stats.closedCount}
                </div>
                <div className="mt-2 text-xs text-[#647087] font-mono font-medium">
                  {formatCurrency(stats.closedCapital)} settled
                </div>
              </Card>
            </div>

            {/* Recent Activity Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg sm:text-xl font-bold text-[#0D1B2E] tracking-tight">
                  Recent Activity
                </h2>
                <span className="text-xs text-[#647087] font-mono">
                  {activityList.length} Event{activityList.length === 1 ? '' : 's'}
                </span>
              </div>

              {activityList.length === 0 ? (
                /* Activity Empty State */
                <Card className="p-8 sm:p-12 text-center bg-white border border-[#E2E7EE] rounded-xl space-y-4">
                  <div className="w-12 h-12 rounded-full bg-[#F5F8FB] border border-[#E2E7EE] flex items-center justify-center text-[#647087] mx-auto">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="space-y-1">
                    <p className="text-base font-semibold text-[#0D1B2E]">No activity yet</p>
                    <p className="text-xs sm:text-sm text-[#647087] max-w-sm mx-auto">
                      Your InvoiceFi activity will appear here after you create or fund an invoice.
                    </p>
                  </div>
                  <div className="pt-2">
                    <Link href="/create">
                      <Button variant="primary" size="md" className="bg-[#4C3AFF] hover:bg-[#3C2ED4] text-white px-6 py-2.5 rounded-xl text-xs sm:text-sm font-semibold">
                        Create Invoice
                      </Button>
                    </Link>
                  </div>
                </Card>
              ) : (
                /* Activity Timeline List */
                <Card className="p-0 bg-white border border-[#E2E7EE] rounded-xl overflow-hidden shadow-2xs divide-y divide-[#F1F5F9]">
                  {activityList.map(act => (
                    <div
                      key={act.id}
                      className="p-4 sm:px-6 sm:py-4 flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 hover:bg-[#F8FAFC] transition-colors"
                    >
                      {/* Left Block: Fixed-width Status Pill + Event Details */}
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        {/* Fixed width status badge container for perfect vertical alignment */}
                        <div className="w-28 shrink-0 flex items-center justify-start">
                          <StatusPill status={act.lifecycleState} />
                        </div>

                        {/* Title, Invoice ID & Date */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs sm:text-sm font-semibold text-[#0D1B2E] truncate">
                              {act.type}
                            </span>
                            <span className="text-[11px] font-mono font-bold text-[#4C3AFF] bg-[#DAD6FF]/40 px-2 py-0.5 rounded border border-[#7669FF]/30 shrink-0">
                              {act.invoiceId}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#647087] font-mono mt-0.5">
                            {formatDate(act.date)}
                          </p>
                        </div>
                      </div>

                      {/* Right Block: Strict Column Alignment for Amount, View Invoice & Explorer */}
                      <div className="flex items-center justify-between md:justify-end gap-4 md:gap-6 pt-2 md:pt-0 border-t md:border-t-0 border-[#F1F5F9] shrink-0">
                        {/* Amount column */}
                        <div className="w-28 text-left md:text-right shrink-0">
                          {act.amount !== undefined ? (
                            <span className="text-xs sm:text-sm font-bold font-mono text-[#0D1B2E]">
                              {formatCurrency(act.amount)}
                            </span>
                          ) : (
                            <span className="text-xs text-[#647087] font-mono">—</span>
                          )}
                        </div>

                        {/* View Invoice Link column */}
                        <div className="w-24 text-center shrink-0">
                          <Link
                            href={`/invoices/${act.invoiceId}`}
                            className="text-xs font-semibold text-[#4C3AFF] hover:underline"
                          >
                            View invoice
                          </Link>
                        </div>

                        {/* Explorer Link column */}
                        <div className="w-20 text-right shrink-0">
                          {act.explorerUrl ? (
                            <a
                              href={act.explorerUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-semibold text-[#0F6E5C] hover:underline font-mono text-[11px]"
                            >
                              Explorer ↗
                            </a>
                          ) : (
                            <span className="text-xs text-[#647087] font-mono">—</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </Card>
              )}
            </div>

            {/* Your Invoices List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg sm:text-xl font-bold text-[#0D1B2E] tracking-tight">
                  Your Invoices
                </h2>
                <span className="text-xs text-[#647087] font-mono">
                  {userInvoices.length} Invoice{userInvoices.length === 1 ? '' : 's'}
                </span>
              </div>

              {userInvoices.length === 0 ? (
                <Card className="p-8 text-center bg-white border border-[#E2E7EE] rounded-xl space-y-3">
                  <p className="text-sm font-semibold text-[#0D1B2E]">No invoices associated with this wallet</p>
                  <p className="text-xs text-[#647087]">Create an invoice or fund an open invoice to see it listed here.</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {userInvoices.map(inv => (
                    <Card key={inv.id} className="p-5 bg-white border border-[#E2E7EE] rounded-xl space-y-4 hover:border-[#4C3AFF]/30 transition-colors shadow-2xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-mono font-bold text-[#4C3AFF] bg-[#DAD6FF]/40 px-2.5 py-1 rounded-md border border-[#7669FF]/30">
                          {inv.id}
                        </span>
                        <StatusPill status={inv.lifecycleState} />
                      </div>

                      <div className="space-y-1">
                        <p className="text-xs text-[#647087]">Client Reference</p>
                        <p className="text-sm font-semibold text-[#0D1B2E] truncate">{inv.clientName}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#F1F5F9] text-xs">
                        <div>
                          <span className="text-[#647087] block text-[10px]">Face Value</span>
                          <span className="font-mono font-semibold text-[#0D1B2E]">{formatCurrency(inv.faceValue)}</span>
                        </div>
                        <div>
                          <span className="text-[#647087] block text-[10px]">Advance</span>
                          <span className="font-mono font-semibold text-[#4C3AFF]">{formatCurrency(inv.advanceAmount)}</span>
                        </div>
                      </div>

                      <div className="pt-2 flex items-center justify-between text-xs border-t border-[#F1F5F9]">
                        <span className="text-[#647087] font-mono text-[11px]">Due: {formatDate(inv.dueDate)}</span>
                        <Link href={`/invoices/${inv.id}`}>
                          <Button variant="secondary" size="sm" className="text-xs py-1.5 px-3 rounded-lg border-[#E2E7EE]">
                            View Details ↗
                          </Button>
                        </Link>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Wallet Connect Sheet Overlay */}
      <WalletConnectSheet
        isOpen={isWalletSheetOpen}
        onClose={() => setIsWalletSheetOpen(false)}
      />
    </AppShell>
  );
}
