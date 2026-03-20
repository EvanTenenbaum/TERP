# Gemini Deep QA Prompt

You are doing a deep QA review of a TERP spreadsheet-native design pack.

This is not a blank-slate redesign prompt. Review the pack against the actual TERP system truth contained in the attached context files and design assets.

## Your job

Review the revised spreadsheet-native golden-flow pack for:

- system-truth mismatches
- missing or under-modeled workflow logic
- hidden loss of trust-critical behavior
- terminology drift
- weak or confusing UX structure
- places where the design over-promises functionality TERP does not really own
- places where TERP already owns behavior but the design still hides it

## Inputs you should use

Use all attached files, but prioritize them in this order:

1. `context/GEMINI_CONTEXT_BRIEF.md`
2. `design-assets/png/`
3. `design-assets/svg/`
4. `design-assets/manifest.json`
5. `context/source-files/docs/design/spreadsheet-native-golden-flows-2026-03-18/figma-to-terp-pack-reality-audit.md`
6. `context/source-files/docs/design/spreadsheet-native-golden-flows-2026-03-18/figma-to-terp-pack-revision-brief.md`
7. the remaining files in `context/source-files/`
8. `context/evidence/FIGMA_IMPORT_EVIDENCE.md`

## Important product truths you must preserve

Do not recommend changes that erase or blur these realities:

- seeded entry into Sales Order from Sales Sheets
- quote mode versus Sales Order mode
- draft save, update, restore, and finalize behavior
- dirty-state gating for Sales Sheets share and convert actions
- the guided payment flow as the main payment story
- direct Intake versus PO Receiving branch clarity
- explicit receive, process, refund, pack, ready, and payment commit boundaries
- output contracts like share, print, PDF, export, manifest, and ledger export
- terminology policy: `Sales Order`, `Intake`, `Fulfillment`

If you think a better UX would require changing one of these truths, say so explicitly as a product-level proposal rather than silently treating it as a design tweak.

## Required output format

Produce your response in these sections.

### 1. Overall Assessment

Give a short but specific summary of:

- what is strongest in the pack
- what is still risky or confusing
- whether the revised pack feels implementation-safe or still likely to cause engineering drift

### 2. Severity-Ranked Findings

Create a flat table with one row per finding and these columns:

- Severity (`Critical`, `High`, `Medium`, `Low`)
- Artboard or pack area
- Finding type (`system-truth mismatch`, `lifecycle gap`, `terminology`, `layout`, `interaction`, `output visibility`, `missing area`, `overreach`, `under-modeling`)
- What is wrong
- Evidence used
- Recommended correction

Only include real findings. Do not pad the table.

### 3. Artboard-By-Artboard Review

For each of these 14 artboards, give a short review:

- `orders-queue.svg`
- `orders-document.svg`
- `sales-order-sheet.svg`
- `sales-sheet.svg`
- `inventory-sheet.svg`
- `receiving-sheet.svg`
- `purchase-orders-sheet.svg`
- `shipping-sheet.svg`
- `invoices-sheet.svg`
- `payments-sheet.svg`
- `client-ledger-sheet.svg`
- `returns-sheet.svg`
- `samples-sheet.svg`
- `shared-primitives.svg`

For each artboard, answer:

- what it gets right
- what is still under-modeled or risky
- whether the route or module ownership is clear
- what should be changed next, if anything

### 4. Pack-Wide Design-System And UX Review

Call out pack-wide patterns:

- consistency of spreadsheet-native grammar
- support-region usefulness
- hierarchy and scannability
- clarity of commit boundaries
- clarity of sibling-surface bridges
- consistency of terminology
- whether outputs and secondary actions are visible enough

### 5. Missing-Area Review

Assess whether the revised pack now handles these system areas well enough:

- Live Shopping
- Quotes
- Returns lifecycle plus refunds plus orders-workbook return actions
- Samples monthly allocation, expiry, and vendor-return depth
- Intake branch split
- reporting / printing / export / manifest / share outputs

For each area, say one of:

- `adequately represented`
- `still under-modeled`
- `still missing`

Then explain why.

### 6. Trust-Critical No-Loss Audit

Specifically audit whether the designs still protect:

- seeded entry
- quote mode
- draft lifecycle
- guided payment commit
- explicit receiving and fulfillment transitions
- refunds and return processing visibility

If any of these feel visually weakened, call that out clearly.

### 7. Prioritized Revision Plan

End with a practical next-step plan in three waves:

- Wave 1: highest-risk fixes
- Wave 2: lifecycle and missing-area fixes
- Wave 3: consistency and polish

Keep this actionable.

## Review standard

Be skeptical, but stay grounded.

- Do not give generic visual design advice with no TERP context.
- Do not praise the work without pointing to specific evidence.
- Do not recommend abstract enterprise-dashboard conventions if they conflict with the spreadsheet-native operating model.
- Do not assume an area is missing if the context files show it is intentionally a sibling surface or explicit non-goal.
- Do explicitly say when the design is strong and implementation-safe.

Your goal is to help this pack become a better implementation instrument, not just a prettier review artifact.
