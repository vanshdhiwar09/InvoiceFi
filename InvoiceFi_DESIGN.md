---
version: alpha
name: InvoiceFi-design-system
description: A financial-infrastructure design language for InvoiceFi — a Stellar-based invoice tokenization and financing protocol. Inherits Stripi's ink-and-indigo DNA (thin-weight editorial type, tabular money figures, pill CTAs, gradient-mesh atmosphere) and re-grounds it in InvoiceFi's own subject matter — the invoice as a financial instrument moving from paper to ledger to settlement. The signature departure from the inspiration: where Stripi's mesh is pure atmosphere, InvoiceFi's backdrop is a "Settlement Mesh" — the same soft gradient wash, but overlaid with a faint, animated ledger-line grid that suggests a document becoming a chain of custody. Every numeric surface (invoice amount, funding progress, yield, reputation score) renders in tabular figures — this is a protocol where the number IS the product.

colors:
  primary: "#4C3AFF"
  primary-deep: "#3C2ED4"
  primary-press: "#2A1F94"
  primary-soft: "#7669FF"
  primary-bg-subdued-hover: "#DAD6FF"
  ledger-teal: "#0F6E5C"
  ledger-teal-soft: "#D7F0EA"
  brand-dark-900: "#141A3D"
  ink: "#0D1B2E"
  ink-secondary: "#2A3A52"
  ink-mute: "#647087"
  ink-mute-2: "#8894A6"
  on-primary: "#FFFFFF"
  canvas: "#FFFFFF"
  canvas-soft: "#F5F8FB"
  canvas-cream: "#F4EFE1"
  hairline: "#E2E7EE"
  hairline-input: "#AFC0DA"
  ruby: "#E23A6E"
  amber-caution: "#B5730B"
  amber-bg: "#FBF0DD"
  success-green: "#0E8F5A"
  success-bg: "#E3F6EC"
  danger-red: "#D6304A"
  danger-bg: "#FCE7EA"
  mainnet-gold: "#B8860B"
  testnet-slate: "#5B6B85"
  shadow-blue: "#00234D"

typography:
  display-xxl: { fontSize: 56px, fontWeight: 300, lineHeight: 1.03, letterSpacing: -1.4px, fontFeature: ss01 }
  display-xl:  { fontSize: 44px, fontWeight: 300, lineHeight: 1.12, letterSpacing: -0.9px,  fontFeature: ss01 }
  display-lg:  { fontSize: 32px, fontWeight: 300, lineHeight: 1.1,  letterSpacing: -0.6px,  fontFeature: ss01 }
  display-md:  { fontSize: 26px, fontWeight: 300, lineHeight: 1.15, letterSpacing: -0.26px, fontFeature: ss01 }
  heading-lg:  { fontSize: 22px, fontWeight: 400, lineHeight: 1.2,  letterSpacing: -0.2px,  fontFeature: ss01 }
  heading-md:  { fontSize: 18px, fontWeight: 400, lineHeight: 1.35, letterSpacing: -0.1px,  fontFeature: ss01 }
  heading-sm:  { fontSize: 16px, fontWeight: 500, lineHeight: 1.4,  letterSpacing: 0,       fontFeature: ss01 }
  body-lg:     { fontSize: 16px, fontWeight: 400, lineHeight: 1.5,  letterSpacing: 0 }
  body-md:     { fontSize: 15px, fontWeight: 400, lineHeight: 1.5,  letterSpacing: 0 }
  body-tabular:{ fontSize: 15px, fontWeight: 400, lineHeight: 1.4,  letterSpacing: -0.3px,  fontFeature: tnum }
  money-lg:    { fontSize: 32px, fontWeight: 500, lineHeight: 1.1,  letterSpacing: -0.5px,  fontFeature: tnum }
  money-md:    { fontSize: 20px, fontWeight: 500, lineHeight: 1.2,  letterSpacing: -0.3px,  fontFeature: tnum }
  button-md:   { fontSize: 15px, fontWeight: 500, lineHeight: 1.0,  letterSpacing: 0 }
  button-sm:   { fontSize: 13px, fontWeight: 500, lineHeight: 1.0,  letterSpacing: 0 }
  caption:     { fontSize: 13px, fontWeight: 400, lineHeight: 1.4,  letterSpacing: 0 }
  micro-cap:   { fontSize: 10px, fontWeight: 600, lineHeight: 1.2,  letterSpacing: 0.6px }
  mono-address:{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 13px, fontWeight: 400, letterSpacing: 0 }

rounded:
  xs: 4px
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
  pill: 9999px

spacing:
  xxs: 2px
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  xxl: 32px
  huge: 64px
---

## 0. Why this system, and what changed from the inspiration

The brief points at Stripi as inspiration — deep ink text, one disciplined indigo, thin editorial display type, pill buttons, tabular money figures, a gradient-mesh hero. That vocabulary is correct for InvoiceFi: it's also a financial-infrastructure product, also asking users to trust a number on a screen. Reusing it wholesale would be lazy, though — InvoiceFi isn't a payments API, it's a *document turning into a liquid asset* on a public ledger. Three deliberate departures:

1. **A second brand color: Ledger Teal (`#0F6E5C`).** Indigo stays the CTA/action color exactly as in the inspiration. Teal is new — it marks *settled, on-chain, verified* states (funded invoices, closed loops, confirmed tx). Stripi has no equivalent because it doesn't have a settlement lifecycle to narrate; InvoiceFi's entire product is that lifecycle, so it earns a second color, used only for status, never for CTAs.
2. **The Settlement Mesh, not the pure atmosphere mesh.** Same gradient family and placement (upper third, marketing surfaces only), but with a faint diagonal ledger-line texture bleeding through it at ~6% opacity — visual shorthand for "paper becoming chain." This is InvoiceFi's one signature flourish; everywhere else stays as disciplined as the inspiration.
3. **A testnet/mainnet state system.** Nothing in Stripi's language distinguishes environments. InvoiceFi ships on testnet at Level 4 and mainnet at Level 6, and reviewers are explicitly grading whether that's provable — so the design needs a first-class, impossible-to-miss network indicator (see §4.6) rather than a settings-page toggle.

Everything else — thin-weight display type, tnum money figures, pill buttons, hairline cards, the ink/canvas surface logic — carries forward directly because it's already correct for this subject.

### Font substitute note
Sohne is proprietary. Use **Inter** at weight 300 for display tiers (`display-*`, `heading-lg`) with the letter-spacing values above, and weight 400–500 for UI/body/button tiers where the inspiration's `button-md`/`heading-sm` already called for heavier weight. Apply `font-feature-settings: "ss01"` globally on `<body>`. Apply `"tnum"` per-element on every money, count, percentage, or wallet-balance cell — this is non-negotiable across all four levels, since RiseIn reviewers are explicitly looking at invoice amounts, user counts, and tx values.

---

## 1. Core tokens (apply at every level, unchanged)

### Color roles
| Role | Token | Hex | Use |
|---|---|---|---|
| CTA / links / focus rings | `primary` | `#4C3AFF` | Filled buttons, active nav, link-on-light |
| CTA pressed | `primary-press` | `#2A1F94` | Button active state |
| Soft tag fill | `primary-bg-subdued-hover` | `#DAD6FF` | "New", "Beta" pills |
| Settled / on-chain / verified | `ledger-teal` | `#0F6E5C` | Funded badge, confirmed tx, repaid status |
| Settled bg | `ledger-teal-soft` | `#D7F0EA` | Status pill fill |
| Body text | `ink` | `#0D1B2E` | Default, never pure black |
| Muted text | `ink-mute` | `#647087` | Captions, helper text, table labels |
| Dashboard/dark chrome | `brand-dark-900` | `#141A3D` | Nav-on-mesh (scrolled), featured cards, terminal mockups |
| Caution | `amber-caution` / `amber-bg` | `#B5730B` / `#FBF0DD` | Self-attested verification notice, pending signature |
| Success | `success-green` / `success-bg` | `#0E8F5A` / `#E3F6EC` | Repayment complete, feedback submitted |
| Danger | `danger-red` / `danger-bg` | `#D6304A` / `#FCE7EA` | Failed tx, wallet rejection, insufficient balance |
| Mainnet marker | `mainnet-gold` | `#B8860B` | Mainnet network badge (Level 6–7 only) |
| Testnet marker | `testnet-slate` | `#5B6B85` | Testnet network badge (Level 4–5) |

### Type scale
Display tiers (`display-xxl` → `heading-lg`) at weight 300, negative tracking, Inter fallback — used only for marketing headlines and hero numbers (e.g. "$2.4M invoices tokenized"). Everything inside the product itself — invoice cards, tables, forms, nav — uses `heading-sm` and below, which sit at weight 400–500. This mirrors the inspiration's split between marketing-page thinness and dashboard-track legibility, and matters more for InvoiceFi than for Stripi because users are signing transactions, not reading a pricing page — legibility beats editorial thinness inside the app shell.

### Elevation
| Level | Treatment | Use |
|---|---|---|
| 0 | Flat | Table rows, list items |
| 1 | `0 1px 3px rgba(0,35,77,0.08)` | Invoice cards, form cards |
| 2 | `0 8px 24px rgba(0,35,77,0.10), 0 2px 6px rgba(0,35,77,0.05)` | Modals, wallet-connect sheet, toasts |
| 3 | Settlement Mesh backdrop | Marketing hero only |

### Radius
Pills (`9999px`) for every button and status badge. `12px` for cards. `6px` for inputs. `16px` for the wallet-connect sheet and dashboard composite chrome. No sharp corners anywhere — this is a trust-building consumer fintech surface, not a terminal.

---

## 2. Core components (built once at Level 4, reused through Level 7)

**`button-primary-pill`** — `primary` fill, `on-primary` text, `button-md`, `10px 20px` padding (slightly more generous than the inspiration's 8px 16px, because wallet-signing CTAs need a larger, more confident tap target). Pressed → `primary-press`.

**`button-secondary`** — canvas fill, 1px `primary` border, `primary` text. Used for "Cancel", "View on explorer".

**`button-wallet`** — canvas fill, 1.5px `hairline-input` border, left-aligned wallet-provider icon + name, right-aligned chevron. Full-width inside the wallet sheet. Hover lifts to elevation 1.

**`card-invoice`** — the single most-repeated component across all four levels. Canvas bg, `hairline` border, `rounded.lg`, `24px` padding.
```
┌─────────────────────────────────────────┐
│ INV-0042              [● Funded — Teal]  │  ← id (mono-address) + status pill
│ Acme Textiles Pvt Ltd                    │  ← heading-sm, client name
│                                           │
│ $12,400.00                               │  ← money-lg, tnum
│ ████████████████░░░░  82% funded         │  ← progress bar, primary fill
│                                           │
│ Due 14 Sep 2026        12.4% APR         │  ← caption row, tnum on APR
└─────────────────────────────────────────┘
```
Status pill vocabulary (fixed across all levels, this consistency is a reviewer-visible signal of design maturity): `Open` (ink-mute/canvas-soft) → `Funding` (primary/subdued-hover) → `Funded` (teal/teal-soft) → `Repaid` (success) → `Overdue` (danger).

**`badge-network`** — fixed top-of-app-shell element, not a settings toggle. `TESTNET` renders as a slate pill with a dashed border (visually "unfinished, still building"); `MAINNET` renders solid gold (visually "real money, be careful"). This single component is what makes the Level 6 mainnet cutover legible in every screenshot the reviewers grade against.

**`toast-tx-status`** — slides in bottom-right, elevation 2, rounded-xl. States: *Awaiting signature* (ink-mute, pulsing wallet icon) → *Broadcasting* (primary, spinner) → *Confirmed* (teal, checkmark) → *Failed* (danger, retry action). This one component covers the execution plan's explicit "per-wallet signing behavior" and "failed tx / wallet rejection" requirements at Level 4.

**`empty-state`** — centered icon + `heading-sm` + one line of `body-md` + primary CTA. Per the frontend-design principle that empty screens are an invitation to act, not a dead end: e.g. "No invoices yet — Create your first invoice to start building on-chain history."

---

## 3. Level 4 — Production-Ready MVP + Real Users

**Design goal:** prove the core loop is real, legible, and forgiving of wallet failure — not visually elaborate. Every screen below maps to a specific line in the Level 4 checklist.

### 3.1 Marketing / landing (satisfies: production deployment, live demo link)
Settlement Mesh hero, `display-xxl` headline set in Inter 300: *"Turn invoices into liquidity, on-chain."* Sub-head in `body-lg`, `ink-secondary`. Single `button-primary-pill`: "Connect Wallet." Below the fold: a `card-dashboard-mockup` composite showing a live invoice card mid-funding — this is the "look at the actual product" move the inspiration insists on, and it doubles as the analytics-dashboard screenshot the checklist asks for.

### 3.2 Wallet connect sheet (satisfies: multi-wallet from day one, 2+ providers in demo video)
Bottom sheet on mobile / centered modal on desktop, elevation 2, `rounded.xl`. Stack of `button-wallet` rows: Freighter, Albedo, xBull, in that priority order. Each row shows its *own* loading and error microcopy when tapped — "Freighter" opens a popup and the row shows a spinner + "Approve in Freighter"; "Albedo" redirects and the row shows "Redirecting to Albedo…"; "xBull" deep-links on mobile and shows "Opening xBull app…" This satisfies the plan's explicit requirement to test each wallet's UX individually rather than only Freighter.

### 3.3 Create invoice (satisfies: core flow, self-attested verification disclosed)
Single-column form card, max-width 480px, generous `xl` spacing between fields. Fields: client name, client email, amount (`text-input` with a fixed `$` prefix and `tnum` as the user types), due date, invoice PDF/upload (optional at this level). A persistent `amber-bg` notice band sits above the submit button: *"Self-attested — InvoiceFi doesn't yet verify this invoice against a third-party source. Stronger verification ships at Level 6."* This is copy-as-design-material: it turns a known MVP limitation into an honest, reviewer-visible disclosure rather than something buried in the README.

### 3.4 Invoice detail / fund flow
`card-invoice` expanded to full detail: funding progress bar, funder's wallet address in `mono-address`, a single "Fund this invoice" CTA for the one-investor Level 4 flow. On tap → `toast-tx-status` walks through sign → broadcast → confirm. On confirm, the Notice-of-Assignment panel appears inline (`ledger-teal-soft` background, checkmark icon): *"Client notified · Settlement instructions sent · Reference INV-0042."* — satisfying the plan's requirement that the demo show NoA triggering on funding.

### 3.5 Simulated repayment
A dashed-border card (visually distinct from real on-chain cards to avoid ever implying this is a real payment): "Simulate repayment" button, confirmation modal explicitly labeled *"Simulated — Level 4 MVP, no real funds move."* Invoice status flips to `Repaid` (success green) on confirm.

### 3.6 States & responsiveness
- Loading: skeleton cards (hairline-bordered gray blocks, no spinner-only screens).
- Error: `danger-bg` inline banners with the specific wallet's name in the copy ("Freighter rejected the transaction"), never a generic "Something went wrong."
- Mobile: single-column, wallet sheet becomes a full-height bottom sheet, invoice cards stack, nav collapses to a bottom tab bar (Home / Create / Wallet) rather than a hamburger — invoice apps are used one-handed, on the move.

### 3.7 Analytics + feedback surfaces
A lightweight `/internal` or footer-linked stats strip (wallet connects, invoices created, funding events) styled as a `card-dashboard-mockup` triplet — three number tiles in `money-md` tnum, `ink-mute` labels. Feedback form uses the same `text-input`/`button-primary-pill` tokens as the rest of the app, not an embedded third-party iframe, so it doesn't visually break the brand in the demo video.

---

## 4. Level 5 — User Growth + Iteration + Pitch

**Design goal:** the product now has to hold *many* invoices and *many* investors on screen at once without feeling noisier — this is where the disciplined single-indigo-CTA rule from the inspiration earns its keep.

### 4.1 Marketplace (satisfies: browse/search/filter, real transaction activity)
Grid of `card-invoice` (3-up desktop / 1-up mobile), filter bar above using `pill-tag-soft` toggles (Status, APR range, Due date) — filters are teal-tinted when active-and-settled-related, indigo when active-and-action-related, keeping the color logic consistent with §1. Search input uses `text-input` with a leading search icon, no separate visual language invented for it.

### 4.2 Partial investment (satisfies: partial investment support)
Invoice detail's single "Fund" CTA becomes an amount stepper: `text-input` with `tnum`, a live-updating progress bar, and a stacked-avatar row beneath it showing other funders (small circular mono-address chips) — this is the visual proof, inside the product itself, that multiple investors can back one invoice, which is exactly what the demo video needs to show.

### 4.3 Investor portfolio + yield calculator (satisfies: portfolio dashboard, yield calculator)
Dark dashboard track, `brand-dark-900` background — this is the one screen in the whole product that flips polarity, deliberately borrowed from the inspiration's "dashboard track flips dark" rule, because it signals "this is your control panel," distinct from the light marketplace. Three `money-lg` tiles (Total invested / Expected yield / Active positions) in `on-primary` text with `primary-soft` accent underlines. Below: a simple yield calculator — slider + tnum output, no chart library needed at this level, just a big recalculating number, matching the inspiration's "big number is the hero" instinct.

### 4.4 Guided first-time flow (satisfies: feature shipped because of Level 4 feedback)
A 3-step overlay (`card-feature-light` panels in a carousel, dots not numbers — this isn't a fixed sequence, it's a skippable tour) triggered once per new wallet. Each step pairs one line of plain-language copy with a highlighted ring around the real UI element it refers to, not a separate illustration — cheaper to build and more honest about what changed.

### 4.5 Pitch deck (satisfies: pitch deck requirement)
Deck inherits the exact token set: `canvas-cream` card for the "problem" slide (the one warm interlude, per the inspiration's rhythm-breaking rule), Settlement Mesh on the title and closing slides only, `display-lg` slide titles at weight 300, body content in `body-lg`. Architecture diagram slide uses `ink-secondary` line art on `canvas-soft`, teal for on-chain components, indigo for user-facing components — the same two-color semantic split used throughout the product, so the deck visually confirms the product rather than looking like a separate Canva file.

### 4.6 README "User Data" + improvement-log sections
Not a UI screen, but worth specifying: table headers and any embedded screenshots in the README should crop to show the `badge-network` and status pills clearly — reviewers are visually scanning for these, and a cropped screenshot that cuts them off undercuts an otherwise-complete submission.

---

## 5. Level 6 — Mainnet + Security + Real Adoption

**Design goal:** the interface has to *feel* different the moment real money is at stake, without a full redesign. This level is almost entirely expressed through the network-state system and new trust signals, layered onto the existing components.

### 5.1 Mainnet cutover (satisfies: mainnet contracts, testnet still referenceable)
`badge-network` switches to solid `mainnet-gold`. Additionally, on first mainnet session, a one-time `danger-bg`-adjacent (but amber, not red — this is a caution, not an error) modal: *"You're now on Stellar Mainnet. Transactions use real XLM and settle real invoices."* A small persistent toggle in account settings lets a user flip back to a clearly-labeled testnet view for reference, per the plan's requirement to keep testnet live.

### 5.2 Fractional ownership (extends §4.2)
The funder-avatar row from Level 5 gains a proportional stacked bar beneath the invoice amount — think a thin horizontal bar chart, segments colored in alternating `primary` / `primary-soft` / `primary-bg-subdued-hover` per funder, with a `ledger-teal` cap segment once fully funded. Tabular percentage labels per segment on hover/tap.

### 5.3 Reputation scores (new component: `badge-reputation`)
Small circular gauge, `rounded.pill` outer ring in teal-to-amber-to-danger depending on repayment history, with a `money-md`-styled number in the center (e.g. "94"). Appears next to any freelancer or investor name across the app — invoice cards, marketplace listings, profile pages. Tapping opens a simple history list (mono-address tx references, dates, outcome pills) rather than a chart, keeping this readable at a glance rather than analytically dense.

### 5.4 Stronger verification (extends §3.3)
The Level 4 amber self-attestation notice is replaced by a real step-based flow: `step-card` pattern (numbered, because this genuinely is a sequence a user must complete) — "1. Client email sent → 2. Awaiting confirmation → 3. Verified" — each step a horizontal row with a status pill from the same vocabulary as invoice status. A duplicate-invoice fraud flag renders as a `danger-bg` inline banner directly on the create-invoice form, pattern-matched at the "amount + client + due date" level, shown before submission, not after.

### 5.5 SEP-24 anchor flow (satisfies: chosen advanced feature)
A dedicated "Withdraw to bank" screen, deliberately styled *closer to a traditional fintech withdrawal form* than the rest of the crypto-native product — larger `text-input` fields, a bank/anchor logo strip, `body-lg` reassurance copy ("Funds typically arrive in 1–3 business days"). This is an intentional register shift: the freelancer using this screen may never have touched a wallet before SEP-24 existed, and the design should meet them there rather than force crypto-dashboard conventions on an off-ramp.

### 5.6 Security review + launch post
Security badge: a small `ledger-teal` shield icon + "Reviewed by RiseIn mentors, Aug 2026" caption, placed in the footer and on the mainnet-cutover modal — quiet, not a marketing hero, because over-designing a security claim reads as compensating for something. Twitter/X launch card template: Settlement Mesh crop at 1200×675, `display-lg` headline, mainnet contract address in `mono-address` at the bottom — built once as a reusable OG-image component so every future "product update post" in Level 7 can reuse the same frame.

---

## 6. Level 7 — Founder Belt: Growth + Retention + Monthly Report

**Design goal:** the product now needs to *report on itself* continuously. This level adds one major new surface (the growth dashboard) and two extensions to existing flows — it does not introduce new visual language, on purpose, since consistency across months is itself a growth-ops signal.

### 6.1 Secondary marketplace (extends §4.1)
Same `card-invoice` grid, with a new `pill-tag-soft` filter specifically for "Tradeable" positions, and a `money-md` "Current market price" line added beneath the original funding amount — deliberately visually subordinate to the original invoice amount, since the face value is still the trust anchor and the trade price is secondary information.

### 6.2 Multi-currency (USD + INR)
A currency toggle pill pair (`USD | INR`) pinned top-right of any amount-bearing screen, not a full settings page — switching should feel as immediate as switching a stock ticker's currency. All `tnum` amounts re-render in place; no page reload, no layout shift (reserve fixed-width numeric columns so INR's typically-longer digit strings don't reflow cards).

### 6.3 Automated Notice of Assignment (extends §3.4)
The Level 4 inline teal panel becomes a generated-document preview: a mini `card-dashboard-mockup`-style document thumbnail (letterhead-style, `canvas` bg, `hairline` border, small enough to read as "a real PDF exists" without rendering full legal text in the UI) with a "Download NoA" button. This is the one place a document-like visual object appears in an otherwise all-digital product, and it should look deliberately more formal — serif-adjacent numerals are still `tnum` Inter, but set larger and centered, evoking a letter rather than a dashboard.

### 6.4 Monthly growth report (new surface, dark dashboard track)
Full-width dark (`brand-dark-900`) report screen, reusing the Level 5 portfolio-dashboard polarity flip. Layout: a top row of four `money-lg` tiles (New users / Volume / Repayment success rate / Retention), then a simple month-over-month bar row per metric — flat-colored bars in `primary-soft`, no 3D, no unnecessary gridlines, matching the inspiration's restraint principle. A `feedback-themes` panel below renders recurring user quotes as short paraphrased tags (`pill-tag-soft`), not a raw comment feed — keeps the report scannable in the time a reviewer will actually spend on it.

### 6.5 Social growth + product update posts
Same OG-image template from §5.6, parameterized: headline slot, optional metric callout slot (`money-md`), always closing on the `badge-network` mainnet-gold mark so every public post reinforces "this is live, real money, ongoing" — the cumulative brand signal RiseIn is grading for by this level.

---

## 7. Do's and Don'ts (carried and extended from the inspiration)

### Do
- Keep indigo reserved for actions the user takes; keep teal reserved for states the chain has confirmed. Never mix the two roles.
- Render every amount, count, percentage, and reputation score in `tnum`. This is the product's quiet financial-data signature at every level, exactly as in the inspiration — and it's also the fastest way for a reviewer to visually confirm "this team cares about the numbers."
- Show the `badge-network` state on every screenshot and every frame of every demo video from Level 4 onward. It is the cheapest, most reviewer-visible proof of "we did what the checklist asked."
- Test and screenshot the wallet-connect sheet with at least two providers at every level's demo, not just once at Level 4.
- Let the one amber/teal/gold semantic system carry all status meaning — don't invent a new color for a new state without checking §1 first.

### Don't
- Don't let the Settlement Mesh appear inside the product shell — mesh is a marketing-page-only device, exactly as the inspiration restricts its gradient to marketing surfaces. The app itself stays flat white/canvas-soft/dark-dashboard.
- Don't render simulated repayment (Level 4) and real repayment (Level 6+) with identical visual weight — the dashed-border distinction in §3.5 must stay until simulation is fully retired.
- Don't add a third brand accent beyond indigo and teal. Reputation gauges and status pills reuse amber/success/danger — that's the full semantic set.
- Don't let the multi-currency toggle (Level 7) reflow card layouts — fixed-width numeric columns only.
- Don't ship a new visual language for the Level 7 growth report — reuse the Level 5 dark-dashboard polarity flip so the product's history of screenshots reads as one continuous brand, not four different hackathon submissions stapled together.

---

## 8. Cross-level component inventory (build-once, reuse-everywhere)

| Component | First appears | Reused at |
|---|---|---|
| `card-invoice` | L4 | L5, L6, L7 (extended, never replaced) |
| `badge-network` | L4 | L5, L6 (state change), L7 |
| `toast-tx-status` | L4 | L5, L6, L7 |
| `button-wallet` | L4 | all levels |
| `card-dashboard-mockup` (dark track) | L5 portfolio | L7 growth report |
| `pill-tag-soft` filters | L5 marketplace | L7 secondary marketplace |
| `badge-reputation` | L6 | L7 |
| OG-image template | L6 launch post | L7 product update posts |

This inventory is the actual deliverable a reviewer benefits from: by Level 7, InvoiceFi should look like one product that grew up, not four separate submissions — and that continuity is itself part of what "15/20/30 meaningful commits" and "README improvement links" are meant to prove.
