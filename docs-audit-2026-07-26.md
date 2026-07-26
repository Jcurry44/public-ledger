# DECISION MEMO — Public Ledger, the Demo, and "Nicastro Automation"
Prepared 2026-07-26. Every number below was independently verified against the live site, the repo, and the raw data.

---

## 1. VERDICT: Do not form "Nicastro Automation."

**Go all-in on the CHANNEL, not the name — and not all-in on consulting yet.** The channel's entire value is the father-in-law's willingness to say "call Joe," which he can grant with no entity. A shared name buys zero additional conversion while adding brand equity you can never own, two-way liability contagion (a dashboard bug becomes his firm's E&O problem), CPA firm-name/referral-fee compliance strings, and family trigger events — the underlying contract is your marriage. "Automation" is also the wrong word: 2026 is drowning in interchangeable AI-automation shops, and your provable differentiation is the opposite claim — verification ($0.00 variance, 36/36).

**The structure to propose, in phases:**
- **Now:** Curry Studio stays the entity. One-page written referral/pilot agreement: he introduces 2–3 clients at real prices, written no-fault unwind, scope line ("software built and operated by Curry Studio; accounting judgments remain your accountant's"). You carry your own E&O before client one.
- **After 2–3 paid pilots RENEW:** upgrade to white-label ("a Nicastro client service, built by Curry Studio" — with a contractual right to named case studies) or a 10–20% disclosed revenue share. Note: AICPA/NYS rules require written client disclosure of referral fees and prohibit them for attest clients — verify his licensure and attest book first; he may prefer no-fee reciprocity once he reads the disclosure requirement.
- **Only with proven recurring revenue AND operational contribution from him** (selling, first-line support, QA — not just intros): joint entity under a NEUTRAL name, you majority, IP owned by Curry Studio and licensed in, buy-sell with death/disability/divorce/retirement/exit triggers and a valuation formula, referral economics in a separate agreement so the channel survives the entity.

**Money:** $500–1,500 setup + $150–250/mo per client company to the firm; the firm resells inside the documented $300–800/mo CAS advisory band (a visible 2–3x margin for him). Ten clients = $1,500–2,500/mo to you — clears the $1k/mo ladder rung on one channel. It does NOT replace $160k: optimistic year-one ceiling is ~$98k. Quit gate: ~$8–10k/mo sustained ~3 months with some revenue from OUTSIDE the Nicastro channel.

**Non-negotiable pre-gate:** file the bank outside-business-activity disclosure THIS WEEK, covering Curry Studio and the already-delivered 7 Construction work, and read the invention-assignment clause. Your day job and this product are both exception-based reconciliation dashboards — that is a real conflict question, not paperwork. Public Ledger's clean-room public-records provenance is your best exhibit. Unwinding a family entity after a bank "no" is far messier than never forming it.

**The conversation, in strict order:** (1) demo; (2) pressure-test — "which three of your clients would pay for this, what would they pay, what would embarrass you if it broke?"; (3) ask for 2–3 priced pilot introductions with the written no-fault unwind; (4) economics only after pilots convert and renew; (5) shared brand last, and only if he contributes operations. Discover his motive first — if his real driver is payroll-client stickiness rather than revenue, he'll prefer white-label. The name never enters the room on day one.

**The bank line, locked:** "The same discipline I use building reconciliation dashboards at a major bank — every number ties to the source, and the build fails if it doesn't." Then point at the live 36/36 page as the receipt. Never imply endorsement, bank-grade controls, or employer code.

---

## 2. AUDIT RESULTS

### Genuinely strong (all independently verified)
- **Every headline number recomputes exactly:** 8,532 rows = $28,072,606.45; 36/36 warrants tie to $0.00 against control totals printed on the documents (re-confirmed end-to-end against the live city PDF); capital = 20 projects / $11,477,413.53; OSC 2024 rev $63,519,207 / exp $66,023,474 exact from 6,872 flow rows; the 6 image scans contribute $0; the deployed page is byte-identical to the audited build, and no figure is hardcoded — page and data cannot drift.
- **The gate is real:** test_fidelity.py is build-blocking (EXACT-only tie-out, name round-trip, row count, list amount); build.py refuses to update index.html on any failure. Ran it green.
- **XSS posture clean** across all 32 innerHTML sinks; JSON inlining breakout-proof.
- **Fast:** 220KB gzipped over the wire, first paint ~304ms, zero console errors. The 853KB single-file fear is unfounded.
- **First-screen impact excellent** desktop and mobile; noindex is the correct mechanism for the courtesy-review period (and does not block link-preview scrapers).

### P0/P1 defects that survived verification — each with the fix
1. **[P0] No OG/Twitter tags — the texted link renders as a bare gray domain with no card.** The demo's real first screen is a text message, and it is broken. Fix in `src/index.template.html` head: og:title, og:description, og:url, og:image (absolute URL to a committed 1200×630 PNG — data URIs don't work), twitter:card=summary_large_image. Fully compatible with staying noindexed.
2. **[P1] False red reconciliation markers on 5 of 36 warrants** (14 fund rows) in the "How this was verified" drill-down — the section whose lede promises exact reconciliation. Cause: `build_site_data.py:112-113` compares year-prefixed fund SEGMENTS ('4-001', '5-001', 'X-605') against sums aggregated by bare 3-digit code. The segments sum correctly, so the reds are false. Fix: aggregate breakdown segments by bare code before comparing; all 14 reds and the duplicate "General Fund" rows disappear. **This is live and it sits inside the demo's centerpiece.**
3. **[P1] The NYS Comptroller source citation hard-404s, twice** (wwe1.osc.state.ny.us), on a page whose pitch is traceability. Swap both occurrences for the verified-live https://www.osc.ny.gov/local-government/data.
4. **[P1] No favicon of any kind** — default globe in the tab. Inline SVG data-URI favicon in the #1b3a5c accent + apple-touch-icon + theme-color.
5. **[P1] Repo About has no website link, topics, or license** — a stranger on github.com/Jcurry44/public-ledger can't reach the live site. Set homepage, add topics, pick a license (the license matters if this becomes the product template).
6. **[P1] P-card/VISA warrants are exempt from duplicate detection** — empty po_range short-circuits the identity check (`parse_warrants.py:268`); a republished VISA warrant (up to $108k) would silently double-count. Fix: fall back to (report_date, control_total, line_items) identity, or extend RE_RANGE to accept the `\d{2}-\d{5}` card format (the Range line exists in the extracts).
7. **[P1] build_osc.py fails silently on schema drift** (`if not found: continue`, zero asserts) — a third OSC schema era would shrink the 30-year chart with exit code 0. Related and worse: **test_fidelity.py passes vacuously on zero documents** — a fresh clone prints "ALL GATES PASS" on nothing. Fix: assert 1995–latest with no gaps and minimum rows per year; make the gate fail on 0 docs.
8. **[P2s worth knowing]** repo can't be independently run (PDFs gitignored, no fetch script — ship `tools/fetch_sources.py` so "run my gate yourself" is literally true); vendor clicks are substring searches with 14 name collisions (state.vendor is dead code); drill-down rows are keyboard-inaccessible DIVs; no h1; hero kicker text fails AA contrast; a city-labeled "pre issue" draft warrant ships as approved while the docstring falsely claims it's excluded.

---

## 3. THE WOW DEMO — 3 minutes, laptop, all numbers verified live

**Beat 0 (0:00–0:20) — Hero, no clicks.** "This is North Tonawanda's checkbook — every claim the council approved across 2025 and 2026, built from the city's own published PDFs. $28 million of approvals, 8,532 lines, 937 payees." Point at the green badge: "Every warrant prints its own control totals. I tie to THEIR figures, to the penny — 36 of 36, exactly. Nothing on this page is self-graded."

**Beat 1 (0:20–1:00) — WOW #1: the tie-out.** Click the badge → click "Warrant Report 6.16.26." Eight funds tick: General Fund $625,285.11 ✓, Water $29,861.97 ✓, Sewer $67,309.61 ✓ … then: **Published $895,846.01 · parsed $895,846.01.** "One warrant, eight funds, each ties. Zero variance, thirty-six for thirty-six. The six image-only scans are declared and excluded — not quietly dropped." Click "open source PDF" — the city's own document opens. *This is the grammar of his working papers; no vendor has ever shown him a tie-out.*

**Beat 2 (1:00–1:50) — WOW #2: the diseases he cures, found automatically.** Nav to The register, type AMAZON: tiles recalc to **729 lines · $163,051 · 79 charge accounts**, in 30 of 42 warrants; top departments FIRE PROTECTION $22,369, POLICE $21,212. "One supplier, seventy-nine GL accounts, thirty-six departments. Amazon is a line item in the fire department. Try answering 'what do we spend with Amazon' from a ledger coded like this." Then Findings → Vendor records tab: "HOME DEPOT CREDIT SERVICES — four vendor codes: HOMED005, 010, 015, 020. 255 line items, $65,097.94, and no view in their system adds it up. You've been fixing vendor masters like this your whole career." (Bonus if he leans in: ISLAND TECH under two codes, $85,256.14 — a renamed company that kept its old vendor code.)

**Beat 3 (1:50–2:30) — WOW #3: the Deerwood trace.** Clear, type GOLF: 410 lines, $473,807 to run Deerwood (Nuttall golf car leasing $115,481.64). Then type LIGHTSPEED: **click "Open line detail — 1 line"** (required — detail is collapsed by default), one line: $4,829.40, account 001-7250-0480 GOLF COURSE – OPERATIONS. Say: "That's Chronogolf — the tee-sheet software at Deerwood; Lightspeed owns it." (Chronogolf is off-page knowledge — say it, don't claim the page says it. And say "a $4,829.40 payment approved June 2026," never a per-year rate.) Click the source link "06/16/2026 p.12" — the city's PDF opens at page 12 with the line on it. "From a question to the source document in ten seconds."

**Beat 4 (2:30–3:00) — Limits, then the bridge.** Read one card aloud ("Approved, not necessarily paid"): "A ledger that won't tell you its limits is lying to you somewhere." Then turn from the screen:

> "Here's why I built this. This is a whole city — forty-two PDFs, eight and a half thousand lines — and every penny ties to control totals the city itself printed, and any line traces to the source page in one click. Your clients' books are smaller than this and messier than this. QuickBooks, the payroll register, the bank statement — same tie-out, three documents instead of forty-two. Now picture every payroll client getting a page like this for their own business: every vendor summarized, the Amazon sprawl and the duplicate vendor records found automatically, everything tied to the bank, and a section that says plainly what their books can't answer. That's what I want to build with you. You have the relationships and thirty years of trust; I build this. Pick one client. Give me their QuickBooks export and one bank statement, and in two weeks I'll show you their version of this page. If it doesn't make you react the way you just did to that golf software line — we stop there, no harm done."

Only if he engages: "That's the thing I'd want to do under a shared arrangement — your firm's name opens the doors, and I keep the books honest the way this page is honest." Still no entity, no "Nicastro Automation."

**SKIP entirely:** the compare panel (TRAP — the default 2023→2024 "surplus flipped to −$2.5M" headline hides $6.9M of debt proceeds counted as 2023 revenue; he'll spot it instantly. If it comes up, play it as "the page catches it — Proceeds of Debt, minus 99%"); the 30-year trend + schema-break note; capital project modals; every UI feature (theme toggle, mobile cards — vendor smell); all parsing tech (if asked how: "same as any tie-out — parse it, foot it, compare to the control figure the document prints"). Cut order if over time: GOLF search first, Beat 1 never.

**Ops:** laptop (mobile hides the variance column), pre-warm the 6.16.26 PDF (city server is slow cold), stay on the private link — "unlisted deliberately until the city's seen it" plays well with him.

---

## 4. TOP 10 MOVES (impact × effort)

**Before the demo (~one focused evening total):**
1. **Fix the false-red per-fund bug** (`build_site_data.py`: aggregate segments by bare 3-digit code), rebuild, redeploy — ~1h. Do not show the tie-out section to an accountant until this ships.
2. **OG/Twitter tags + committed 1200×630 og-card PNG + inline SVG favicon** — ~1h. The texted link IS the first screen.
3. **Swap the dead OSC citation** (2 occurrences) for osc.ny.gov/local-government/data — 10 min.
4. **"Try:" preset chips** under the register search (AMAZON / HOME DEPOT → opens the Vendor-records tab / GOLF / LIGHTSPEED) + auto-open line detail on single-line results — ~1.5h via the existing setSearch(). Makes the page self-demo when he re-opens it alone — the viewing that actually sells.
5. **Promote the money quote:** PUBLISHED $895,846.01 / PARSED $895,846.01 / VARIANCE $0.00 at full weight (now a 12.5px muted footnote) + the single-payee summary sentence ("AMAZON CAPITAL SERVICES — 729 approvals, $163,051, 79 accounts, 36 departments") — ~1.5h.
6. **File the bank OBA disclosure** (covering Curry Studio + 7 Construction) and **add the Business Health Dashboard as a named offering on jcurry44.github.io** — both are prerequisites to the pilot ask, not the demo itself.

**After the demo:**
7. **Harden the gates:** test_fidelity fails on 0 documents; close the P-card dedupe exemption; give build_osc.py year-span/row-count asserts.
8. **Repo credibility pass:** About homepage/topics/license + commit `tools/fetch_sources.py` (encode the Wayback-CDX recovery) so a comptroller or prospect can clone, fetch, and watch the gate pass.
9. **Run the bridge experiment before pricing anything:** fork the repo, swap parse_warrants.py for a QBO+payroll CSV mapper, and prove on ONE real client's exports that a non-circular control figure exists (bank statement ending balance, payroll register printed totals). 2–3 weekends; this IS the pilot demo.
10. **Comptroller-preview polish:** print-ready one-page tie-out statement (@media print) + accessibility pass (h1, role=button/tabindex on drill-down rows, darken --faint to pass AA).

---

## 5. THE TWO KILL RISKS

**Most likely to blow the demo: the false-red reconciliation bug.** The one guaranteed behavior of a veteran accountant shown a tie-out table is to expand a second row. Five of thirty-six are poisoned with false red "vs $X" markers — inside the section headlined "reconciles exactly." If he pokes 1.7 (004).25, the product refutes its own central claim in front of the one person on earth certain to notice, and hands him the polite-nod exit for free. One hour of code. Fix it before the link is ever texted. (Runner-up: leading with the −$2.5M shortfall — he'll see the $6.9M of debt proceeds in 2023 revenue immediately.)

**Most likely to blow the partnership: proposing the name before the evidence.** Floating "Nicastro Automation" in the first conversation converts a lean-forward moment into a family-business negotiation over an unbuilt product with zero customers — and locks your accruing track record inside a brand you lose in any falling-out, where the trigger events include your own marriage. The channel runs through exactly one relationship; one bad pilot (or a vacuous tie-out — QuickBooks exports don't print their own control totals the way warrants do, which is what move #9 de-risks) can close it permanently, with your wife as the permanent mediator. Sequence ruthlessly: demo, pressure-test, priced pilots with a written no-fault unwind, economics after renewal, name last or never — and file the OBA before any of it, because unwinding a family entity after a bank "no" is the worst version of every one of these risks at once.