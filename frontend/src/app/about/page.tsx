'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LightPillar } from '@/components/marketing/LightPillar';
import { ShinyText } from '@/components/marketing/ShinyText';

export default function AboutPage() {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const faqData = [
    {
      q: 'What is InvoiceFi?',
      a: 'InvoiceFi is a Stellar-based invoice financing protocol enabling businesses to tokenize unpaid invoices into smart contract assets for Testnet liquidity.'
    },
    {
      q: 'Is this real money or on mainnet?',
      a: 'No. The current Level 4 MVP operates exclusively on Stellar Testnet. Repayment is simulated and uses testnet tokens for proof-of-concept validation.'
    },
    {
      q: 'How does invoice tokenization work?',
      a: 'Invoice financial parameters (face value, advance amount, due date) are stored in a Soroban smart contract, creating a transparent on-chain asset on Stellar.'
    },
    {
      q: 'Who can fund an invoice?',
      a: 'Any wallet holder on Stellar Testnet (using Freighter, Albedo, or xBull) can act as a single investor to fund an open invoice.'
    },
    {
      q: 'How are invoices verified?',
      a: 'Level 4 uses self-attested verification by the invoice creator. Enhanced verification, credit scoring, and client confirmation are planned for later levels.'
    },
    {
      q: 'What is a Notice of Assignment (NoA)?',
      a: 'When an invoice is funded, InvoiceFi issues a Notice of Assignment providing updated settlement reference instructions (e.g. INV-14) for the debtor.'
    }
  ];

  /* ---------------------------------------------------- */
  /* HERO SECTION: DARK MARKETING ENVIRONMENT             */
  /* ---------------------------------------------------- */
  const heroSection = (
    <section className="relative w-full min-h-[70vh] border-b border-[#1E293B] bg-[#070A14] overflow-hidden flex flex-col justify-center">
      <div className="absolute inset-0 z-0 opacity-100 pointer-events-none">
        <LightPillar
          topColor="#4C3AFF"
          bottomColor="#0F6E5C"
          rotationSpeed={0.12}
          pillarRotation={25}
          interactive={false}
          intensity={1.2}
          glowAmount={0.01}
          pillarWidth={4.0}
          pillarHeight={0.4}
          noiseIntensity={0.3}
          mixBlendMode="screen"
          quality="medium"
        />
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-12 sm:py-16 text-left space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#4C3AFF]/15 border border-[#4C3AFF]/30 text-xs font-mono font-semibold text-[#818CF8]">
          <span className="w-2 h-2 rounded-full bg-[#4C3AFF] animate-pulse" />
          <span>ABOUT INVOICEFI</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-light text-white tracking-tight leading-[1.15] max-w-4xl">
          Turn Unpaid Invoices Into{' '}
          <ShinyText className="font-normal block mt-1">
            Working Capital.
          </ShinyText>
        </h1>

        <p className="text-base sm:text-lg lg:text-xl text-[#E2E8F0] font-normal leading-relaxed max-w-2xl">
          InvoiceFi is a Stellar-based invoice financing platform designed to help freelancers, agencies, and small businesses unlock the value of unpaid invoices instead of waiting weeks or months for payment.
        </p>

        <div className="pt-2 flex flex-wrap items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-full bg-[#1E293B] border border-[#334155] text-xs font-mono text-[#34D399] font-semibold">
            Stellar Testnet • Level 4 Soroban MVP
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3.5 pt-4">
          <Link href="/invoices" className="w-full sm:w-auto">
            <Button variant="primary" size="lg" className="w-full sm:w-auto bg-[#4C3AFF] hover:bg-[#3C2ED4] text-white border-0 shadow-[0_0_30px_rgba(76,58,255,0.6)] px-7 py-3 text-sm sm:text-base font-semibold">
              Open App →
            </Button>
          </Link>

          <Button
            variant="secondary"
            size="lg"
            className="w-full sm:w-auto border-[#334155] text-white bg-white/10 hover:bg-white/20 px-7 py-3 text-sm sm:text-base font-semibold"
            onClick={() => scrollToSection('how-it-works')}
          >
            Explore the Invoice Flow
          </Button>
        </div>
      </div>
    </section>
  );

  return (
    <AppShell activeRoute="about" hero={heroSection}>
      <div className="space-y-16 sm:space-y-24 pb-12">

        {/* 2. THE PROBLEM */}
        <section className="space-y-8">
          <div className="space-y-3">
            <span className="text-xs font-bold text-[#4C3AFF] uppercase tracking-widest font-mono">01 / THE PROBLEM</span>
            <h2 className="text-2xl sm:text-4xl font-bold text-[#0D1B2E] tracking-tight">
              An invoice can be earned today and paid months later.
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-2xl border border-[#E2E7EE] shadow-xs space-y-4 text-sm text-[#647087] leading-relaxed">
              <p>
                Freelancers, digital agencies, and B2B vendors frequently complete high-quality deliverables only to face 30, 60, or 90-day payment terms from enterprise clients.
              </p>
              <p>
                During this waiting period, payroll, software subscriptions, rent, suppliers, and operating costs do not stop. Working capital becomes tied up in unpaid accounts receivable.
              </p>
              <p>
                Traditional invoice factoring and bank credit lines exist, but they are often burdened by manual paperwork, heavy financial intermediaries, high discount fees, and accessibility barriers for smaller entities.
              </p>
              <div className="p-4 bg-[#F5F8FB] border border-[#E2E7EE] rounded-xl text-xs text-[#0D1B2E] font-medium">
                InvoiceFi is designed to make this process more accessible, transparent and programmable using Stellar and Soroban smart contracts.
              </div>
            </div>

            {/* Visual Comparison Card */}
            <div className="lg:col-span-5 bg-[#0D1B2E] text-white p-6 sm:p-8 rounded-2xl border border-[#1E293B] shadow-md flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <span className="text-[11px] font-mono font-semibold uppercase text-[#D6304A] bg-[#D6304A]/10 px-2.5 py-0.5 rounded-full border border-[#D6304A]/30">
                  TRADITIONAL FLOW
                </span>
                <div className="flex items-center gap-2 text-xs font-mono text-[#94A3B8]">
                  <span>Invoice issued</span>
                  <span>→</span>
                  <span>Wait 30–90 days</span>
                  <span>→</span>
                  <span>Payment arrives</span>
                </div>
              </div>

              <div className="border-t border-[#1E293B] pt-6 space-y-3">
                <span className="text-[11px] font-mono font-semibold uppercase text-[#0F6E5C] bg-[#0F6E5C]/20 px-2.5 py-0.5 rounded-full border border-[#0F6E5C]/40 text-[#34D399]">
                  INVOICEFI FLOW
                </span>
                <div className="space-y-1.5 text-xs font-mono text-white">
                  <div className="flex items-center gap-2 text-[#818CF8]"><span>1.</span> Invoice issued & tokenized</div>
                  <div className="flex items-center gap-2 text-[#34D399]"><span>2.</span> Investor funds invoice on Stellar</div>
                  <div className="flex items-center gap-2 text-[#F59E0B]"><span>3.</span> Notice of Assignment communicated</div>
                  <div className="flex items-center gap-2 text-[#60A5FA]"><span>4.</span> Repayment & investor return claimed</div>
                  <div className="flex items-center gap-2 text-[#94A3B8]"><span>5.</span> Invoice state closed</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. WHAT INVOICEFI REPLACES / IMPROVES */}
        <section className="space-y-8">
          <div className="space-y-3">
            <span className="text-xs font-bold text-[#4C3AFF] uppercase tracking-widest font-mono">02 / COMPARISON</span>
            <h2 className="text-2xl sm:text-4xl font-bold text-[#0D1B2E] tracking-tight">
              What changes?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6 sm:p-8 bg-white border border-[#E2E7EE] rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-[#0D1B2E]">Traditional Invoice Financing</h3>
                <span className="text-xs font-mono text-[#D6304A] bg-[#FCE7EA] px-2.5 py-1 rounded-full font-semibold">Legacy</span>
              </div>
              <ul className="space-y-2.5 text-xs text-[#647087]">
                <li className="flex items-start gap-2">
                  <span className="text-[#D6304A] font-bold">✕</span>
                  <span>Manual paper-heavy credit approval processes</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#D6304A] font-bold">✕</span>
                  <span>Intermediary-heavy brokers and factoring houses</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#D6304A] font-bold">✕</span>
                  <span>Opaque fee structures and hidden penalties</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#D6304A] font-bold">✕</span>
                  <span>Slow settlement via multi-day banking rails</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#D6304A] font-bold">✕</span>
                  <span>High minimum revenue thresholds excluding freelancers</span>
                </li>
              </ul>
            </Card>

            <Card className="p-6 sm:p-8 bg-[#F5F8FB] border border-[#4C3AFF]/30 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-[#0D1B2E]">InvoiceFi Protocol Vision</h3>
                <span className="text-xs font-mono text-[#4C3AFF] bg-[#EFEFFE] px-2.5 py-1 rounded-full font-semibold">Stellar Soroban</span>
              </div>
              <ul className="space-y-2.5 text-xs text-[#0D1B2E]">
                <li className="flex items-start gap-2">
                  <span className="text-[#0F6E5C] font-bold">✓</span>
                  <span>Tokenized invoice representation on Stellar Testnet</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#0F6E5C] font-bold">✓</span>
                  <span>Programmable Soroban smart contract lifecycle logic</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#0F6E5C] font-bold">✓</span>
                  <span>On-chain transaction visibility via Stellar Expert</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#0F6E5C] font-bold">✓</span>
                  <span>Non-custodial wallet participation (Freighter, Albedo, xBull)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#0F6E5C] font-bold">✓</span>
                  <span>Transparent 5-state lifecycle progression tracking</span>
                </li>
              </ul>
              <div className="pt-2 text-[11px] font-mono text-[#647087] border-t border-[#E2E7EE]">
                Testnet MVP demonstrates the on-chain financing lifecycle.
              </div>
            </Card>
          </div>
        </section>

        {/* 4. HOW IT WORKS */}
        <section id="how-it-works" className="space-y-8 scroll-mt-24">
          <div className="space-y-3">
            <span className="text-xs font-bold text-[#4C3AFF] uppercase tracking-widest font-mono">03 / PROTOCOL FLOW</span>
            <h2 className="text-2xl sm:text-4xl font-bold text-[#0D1B2E] tracking-tight">
              How InvoiceFi Works (Level 4 Lifecycle)
            </h2>
            <p className="text-sm text-[#647087]">
              The active Level 4 MVP executes a 7-step lifecycle entirely verified on Stellar Soroban Testnet.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { step: '01', title: 'Create', desc: 'Business uploads invoice metadata and financial parameters (face value, advance amount, due date).' },
              { step: '02', title: 'Tokenize', desc: 'Invoice becomes represented as an on-chain asset through the InvoiceFi Soroban smart contract.' },
              { step: '03', title: 'Fund', desc: 'A single investor funds the invoice advance amount on Stellar Testnet in XLM.' },
              { step: '04', title: 'Notice of Assignment', desc: 'A Notice of Assignment (NoA) is issued with settlement reference (e.g. INV-14).' },
              { step: '05', title: 'Repay', desc: 'Level 4 uses a simulated repayment flow on Testnet to record full settlement.' },
              { step: '06', title: 'Claim Returns', desc: 'The recorded investor claims repayment principal + yield return via Soroban.' },
              { step: '07', title: 'Closed', desc: 'Soroban contract marks the invoice state as Closed, completing the lifecycle.' }
            ].map((item, idx) => (
              <Card key={idx} className="p-5 bg-white border border-[#E2E7EE] rounded-2xl space-y-2">
                <span className="text-xs font-mono font-bold text-[#4C3AFF]">{item.step} — {item.title}</span>
                <p className="text-xs text-[#647087] leading-relaxed">{item.desc}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* 5. WHY STELLAR */}
        <section className="space-y-8">
          <div className="space-y-3">
            <span className="text-xs font-bold text-[#4C3AFF] uppercase tracking-widest font-mono">04 / INFRASTRUCTURE</span>
            <h2 className="text-2xl sm:text-4xl font-bold text-[#0D1B2E] tracking-tight">
              Why build InvoiceFi on Stellar?
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: 'Sub-Second Settlement', desc: 'Stellar consensus achieves sub-second transaction finality essential for real-time liquidity.' },
              { title: 'Ultra-Low Costs', desc: 'Transaction fees on Stellar cost fractions of a cent, enabling micro-invoicing without fee erosion.' },
              { title: 'Global Payment Focus', desc: 'Stellar is purpose-built for cross-border asset issuance, payments, and financial inclusion.' },
              { title: 'Soroban Smart Contracts', desc: 'Soroban provides WebAssembly-based, deterministic smart contracts with strict state archival TTLs.' },
              { title: 'Native Asset Primitives', desc: 'Native Stellar Asset Contracts (SAC) enable seamless tokenization of real-world financial assets.' },
              { title: 'Rich Wallet Ecosystem', desc: 'Integrated with Freighter, Albedo, and xBull for secure non-custodial key management.' }
            ].map((item, idx) => (
              <Card key={idx} className="p-6 bg-white border border-[#E2E7EE] rounded-2xl space-y-2">
                <h3 className="text-sm font-bold text-[#0D1B2E]">{item.title}</h3>
                <p className="text-xs text-[#647087] leading-relaxed">{item.desc}</p>
              </Card>
            ))}
          </div>

          <div className="p-4 bg-[#F5F8FB] border border-[#E2E7EE] rounded-xl text-xs text-[#647087] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <span>Soroban acts as the programmable layer handling invoice lifecycle transitions and escrow security.</span>
            <span className="font-mono text-[11px] text-[#4C3AFF] shrink-0">Anchor-based fiat rails are part of the future roadmap.</span>
          </div>
        </section>

        {/* 6. WHO IT IS FOR */}
        <section className="space-y-8">
          <div className="space-y-3">
            <span className="text-xs font-bold text-[#4C3AFF] uppercase tracking-widest font-mono">05 / AUDIENCE</span>
            <h2 className="text-2xl sm:text-4xl font-bold text-[#0D1B2E] tracking-tight">
              Who is InvoiceFi for?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 bg-white border border-[#E2E7EE] rounded-2xl space-y-3">
              <div className="w-8 h-8 rounded-lg bg-[#EFEFFE] text-[#4C3AFF] flex items-center justify-center font-bold text-xs font-mono">01</div>
              <h3 className="text-base font-bold text-[#0D1B2E]">Freelancers & Creators</h3>
              <p className="text-xs text-[#647087] leading-relaxed">
                Individuals who have completed work for clients but face long payment terms. InvoiceFi allows them to unlock working capital immediately.
              </p>
            </Card>

            <Card className="p-6 bg-white border border-[#E2E7EE] rounded-2xl space-y-3">
              <div className="w-8 h-8 rounded-lg bg-[#D7F0EA] text-[#0F6E5C] flex items-center justify-center font-bold text-xs font-mono">02</div>
              <h3 className="text-base font-bold text-[#0D1B2E]">Small Businesses & Agencies</h3>
              <p className="text-xs text-[#647087] leading-relaxed">
                Growing firms managing cash flow gaps between supplier costs, payroll, and delayed client receivables.
              </p>
            </Card>

            <Card className="p-6 bg-white border border-[#E2E7EE] rounded-2xl space-y-3">
              <div className="w-8 h-8 rounded-lg bg-[#FEF3C7] text-[#D97706] flex items-center justify-center font-bold text-xs font-mono">03</div>
              <h3 className="text-base font-bold text-[#0D1B2E]">Investors</h3>
              <p className="text-xs text-[#647087] leading-relaxed">
                Participants seeking to fund short-term invoice assets and earn contractual returns demonstrated by the Testnet MVP.
              </p>
            </Card>
          </div>
        </section>

        {/* 7. OUR APPROACH TO TRUST */}
        <section className="space-y-8">
          <div className="space-y-3">
            <span className="text-xs font-bold text-[#4C3AFF] uppercase tracking-widest font-mono">06 / TRUST & VERIFICATION</span>
            <h2 className="text-2xl sm:text-4xl font-bold text-[#0D1B2E] tracking-tight">
              Designed around transparency — not hidden assumptions.
            </h2>
          </div>

          <Card className="p-6 sm:p-8 bg-white border border-[#E2E7EE] rounded-2xl space-y-4 text-xs text-[#647087] leading-relaxed">
            <p className="text-sm font-semibold text-[#0D1B2E]">
              Current Verification Model (Level 4 MVP):
            </p>
            <p>
              In Level 4, InvoiceFi uses self-attested invoice verification. The business owner confirms the invoice details and uploads supporting invoice documents.
            </p>
            <div className="p-4 bg-[#FFFBEB] border border-[#FCD34D]/50 rounded-xl text-[#92400E] space-y-1">
              <span className="font-bold block">Important Notice on MVP Scope:</span>
              <span>Self-attestation is an MVP limitation. Stronger client confirmation, duplicate-invoice detection, credit scoring integrations, and third-party verification mechanisms are planned for later development levels.</span>
            </div>
          </Card>
        </section>

        {/* 8. NOTICE OF ASSIGNMENT */}
        <section className="space-y-8">
          <div className="space-y-3">
            <span className="text-xs font-bold text-[#4C3AFF] uppercase tracking-widest font-mono">07 / NOTICE OF ASSIGNMENT</span>
            <h2 className="text-2xl sm:text-4xl font-bold text-[#0D1B2E] tracking-tight">
              Making repayment instructions explicit.
            </h2>
          </div>

          <Card className="p-6 sm:p-8 bg-white border border-[#E2E7EE] rounded-2xl space-y-4 text-xs text-[#647087] leading-relaxed">
            <p>
              Once an invoice is funded on-chain, InvoiceFi provides a Notice of Assignment (NoA) mechanism. The NoA communicates updated settlement instructions and an invoice reference (e.g. INV-14) to ensure settlement transparency.
            </p>
            <div className="p-4 bg-[#F5F8FB] border border-[#E2E7EE] rounded-xl text-[#0D1B2E] space-y-1">
              <span className="font-semibold block text-xs">Legal Scope Disclosure:</span>
              <span className="text-[11px] text-[#647087]">
                At the MVP stage, &ldquo;assignment&rdquo; refers to the platform&apos;s financing/settlement terms and is not represented as a formal legally enforceable transfer of the receivable.
              </span>
            </div>
          </Card>
        </section>

        {/* 9. WHAT IS LIVE TODAY */}
        <section className="space-y-8">
          <div className="space-y-3">
            <span className="text-xs font-bold text-[#4C3AFF] uppercase tracking-widest font-mono">08 / CURRENT STATUS</span>
            <h2 className="text-2xl sm:text-4xl font-bold text-[#0D1B2E] tracking-tight">
              Live on Stellar Testnet
            </h2>
          </div>

          <Card className="p-6 sm:p-8 bg-white border border-[#E2E7EE] rounded-2xl space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs text-[#0D1B2E]">
              {[
                'Multi-wallet support (Freighter, Albedo, xBull)',
                'Invoice creation with off-chain privacy',
                'Invoice tokenization on Soroban Testnet',
                'Single-investor funding mechanism',
                'Soroban lifecycle tracking (5 states)',
                'Notice of Assignment (NoA) workflow',
                'Simulated repayment flow',
                'Investor return claim execution',
                'Invoice state closure',
                'Mobile-responsive web application',
                'Testnet analytics integration'
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 bg-[#F5F8FB] rounded-lg border border-[#E2E7EE]">
                  <span className="text-[#0F6E5C] font-bold">✓</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-[#E2E7EE] flex items-center justify-between text-xs font-mono">
              <span className="text-[#647087]">Current Status:</span>
              <span className="font-semibold text-[#4C3AFF] bg-[#EFEFFE] px-3 py-1 rounded-full border border-[#4C3AFF]/20">
                Level 4 Soroban MVP on Stellar Testnet
              </span>
            </div>
          </Card>
        </section>

        {/* 10. ROADMAP */}
        <section className="space-y-8">
          <div className="space-y-3">
            <span className="text-xs font-bold text-[#4C3AFF] uppercase tracking-widest font-mono">09 / ROADMAP</span>
            <h2 className="text-2xl sm:text-4xl font-bold text-[#0D1B2E] tracking-tight">
              Development Roadmap
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-6 bg-white border-2 border-[#4C3AFF] rounded-2xl space-y-3">
              <span className="text-[11px] font-mono font-bold text-[#4C3AFF] uppercase bg-[#EFEFFE] px-2.5 py-0.5 rounded-full border border-[#4C3AFF]/30">
                LEVEL 4 — CURRENT
              </span>
              <h3 className="text-base font-bold text-[#0D1B2E]">Tokenized Invoice MVP</h3>
              <ul className="text-xs text-[#647087] space-y-1.5 list-disc list-inside">
                <li>Single investor funding</li>
                <li>Self-attested verification</li>
                <li>Simulated repayment</li>
                <li>Stellar Testnet</li>
              </ul>
            </Card>

            <Card className="p-6 bg-[#F5F8FB] border border-[#E2E7EE] rounded-2xl space-y-3 opacity-90">
              <span className="text-[11px] font-mono font-bold text-[#647087] uppercase bg-white px-2.5 py-0.5 rounded-full border border-[#E2E7EE]">
                LEVEL 5 — NEXT
              </span>
              <h3 className="text-base font-bold text-[#0D1B2E]">Public Marketplace</h3>
              <ul className="text-xs text-[#647087] space-y-1.5 list-disc list-inside">
                <li>Public invoice marketplace</li>
                <li>Multiple active invoices</li>
                <li>Partial investment pools</li>
                <li>Investor portfolio & yield calc</li>
              </ul>
            </Card>

            <Card className="p-6 bg-[#F5F8FB] border border-[#E2E7EE] rounded-2xl space-y-3 opacity-80">
              <span className="text-[11px] font-mono font-bold text-[#647087] uppercase bg-white px-2.5 py-0.5 rounded-full border border-[#E2E7EE]">
                LEVEL 6 — PLANNED
              </span>
              <h3 className="text-base font-bold text-[#0D1B2E]">Fractional Pools</h3>
              <ul className="text-xs text-[#647087] space-y-1.5 list-disc list-inside">
                <li>Fractional invoice ownership</li>
                <li>Reputation scoring</li>
                <li>Stronger client verification</li>
                <li>Proportional repayment</li>
              </ul>
            </Card>

            <Card className="p-6 bg-[#F5F8FB] border border-[#E2E7EE] rounded-2xl space-y-3 opacity-70">
              <span className="text-[11px] font-mono font-bold text-[#647087] uppercase bg-white px-2.5 py-0.5 rounded-full border border-[#E2E7EE]">
                LEVEL 7 — FUTURE
              </span>
              <h3 className="text-base font-bold text-[#0D1B2E]">Mainnet & Fiat Rails</h3>
              <ul className="text-xs text-[#647087] space-y-1.5 list-disc list-inside">
                <li>Stellar Mainnet launch</li>
                <li>Real anchor fiat rails</li>
                <li>Multi-currency settlement</li>
                <li>Secondary marketplace</li>
              </ul>
            </Card>
          </div>
        </section>

        {/* 11. FREQUENTLY ASKED QUESTIONS */}
        <section className="space-y-8">
          <div className="space-y-3">
            <span className="text-xs font-bold text-[#4C3AFF] uppercase tracking-widest font-mono">10 / FAQ</span>
            <h2 className="text-2xl sm:text-4xl font-bold text-[#0D1B2E] tracking-tight">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            {faqData.map((item, idx) => (
              <Card key={idx} className="bg-white border border-[#E2E7EE] rounded-xl overflow-hidden self-start">
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-4 sm:p-5 text-left flex items-start justify-between gap-3 focus:outline-none"
                >
                  <span className="text-xs sm:text-sm font-semibold text-[#0D1B2E] leading-snug">{item.q}</span>
                  <span className="text-base font-bold text-[#4C3AFF] shrink-0">
                    {openFaqIndex === idx ? '−' : '+'}
                  </span>
                </button>
                {openFaqIndex === idx && (
                  <div className="px-4 sm:px-5 pb-4 pt-0 text-xs text-[#647087] leading-relaxed border-t border-[#F1F5F9]">
                    <p className="pt-2.5">{item.a}</p>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </section>

        {/* 12. FEEDBACK / CONTACT */}
        <section className="p-8 sm:p-12 bg-[#0D1B2E] text-white rounded-3xl border border-[#1E293B] shadow-xl text-center space-y-6 max-w-4xl mx-auto">
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">
              Help us build the next version of InvoiceFi.
            </h2>
            <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed max-w-xl mx-auto">
              InvoiceFi is being developed iteratively with feedback from real Testnet users. Tell us what was clear, what was confusing, and what you would change.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <a
              href="https://forms.gle/2mefPw72fh3enLcKA"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center rounded-xl bg-[#4C3AFF] border border-[#635BFF] hover:bg-[#3C2ED4] text-white text-xs sm:text-sm font-semibold transition-all shadow-lg overflow-hidden group"
            >
              <div className="px-3.5 py-3 bg-[#3C2ED4] border-r border-[#635BFF] flex items-center justify-center">
                <svg className="w-5 h-5 fill-none stroke-current text-white group-hover:scale-110 transition-transform" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
              </div>
              <div className="px-4 py-3 flex items-center gap-2 font-mono">
                <span className="text-[#34D399]">💬</span>
                <span>Give Feedback ↗</span>
              </div>
            </a>

            <a
              href="https://github.com/vanshdhiwar09/InvoiceFi"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center rounded-xl bg-[#161B22] border border-[#30363D] hover:bg-[#21262D] text-white text-xs sm:text-sm font-semibold transition-all shadow-md overflow-hidden group"
            >
              <div className="px-3.5 py-3 bg-[#0D1117] border-r border-[#30363D] flex items-center justify-center">
                <svg className="w-5 h-5 fill-current text-white group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
              </div>
              <div className="px-4 py-3 flex items-center gap-2 font-mono">
                <span className="text-[#EAB308]">★</span>
                <span>GitHub Repository ↗</span>
              </div>
            </a>
          </div>
        </section>

      </div>
    </AppShell>
  );
}
