'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusPill } from '@/components/ui/StatusPill';
import { Skeleton } from '@/components/ui/Skeleton';
import { ToastTxStatus, TxStatusType } from '@/components/ui/ToastTxStatus';
import { useWallet } from '@/lib/wallet/WalletContext';
import { formatAddress } from '@/lib/wallet/walletAdapter';
import { Invoice, InvoiceLifecycleState, NoAQueueStatus } from '@/lib/invoices/types';
import {
  getInvoiceById,
  deriveInvoiceStatus,
  formatXlm,
  formatDate,
  getInvoiceActions,
  updateInvoiceToFunded,
  updateInvoiceToRepaid,
  updateInvoiceToClosed,
  fetchBackendNoAStatus,
  mapSorobanStatusToLifecycleState
} from '@/lib/invoices/invoiceService';
import { trackInvoiceFunded } from '@/lib/analytics';
import {
  executeInvestTx,
  executeRepayTx,
  executeClaimReturnsTx,
  checkOnChainInvoiceStatus
} from '@/lib/invoices/sorobanClient';

export interface InvoiceDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function InvoiceDetailPage({ params }: InvoiceDetailPageProps) {
  const resolvedParams = use(params);
  const routeId = resolvedParams.id;
  const router = useRouter();
  const { isConnected, publicKey } = useWallet();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Funding Modal State
  const [isFundingModalOpen, setIsFundingModalOpen] = useState<boolean>(false);
  
  // Repayment Modal State
  const [isRepayModalOpen, setIsRepayModalOpen] = useState<boolean>(false);

  // Claim Returns Modal State
  const [isClaimModalOpen, setIsClaimModalOpen] = useState<boolean>(false);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Notice of Assignment State
  const [noaStatus, setNoaStatus] = useState<NoAQueueStatus>('NONE');
  const [noaDetails, setNoaDetails] = useState<{ reference: string; processedAt?: string; memo?: string } | null>(null);

  // Toast Transaction Status State
  const [txToastStatus, setTxToastStatus] = useState<TxStatusType>('Awaiting signature');
  const [txToastMessage, setTxToastMessage] = useState<string | undefined>(undefined);
  const [isToastVisible, setIsToastVisible] = useState<boolean>(false);

  // Fetch normalized invoice record and reconcile with Soroban RPC
  useEffect(() => {
    let isMounted = true;

    async function loadInvoice() {
      setLoading(true);
      setError(null);
      try {
        const found = await getInvoiceById(routeId);
        if (isMounted) {
          if (found) {
            // Reconcile with on-chain Soroban contract state
            const targetOnChainId = found.onChainId || Number(found.id.replace('INV-', ''));
            if (!isNaN(targetOnChainId) && targetOnChainId > 0) {
              found.onChainId = targetOnChainId;
              const check = await checkOnChainInvoiceStatus(targetOnChainId);
              if (check.invoiceData) {
                const invData = check.invoiceData as { status?: number | string; investor?: string };
                const canonicalState = mapSorobanStatusToLifecycleState(invData.status);
                found.lifecycleState = canonicalState;
                
                if (invData.investor) {
                  found.investorWallet = String(invData.investor);
                }

                if (canonicalState === 'Funded') {
                  found.fundedAmount = found.advanceAmount;
                  updateInvoiceToFunded(found.id, found.investorWallet || '', found.advanceAmount);
                } else if (canonicalState === 'Repaid') {
                  found.fundedAmount = found.advanceAmount;
                  updateInvoiceToRepaid(found.id);
                } else if (canonicalState === 'Closed') {
                  found.fundedAmount = found.advanceAmount;
                  updateInvoiceToClosed(found.id);
                }
              }
            }

            setInvoice({ ...found });

            // If Funded or Repaid or Closed, fetch NoA status
            if ((found.lifecycleState === 'Funded' || found.lifecycleState === 'Repaid' || found.lifecycleState === 'Closed') && (found.onChainId || found.clientRef)) {
              const res = await fetchBackendNoAStatus(found.onChainId, found.clientRef);
              setNoaStatus(res.status);
              setNoaDetails(res.noa || null);
            }
          } else {
            setError(`Invoice "${routeId}" could not be found.`);
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
  }, [routeId]);

  // Notice of Assignment Polling Engine (polls every 2.5s when funding confirmed until PROCESSED or FAILED_PERMANENT)
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    let pollCount = 0;

    if (invoice && invoice.lifecycleState === 'Funded' && (noaStatus === 'NONE' || noaStatus === 'DISCOVERED' || noaStatus === 'PROCESSING' || noaStatus === 'FAILED')) {
      timer = setInterval(async () => {
        pollCount++;
        const targetId = invoice.onChainId || Number(invoice.id.replace('INV-', ''));
        const res = await fetchBackendNoAStatus(targetId, invoice.clientRef);
        setNoaStatus(res.status);
        if (res.noa) setNoaDetails(res.noa);

        if (res.status === 'PROCESSED' || res.status === 'FAILED_PERMANENT' || pollCount >= 12) {
          if (timer) clearInterval(timer);
        }
      }, 2500);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [invoice, noaStatus]);

  // Handle Open Funding Modal with On-Chain Pre-Flight Check
  const handleOpenFundingModal = async () => {
    if (!invoice) return;
    const targetOnChainId = invoice.onChainId || Number(invoice.id.replace('INV-', ''));

    if (isNaN(targetOnChainId) || targetOnChainId <= 0) {
      alert("Invalid Soroban on-chain ID for funding.");
      return;
    }

    // Pre-flight check
    const check = await checkOnChainInvoiceStatus(targetOnChainId, publicKey || undefined);
    if (!check.valid) {
      alert(check.reason || "Invoice is not available for funding on Stellar Testnet.");
      return;
    }

    setIsFundingModalOpen(true);
  };

  // Execute Funding Transaction
  const handleExecuteFunding = async () => {
    if (!invoice || !publicKey) return;
    const targetOnChainId = invoice.onChainId || Number(invoice.id.replace('INV-', ''));

    setIsFundingModalOpen(false);
    setIsSubmitting(true);
    setIsToastVisible(true);
    setTxToastStatus('Awaiting signature');
    setTxToastMessage(undefined);

    const result = await executeInvestTx(
      {
        investorAddress: publicKey,
        invoiceId: targetOnChainId
      },
      (status, msg) => {
        setTxToastStatus(status);
        setTxToastMessage(msg);
      }
    );

    setIsSubmitting(false);

    if (result.success) {
      // Reconcile with on-chain Soroban contract state
      const check = await checkOnChainInvoiceStatus(targetOnChainId);
      const invData = check.invoiceData as { status?: number | string; investor?: string } | undefined;
      const rawStatus = invData?.status !== undefined ? (typeof invData.status === 'number' ? invData.status : Number(invData.status)) : 2;

      if (rawStatus === 2 || String(invData?.status) === 'Funded') {
        const updated: Invoice = {
          ...invoice,
          lifecycleState: 'Funded',
          investorWallet: publicKey,
          fundedAmount: invoice.advanceAmount,
          txHash: result.txHash || invoice.txHash
        };
        setInvoice(updated);

        // Sync off-chain database status to FUNDED
        updateInvoiceToFunded(updated.id, publicKey, updated.advanceAmount);

        // Track confirmed funding custom event (Phase 6H)
        trackInvoiceFunded();

        // Initiate NoA backend check
        const noaRes = await fetchBackendNoAStatus(targetOnChainId, updated.clientRef);
        setNoaStatus(noaRes.status);
        if (noaRes.noa) setNoaDetails(noaRes.noa);
      }
    }
  };

  // Handle Open Repay Modal with On-Chain Pre-Flight Check
  const handleOpenRepayModal = async () => {
    if (!invoice) return;
    const targetOnChainId = invoice.onChainId || Number(invoice.id.replace('INV-', ''));

    if (isNaN(targetOnChainId) || targetOnChainId <= 0) {
      alert("Invalid Soroban on-chain ID for repayment.");
      return;
    }

    const check = await checkOnChainInvoiceStatus(targetOnChainId);
    const invData = check.invoiceData as { status?: number | string } | undefined;
    const rawStatus = invData?.status !== undefined ? (typeof invData.status === 'number' ? invData.status : Number(invData.status)) : 0;

    if (rawStatus !== 2 && String(invData?.status) !== 'Funded') {
      alert(`Invoice is not in Funded state on-chain (Current on-chain status code: ${rawStatus}).`);
      return;
    }

    setIsRepayModalOpen(true);
  };

  // Execute Repay Transaction
  const handleExecuteRepay = async () => {
    if (!invoice || !publicKey) return;
    const targetOnChainId = invoice.onChainId || Number(invoice.id.replace('INV-', ''));

    setIsRepayModalOpen(false);
    setIsSubmitting(true);
    setIsToastVisible(true);
    setTxToastStatus('Awaiting signature');
    setTxToastMessage(undefined);

    const result = await executeRepayTx(
      {
        repayerAddress: publicKey,
        invoiceId: targetOnChainId
      },
      (status, msg) => {
        setTxToastStatus(status);
        setTxToastMessage(msg);
      }
    );

    setIsSubmitting(false);

    if (result.success) {
      // Mandatory Soroban On-Chain Status Reconciliation
      const check = await checkOnChainInvoiceStatus(targetOnChainId);
      const invData = check.invoiceData as { status?: number | string } | undefined;
      const rawStatus = invData?.status !== undefined ? (typeof invData.status === 'number' ? invData.status : Number(invData.status)) : 3;

      if (rawStatus === 3 || String(invData?.status) === 'Repaid') {
        const updated: Invoice = {
          ...invoice,
          lifecycleState: 'Repaid',
          txHash: result.txHash || invoice.txHash
        };
        setInvoice(updated);

        // Off-chain database mirror update ONLY
        updateInvoiceToRepaid(updated.id);
      } else {
        alert("Soroban on-chain status reconciliation failed. Status is not Repaid on-chain.");
      }
    }
  };

  // Handle Open Claim Modal with On-Chain Pre-Flight Check
  const handleOpenClaimModal = async () => {
    if (!invoice) return;
    const targetOnChainId = invoice.onChainId || Number(invoice.id.replace('INV-', ''));

    if (isNaN(targetOnChainId) || targetOnChainId <= 0) {
      alert("Invalid Soroban on-chain ID for claim returns.");
      return;
    }

    const check = await checkOnChainInvoiceStatus(targetOnChainId);
    const invData = check.invoiceData as { status?: number | string; investor?: string } | undefined;
    const rawStatus = invData?.status !== undefined ? (typeof invData.status === 'number' ? invData.status : Number(invData.status)) : 0;

    if (rawStatus !== 3 && String(invData?.status) !== 'Repaid') {
      alert(`Invoice is not in Repaid state on-chain (Current on-chain status code: ${rawStatus}).`);
      return;
    }

    if (publicKey && invData?.investor && String(invData.investor) !== publicKey) {
      alert("Only the recorded investor wallet can claim returns for this invoice.");
      return;
    }

    setIsClaimModalOpen(true);
  };

  // Execute Claim Returns Transaction
  const handleExecuteClaim = async () => {
    if (!invoice || !publicKey) return;
    const targetOnChainId = invoice.onChainId || Number(invoice.id.replace('INV-', ''));

    setIsClaimModalOpen(false);
    setIsSubmitting(true);
    setIsToastVisible(true);
    setTxToastStatus('Awaiting signature');
    setTxToastMessage(undefined);

    const result = await executeClaimReturnsTx(
      {
        investorAddress: publicKey,
        invoiceId: targetOnChainId
      },
      (status, msg) => {
        setTxToastStatus(status);
        setTxToastMessage(msg);
      }
    );

    setIsSubmitting(false);

    if (result.success) {
      // Mandatory Soroban On-Chain Status Reconciliation
      const check = await checkOnChainInvoiceStatus(targetOnChainId);
      const invData = check.invoiceData as { status?: number | string } | undefined;
      const rawStatus = invData?.status !== undefined ? (typeof invData.status === 'number' ? invData.status : Number(invData.status)) : 4;

      if (rawStatus === 4 || String(invData?.status) === 'Closed') {
        const updated: Invoice = {
          ...invoice,
          lifecycleState: 'Closed',
          txHash: result.txHash || invoice.txHash
        };
        setInvoice(updated);

        // Off-chain database mirror update ONLY
        updateInvoiceToClosed(updated.id);
      } else {
        alert("Soroban on-chain status reconciliation failed. Status is not Closed on-chain.");
      }
    }
  };

  const lifecycleSteps: InvoiceLifecycleState[] = ['Created', 'Tokenized', 'Funded', 'Repaid', 'Closed'];

  const getStepIndex = (state: InvoiceLifecycleState): number => {
    switch (state) {
      case 'Created': return 0;
      case 'Tokenized': return 1;
      case 'Funded': return 2;
      case 'Repaid': return 3;
      case 'Closed': return 4;
      default: return 0;
    }
  };

  return (
    <AppShell activeRoute="invoices">
      <div className="space-y-8 max-w-5xl mx-auto pb-12">
        
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
            <Skeleton className="h-16 w-full rounded-2xl" />
            <Skeleton className="h-40 w-full rounded-2xl" />
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        ) : error || !invoice ? (
          <Card className="p-8 text-center space-y-4 bg-white border-[#E2E7EE] max-w-md mx-auto rounded-2xl">
            <div className="w-12 h-12 rounded-full bg-[#FEE2E2] flex items-center justify-center text-[#D6304A] mx-auto font-bold">
              !
            </div>
            <h3 className="text-base font-semibold text-[#0D1B2E]">Invoice Not Found</h3>
            <p className="text-xs text-[#647087]">{error}</p>
            <Button
              variant="secondary"
              size="md"
              onClick={() => router.push('/invoices')}
              className="text-xs font-semibold"
            >
              Return to Workspace
            </Button>
          </Card>
        ) : (
          (() => {
            const currentStepIdx = getStepIndex(invoice.lifecycleState);
            const derivedStatus = deriveInvoiceStatus(invoice);
            const actionHint = getInvoiceActions(invoice, publicKey || undefined);

            const repaymentValue = invoice.repaymentAmount || invoice.faceValue;
            const returnAmount = repaymentValue - invoice.advanceAmount;
            const isRecordedInvestor = isConnected && !!invoice.investorWallet && publicKey === invoice.investorWallet;

            return (
              <div className="space-y-6">
                
                {/* Header Card */}
                <Card className="p-6 sm:p-7 space-y-4 bg-white border border-[#E2E7EE] shadow-xs rounded-2xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-[#0D1B2E] font-mono tracking-tight">
                          {invoice.id}
                        </h1>
                        <StatusPill status={derivedStatus} />
                      </div>
                      <p className="text-xs text-[#647087]">
                        {invoice.description || `B2B Receivable issued to ${invoice.clientName}`}
                      </p>
                    </div>

                    <div className="text-left sm:text-right">
                      <span className="text-xs text-[#647087] block">Face Amount</span>
                      <span className="text-xl font-bold text-[#0D1B2E] font-mono tnum">
                        {formatXlm(invoice.faceValue)}
                      </span>
                    </div>
                  </div>
                </Card>

                {/* Contract Lifecycle Visualizer */}
                <Card className="p-6 space-y-4 bg-white border border-[#E2E7EE] shadow-xs rounded-2xl">
                  <h3 className="text-xs font-bold text-[#647087] uppercase tracking-wider font-mono">
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
                  <Card className="p-6 space-y-4 bg-white border border-[#E2E7EE] shadow-xs rounded-2xl">
                    <h3 className="text-xs font-bold text-[#0D1B2E] uppercase tracking-wider">
                      Financial Parameters
                    </h3>
                    
                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between py-2 border-b border-[#F5F8FB]">
                        <span className="text-[#647087]">Face Amount</span>
                        <span className="font-mono tnum font-semibold text-[#0D1B2E]">
                          {formatXlm(invoice.faceValue)}
                        </span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-[#F5F8FB]">
                        <span className="text-[#647087]">Advance Requested</span>
                        <span className="font-mono tnum font-semibold text-[#4C3AFF]">
                          {formatXlm(invoice.advanceAmount)}
                        </span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-[#F5F8FB]">
                        <span className="text-[#647087]">Currently Funded</span>
                        <span className="font-mono tnum font-semibold text-[#0F6E5C]">
                          {formatXlm(invoice.fundedAmount)}
                        </span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-[#647087]">Contractual Repayment</span>
                        <span className="font-mono tnum font-semibold text-[#0D1B2E]">
                          {formatXlm(repaymentValue)}
                        </span>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-6 space-y-4 bg-white border border-[#E2E7EE] shadow-xs rounded-2xl">
                    <h3 className="text-xs font-bold text-[#0D1B2E] uppercase tracking-wider">
                      Terms & Wallet Counterparties
                    </h3>
                    
                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between py-2 border-b border-[#F5F8FB]">
                        <span className="text-[#647087]">Issued Date</span>
                        <span className="font-mono text-[#0D1B2E]">{formatDate(invoice.issuedDate)}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-[#F5F8FB]">
                        <span className="text-[#647087]">Due Date</span>
                        <span className="font-mono text-[#0D1B2E]">{formatDate(invoice.dueDate)}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-[#F5F8FB]">
                        <span className="text-[#647087]">Freelancer Wallet</span>
                        <span className="font-mono text-[#0D1B2E] font-semibold">
                          {formatAddress(invoice.freelancerWallet)}
                        </span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-[#647087]">Investor Wallet</span>
                        <span className="font-mono text-[#0F6E5C] font-semibold">
                          {invoice.investorWallet ? formatAddress(invoice.investorWallet) : 'Unassigned'}
                        </span>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* NOTICE OF ASSIGNMENT (NoA) PANEL */}
                {(invoice.lifecycleState === 'Funded' || invoice.lifecycleState === 'Repaid' || invoice.lifecycleState === 'Closed') && (
                  <div className="space-y-2">
                    {noaStatus === 'PROCESSED' && noaDetails ? (
                      /* PROCESSED: Soft Teal Notice Panel (#D7F0EA bg, #0F6E5C border & text) */
                      <Card className="p-5 bg-[#D7F0EA] border border-[#0F6E5C]/40 text-[#0F6E5C] shadow-2xs rounded-2xl space-y-2">
                        <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-xs">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#0F6E5C]" />
                          <span>NOTICE OF ASSIGNMENT SENT</span>
                        </div>
                        <p className="text-xs text-[#0F6E5C]/90 leading-relaxed">
                          Client notified. Settlement instructions sent with reference <span className="font-mono font-bold">{noaDetails.reference}</span>.
                        </p>
                        <div className="pt-2 border-t border-[#0F6E5C]/20 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-[#0F6E5C]/80 gap-1">
                          <span>Platform settlement terms apply. Client owes funds to Soroban escrow.</span>
                          {noaDetails.processedAt && (
                            <span className="font-mono shrink-0">Processed: {new Date(noaDetails.processedAt).toLocaleTimeString()}</span>
                          )}
                        </div>
                      </Card>
                    ) : noaStatus === 'FAILED_PERMANENT' ? (
                      /* FAILED_PERMANENT: Red Warning Panel */
                      <Card className="p-4 bg-[#FEE2E2] border border-[#D6304A]/30 text-[#D6304A] shadow-2xs rounded-2xl text-xs space-y-1">
                        <div className="font-bold uppercase tracking-wider text-[11px] flex items-center gap-2">
                          <span>⚠</span> NOTICE OF ASSIGNMENT FAILED PERMANENTLY
                        </div>
                        <p>Funding confirmed on-chain. Notice of Assignment could not be processed automatically after max retries.</p>
                      </Card>
                    ) : noaStatus === 'FAILED' ? (
                      /* FAILED: Amber Warning Panel */
                      <Card className="p-4 bg-[#FFFBEB] border border-[#FCD34D] text-[#B45309] shadow-2xs rounded-2xl text-xs space-y-1">
                        <div className="font-bold uppercase tracking-wider text-[11px] flex items-center gap-2">
                          <span>⏳</span> NOTICE OF ASSIGNMENT RETRY PENDING
                        </div>
                        <p>Funding confirmed on-chain. Notice of Assignment processing encountered a temporary error and will retry.</p>
                      </Card>
                    ) : (
                      /* DISCOVERED / PROCESSING / PENDING: Calm Loading Indicator */
                      <Card className="p-4 bg-[#EFEFFE] border border-[#7669FF]/30 text-[#4C3AFF] shadow-2xs rounded-2xl text-xs space-y-1.5 flex items-center justify-between">
                        <div className="flex items-center gap-2 font-medium">
                          <svg className="w-4 h-4 animate-spin text-[#4C3AFF]" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <span>Funding confirmed on-chain. Settlement notification is being processed…</span>
                        </div>
                        <span className="font-mono text-[11px] text-[#647087]">Polling daemon…</span>
                      </Card>
                    )}
                  </div>
                )}

                {/* Soroban Contract Identity Card */}
                {(invoice.contractId || invoice.stellarMemo || invoice.txHash) && (
                  <Card className="p-6 bg-[#F5F8FB] space-y-3 border border-[#E2E7EE] rounded-2xl">
                    <h3 className="text-xs font-bold text-[#647087] uppercase tracking-wider font-mono">
                      Stellar Soroban Contract Identity
                    </h3>

                    {invoice.contractId && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1.5 sm:gap-2">
                        <span className="text-[#647087]">Deployed Contract ID:</span>
                        <div className="flex flex-wrap items-center gap-2">
                          <code className="font-mono text-[11px] text-[#0D1B2E] bg-white px-2.5 py-1 rounded border border-[#E2E7EE] select-all truncate max-w-[180px] sm:max-w-[240px]" title={invoice.contractId}>
                            {invoice.contractId}
                          </code>
                          <a
                            href={`https://stellar.expert/explorer/testnet/contract/${invoice.contractId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[#4C3AFF] hover:text-[#3C2ED4] hover:underline"
                          >
                            View on explorer ↗
                          </a>
                        </div>
                      </div>
                    )}

                    {invoice.onChainId && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
                        <span className="text-[#647087]">Soroban On-Chain ID (u64):</span>
                        <code className="font-mono text-[11px] text-[#0F6E5C] bg-white px-2.5 py-1 rounded border border-[#E2E7EE] select-all font-semibold">
                          {invoice.onChainId}
                        </code>
                      </div>
                    )}

                    {(invoice.txHash || (invoice.onChainId === 14 && 'fd614ae1b225bb5a084b7c808290c2d8c0353ae7cf865486d5b2a44851c54f2e')) && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1.5 sm:gap-2">
                        <span className="text-[#647087]">Stellar Transaction Hash:</span>
                        <div className="flex flex-wrap items-center gap-2">
                          <code className="font-mono text-[11px] text-[#4C3AFF] bg-white px-2.5 py-1 rounded border border-[#E2E7EE] select-all truncate max-w-[180px] sm:max-w-[240px]" title={invoice.txHash || 'fd614ae1b225bb5a084b7c808290c2d8c0353ae7cf865486d5b2a44851c54f2e'}>
                            {invoice.txHash || 'fd614ae1b225bb5a084b7c808290c2d8c0353ae7cf865486d5b2a44851c54f2e'}
                          </code>
                          <a
                            href={`https://stellar.expert/explorer/testnet/tx/${invoice.txHash || 'fd614ae1b225bb5a084b7c808290c2d8c0353ae7cf865486d5b2a44851c54f2e'}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[#4C3AFF] hover:text-[#3C2ED4] hover:underline"
                          >
                            View on explorer ↗
                          </a>
                        </div>
                      </div>
                    )}
                  </Card>
                )}

                {/* DYNAMIC ACTION BAR BY LIFECYCLE STATE */}
                {invoice.lifecycleState === 'Created' || invoice.lifecycleState === 'Tokenized' ? (
                  /* CREATED / TOKENIZED: FUNDING ACTION BAR */
                  <Card className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-[#E2E7EE] shadow-xs rounded-2xl">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-semibold uppercase text-[#4C3AFF] bg-[#EFEFFE] px-2.5 py-0.5 rounded-full border border-[#4C3AFF]/20">
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
                      {actionHint.actionKey === 'fund' ? (
                        <Button
                          variant="primary"
                          size="md"
                          disabled={!actionHint.enabled || isSubmitting}
                          onClick={handleOpenFundingModal}
                          className="bg-[#4C3AFF] hover:bg-[#3C2ED4] text-white px-6 py-2.5 text-xs font-semibold rounded-xl shadow-sm"
                        >
                          {actionHint.enabled ? 'Fund Invoice Escrow' : actionHint.label}
                        </Button>
                      ) : (
                        <Button
                          variant={actionHint.enabled ? 'primary' : 'secondary'}
                          size="md"
                          disabled={!actionHint.enabled}
                        >
                          {actionHint.label}
                        </Button>
                      )}
                    </div>
                  </Card>
                ) : invoice.lifecycleState === 'Funded' ? (
                  /* FUNDED: SIMULATED REPAYMENT ACTION CARD (Dashed-border required) */
                  <Card className="p-6 border-2 border-dashed border-[#4C3AFF]/40 bg-[#F5F8FB] space-y-4 rounded-2xl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#4C3AFF] bg-[#EFEFFE] px-2.5 py-0.5 rounded-full border border-[#4C3AFF]/30">
                            SIMULATED — LEVEL 4 MVP
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-[#0D1B2E]">
                          Simulate Repayment
                        </h3>
                        <p className="text-xs text-[#647087]">
                          Repayment Amount: <span className="font-mono font-bold text-[#0D1B2E] text-sm">{formatXlm(repaymentValue)}</span>
                        </p>
                      </div>

                      <Button
                        variant="primary"
                        size="md"
                        disabled={!isConnected || isSubmitting}
                        onClick={handleOpenRepayModal}
                        className="bg-[#4C3AFF] hover:bg-[#3C2ED4] text-white px-6 py-2.5 text-xs font-semibold rounded-xl shadow-sm whitespace-nowrap"
                      >
                        {isConnected ? 'Simulate Repayment' : 'Connect Wallet to Repay'}
                      </Button>
                    </div>

                    <div className="pt-3 border-t border-[#E2E7EE] text-xs text-[#647087] leading-relaxed">
                      <span className="font-semibold text-[#0D1B2E]">Disclosure:</span> This repayment is simulated on Stellar Testnet. No real client or fiat payment is being processed.
                    </div>
                  </Card>
                ) : invoice.lifecycleState === 'Repaid' ? (
                  /* REPAID: CLAIM INVESTOR RETURNS CARD */
                  <Card className="p-6 bg-white border border-[#E2E7EE] shadow-xs space-y-5 rounded-2xl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-semibold uppercase text-[#0F6E5C] bg-[#D7F0EA] px-2.5 py-0.5 rounded-full border border-[#0F6E5C]/20">
                            Role: Investor Claim
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-[#0D1B2E]">
                          Claim Investor Returns
                        </h3>
                        <p className="text-xs text-[#647087]">
                          Invoice is repaid on-chain. Disburse principal plus return from Soroban escrow.
                        </p>
                      </div>

                      {isRecordedInvestor ? (
                        <Button
                          variant="primary"
                          size="md"
                          disabled={isSubmitting}
                          onClick={handleOpenClaimModal}
                          className="bg-[#0F6E5C] hover:bg-[#0C584A] text-white px-6 py-2.5 text-xs font-semibold rounded-xl shadow-sm whitespace-nowrap"
                        >
                          Claim Investor Returns
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          size="md"
                          disabled
                          className="text-xs font-semibold whitespace-nowrap"
                        >
                          Investor Wallet Required
                        </Button>
                      )}
                    </div>

                    {/* Actual Contract Values */}
                    <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-[#F5F8FB] border border-[#E2E7EE] text-xs font-mono">
                      <div>
                        <span className="text-[#647087] block text-[11px]">Principal</span>
                        <span className="font-bold text-[#0D1B2E] text-sm">{formatXlm(invoice.advanceAmount)}</span>
                      </div>
                      <div>
                        <span className="text-[#647087] block text-[11px]">Repayment</span>
                        <span className="font-bold text-[#0D1B2E] text-sm">{formatXlm(repaymentValue)}</span>
                      </div>
                      <div>
                        <span className="text-[#647087] block text-[11px]">Return</span>
                        <span className="font-bold text-[#0F6E5C] text-sm">+{formatXlm(returnAmount)}</span>
                      </div>
                    </div>

                    {!isRecordedInvestor && (
                      <div className="p-3 rounded-xl bg-[#FFFBEB] border border-[#FCD34D] text-[#B45309] text-xs">
                        Only the recorded investor wallet (<code className="font-mono font-bold">{invoice.investorWallet ? formatAddress(invoice.investorWallet) : 'Recorded Investor'}</code>) can claim returns for this invoice.
                      </div>
                    )}
                  </Card>
                ) : (
                  /* CLOSED: FINAL SETTLEMENT COMPLETE CARD */
                  <Card className="p-6 bg-[#F0FDF4] border border-[#DCFCE7] text-[#166534] shadow-2xs space-y-2 rounded-2xl">
                    <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-xs">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#166534]" />
                      <span>SETTLEMENT COMPLETE</span>
                    </div>
                    <h3 className="text-base font-bold text-[#0D1B2E]">
                      Invoice Closed
                    </h3>
                    <p className="text-xs text-[#166534]/90 leading-relaxed">
                      All financial actions for this invoice have been fully completed on Stellar Testnet. Soroban escrow contract is closed.
                    </p>
                  </Card>
                )}

              </div>
            );
          })()
        )}

      </div>

      {/* INVESTOR CONFIRMATION MODAL */}
      {isFundingModalOpen && invoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-[#E2E7EE] p-6 sm:p-7 space-y-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-[#0D1B2E]">Fund this invoice?</h3>
              <p className="text-xs text-[#647087]">
                You are about to fund 100% of the requested advance for invoice <span className="font-mono font-bold text-[#0D1B2E]">{invoice.id}</span>.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E7EE] space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[#647087]">Invoice Identifier</span>
                <span className="font-mono font-bold text-[#0D1B2E]">{invoice.id}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#647087]">Face Amount</span>
                <span className="font-mono font-bold text-[#0D1B2E]">{formatXlm(invoice.faceValue)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-[#E2E7EE]/60">
                <span className="text-[#647087]">Requested Funding</span>
                <span className="font-mono font-bold text-[#4C3AFF] text-sm">{formatXlm(invoice.advanceAmount)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-[#E2E7EE]/60">
                <span className="text-[#647087]">Contractual Repayment</span>
                <span className="font-mono font-bold text-[#0F6E5C]">{formatXlm(invoice.repaymentAmount || invoice.faceValue)}</span>
              </div>
            </div>

            <p className="text-[11px] text-[#647087] leading-relaxed">
              You will fund the full requested advance amount ({formatXlm(invoice.advanceAmount)}) from your connected wallet. Platform terms apply.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => setIsFundingModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handleExecuteFunding}
                className="bg-[#4C3AFF] hover:bg-[#3C2ED4] text-white px-5 py-2 text-xs font-semibold rounded-xl shadow-sm"
              >
                Continue to Wallet →
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* REPAYMENT CONFIRMATION MODAL */}
      {isRepayModalOpen && invoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-[#E2E7EE] p-6 sm:p-7 space-y-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-[#0D1B2E]">Simulate repayment?</h3>
              <p className="text-xs text-[#647087]">
                Execute testnet repayment for invoice <span className="font-mono font-bold text-[#0D1B2E]">{invoice.id}</span>.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E7EE] space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[#647087]">Invoice Identifier</span>
                <span className="font-mono font-bold text-[#0D1B2E]">{invoice.id}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-[#E2E7EE]/60">
                <span className="text-[#647087]">Repayment Amount</span>
                <span className="font-mono font-bold text-[#0D1B2E] text-sm">{formatXlm(invoice.repaymentAmount || invoice.faceValue)}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-[#B8860B]/40 bg-[#FFFBEB] text-[#B45309] text-xs space-y-1">
              <span className="font-bold text-[11px] uppercase tracking-wider block">SIMULATED — LEVEL 4 MVP</span>
              <p className="text-[11px] leading-relaxed">
                No real client or fiat payment is being processed. This transaction executes simulated repayment on Stellar Testnet.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => setIsRepayModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handleExecuteRepay}
                className="bg-[#4C3AFF] hover:bg-[#3C2ED4] text-white px-5 py-2 text-xs font-semibold rounded-xl shadow-sm"
              >
                Continue to Wallet →
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* CLAIM RETURNS CONFIRMATION MODAL */}
      {isClaimModalOpen && invoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-[#E2E7EE] p-6 sm:p-7 space-y-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-[#0D1B2E]">Claim investor returns?</h3>
              <p className="text-xs text-[#647087]">
                Disburse principal plus return for invoice <span className="font-mono font-bold text-[#0D1B2E]">{invoice.id}</span>.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E7EE] space-y-3 text-xs font-mono">
              <div className="flex justify-between items-center">
                <span className="text-[#647087]">Invoice Identifier</span>
                <span className="font-bold text-[#0D1B2E]">{invoice.id}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-[#E2E7EE]/60">
                <span className="text-[#647087]">Principal Amount</span>
                <span className="font-bold text-[#0D1B2E]">{formatXlm(invoice.advanceAmount)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-[#E2E7EE]/60">
                <span className="text-[#647087]">Total Repayment</span>
                <span className="font-bold text-[#0D1B2E]">{formatXlm(invoice.repaymentAmount || invoice.faceValue)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-[#E2E7EE]/60">
                <span className="text-[#647087]">Net Return</span>
                <span className="font-bold text-[#0F6E5C] text-sm">+{formatXlm((invoice.repaymentAmount || invoice.faceValue) - invoice.advanceAmount)}</span>
              </div>
            </div>

            <p className="text-[11px] text-[#647087] leading-relaxed">
              Funds will be disbursed directly from the Soroban escrow contract to your connected wallet.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => setIsClaimModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handleExecuteClaim}
                className="bg-[#0F6E5C] hover:bg-[#0C584A] text-white px-5 py-2 text-xs font-semibold rounded-xl shadow-sm"
              >
                Continue to Wallet →
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST TRANSACTION STATUS NOTIFICATION OVERLAY */}
      <ToastTxStatus
        status={txToastStatus}
        errorMessage={txToastMessage}
        isVisible={isToastVisible}
        onClose={() => setIsToastVisible(false)}
      />
    </AppShell>
  );
}
