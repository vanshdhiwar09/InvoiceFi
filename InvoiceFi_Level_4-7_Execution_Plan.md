# InvoiceFi — Level 4–7 Execution Plan
### Mapped directly to RiseIn's official level requirements

*(Companion to InvoiceFi_Idea_Submission.md — this doc focuses only on what must be built/collected/proven at each level to pass review, with zero gaps against the checklist.)*

---

## 🟢 Level 4 — Production-Ready MVP + Real Users

**What to build (product scope):**
- Multi-wallet support from day one via Stellar Wallet Kit (Freighter, Albedo, xBull minimum) — not single-provider, expand later
- Core flow only: Connect wallet → Create invoice → Tokenize invoice → Single investor funds it → Simulated repayment → Invoice closes
- Self-attested invoice verification (explicitly documented as an MVP-stage limitation)
- Mobile-responsive frontend with visible loading states and error handling (failed tx, wallet rejection, insufficient balance)
- Soroban contract deployed on **Stellar testnet**
- Basic Notice of Assignment mechanism: automated notification to client on invoice funding + settlement-account payment instructions with invoice-ID memo/reference for payment matching

**What to satisfy each requirement:**
| Requirement | How InvoiceFi satisfies it |
|---|---|
| 10+ real users onboarded | Recruit from student/freelancer/hackathon networks; each must connect a real wallet and complete at least one on-chain action (create or fund an invoice) |
| Proof of wallet interactions | Screenshot/export of 10+ distinct wallet addresses with tx hashes from testnet explorer |
| Basic feedback collection | Short in-app or Google Form (3–5 questions: ease of use, clarity, would-you-use-this, 1 open comment) |
| Monitoring/analytics | Integrate a lightweight analytics tool (e.g., Plausible, PostHog, or even Vercel Analytics) tracking wallet connects, invoices created, funding events |
| Production deployment | Deploy frontend on Vercel/Netlify; not localhost-only |
| 15+ meaningful commits | Enforce real commit hygiene from day 1 — one feature/fix per commit, no giant single-commit dumps |
| Documentation | README covering setup, architecture, contract address, known limitations (incl. verification caveat) |
|Proper loading states and error handling | Handle per-wallet signing behavior individually (popup vs. redirect vs. deep link) — each provider fails/rejects differently, so error states must be tested per wallet, not just Freighter|

**Submission checklist (don't skip any):**
- [ ] Public GitHub repo
- [ ] README with full documentation
- [ ] 15+ meaningful commits
- [ ] Live demo link (deployed frontend)
- [ ] Testnet contract deployment address
- [ ] Screenshots: product UI, mobile view, analytics dashboard
- [ ] Demo video (full walkthrough, not just a teaser)
- [ ] Proof of 10+ user wallet interactions
- [ ] User feedback summary (short write-up of form responses)
- [ ] Demo video shows wallet connection via at least 2 different providers
- [ ] Demo video/screenshot shows Notice of Assignment triggering on invoice funding (simulated/logged notification is fine for MVP — doesn't need a real email service)

---

## 🟡 Level 5 — User Growth + Iteration + Pitch

**What to build (product scope, additive to Level 4):**
- Public marketplace: browse/search/filter multiple invoices
- Partial investment support (more than one investor per invoice)
- Investor portfolio dashboard + basic yield calculator
- At least 1–2 features added **specifically because of Level 4 feedback** — pick real ones (e.g., if users said onboarding was confusing, ship a guided first-time flow)

**What to satisfy each requirement:**
| Requirement | How InvoiceFi satisfies it |
|---|---|
| 50+ testnet users | Expand recruitment beyond Level 4 circle — other student communities, Discord/Telegram Stellar groups, LinkedIn |
| Real transaction activity | Each user must create, fund, or invest in at least one invoice — not just connect a wallet |
| Google Form (wallet, email, name, feedback rating) | Build one form covering all 4 fields; keep it short so completion rate stays high |
| Excel export + linked in README | Export Form responses → Google Sheets/Excel → link in README under a clear "User Data" heading |
| README improvement section w/ commit links | For each planned improvement, link the exact commit(s) that implemented it — this is explicitly checked, don't skip |
| Pitch deck | Cover: problem, solution, market size (freelance economy + invoice financing gap), architecture diagram, growth strategy, roadmap |
| Full demo walkthrough video | Show real user flow: create → list → fund → repay, not just UI clicking |
| 20+ meaningful commits | Cumulative from Level 4 (should be well past 20 by now if committing properly) |

**Submission checklist:**
- [ ] Public GitHub repo (updated)
- [ ] 20+ meaningful commits total
- [ ] Live deployed application
- [ ] Pitch deck/PPT link
- [ ] Demo video link
- [ ] Proof of 50+ users (via Excel export)
- [ ] Screenshots: analytics/transaction activity
- [ ] Updated README + documentation
- [ ] User feedback iteration summary (what changed and why, with commit links)

---

## 🟠 Level 6 — Mainnet + Security + Real Adoption

**What to build (product scope, additive to Level 5):**
- Fractional ownership (multiple investors funding one invoice proportionally)
- On-chain reputation scores (freelancer + investor) derived from repayment history
- Stronger invoice verification (client email/document confirmation step; basic duplicate-invoice fraud flag)
- Deploy contracts to **Stellar mainnet**

**Advanced feature (pick one — recommended: Cross-Border Flows):**
> **SEP-24/SEP-31 Anchor Integration** is the clear choice for InvoiceFi — it's already core to the idea (real fiat in/out for invoice repayment), so this isn't bolted-on scope, it's the natural next step. Implement real SEP-24 deposit/withdrawal through a sandbox-to-mainnet-capable anchor for at least one flow (e.g., freelancer withdrawal).
*(Avoid picking a second advanced feature just to "do more" — one implemented well beats two implemented shallowly.)*

**What to satisfy each requirement:**
| Requirement | How InvoiceFi satisfies it |
|---|---|
| Mainnet contracts | Redeploy audited/reviewed contract version to mainnet; keep testnet version live too for reference |
| 20+ verified mainnet users | Real wallets performing real (small-value) mainnet transactions — budget for this, mainnet fees/funding aren't free |
| Real on-chain activity | At least one full invoice cycle (create → fund → repay) actually settled on mainnet, not simulated |
| Security audit OR reviewed by mentors | If a paid audit isn't feasible, get a structured security review from RiseIn mentors/team and get it explicitly signed off — don't assume an informal chat counts |
| Twitter/X launch post | Public launch thread: what InvoiceFi is, demo clip/GIF, mainnet contract link, tag @StellarOrg / Stellar ecosystem accounts |
| Ecosystem contribution | Pick one: write a short technical blog on the invoice-tokenization + escrow contract design (easiest, most reusable option) |
| 30+ meaningful commits | Cumulative; should reflect real feature growth, not commit-count padding |
| User onboarding form (repeat) | Same Google Form process as Level 5, but now capturing mainnet users |

**Submission checklist:**
- [ ] Public GitHub repo
- [ ] 30+ meaningful commits
- [ ] Live mainnet application
- [ ] Mainnet contract address(es)
- [ ] Proof of 20+ mainnet users
- [ ] Transaction activity proof (mainnet tx hashes)
- [ ] Audit/security review proof
- [ ] Twitter/X launch post link
- [ ] Demo video link
- [ ] Technical documentation + user guide
- [ ] Community contribution link (blog/tutorial/etc.)
- [ ] Advanced feature implemented (SEP-24/31 anchor flow)

---

## 🔴 Level 7 — Founder Belt: Growth + Retention + Monthly Report

**What to build (product scope, additive to Level 6):**
- Secondary marketplace (trade invoice tokens before maturity)
- Multi-currency support (at minimum USD + INR corridor, since that's your working example)
- Polished onboarding, retention-focused UX improvements based on Level 6 feedback
- Automated, legally-templated Notice of Assignment generation (upgrade from Level 4's manual/templated version)

**Note on framing:** Level 7 is evaluated monthly and is as much about **growth operations** as new features — treat it like running a small startup, not just shipping code.

**What to satisfy each requirement:**
| Requirement | How InvoiceFi satisfies it |
|---|---|
| 50+ *new* mainnet users | Must be net-new, not a recount of Level 6's 20 — needs an actual acquisition push (communities, social, referrals) |
| Mainnet transaction proof | Ongoing real invoice cycles, not a one-time demo batch |
| User feedback sheet (continued) | Keep the same Google Form → Excel pipeline running continuously, not just at submission time |
| Product improvement commit links | Every meaningful change tied back to specific user feedback, linked explicitly |
| Monthly growth report | Track and report: new users, transaction volume, repayment success rate, retention (returning users), feedback themes |
| Social media growth proof (50+ followers) | Start/maintain a project account (X/Twitter) from Level 6 onward — don't start this cold in Level 7, it takes weeks to build |
| Product update posts | Regular (weekly/biweekly) public updates — feature ships, user milestones, learnings |
| Community contribution proof | Continue from Level 6 — a second blog post, a workshop, or helping another builder counts |
| 30+ meaningful commits | Should already be well past this if iterating continuously |

**Submission checklist:**
- [ ] Public GitHub repo
- [ ] 30+ meaningful commits (this period)
- [ ] Live production application (Vercel or equivalent)
- [ ] Proof of 50+ new mainnet users
- [ ] Mainnet transaction proof
- [ ] User feedback sheet (updated)
- [ ] Product improvement commit links
- [ ] Monthly growth report
- [ ] Social media growth proof (50+ followers)
- [ ] Product update posts
- [ ] Community contribution proof
- [ ] Updated documentation
- [ ] Submitted before monthly deadline

---

## Cross-Level Traps to Avoid

- **Don't skip the Google Form → Excel → README link step at Level 5 and 6** — it's explicitly required both times, easy to forget the second time thinking "I already did this."
- **Don't reuse Level 6's 20 mainnet users as part of Level 7's 50** — Level 7 requires *new* users; keep separate records.
- **Start the Twitter/X account by Level 6, not Level 7** — the 50-follower requirement in Level 7 is much easier if you're not starting from zero.
- **Pick only one advanced feature at Level 6** (Cross-Border Flows / SEP-24-31) and implement it properly rather than attempting multiple shallowly.
- **Keep commit hygiene real throughout** — reviewers can tell the difference between 30 meaningful commits and 30 commits padded with trivial whitespace/README-only changes.
- **Don't test only against Freighter** — since multi-wallet is built in from Level 4, QA each supported wallet's connect/sign/reject flow individually before every level's demo video, not just the one you personally use.