# InvoiceFi — Turn Unpaid Invoices into Instant Working Capital
### Stellar Builder Program — Level 4 Idea Submission

---

## Elevator Pitch

InvoiceFi is a decentralized invoice financing platform built on Stellar that lets freelancers, agencies, and small businesses convert unpaid invoices into tokenized digital assets — and get paid instantly by investors instead of waiting 30–90 days. When the client eventually pays, a Soroban smart contract automatically distributes the repayment: investors get their principal + yield, and the freelancer gets any remainder.

InvoiceFi combines **Asset Tokenization, Soroban Smart Contracts, Stellar Anchors, and Cross-Border Payments** into one real-world financial product.

---

## 1. Problem Statement

Millions of freelancers, agencies, and SMEs complete work every day but don't get paid immediately — clients routinely pay 30, 60, or even 90 days later. During that gap, freelancers still owe rent, salaries, software subscriptions, and daily expenses.

Traditional invoice financing exists, but it mainly serves large corporates, requires heavy paperwork, is expensive, and is largely unavailable in developing countries. There is no simple, transparent, low-cost platform where an independent freelancer can unlock the value of an approved invoice instantly.

InvoiceFi solves this by turning invoices into digital assets that investors can finance directly and transparently on Stellar.

**A known limitation, addressed head-on:** invoice financing has an inherent trust problem — how do you know an invoice is genuine and not fabricated to extract cash with no intent to repay? InvoiceFi's MVP handles this with a manual/self-attested verification step (client confirmation via email/document upload); stronger verification (client co-signing, contract linkage, fraud scoring) is explicitly phased in at Level 6, not glossed over. This is called out directly in the roadmap so reviewers see it as a designed trade-off, not an oversight.

A second common question, answered upfront: once an invoice is financed by an investor, how does the client know to pay the investor instead of the freelancer? InvoiceFi solves this with a Notice of Assignment mechanism — see Section 4 for the full mechanics. This is addressed at the architecture level starting at Level 4, not deferred to a later stage, since it's foundational to how repayment works at all.

## 2. Why Stellar?

**Asset Tokenization** — every approved invoice becomes a tokenized real-world asset representing a future payment claim.

**Soroban Smart Contracts** — automate invoice creation, investor funding, fund locking, repayment distribution, investor returns, and loan completion, with no trusted middleman required.

**Stellar Anchors** — clients pay via normal bank transfer; anchors convert fiat into digital assets. When the invoice matures, repayment arrives through the anchor, stablecoins move automatically, and investors + freelancers are paid out.

**Payments** — fast settlement, very low fees, and global/cross-border accessibility make this viable even for small invoice amounts, which traditional invoice financing can't serve profitably.

Together, these four pillars make InvoiceFi a genuine full-stack use of what Stellar is built for — not a single-feature demo.

## 3. Target Users

**Primary (borrowers):** Freelancers, designers, developers, consultants, writers, small agencies

**Secondary (borrowers):** SMEs, international contractors, export businesses

**Investors (lenders):** Retail investors, DeFi lenders, liquidity providers, small investment funds/pools

This is a two-sided marketplace by design — value only exists once both sides are present, which is part of what makes it more technically and product-wise interesting than a single-user-type app.

## 4. Technical Architecture

**Frontend**
React + Next.js + TailwindCSS, Stellar Wallet Kit integration (multi-wallet support: Freighter, Albedo, xBull, and Lobstr for mobile) fully mobile-responsive layout — users choose their preferred wallet provider rather than being locked to one
Modules: Dashboard, Create Invoice, Marketplace, Invest, Portfolio, Repayment Tracking

**Backend (off-chain)**
Node.js + Express + PostgreSQL/Supabase
Stores: user profiles, invoice metadata, client contact info, uploaded documents, off-chain analytics
*(Deliberately off-chain — invoice PDFs, KYC docs, and client contact details should never live on a public ledger.)*

**Smart Contracts (Soroban)**

*Invoice Contract* — stores invoice amount, owner, client, due date, funding status
`create_invoice()` · `tokenize_invoice()` · `invest()` · `repay()` · `claim_returns()` · `cancel_invoice()`

*Marketplace Contract* — handles listing, investment matching, partial investments, closing funding rounds

*Reputation Contract* — tracks successful repayments, completed invoices, default rate, investor score, freelancer score

**Data Flow**
```
Freelancer connects wallet (multi-wallet support via Stellar Wallet Kit) 
   ↓
creates invoice
   ↓
Invoice tokenized (with self-attested verification at MVP stage)
   ↓
Listed on Marketplace
   ↓
Investor(s) fund invoice
   ↓
Freelancer receives funds instantly
   ↓
Client pays invoice (via Anchor, fiat → stablecoin)
   ↓
Contract auto-distributes: investor principal + yield, freelancer remainder
   ↓
Invoice closed, reputation updated
```
**Repayment Routing — Notice of Assignment** - When an investor funds an invoice, payment rights are assigned from the freelancer to InvoiceFi's settlement layer per the platform's terms (not a formal legal transfer at MVP stage — see caveat below). Instead of asking clients to pay individual investors directly, which doesn't scale past one investor per invoice:

1.InvoiceFi automatically notifies the client (email/document) that the invoice has been financed and provides updated payment instructions.
The client repays via a normal bank transfer to InvoiceFi's designated settlement account/anchor, using the invoice ID as the payment reference/memo — most clients are not crypto-native, so this step is a standard bank wire, not direct interaction with a Stellar wallet or anchor UI.
The anchor converts the incoming fiat into a digital asset (e.g., USDC), matches it to the correct invoice using the reference/memo, and the Soroban smart contract automatically distributes the repayment to the invoice's investor(s) based on ownership share.

2.This scales cleanly to partial/fractional investment (Level 6) since the client only ever deals with one settlement account regardless of how many investors are involved, and investors never need to expose personal bank details.

3.Legal/terminology caveat: "assignment" here refers to InvoiceFi's platform terms, not a drafted, enforceable legal transfer — that distinction matters and shouldn't be overstated in user-facing copy or reviewer conversations.

Edge case: if a client mistakenly pays the freelancer directly instead of the settlement account, the blockchain/contract cannot prevent or reverse this. It becomes a contractual matter — the freelancer is obligated to forward the funds per the financing agreement. This mirrors how traditional invoice factoring handles the same edge case.

## 5. Complexity Evaluation

- **Real-world asset tokenization** — representing a future payment claim as a verifiable on-chain asset
- **Marketplace design** — investors browsing/selecting invoices by risk, value, due date, expected yield; matching partial investments to funding rounds
- **DeFi lending logic** — contracts computing repayment splits, interest/yield, and investor allocation correctly, including partial/fractional cases
- **Anchor integration** — real fiat entering and exiting the chain through Stellar anchors, including callback/KYC handling
- **Reputation system** — building decentralized credit history for both freelancers and investors from on-chain event history
- **Invoice trust/fraud risk** — a known hard problem in this space, deliberately phased (manual attestation → verification → risk scoring) rather than either ignored or overpromised
- **Repayment routing & matching** — reconciling incoming settlement-account payments (via invoice-ID reference/memo) to the correct invoice and correctly splitting funds across fractional investors

## 6. Roadmap

**MVP (Level 4):** Tokenized invoice, single investor funding, simulated repayment, Stellar Testnet, self-attested invoice verification

**User acquisition:** University freelancers, student developers, design agencies, startup communities, hackathon networks — low-stakes, real users to pressure-test the funding/repayment flow

**Mainnet vision:** InvoiceFi becomes a decentralized invoice financing marketplace connecting freelancers worldwide with global investors, with real anchor rails, multi-currency support, and a credible (if basic) fraud/verification layer.

---

# Level-by-Level Build Scope (4 → 7)

Each level is a complete, demoable, review-ready project on its own.

## 🟢 Level 4 — Tokenized Invoice MVP

**Goal:** Prove an invoice can become a digital asset and be financed.

**Features:**
- Connect wallet — multi-wallet support (Freighter, Albedo, xBull minimum) via Stellar Wallet Kit
- Create invoice → tokenize invoice
- Single investor funds the invoice
- Simulated repayment (manual trigger, testnet stablecoin)
- Basic dashboard
- Self-attested verification only (freelancer confirms invoice is real; explicitly flagged as an MVP-stage limitation, not solved)
- Testnet deployment
- Basic Notice of Assignment: automated client notification + settlement-account payment instructions with invoice-ID memo/reference for payment matching
- Mobile-responsive UI across all core flows (wallet connect, invoice creation, funding, dashboard)
**Demo** : Freelancer connects via one wallet provider (e.g., Freighter) and creates a $1,000 invoice on a mobile-responsive UI → investor funds it using a different wallet provider (e.g., Albedo) → client receives a Notice of Assignment with settlement instructions → repayment simulated → invoice closes successfully, all visible on-chain via Stellar Expert (testnet).

---

## 🟡 Level 5 — Marketplace

**Goal:** Turn the single-invoice demo into an actual marketplace with multiple participants.

**Add:**
- Public invoice marketplace: browse, search, filter by risk/value/due date
- Multiple invoices listed simultaneously
- Partial investments (more than one investor per invoice)
- Portfolio dashboard for investors (what they've funded, expected returns)
- Simple yield calculator

**Demo:** Five invoices listed on the marketplace; multiple investors funding different invoices (and one invoice funded by more than one investor).

---

## 🟠 Level 6 — DeFi Expansion & Reputation

**Goal:** Add the harder financial logic and trust-layer improvements — kept deliberately focused so it doesn't overload into a full secondary market yet.

**Add:**
- **Fractional ownership** — e.g., a $10,000 invoice funded by 10 investors at $1,000 each
- **Reputation scores & risk categories** — derived from on-chain repayment history for both freelancers and investors
- **Auto repayment distribution** — contract splits incoming repayment across all fractional investors automatically, proportional to their share
- **Stronger invoice verification** — move beyond self-attestation: client email/document confirmation step, basic fraud flags (e.g., duplicate invoice detection)

**Demo:** A single invoice funded by multiple fractional investors, repaid, and automatically split proportionally — plus a freelancer/investor profile page showing real on-chain reputation scores.

*(Note: the secondary marketplace — trading invoice tokens before maturity — has been moved to Level 7. Bundling it into Level 6 alongside fractional ownership, reputation, and verification was too much for one level; it's essentially a small order-book system in its own right.)*

---

## 🔴 Level 7 — Production Platform

**Goal:** Full-fledged, mainnet-ready product.

**Add:**
- **Real Anchor Integration** — actual SEP-24 flow for at least one live corridor (e.g., US ↔ India), not sandbox-only
- **Cross-border settlement** — client pays USD → anchor → USDC → smart contract → investor payout → freelancer withdraws INR through a local anchor
- **Multi-currency support** — USD, EUR, INR, GBP
- **Secondary marketplace** — investors can trade invoice tokens before maturity (moved here from Level 6)
- **Mainnet deployment** -  full multi-milestone, multi-currency product on Stellar Mainnet, real anchor rails, and Notice of Assignment moves from a manual/templated process (Level 4) to a fully automated, auto-generated document workflow with proper legal templating.
- **Analytics dashboard** — TVL, total invoices financed, investor earnings, average repayment time, marketplace stats

**Optional / stretch (not core deliverables):**
- A basic risk-scoring model for repayment probability — framed as a "future vision" line, not a required Level 7 feature, since predictive risk modeling is tangential to what the program is evaluating (on-chain/Soroban skill) and shouldn't dilute the core cross-border + multi-currency + secondary-market work.

**Demo:** End-to-end flow across two countries with real fiat rails, multi-currency invoices, fractional investment, reputation, and a functioning secondary market for invoice tokens — a genuinely pitch-ready product.

---

### Summary Table

| Level | Core Addition | Demo Highlight |
|---|---|---|
| 4 | Tokenized invoice, single investor, self-attested verification | One invoice funded and repaid on testnet |
| 5 | Marketplace, multiple invoices, partial investment | 5 invoices, multiple investors, live marketplace |
| 6 | Fractional ownership, reputation, stronger verification | Fractional funding + proportional auto-repayment + reputation profile |
| 7 | Real anchors, multi-currency, secondary market, mainnet | Full cross-border product, pitch-ready |

---

# Example User Journey (for context/demo narration)

**Alice (Freelancer)** completes a $1,000 website project; the client will pay in 60 days.

1. Alice tokenizes the approved invoice on InvoiceFi (self-attested at MVP stage).
2. It's listed on the marketplace.
3. **Bob (investor)** funds it for $950.
4. Alice receives $950 immediately.
5. Once funded, InvoiceFi automatically sends the client a Notice of Assignment with updated payment instructions (settlement account + invoice ID as memo). 60 days later, the client pays $1,000 via normal bank transfer, which routes through the anchor to the smart contract.
6. The contract automatically sends $1,000 to Bob (his $50 return).
7. Invoice closes; both Alice's and Bob's on-chain reputation scores update.

---

# Why This Should Pass Review

- Hits Stellar's flagship capabilities in one coherent system: tokenization, Soroban, anchors, payments, DeFi lending, reputation, marketplace design — not a single-feature demo.
- Clear, honest handling of the hardest problem in this space (invoice trust/fraud) — phased deliberately rather than ignored, which reads as maturity, not a gap.
- Each level (4→7) is independently demoable and reviewable, with no level requiring you to "finish everything at once."
- Level 6 and 7 scope has been rebalanced so no single level is overloaded — Level 6 stays focused on financial logic + trust, Level 7 owns the harder infrastructure (real anchors, secondary market, mainnet).
-  Directly answers the second most common reviewer question — how clients know to pay post-financing — via the Notice of Assignment mechanism, rather than leaving it unaddressed until asked.