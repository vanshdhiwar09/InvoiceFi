# Stellar Reference Sources — Compiled for InvoiceFi Project
*(Compiled from RiseIn's required Level 4 idea-submission reading list, so every project chat has this content available directly rather than relying on live link access.)*

---

## 1. Stellar Anchors
**Source:** https://stellar.org/learn/anchor-basics

Anchors are the bridge between the Stellar network and traditional banking rails, allowing the world's currencies to interoperate on one platform. They're typically regulated financial institutions, money service businesses, or fintechs — the easiest mental model is "a stablecoin issuer" combined with a fiat on/off-ramp.

Anchors provide three core services:
- **Buy/sell and deposit/withdraw services** between fiat and digital assets
- **Tokenizing real-world value** as digital assets on the network
- **Supporting existing Stellar assets** such as USDC and XLM

They solve a real fragmentation problem: each region runs its own payment system (ACH, SEPA, SPEI, etc.) that doesn't talk to the others. Anchors let those local systems plug into one common blockchain layer instead. Technically, anchors implement **Stellar Ecosystem Proposals (SEPs)** — open standards defining how anchors, wallets, and apps interoperate. The most relevant ones for app builders:
- **SEP-24** — interactive deposit/withdrawal via a webview hosted by the anchor (handles KYC, UI)
- **SEP-31** — cross-border payment flows between regulated entities
- **SEP-12** — standardized way to collect/exchange KYC info

**Relevance to InvoiceFi:** This is the mechanism by which clients pay in fiat and it becomes on-chain stablecoin for investor distribution, and how freelancers/investors cash out to their local currency.

---

## 2. Stellar Use Case — Payments
**Source:** https://stellar.org/use-cases/payments

Stellar is built for cross-border payments — remittances, payroll, supplier invoices, treasury management, and e-commerce payments — settling in seconds at very low cost (commonly cited around $0.0007 per transaction, vs. up to 5 business days for traditional wire/SWIFT transfers).

Real-world example cited by Stellar: **Airtm**, a global payments platform, uses Stellar USDC/EURC to help companies pay freelance and remote workers across regions with inflation or limited banking infrastructure — processing $1.2B in stablecoin volume in 2024.

**Relevance to InvoiceFi:** This is the direct precedent for your core value prop — fast, low-cost, cross-border settlement for freelancers/invoices instead of slow traditional banking rails.

---

## 3. Stellar Use Case — Asset Tokenization
**Source:** https://stellar.org/use-cases/tokenization

Asset tokenization is representing real-world assets (RWAs) or financial products as digital assets on-chain, enabling 24/7 low-cost tracking, holding, and trading. On Stellar specifically, there's no separate "mint" operation — assets are created via a payment operation from an issuing account to a recipient account, with a **trustline** required before an account can hold a given asset.

Key benefits highlighted:
- Institutions can use the blockchain as a real-time source of truth instead of siloed internal record-keeping
- Expanded distribution via Stellar's on/off-ramp and wallet network
- Soroban (smart contracts) enables more advanced use cases on top of tokenized assets: savings, lending, automatic yield calculation

Institutions already tokenizing on Stellar include Franklin Templeton and WisdomTree. Stellar has native protocol-level asset controls (Freeze, Clawback, Authorization Required, Supply Limits) that are relevant for compliance-sensitive assets.

**Relevance to InvoiceFi:** This is the exact mechanism for turning an invoice into a digital asset — the invoice is the "real-world asset" being tokenized, with a trustline and payment-based issuance model.

---

## 4. Stellar Use Case — On-Ramp/Off-Ramp (Ramps)
**Source:** https://stellar.org/use-cases/ramps

**Stellar Ramps** is a suite of open standards letting an application connect to Stellar's global anchor network with a single integration, instead of building custom integrations with each anchor individually.

- **On-ramp** = converting fiat into crypto/digital assets
- **Off-ramp** = converting crypto back into fiat

Two integration patterns for wallets/apps:
- **Anchor-hosted** — directly embed the anchor's deposit/withdrawal interface in-app (this is SEP-24)
- **Anchor API-based** — connect to the anchor's services via API directly

Real examples cited: MoneyGram Ramps and Coinme (convert cash to digital dollars and back), Banxa (Australia-based fintech, on/off-ramp), Flutterwave (African remittance integration). Stellar is cited as having one of the largest off-ramp networks of any blockchain (reportedly ~322,000 off-ramp locations vs. Bitcoin's ~98,000, per a cited Block report), reflecting the network's heavy real-world/cash-economy focus.

**Relevance to InvoiceFi:** This is the technical layer underneath your Notice-of-Assignment settlement flow — a client's bank transfer or cash payment needs to become on-chain stablecoin, and this is exactly what Stellar Ramps standardizes.

---

## 5. Stellar Use Case — DeFi
**Source:** https://stellar.org/use-cases/defi

DeFi on Stellar is powered by **Soroban**, Stellar's smart contract platform (Rust-based, WASM-executed, XLM used for gas). Soroban unlocks use cases that weren't previously possible on Stellar directly: lending, borrowing, decentralized exchanges, and more complex composable financial logic.

Key characteristics of Soroban relevant to builders:
- Rust-based smart contracts, "batteries-included" developer tooling (CLI, RPC, local sandbox, SDKs)
- Built-in support for lending/borrowing markets: users can post collateral, borrow another asset against it, or supply assets to earn yield
- Designed to be composable — lending/borrowing protocols can serve as yield/credit building blocks for other apps built on top
- Real example: **Blend**, a lending/borrowing protocol on Stellar, powers a yield product inside the Meru digital wallet

DeFi's stated value prop on Stellar: increased accessibility (anyone with internet can use it), lower costs (no traditional intermediary fees), and new financial instruments not otherwise available to underserved markets.

**Relevance to InvoiceFi:** This is the direct foundation for your investor-funding/repayment logic — investors supplying capital against a collateral-like asset (the tokenized invoice) and earning yield is structurally a lending/borrowing DeFi pattern.

---

## 6. Stellar Ecosystem Projects
**Source:** https://stellar.org/ecosystem

This is Stellar's directory of live projects building across the network — wallets, anchors, DeFi protocols, tokenization platforms, and infrastructure tools. It's useful as:
- **Competitive/precedent research** — checking whether something similar to InvoiceFi already exists on Stellar (worth periodically re-checking as the ecosystem grows)
- **Partnership/integration scouting** — identifying existing anchors or infrastructure (e.g., existing lending protocols like Blend) that InvoiceFi could eventually integrate with rather than building from scratch
- **Positioning reference** — understanding how other projects describe themselves and where InvoiceFi fits relative to existing payments, tokenization, and DeFi projects on the network

**Relevance to InvoiceFi:** Worth checking before major architecture decisions (e.g., Level 6-7) to confirm you're not duplicating existing infrastructure, and to identify potential ecosystem partners or integration points (anchors, lending protocols, wallets).

---

## Quick-Reference Summary Table

| Resource | Core Concept | Where It Shows Up in InvoiceFi |
|---|---|---|
| Anchor Basics | Fiat ↔ digital asset bridge via regulated entities, SEP-24/31/12 | Client repayment routing, freelancer/investor cash-out |
| Payments | Fast, cheap, global settlement | Core value prop vs. traditional 30-90 day invoice payment delay |
| Tokenization | Real-world assets represented on-chain via issuance + trustlines | Turning an approved invoice into a fundable digital asset |
| Ramps | Standardized single-integration fiat on/off-ramp access | Technical layer behind Notice of Assignment settlement flow |
| DeFi (Soroban) | Smart-contract-based lending/borrowing/yield logic | Investor funding, repayment, yield distribution logic |
| Ecosystem Projects | Directory of existing Stellar projects | Precedent research, partnership/integration scouting |
