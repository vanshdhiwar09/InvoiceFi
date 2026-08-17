'use client';

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';
import { Card } from '@/components/ui/Card';
import { StatusPill } from '@/components/ui/StatusPill';
import { BadgeNetwork } from '@/components/ui/BadgeNetwork';
import { Skeleton } from '@/components/ui/Skeleton';
import { ToastTxStatus, TxStatusType } from '@/components/ui/ToastTxStatus';
import { SheetModal } from '@/components/ui/SheetModal';
import { SettlementMesh } from '@/components/marketing/SettlementMesh';
import { ShinyText } from '@/components/marketing/ShinyText';

export default function Home() {
  const [inputValue, setInputValue] = useState('12400.00');
  const [toastStatus, setToastStatus] = useState<TxStatusType | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <AppShell activeRoute="dashboard">
      <div className="space-y-8 pb-12">
        {/* Foundation Hero Header */}
        <div className="bg-white border border-[#E2E7EE] rounded-xl p-6 sm:p-8 elevation-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#DAD6FF] text-[#4C3AFF]">
                  Phase 6A.5
                </span>
                <span className="text-xs font-medium text-[#647087]">Motion & Component Foundation</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-light text-[#0D1B2E] tracking-tight">
                <ShinyText>InvoiceFi Motion & Interaction Language</ShinyText>
              </h1>
              <p className="text-sm text-[#647087] mt-1 max-w-2xl">
                Restrained, financial-infrastructure quality motion supporting interaction feedback, status transitions, bottom sheets, toast notifications, and prefers-reduced-motion accessibility.
              </p>
            </div>
            <div className="flex items-center gap-3 self-start sm:self-center">
              <BadgeNetwork network="TESTNET" />
            </div>
          </div>
        </div>

        {/* 1. Motion & Interactive Surfaces */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card interactive className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#0D1B2E] uppercase tracking-wider">
                Interactive Card (Hover State)
              </span>
              <span className="text-xs text-[#4C3AFF] font-medium">Hover me →</span>
            </div>
            <p className="text-sm text-[#647087]">
              Interactive cards elevate slightly with a restrained transform (`-translate-y-0.5`) and smooth 150ms motion timing curve. Non-interactive cards remain visually stable.
            </p>
          </Card>

          <Card className="space-y-4">
            <span className="text-xs font-semibold text-[#0D1B2E] uppercase tracking-wider">
              Interactive Sheet & Modal Motion
            </span>
            <p className="text-sm text-[#647087]">
              Mobile bottom sheet and desktop centered modal primitives built for future wallet connection and transaction confirmations.
            </p>
            <Button variant="secondary" size="sm" onClick={() => setIsModalOpen(true)}>
              Preview Sheet / Modal Motion
            </Button>
          </Card>
        </div>

        {/* 2. Toast Tx Status Motion Controls */}
        <Card className="space-y-4">
          <h2 className="text-sm font-semibold text-[#0D1B2E] uppercase tracking-wider">
            Transaction Status Toast Motion (`toast-tx-status`)
          </h2>
          <p className="text-sm text-[#647087]">
            Test the smooth slide/fade entrance of the transaction status toast across all four design states:
          </p>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" size="sm" onClick={() => setToastStatus('Awaiting signature')}>
              Awaiting Signature
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setToastStatus('Broadcasting')}>
              Broadcasting
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setToastStatus('Confirmed')}>
              Confirmed (Teal)
            </Button>
            <Button variant="danger" size="sm" onClick={() => setToastStatus('Failed')}>
              Failed (Red)
            </Button>
          </div>
        </Card>

        {/* 3. Original Tokens Showcase */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Buttons & Status Pills */}
          <Card className="space-y-6">
            <h2 className="text-sm font-semibold text-[#0D1B2E] uppercase tracking-wider">
              Pill Buttons & Status Vocabulary
            </h2>
            
            <div className="space-y-3">
              <span className="text-xs text-[#647087]">Button Feedback (Active Scale)</span>
              <div className="flex flex-wrap gap-3 items-center">
                <Button variant="primary" size="md">
                  Primary Action
                </Button>
                <Button variant="secondary" size="md">
                  Secondary Action
                </Button>
                <Button variant="danger" size="md">
                  Cancel
                </Button>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-[#E2E7EE]">
              <span className="text-xs text-[#647087]">Status Vocabulary</span>
              <div className="flex flex-wrap gap-2">
                <StatusPill status="Open" />
                <StatusPill status="Funding" />
                <StatusPill status="Funded" />
                <StatusPill status="Repaid" />
                <StatusPill status="Overdue" />
              </div>
            </div>
          </Card>

          {/* Form Inputs & Tabular Numerals */}
          <Card className="space-y-6">
            <h2 className="text-sm font-semibold text-[#0D1B2E] uppercase tracking-wider">
              Inputs & Tabular Figures (tnum)
            </h2>

            <div className="space-y-4">
              <TextInput
                label="Invoice Amount"
                prefixSymbol="$"
                isTabular
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                helperText="Formatted with 6px input radius and tabular figures."
              />

              <div className="p-3.5 bg-[#F5F8FB] rounded-md border border-[#E2E7EE] flex justify-between items-center text-sm">
                <span className="text-[#647087]">Tabular Output:</span>
                <span className="font-tabular font-medium text-lg text-[#0D1B2E]">
                  ${parseFloat(inputValue || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })} XLM
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* 4. Marketing Settlement Mesh Foundation Preview (Separate from AppShell) */}
        <div className="space-y-4 pt-4 border-t border-[#E2E7EE]">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#0D1B2E] uppercase tracking-wider">
              Marketing Foundation: Settlement Mesh Preview (Outside AppShell)
            </h2>
            <span className="text-xs text-[#647087]">Marketing surface only</span>
          </div>

          <SettlementMesh className="rounded-xl p-8 border border-[#E2E7EE]">
            <div className="max-w-xl space-y-3">
              <span className="text-xs font-semibold text-[#4C3AFF] uppercase tracking-wider">
                Settlement Mesh Atmosphere
              </span>
              <h3 className="text-xl font-light text-[#0D1B2E]">
                Document becoming chain of custody
              </h3>
              <p className="text-sm text-[#647087]">
                Features a soft gradient atmosphere with a 6% opacity diagonal ledger-line grid. Used exclusively on public marketing hero surfaces, never inside product dashboards.
              </p>
            </div>
          </SettlementMesh>
        </div>

        {/* 5. Skeleton Loading Primitives */}
        <Card className="space-y-4">
          <h3 className="text-xs font-semibold text-[#0D1B2E] uppercase tracking-wider">
            Restrained Shimmer Skeleton Primitives
          </h3>
          <div className="space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-3 w-full" />
          </div>
        </Card>
      </div>

      {/* Toast Notification Component */}
      {toastStatus && (
        <ToastTxStatus
          status={toastStatus}
          onClose={() => setToastStatus(null)}
          onRetry={() => setToastStatus('Broadcasting')}
        />
      )}

      {/* Modal / Sheet Component */}
      <SheetModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Wallet Connect Sheet (Motion Foundation)"
      >
        <div className="space-y-4">
          <p className="text-sm text-[#647087]">
            This modal primitive transitions with a bottom sheet animation on mobile and a centered scale-fade on desktop.
          </p>
          <div className="p-4 bg-[#F5F8FB] rounded-xl border border-[#E2E7EE]">
            <span className="font-mono text-xs text-[#0F6E5C]">Freighter / Albedo / xBull Connect Placeholder</span>
          </div>
          <Button variant="primary" size="md" className="w-full" onClick={() => setIsModalOpen(false)}>
            Close Sheet
          </Button>
        </div>
      </SheetModal>
    </AppShell>
  );
}
