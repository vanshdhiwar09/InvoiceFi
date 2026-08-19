'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';
import { StatusPill } from '@/components/ui/StatusPill';
import { ToastTxStatus, TxStatusType } from '@/components/ui/ToastTxStatus';
import { useWallet } from '@/lib/wallet/WalletContext';
import { savePrivateInvoiceMetadata, updateOnChainMapping, updateTokenizedStatus } from '@/lib/invoices/metadataClient';
import { executeCreateInvoiceTx, executeTokenizeInvoiceTx, INVOICE_CONTRACT_ID } from '@/lib/invoices/sorobanClient';
import { addCreatedInvoice, updateInvoiceToTokenized, formatXlm } from '@/lib/invoices/invoiceService';
import { trackInvoiceCreated } from '@/lib/analytics';

export default function CreateInvoicePage() {
  const router = useRouter();
  const { isConnected, publicKey } = useWallet();

  // Form State
  const [clientName, setClientName] = useState<string>('');
  const [clientEmail, setClientEmail] = useState<string>('');
  const [invoiceAmountXlm, setInvoiceAmountXlm] = useState<string>('');
  const [advanceAmountXlm, setAdvanceAmountXlm] = useState<string>('');
  const [dueDateIso, setDueDateIso] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isSelfVerified, setIsSelfVerified] = useState<boolean>(false);

  // Field Validation Error States
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Workflow State Machine: 'form' | 'created' | 'tokenized'
  const [flowState, setFlowState] = useState<'form' | 'created' | 'tokenized'>('form');
  const [createdInvoiceId, setCreatedInvoiceId] = useState<number | null>(null);
  const [createdClientRef, setCreatedClientRef] = useState<string | null>(null);
  const [createdTxHash, setCreatedTxHash] = useState<string | null>(null);

  // Toast Transaction Status State
  const [txToastStatus, setTxToastStatus] = useState<TxStatusType>('Awaiting signature');
  const [txToastMessage, setTxToastMessage] = useState<string | undefined>(undefined);
  const [isToastVisible, setIsToastVisible] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Lazy date bounds initialization for picker
  const [dateBounds] = useState<{ tomorrow: string; maxDate: string }>(() => {
    const nowMs = Date.now();
    return {
      tomorrow: new Date(nowMs + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      maxDate: new Date(nowMs + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      const allowedExts = ['pdf', 'jpeg', 'jpg', 'png'];
      const ext = file.name.split('.').pop()?.toLowerCase() || '';

      if (!allowedTypes.includes(file.type) && !allowedExts.includes(ext)) {
        setFileError('Invoice documents must be PDF, JPG, or PNG.');
        setSelectedFile(null);
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setFileError('Invoice document must be 10 MB or smaller.');
        setSelectedFile(null);
        return;
      }

      setSelectedFile(file);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!clientName.trim()) {
      newErrors.clientName = 'Client name is required.';
    }

    if (!clientEmail.trim() || !clientEmail.includes('@')) {
      newErrors.clientEmail = 'Valid client email address is required.';
    }

    const faceVal = parseFloat(invoiceAmountXlm);
    if (isNaN(faceVal) || faceVal <= 0) {
      newErrors.invoiceAmount = 'Invoice amount must be a positive number.';
    }

    const advVal = parseFloat(advanceAmountXlm);
    if (isNaN(advVal) || advVal <= 0) {
      newErrors.advanceAmount = 'Requested advance amount must be a positive number.';
    } else if (!isNaN(faceVal) && advVal >= faceVal) {
      newErrors.advanceAmount = 'Requested advance amount must be strictly less than Invoice Amount.';
    }

    if (!dueDateIso) {
      newErrors.dueDate = 'Due date is required.';
    } else {
      const selected = new Date(dueDateIso).getTime();
      const now = new Date().getTime();
      const oneYearOut = now + 366 * 24 * 60 * 60 * 1000;

      if (selected <= now) {
        newErrors.dueDate = 'Due date must be in the future.';
      } else if (selected > oneYearOut) {
        newErrors.dueDate = 'Due date cannot exceed 1 year in the future.';
      }
    }

    if (!isSelfVerified) {
      newErrors.selfVerified = 'You must verify the accuracy of the invoice details before proceeding.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Step 1: Submit Metadata to Express Backend -> Receive Opaque client_ref -> Execute Soroban create_invoice()
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConnected || !publicKey) {
      alert('Please connect your Freighter, Albedo, or xBull wallet first.');
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setIsToastVisible(true);
    setTxToastStatus('Awaiting signature');
    setTxToastMessage('Persisting private metadata and requesting wallet signature…');

    try {
      // 1. Convert optional document to base64 if selected
      let docPayload: { name: string; type: string; dataBase64: string } | undefined = undefined;
      if (selectedFile) {
        const arrayBuffer = await selectedFile.arrayBuffer();
        const base64Str = Buffer.from(arrayBuffer).toString('base64');
        docPayload = {
          name: selectedFile.name,
          type: selectedFile.type,
          dataBase64: base64Str
        };
      }

      // 2. Send private client PII & metadata to Express backend (NEVER to Soroban)
      const faceValNum = parseFloat(invoiceAmountXlm);
      const advValNum = parseFloat(advanceAmountXlm);

      const metadataRes = await savePrivateInvoiceMetadata({
        client_name: clientName.trim(),
        client_email: clientEmail.trim(),
        freelancer_address: publicKey,
        face_value: faceValNum,
        funding_amount: advValNum,
        due_date: dueDateIso,
        document: docPayload
      });

      if (!metadataRes.success || !metadataRes.client_ref) {
        throw new Error(metadataRes.error || 'Failed to generate private client_ref metadata.');
      }

      const clientRef = metadataRes.client_ref;
      setCreatedClientRef(clientRef);

      // 3. Build, simulate and sign Soroban create_invoice() transaction
      const txResult = await executeCreateInvoiceTx(
        {
          freelancerAddress: publicKey,
          clientRef,
          faceValueXlm: faceValNum,
          fundingAmountXlm: advValNum,
          dueDateIso
        },
        (status, msg) => {
          setTxToastStatus(status);
          if (msg) setTxToastMessage(msg);
        }
      );

      if (!txResult.success || !txResult.onChainId) {
        throw new Error(txResult.errorMessage || 'Transaction execution failed');
      }

      const generatedId = txResult.onChainId;
      setCreatedInvoiceId(generatedId);
      setCreatedTxHash(txResult.txHash || null);

      // 4. Map confirmed on_chain_id to backend client_ref record
      await updateOnChainMapping(clientRef, generatedId);

      // 5. Add newly created invoice to normalized local invoice service store
      addCreatedInvoice({
        id: `INV-${generatedId}`,
        clientName: clientName.trim(),
        faceValue: faceValNum,
        advanceAmount: advValNum,
        fundedAmount: 0.00,
        repaymentAmount: faceValNum,
        lifecycleState: 'Created',
        issuedDate: new Date().toISOString().split('T')[0],
        dueDate: dueDateIso,
        freelancerWallet: publicKey,
        contractId: INVOICE_CONTRACT_ID,
        txHash: txResult.txHash,
        description: `B2B Receivable issued to ${clientName.trim()}`
      });

      // Track confirmed invoice creation custom event (Phase 6H)
      trackInvoiceCreated();

      // 6. Transition state machine to Created Success View
      setFlowState('created');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to execute create_invoice transaction';
      setTxToastStatus('Failed');
      setTxToastMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Sign and Execute Soroban tokenize_invoice() transaction
  const handleTokenizeSubmit = async () => {
    if (!createdInvoiceId || !publicKey) return;

    setIsSubmitting(true);
    setIsToastVisible(true);
    setTxToastStatus('Awaiting signature');
    setTxToastMessage('Approve tokenize_invoice() transaction in your wallet…');

    try {
      const txResult = await executeTokenizeInvoiceTx(
        {
          freelancerAddress: publicKey,
          invoiceId: createdInvoiceId
        },
        (status, msg) => {
          setTxToastStatus(status);
          if (msg) setTxToastMessage(msg);
        }
      );

      if (!txResult.success) {
        throw new Error(txResult.errorMessage || 'Tokenization transaction failed');
      }

      // Update backend & local store state to Tokenized
      if (createdClientRef) {
        await updateTokenizedStatus(createdClientRef);
      }
      updateInvoiceToTokenized(`INV-${createdInvoiceId}`);

      // Transition state machine to Tokenized Success View
      setFlowState('tokenized');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to tokenize invoice';
      setTxToastStatus('Failed');
      setTxToastMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const faceValNum = parseFloat(invoiceAmountXlm) || 0;
  const advValNum = parseFloat(advanceAmountXlm) || 0;

  return (
    <AppShell activeRoute="create">
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        
        {/* Not Connected Wallet Banner Notice */}
        {!isConnected ? (
          <Card className="p-8 text-center space-y-4 bg-white border-[#E2E7EE] max-w-lg mx-auto shadow-xs rounded-2xl">
            <div className="w-12 h-12 rounded-full bg-[#F5F8FB] border border-[#E2E7EE] flex items-center justify-center text-[#4C3AFF] mx-auto">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-[#0D1B2E]">Connect Wallet to Create an Invoice</h3>
              <p className="text-xs text-[#647087] max-w-xs mx-auto">
                Connect your Freighter, Albedo, or xBull wallet to sign invoice transactions on Testnet.
              </p>
            </div>
            <Button
              variant="primary"
              size="md"
              className="bg-[#4C3AFF] hover:bg-[#3C2ED4] text-white px-6 py-2.5 text-xs font-semibold rounded-xl"
              onClick={() => {
                const btn = document.querySelector('header button') as HTMLButtonElement;
                if (btn) btn.click();
              }}
            >
              Connect Wallet
            </Button>
          </Card>
        ) : (
          <>
            {/* STATE 1: FORM INPUT VIEW */}
            {flowState === 'form' && (
              <form onSubmit={handleCreateSubmit}>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  
                  {/* LEFT COLUMN: MAIN FORM CARDS (2/3 width = lg:col-span-8) */}
                  <div className="lg:col-span-8 space-y-6">
                    
                    {/* 01 / CLIENT INFORMATION SECTION */}
                    <div className="space-y-2">
                      <h2 className="text-xs font-bold text-[#647087] uppercase tracking-widest font-mono flex items-center gap-1.5">
                        <span className="text-[#4C3AFF]">01 /</span> CLIENT INFORMATION
                      </h2>

                      <Card className="p-6 sm:p-7 bg-white border border-[#E2E7EE] shadow-xs rounded-2xl space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <TextInput
                            label="Client Name *"
                            placeholder="e.g. Acme Textiles Pvt Ltd"
                            value={clientName}
                            onChange={(e) => setClientName(e.target.value)}
                            error={errors.clientName}
                            helperText="Private metadata — stored off-chain only."
                          />

                          <TextInput
                            label="Client Email *"
                            type="email"
                            placeholder="e.g. finance@acmetextiles.com"
                            value={clientEmail}
                            onChange={(e) => setClientEmail(e.target.value)}
                            error={errors.clientEmail}
                            helperText="Used for off-chain Notice of Assignment tracking."
                          />
                        </div>
                      </Card>
                    </div>

                    {/* 02 / INVOICE DETAILS SECTION */}
                    <div className="space-y-2">
                      <h2 className="text-xs font-bold text-[#647087] uppercase tracking-widest font-mono flex items-center gap-1.5">
                        <span className="text-[#4C3AFF]">02 /</span> INVOICE DETAILS (TESTNET XLM)
                      </h2>

                      <Card className="p-6 sm:p-7 bg-white border border-[#E2E7EE] shadow-xs rounded-2xl space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          {/* Invoice Amount (XLM) Input */}
                          <div className="relative flex flex-col gap-1.5 w-full">
                            <TextInput
                              label="Invoice Amount (XLM) *"
                              type="number"
                              step="any"
                              placeholder="e.g. 1000"
                              isTabular
                              value={invoiceAmountXlm}
                              onChange={(e) => setInvoiceAmountXlm(e.target.value)}
                              error={errors.invoiceAmount}
                              helperText="Face amount of receivable in Testnet XLM."
                            />
                          </div>

                          {/* Requested Advance (XLM) Input */}
                          <div className="relative flex flex-col gap-1.5 w-full">
                            <TextInput
                              label="Requested Advance (XLM) *"
                              type="number"
                              step="any"
                              placeholder="e.g. 950"
                              isTabular
                              value={advanceAmountXlm}
                              onChange={(e) => setAdvanceAmountXlm(e.target.value)}
                              error={errors.advanceAmount}
                              helperText="Liquidity requested from investor."
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          {/* Repayment Amount (Display Only) */}
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-[#0D1B2E] uppercase tracking-wider">
                              Repayment Amount (XLM)
                            </label>
                            <div className="relative flex items-center w-full">
                              <div className="w-full bg-[#F8FAFC] text-[#0D1B2E] font-mono font-semibold text-sm rounded-md border border-[#E2E7EE] px-3.5 py-2.5 outline-none select-none">
                                {faceValNum > 0 ? faceValNum.toLocaleString() : '0'}
                              </div>
                              <span className="absolute right-3.5 text-[#647087] text-xs font-mono select-none pointer-events-none font-semibold">
                                XLM
                              </span>
                            </div>
                            <p className="text-[11px] text-[#647087]">Enforced on-chain: Equals Face Amount.</p>
                          </div>

                          {/* Due Date Input */}
                          <div className="flex flex-col gap-1.5">
                            <label htmlFor="input-due-date" className="text-xs font-semibold text-[#0D1B2E] uppercase tracking-wider">
                              Due Date *
                            </label>
                            <input
                              id="input-due-date"
                              type="date"
                              min={dateBounds.tomorrow}
                              max={dateBounds.maxDate}
                              value={dueDateIso}
                              onChange={(e) => setDueDateIso(e.target.value)}
                              className={`w-full bg-white text-[#0D1B2E] text-sm rounded-md border border-[#AFC0DA] px-3.5 py-2.5 outline-none transition-all focus:border-[#4C3AFF] focus:ring-2 focus:ring-[#4C3AFF]/20 ${
                                errors.dueDate ? 'border-[#D6304A]' : ''
                              }`}
                            />
                            {errors.dueDate ? (
                              <p className="text-xs text-[#D6304A] font-medium">{errors.dueDate}</p>
                            ) : (
                              <p className="text-[11px] text-[#647087]">Must be between tomorrow and 1 year in future.</p>
                            )}
                          </div>
                        </div>
                      </Card>
                    </div>

                  </div>

                  {/* RIGHT COLUMN: SIDEBAR CARDS & ACTIONS (1/3 width = lg:col-span-4) */}
                  <div className="lg:col-span-4 space-y-6">

                    {/* CARD 1: INVOICE DOCUMENT (OPTIONAL) */}
                    <Card className="p-6 bg-white border border-[#E2E7EE] shadow-xs rounded-2xl space-y-4">
                      <h3 className="text-xs font-bold text-[#0D1B2E] uppercase tracking-wider flex items-center justify-between">
                        <span>Invoice Document</span>
                        <span className="text-[11px] font-normal text-[#647087] normal-case">(Optional)</span>
                      </h3>

                      <div className="p-6 rounded-2xl border-2 border-dashed border-[#7669FF]/30 bg-[#F8F9FE] hover:bg-[#F0F2FE] hover:border-[#4C3AFF] transition-all text-center space-y-3">
                        <input
                          type="file"
                          id="file-upload"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                        <label
                          htmlFor="file-upload"
                          className="inline-flex flex-col items-center gap-2 cursor-pointer group"
                        >
                          <div className="w-10 h-10 rounded-full bg-[#EFEFFE] text-[#4C3AFF] flex items-center justify-center group-hover:scale-105 transition-transform shadow-2xs">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                          </div>
                          <span className="text-xs font-semibold text-[#4C3AFF] group-hover:underline">
                            {selectedFile ? 'Change Invoice File' : 'Select Invoice File'}
                          </span>
                          <span className="text-[11px] text-[#647087]">
                            PDF, JPG, or PNG (Max 10MB)
                          </span>
                        </label>

                        {selectedFile && (
                          <div className="pt-2 border-t border-[#E2E7EE]/60 text-xs font-mono font-semibold text-[#0F6E5C] truncate">
                            ✓ {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                          </div>
                        )}

                        {fileError && <p className="text-xs text-[#D6304A] font-medium pt-1">{fileError}</p>}
                      </div>

                      <p className="text-[11px] text-[#647087] leading-tight">
                        Documents remain private and are stored off-chain. Never uploaded to Soroban smart contracts.
                      </p>
                    </Card>

                    {/* CARD 2: FINANCING SUMMARY */}
                    <Card className="p-6 bg-white border border-[#E2E7EE] shadow-xs rounded-2xl space-y-4 relative overflow-hidden">
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#4C3AFF] via-[#7669FF] to-[#0F6E5C]" />

                      <h3 className="text-xs font-bold text-[#0D1B2E] uppercase tracking-wider">
                        Financing Summary
                      </h3>

                      <div className="space-y-3 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-[#647087]">Face Amount</span>
                          <span className="font-mono font-bold text-[#0D1B2E] text-sm">
                            {formatXlm(faceValNum)}
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-[#647087]">Requested Advance</span>
                          <span className="font-mono font-bold text-[#4C3AFF] text-sm">
                            {formatXlm(advValNum)}
                          </span>
                        </div>

                        <div className="flex justify-between items-center pt-2.5 border-t border-[#F5F8FB]">
                          <span className="text-[#647087]">Repayment Amount</span>
                          <span className="font-mono font-bold text-[#0F6E5C] text-sm">
                            {formatXlm(faceValNum)}
                          </span>
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t border-[#F5F8FB] text-[11px]">
                          <span className="text-[#647087]">Testnet Token Asset</span>
                          <span className="font-mono text-[#4C3AFF] bg-[#EFEFFE] px-2 py-0.5 rounded text-[11px] font-semibold">
                            XLM SAC
                          </span>
                        </div>
                      </div>
                    </Card>

                    {/* CARD 3: INTERACTIVE SELF-VERIFICATION CHECKBOX */}
                    <div className="p-4 rounded-2xl bg-[#F5F8FB] border border-[#E2E7EE] space-y-2">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isSelfVerified}
                          onChange={(e) => {
                            setIsSelfVerified(e.target.checked);
                            if (errors.selfVerified) {
                              setErrors((prev) => ({ ...prev, selfVerified: '' }));
                            }
                          }}
                          className="mt-0.5 w-4 h-4 rounded border-[#CBD5E1] text-[#4C3AFF] focus:ring-[#4C3AFF] cursor-pointer shrink-0"
                        />
                        <span className="text-xs text-[#0D1B2E] font-medium leading-relaxed select-none">
                          I verify that I am authorized to issue this invoice and that all provided financial parameters and document details are accurate and self-attested.
                        </span>
                      </label>
                      {errors.selfVerified && (
                        <p className="text-xs font-medium text-[#D6304A] pt-1 pl-7">{errors.selfVerified}</p>
                      )}
                    </div>

                    {/* PRIMARY SUBMIT BUTTON */}
                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      disabled={isSubmitting}
                      className="w-full bg-[#4C3AFF] hover:bg-[#3C2ED4] text-white py-3.5 text-sm font-semibold rounded-xl shadow-md hover:shadow-lg transition-all"
                    >
                      {isSubmitting ? 'Processing Transaction…' : 'Create Invoice →'}
                    </Button>

                  </div>

                </div>
              </form>
            )}

            {/* STATE 2: CREATED SUCCESS VIEW (Step 1 Complete -> Tokenization Available) */}
            {flowState === 'created' && (
              <Card className="p-8 text-center space-y-6 bg-white border-[#E2E7EE] shadow-lg max-w-lg mx-auto rounded-2xl">
                <div className="w-14 h-14 rounded-full bg-[#EFEFFE] flex items-center justify-center text-[#4C3AFF] mx-auto font-bold text-xl">
                  ✓
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <StatusPill status="Created" />
                    <span className="text-xs font-semibold text-[#0F6E5C] bg-[#D7F0EA] px-2.5 py-0.5 rounded-full border border-[#0F6E5C]/20">
                      Self-attested
                    </span>
                  </div>
                  <h2 className="text-xl font-semibold text-[#0D1B2E]">Invoice Metadata Persisted</h2>
                  <p className="font-mono text-base font-bold text-[#4C3AFF]">
                    INV-{createdInvoiceId}
                  </p>
                  <p className="text-xs text-[#647087] max-w-sm mx-auto leading-relaxed">
                    Private metadata was stored off-chain. Complete Step 2 to mint and tokenize this invoice on Soroban Testnet.
                  </p>
                </div>

                {createdTxHash && (
                  <div className="p-3 bg-[#F5F8FB] rounded-xl border border-[#E2E7EE] text-xs font-mono text-[#647087]">
                    Tx Hash: <span className="text-[#0D1B2E] select-all">{createdTxHash.slice(0, 16)}…{createdTxHash.slice(-8)}</span>
                  </div>
                )}

                {/* STEP 2 CTA: TOKENIZE INVOICE */}
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  disabled={isSubmitting}
                  onClick={handleTokenizeSubmit}
                  className="w-full bg-[#4C3AFF] hover:bg-[#3C2ED4] text-white py-3.5 text-sm font-semibold rounded-xl shadow-md"
                >
                  {isSubmitting ? 'Tokenizing Asset…' : 'Tokenize Invoice (Step 2)'}
                </Button>
              </Card>
            )}

            {/* STATE 3: TOKENIZED SUCCESS VIEW (Step 2 Complete) */}
            {flowState === 'tokenized' && (
              <Card className="p-8 text-center space-y-6 bg-white border-[#0F6E5C]/30 shadow-lg max-w-lg mx-auto rounded-2xl">
                <div className="w-14 h-14 rounded-full bg-[#D7F0EA] border border-[#0F6E5C]/30 flex items-center justify-center text-[#0F6E5C] mx-auto">
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <StatusPill status="Tokenized" />
                    <span className="text-xs font-semibold text-[#0F6E5C] bg-[#D7F0EA] px-2.5 py-0.5 rounded-full border border-[#0F6E5C]/20">
                      Self-attested
                    </span>
                  </div>
                  <h2 className="text-xl font-semibold text-[#0D1B2E]">Invoice Tokenization Complete</h2>
                  <p className="font-mono text-base font-bold text-[#0F6E5C]">
                    INV-{createdInvoiceId}
                  </p>
                  <p className="text-xs text-[#647087] max-w-sm mx-auto leading-relaxed">
                    Your invoice is now tokenized on Stellar Testnet and available for investor funding.
                  </p>
                </div>

                {/* NAVIGATE TO WORKSPACE CTA */}
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  onClick={() => router.push(`/invoices/${createdInvoiceId ? `INV-${createdInvoiceId}` : ''}`)}
                  className="w-full bg-[#0F6E5C] hover:bg-[#0E5D4E] text-white py-3.5 text-sm font-semibold rounded-xl shadow-md"
                >
                  View in Workspace →
                </Button>
              </Card>
            )}
          </>
        )}

      </div>

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
