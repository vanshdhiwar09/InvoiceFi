'use client';

import React from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { StatusPill } from '@/components/ui/StatusPill';
import { BadgeNetwork } from '@/components/ui/BadgeNetwork';
import { LightPillar } from '@/components/marketing/LightPillar';
import { ShinyText } from '@/components/marketing/ShinyText';

export default function HomePage() {
  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  /* ---------------------------------------------------- */
  /* HERO SECTION: FULL VIEWPORT MARKETING DISPLAY        */
  /* ---------------------------------------------------- */
  const heroSection = (
    <section className="relative w-full min-h-[calc(100vh-80px)] border-b border-[#1E293B] bg-[#070A14] overflow-hidden flex flex-col justify-between">
      {/* Background WebGL LightPillar - Fills Entire Viewport Width & Height */}
      <div className="absolute inset-0 z-0 opacity-100 pointer-events-none">
        <LightPillar
          topColor="#4C3AFF"
          bottomColor="#0F6E5C"
          rotationSpeed={0.15}
          pillarRotation={30}
          interactive={false}
          intensity={1.4}
          glowAmount={0.01}
          pillarWidth={4.2}
          pillarHeight={0.4}
          noiseIntensity={0.35}
          mixBlendMode="screen"
          quality="medium"
        />
      </div>

      {/* Hero Content Grid (Left Aligned High-Contrast Text + Right Floating Card) */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-8 sm:py-10 lg:py-12 grid grid-cols-1 lg:grid-cols-12 items-center gap-8 lg:gap-12 flex-1">
        
        {/* Left Column: Headline, Copy, CTAs & Protocol Metrics */}
        <div className="lg:col-span-7 text-left space-y-5 sm:space-y-6">
          <h1 className="text-3xl sm:text-5xl lg:text-6xl xl:text-7xl font-light text-white tracking-tight leading-[1.15]">
            Turn Unpaid Invoices Into{' '}
            <ShinyText className="font-normal block mt-1">
              Working Capital
            </ShinyText>
          </h1>

          <p className="text-sm sm:text-lg lg:text-xl text-[#E2E8F0] font-normal leading-relaxed max-w-xl drop-shadow-sm">
            InvoiceFi tokenizes B2B receivables on Stellar Soroban Testnet—unlocking instant working capital for businesses and high-yield invoice asset pools for global investors.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3.5 pt-1">
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
              How It Works
            </Button>
          </div>

          {/* Key Metrics Bar */}
          <div className="pt-6 sm:pt-8 border-t border-[#1E293B]/80 grid grid-cols-3 gap-4 sm:gap-6 max-w-lg">
            <div>
              <p className="text-[11px] sm:text-xs text-[#CBD5E1] uppercase tracking-wider font-semibold">Settlement Speed</p>
              <p className="font-mono text-sm sm:text-base font-semibold text-white mt-0.5">Sub-second</p>
            </div>
            <div>
              <p className="text-[11px] sm:text-xs text-[#CBD5E1] uppercase tracking-wider font-semibold">Architecture</p>
              <p className="font-mono text-sm sm:text-base font-semibold text-[#34D399] mt-0.5">Non-Custodial</p>
            </div>
            <div>
              <p className="text-[11px] sm:text-xs text-[#CBD5E1] uppercase tracking-wider font-semibold">Smart Contract</p>
              <p className="font-mono text-sm sm:text-base font-semibold text-[#818CF8] mt-0.5">Soroban SAC</p>
            </div>
          </div>
        </div>

        {/* Right Column: Floating Protocol Preview Card Hovering Next to the Slanted Beam */}
        <div className="lg:col-span-5 hidden sm:flex justify-center lg:justify-end">
          <div className="w-full max-w-sm lg:max-w-md bg-[#0F172A]/90 backdrop-blur-2xl border border-[#334155] rounded-3xl p-5 sm:p-6 lg:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.5)] space-y-4 sm:space-y-6 transform hover:scale-[1.02] transition-transform duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#34D399] animate-pulse" />
                <span className="font-mono text-xs sm:text-sm font-semibold text-white">INV-2026-0842</span>
              </div>
              <StatusPill status="Funding" />
            </div>

            <div className="space-y-1 pt-1 border-t border-[#1E293B]">
              <p className="text-xs text-[#CBD5E1]">Target Receivable Value</p>
              <div className="flex items-baseline justify-between">
                <p className="font-mono text-2xl sm:text-3xl font-light text-white">$50,000.00</p>
                <span className="font-mono text-[11px] sm:text-xs text-[#34D399] font-semibold bg-[#34D399]/10 px-2.5 py-0.5 sm:py-1 rounded-full border border-[#34D399]/30">90% Funded</span>
              </div>
            </div>

            {/* Glowing Progress Bar */}
            <div className="w-full bg-[#1E293B] h-2.5 rounded-full overflow-hidden p-0.5 border border-[#334155]/50">
              <div className="bg-gradient-to-r from-[#4C3AFF] to-[#34D399] h-full w-[90%] rounded-full shadow-[0_0_12px_rgba(76,58,255,0.8)]" />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
              <div className="bg-[#1E293B]/70 p-2.5 sm:p-3 rounded-2xl border border-[#334155]/50">
                <p className="text-[#CBD5E1]">Advance Rate</p>
                <p className="font-mono text-xs sm:text-sm font-semibold text-white mt-0.5">85% ($42.5k)</p>
              </div>
              <div className="bg-[#1E293B]/70 p-2.5 sm:p-3 rounded-2xl border border-[#334155]/50">
                <p className="text-[#CBD5E1]">Illustrative Return</p>
                <p className="font-mono text-xs sm:text-sm font-semibold text-[#34D399] mt-0.5">Agreed Return</p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between text-xs text-[#CBD5E1] font-mono border-t border-[#1E293B]">
              <span>On-Chain Verified</span>
              <span className="text-[#818CF8] font-semibold text-[11px] sm:text-xs">CCG2BPR7...P0YR</span>
            </div>
          </div>
        </div>

      </div>

      {/* Stripe-Inspired Bottom Protocol Ticker Bar (Bottom Anchored) */}
      <div className="relative z-10 w-full bg-[#05070E]/90 border-t border-[#1E293B]/80 py-3 px-4 sm:px-8 lg:px-12 backdrop-blur-md hidden sm:flex items-center justify-between font-mono text-[11px] sm:text-xs text-[#94A3B8]">
        <div className="flex items-center gap-4 sm:gap-6">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#34D399]" />
            Stellar Soroban Testnet
          </span>
          <span className="text-[#334155]">|</span>
          <span>RPC-NODE-01</span>
        </div>
        <div className="flex items-center gap-6 sm:gap-8">
          <span>Fee: <strong className="text-white">0.00001 XLM</strong></span>
          <span>Finality: <strong className="text-[#34D399]">Sub-Second</strong></span>
          <span>Contract: <strong className="text-[#818CF8]">Soroban SAC</strong></span>
        </div>
      </div>
    </section>
  );

  return (
    <AppShell activeRoute="home" hero={heroSection}>
      {/* ---------------------------------------------------- */}
      {/* SECTION 1: HOW INVOICEFI WORKS (ACCURATE MAPPING)     */}
      {/* ---------------------------------------------------- */}
      <section id="how-it-works" className="space-y-10 sm:space-y-12 py-8 sm:py-10 scroll-mt-24">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <h2 className="text-2xl sm:text-4xl font-light text-[#0D1B2E] tracking-tight">
            How Invoice Financing Works on Stellar
          </h2>
          <p className="text-xs sm:text-base text-[#647087] leading-relaxed">
            From B2B receivable tokenization to automated Soroban smart contract settlement.
          </p>
        </div>

        {/* Premium Bento Grid with Truthful Protocol Terminology */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Card 1: Issue & Tokenize */}
          <div className="group md:col-span-7 bg-gradient-to-br from-white via-[#F8FAFC] to-[#F1F5F9] p-6 sm:p-8 rounded-3xl border border-[#E2E7EE] shadow-sm hover:shadow-xl hover:border-[#4C3AFF]/40 transition-all duration-300 space-y-4 sm:space-y-5 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#DAD6FF]/80 text-[#4C3AFF] font-mono font-bold text-xs sm:text-sm flex items-center justify-center shadow-xs">
                  01
                </span>
                <span className="text-xs font-mono text-[#647087] uppercase tracking-wider">Phase 1</span>
              </div>
              <StatusPill status="Open" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl sm:text-2xl font-semibold text-[#0D1B2E] group-hover:text-[#4C3AFF] transition-colors">
                1. Issue & Tokenize Receivables
              </h3>
              <p className="text-xs sm:text-sm text-[#647087] leading-relaxed">
                Businesses upload verified B2B invoices. InvoiceFi mints an on-chain Soroban smart contract asset storing SHA-256 metadata hash securely on Stellar Testnet.
              </p>
            </div>

            <div className="p-3.5 sm:p-4 bg-white rounded-2xl border border-[#E2E7EE] shadow-2xs font-mono text-xs flex items-center justify-between">
              <span className="text-[#647087]">SHA-256 Metadata Hash</span>
              <span className="text-[#0F6E5C] font-semibold bg-[#D7F0EA] px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs">
                e3b0c442...8859
              </span>
            </div>
          </div>

          {/* Card 2: Investor Funding */}
          <div className="group md:col-span-5 bg-gradient-to-br from-white via-[#F8FAFC] to-[#F1F5F9] p-6 sm:p-8 rounded-3xl border border-[#E2E7EE] shadow-sm hover:shadow-xl hover:border-[#0F6E5C]/40 transition-all duration-300 space-y-4 sm:space-y-5 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#D7F0EA] text-[#0F6E5C] font-mono font-bold text-xs sm:text-sm flex items-center justify-center shadow-xs">
                  02
                </span>
                <span className="text-xs font-mono text-[#647087] uppercase tracking-wider">Phase 2</span>
              </div>
              <StatusPill status="Funding" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl sm:text-2xl font-semibold text-[#0D1B2E] group-hover:text-[#0F6E5C] transition-colors">
                2. Investor Funding Flow
              </h3>
              <p className="text-xs sm:text-sm text-[#647087] leading-relaxed">
                Capital is committed to the tokenized invoice through the non-custodial Soroban contract funding flow.
              </p>
            </div>

            <div className="p-3.5 sm:p-4 bg-white rounded-2xl border border-[#E2E7EE] shadow-2xs font-mono text-xs flex items-center justify-between">
              <span className="text-[#647087]">Funding Contract</span>
              <span className="text-[#4C3AFF] font-semibold text-[11px] sm:text-xs">Stellar Testnet Escrow</span>
            </div>
          </div>

          {/* Card 3: Notice of Assignment */}
          <div className="group md:col-span-5 bg-gradient-to-br from-white via-[#F8FAFC] to-[#F1F5F9] p-6 sm:p-8 rounded-3xl border border-[#E2E7EE] shadow-sm hover:shadow-xl hover:border-[#B8860B]/40 transition-all duration-300 space-y-4 sm:space-y-5 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#F4EFE1] text-[#B8860B] font-mono font-bold text-xs sm:text-sm flex items-center justify-center shadow-xs">
                  03
                </span>
                <span className="text-xs font-mono text-[#647087] uppercase tracking-wider">Phase 3</span>
              </div>
              <StatusPill status="Funded" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl sm:text-2xl font-semibold text-[#0D1B2E] group-hover:text-[#B8860B] transition-colors">
                3. Notice of Assignment (NoA)
              </h3>
              <p className="text-xs sm:text-sm text-[#647087] leading-relaxed">
                The client settles payment via Notice of Assignment memo tracking directly to the designated escrow address.
              </p>
            </div>

            <div className="p-3.5 sm:p-4 bg-white rounded-2xl border border-[#E2E7EE] shadow-2xs font-mono text-xs flex items-center justify-between">
              <span className="text-[#647087]">Stellar Memo ID</span>
              <span className="text-[#0D1B2E] font-semibold text-[11px] sm:text-xs">NOA-842-SETTLE</span>
            </div>
          </div>

          {/* Card 4: Automated Returns */}
          <div className="group md:col-span-7 bg-gradient-to-br from-white via-[#F8FAFC] to-[#F1F5F9] p-6 sm:p-8 rounded-3xl border border-[#E2E7EE] shadow-sm hover:shadow-xl hover:border-[#0F6E5C]/40 transition-all duration-300 space-y-4 sm:space-y-5 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#D7F0EA] text-[#0F6E5C] font-mono font-bold text-xs sm:text-sm flex items-center justify-center shadow-xs">
                  04
                </span>
                <span className="text-xs font-mono text-[#647087] uppercase tracking-wider">Phase 4</span>
              </div>
              <StatusPill status="Repaid" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl sm:text-2xl font-semibold text-[#0D1B2E] group-hover:text-[#0F6E5C] transition-colors">
                4. Automated Settlement & Returns
              </h3>
              <p className="text-xs sm:text-sm text-[#647087] leading-relaxed">
                Upon client repayment, the Soroban contract automatically disburses principal plus agreed financing return directly to the investor wallet.
              </p>
            </div>

            <div className="p-3.5 sm:p-4 bg-white rounded-2xl border border-[#E2E7EE] shadow-2xs font-mono text-xs flex items-center justify-between">
              <span className="text-[#647087]">Investor Payout</span>
              <span className="text-[#0F6E5C] font-semibold text-[11px] sm:text-xs">Principal + Agreed Return</span>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* SECTION 2: BUILT ON STELLAR & SOROBAN               */}
      {/* ---------------------------------------------------- */}
      <section className="py-10 sm:py-14 border-t border-[#E2E7EE] space-y-8 sm:space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <h2 className="text-2xl sm:text-4xl font-light text-[#0D1B2E] tracking-tight">
            Why Stellar Soroban?
          </h2>
          <p className="text-xs sm:text-base text-[#647087] leading-relaxed">
            Built on Stellar&apos;s high-speed smart contract engine for auditability, sub-second finality, and ultra-low fees.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E2E7EE] shadow-sm hover:shadow-lg transition-all duration-300 space-y-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-[#DAD6FF]/60 text-[#4C3AFF] flex items-center justify-center font-bold text-xs sm:text-sm shadow-xs">
              RPC
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-[#0D1B2E]">On-Chain Transparency</h3>
            <p className="text-xs sm:text-sm text-[#647087] leading-relaxed">
              Every invoice state transition is recorded as a contract event on Stellar Testnet and indexed real-time via Soroban RPC.
            </p>
          </div>

          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E2E7EE] shadow-sm hover:shadow-lg transition-all duration-300 space-y-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-[#D7F0EA] text-[#0F6E5C] flex items-center justify-center font-bold text-xs sm:text-sm shadow-xs">
              SAC
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-[#0D1B2E]">Instant Settlement Primitives</h3>
            <p className="text-xs sm:text-sm text-[#647087] leading-relaxed">
              Native XLM SAC integration enables sub-second transaction speed and minimal gas costs for high-frequency financing pools.
            </p>
          </div>

          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E2E7EE] shadow-sm hover:shadow-lg transition-all duration-300 space-y-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-[#F4EFE1] text-[#B8860B] flex items-center justify-center font-bold text-xs sm:text-sm shadow-xs">
              SWK
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-[#0D1B2E]">Non-Custodial Multi-Wallet</h3>
            <p className="text-xs sm:text-sm text-[#647087] leading-relaxed">
              Full Stellar Wallets Kit support for Freighter, Albedo, and xBull without storing private keys or user credentials.
            </p>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* SECTION 3: TRUST & TESTNET MVP DISCLOSURE            */}
      {/* ---------------------------------------------------- */}
      <section className="py-8 sm:py-10 border-t border-[#E2E7EE]">
        <div className="bg-gradient-to-r from-[#F8FAFC] via-white to-[#F8FAFC] border border-[#E2E7EE] rounded-3xl p-6 sm:p-10 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#5B6B85]" />
                <span className="text-xs font-semibold text-[#0D1B2E] uppercase tracking-wider">
                  Testnet Architecture Disclosure
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-[#0D1B2E]">
                Level 4 Testnet MVP Demonstration
              </h3>
            </div>
            <BadgeNetwork network="TESTNET" />
          </div>

          <p className="text-xs sm:text-sm text-[#647087] leading-relaxed">
            InvoiceFi is operating on Stellar Soroban Testnet for developer verification. Deployed Contract ID:{' '}
            <code className="font-mono text-[11px] sm:text-xs text-[#0D1B2E] bg-white px-2.5 py-1 rounded-lg border border-[#E2E7EE] select-all font-semibold break-all sm:break-normal">
              CCG2BPR7NEQPV4XOLABSZOWSU24CBJXF4V7LEXIXMAMBPIL6P5CPO2YR
            </code>
          </p>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* SECTION 4: CALL TO ACTION BANNER                     */}
      {/* ---------------------------------------------------- */}
      <section className="py-8 sm:py-12">
        <div className="bg-gradient-to-br from-[#141A3D] via-[#0D1B2E] to-[#0A0D18] text-white rounded-3xl p-8 sm:p-14 text-center space-y-5 sm:space-y-6 shadow-2xl border border-[#334155]">
          <h2 className="text-2xl sm:text-5xl font-light tracking-tight">
            Ready to Tokenize B2B Receivables?
          </h2>
          <p className="text-xs sm:text-base text-[#94A3B8] max-w-xl mx-auto leading-relaxed">
            Connect your Freighter, Albedo, or xBull wallet to explore active testnet invoice pools or launch a new pool.
          </p>
          <div className="pt-2">
            <Link href="/create">
              <Button variant="primary" size="lg" className="bg-[#4C3AFF] hover:bg-[#3C2ED4] text-white border-0 shadow-[0_0_25px_rgba(76,58,255,0.5)] px-7 py-3 text-sm sm:text-base font-semibold">
                Create Testnet Invoice →
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
