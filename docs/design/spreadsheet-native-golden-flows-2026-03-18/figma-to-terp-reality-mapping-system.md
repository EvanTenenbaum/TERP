# Figma To TERP Reality Mapping System

Date: `2026-03-18`

## Purpose

This document defines the systematic method for translating the spreadsheet-native Figma pack into TERP-ready product requirements.

The governing rule is simple:

- Figma is the authority for layout direction, visual principles, hierarchy, and interaction tone.
- The live TERP product, codebase, routes, contracts, and terminology rules are the authority for functional truth.

The job is not to force TERP to match the mockups literally.
The job is to preserve the design intent from Figma while making each module map to the actual ownership, workflow, and guardrail reality of the current system.

## Core Principle

When Figma and current TERP reality disagree, resolve the conflict in this order:

1. Preserve business truth and workflow ownership.
2. Preserve functional coverage and no-regression behavior.
3. Preserve the Figma design principle and composition intent.
4. Change the literal layout details only as much as needed to satisfy 1-3.

That means:

- keep the general design strictly from the Figma files
- do not import accidental omissions from the mockups as product cuts
- do not let current UI chrome or legacy layout override the new spreadsheet-native direction if the underlying workflow can already support the new form

## Non-Negotiable Guardrails

Every artboard translation must pass these no-loss rules before it can be called ready:

- no hidden loss of seeded entry modes such as route seeds, deep links, `fromSalesSheet=true`, `draftId`, or `sessionStorage["salesSheetToQuote"]`
- no hidden loss of draft lifecycle behavior such as save, restore, autosave, or quote-versus-sales-order branching
- no hidden loss of trust-critical commit boundaries such as `inventory.intake`, draft finalization, payment creation, PO receiving, or return/refund completion
- no silent absorption of adjacent-owned work such as accounting, fulfillment, refund, or output/export actions into the wrong sheet
- no implementation handoff without an explicit terminology reconciliation pass against [TERMINOLOGY_BIBLE.md](/Users/evan/spec-erp-docker/TERP/TERP/docs/terminology/TERMINOLOGY_BIBLE.md)

## Reality Status Buckets

Each artboard gets a pack-audit status before module-level decisions are written:

- `Aligned` - the artboard already fits the real TERP owner and only needs normal implementation binding
- `Adapt` - the design principle is correct, but copy, handoff shape, or route/contract wiring must change
- `Under-modeled` - the artboard represents the right module but omits meaningful lifecycle, output, or seam reality
- `Missing` - TERP has a real system area but the pack does not yet provide a meaningful artboard for it

These status buckets are not a substitute for `Adopt / Adapt / Preserve / Defer / Reject`.
They answer a different question: how complete and trustworthy the artboard is as a representation of TERP reality.

## Mapping Doctrine

Each artboard must be translated through seven lenses.

### 1. Surface Truth

Identify the real TERP surface that owns the workflow today.

Questions:

- What route owns this module now?
- Is it a standalone page, workspace tab, work-surface, pilot surface, or embedded page?
- Is the Figma artboard representing the main owner, an adjacent support surface, or a cross-sheet handoff?

Examples from current TERP:

- Sales workspace routes and tabs are owned by [SalesWorkspacePage.tsx](/Users/evan/spec-erp-docker/TERP/TERP/client/src/pages/SalesWorkspacePage.tsx)
- Operations workspace tabs are owned by [InventoryWorkspacePage.tsx](/Users/evan/spec-erp-docker/TERP/TERP/client/src/pages/InventoryWorkspacePage.tsx)
- Accounting workspace tabs are owned by [AccountingWorkspacePage.tsx](/Users/evan/spec-erp-docker/TERP/TERP/client/src/pages/AccountingWorkspacePage.tsx)
- Client Ledger is still a standalone route surfaced through [ClientLedgerWorkSurface.tsx](/Users/evan/spec-erp-docker/TERP/TERP/client/src/components/work-surface/ClientLedgerWorkSurface.tsx)

### 2. Capability Truth

Identify what the module must actually do today.

Questions:

- What tRPC procedures already power the current flow?
- What states are real versus merely implied by design?
- What seeded entry modes or handoff paths already exist and must survive?

Examples:

- Sales Sheets uses `getInventory`, `saveDraft`, `getDraftById`, `getById`, `getHistory`, `generateShareLink`, `convertToOrder`, `saveView`, `getViews`, and `setDefaultView` in [salesSheets.ts](/Users/evan/spec-erp-docker/TERP/TERP/server/routers/salesSheets.ts)
- Sales Order creation preserves route seeding and sales-sheet import through [OrderCreatorPage.tsx](/Users/evan/spec-erp-docker/TERP/TERP/client/src/pages/OrderCreatorPage.tsx)
- Invoice-to-payment flow now uses `trpc.accounting.payments.create` in [InvoiceToPaymentFlow.tsx](/Users/evan/spec-erp-docker/TERP/TERP/client/src/components/work-surface/golden-flows/InvoiceToPaymentFlow.tsx)
- Direct intake still commits through `inventory.intake` from [inventory.ts](/Users/evan/spec-erp-docker/TERP/TERP/server/routers/inventory.ts)

### 3. Ownership Seams

Decide what belongs inside the sheet and what must remain adjacent.

Questions:

- Which actions are owned directly in this module's sheet?
- Which actions should stay as explicit handoffs to another surface?
- What must remain visible as adjacent context rather than absorbed into the main table?

Rules:

- dominant-table work stays in the sheet
- trust-critical transitions stay explicit
- adjacent-owned execution remains visible but not silently absorbed
- inspectors support the main flow but do not become the main flow

### 4. Terminology And Policy Truth

Map the Figma labels to TERP's terminology rules before implementation starts.

Current TERP policy constraints from [TERMINOLOGY_BIBLE.md](/Users/evan/spec-erp-docker/TERP/TERP/docs/terminology/TERMINOLOGY_BIBLE.md):

- use `Intake`, not `Receiving`, for the product term
- use `Sales Order`, not `Sale`, for the document term
- use `Fulfillment` as the lifecycle term; `Shipping` is only the ship step, not the whole lifecycle
- distinguish `Purchase Order` from `PO Receiving` / `Intake`

Implication:

- Figma may keep directional labels like `Shipping` or `Receiving` for internal draft shorthand
- the product-mapped requirement set must rewrite those into TERP-approved language before implementation work starts

### 5. No-Loss Guardrail Check

Run an explicit no-loss check before writing mapping decisions.

Questions:

- What seeded entry modes already exist and must still land users in the right place?
- What draft save / restore behaviors are trust-critical?
- Where does the real system require an explicit commit instead of a silent inline change?
- What adjacent-owned outputs or follow-up actions are real, even if the artboard does not show them?

Examples:

- `OrderCreatorPage.tsx` preserves `fromSalesSheet=true`, `salesSheetToQuote`, and draft creation / update / finalize boundaries in [OrderCreatorPage.tsx](/Users/evan/spec-erp-docker/TERP/TERP/client/src/pages/OrderCreatorPage.tsx)
- `SalesSheetPreview.tsx` preserves dirty-state save gating, share links, conversion, and live-shopping launch in [SalesSheetPreview.tsx](/Users/evan/spec-erp-docker/TERP/TERP/client/src/components/sales/SalesSheetPreview.tsx)
- trust-critical payment creation now centers on `trpc.accounting.payments.create` in [InvoiceToPaymentFlow.tsx](/Users/evan/spec-erp-docker/TERP/TERP/client/src/components/work-surface/golden-flows/InvoiceToPaymentFlow.tsx)

### 6. Missing Area Discovery Pass

Do not stop at what the artboard shows.
Interrogate the owning workbook, adjacent tabs, routers, and reference docs for real TERP areas that the pack does not yet identify.

Questions:

- What real workspace tabs or standalone routes exist beside this artboard's owner?
- What deeper lifecycle branches, outputs, or support widgets exist in TERP but are not modeled here?
- What adjacent surfaces would disappear from implementation planning if the team only looked at the SVG?

Common missing-area categories:

- sibling workspace tabs such as Quotes or Live Shopping
- deeper lifecycle branches such as returns, refunds, vendor returns, or staged restock actions
- direct versus linked intake branches
- document-output contracts such as PDF, print, share, export, or manifest generation
- pack-wide terminology drift that would confuse implementation if not corrected up front

### 7. Proof Of Preservation

For every module, produce an explicit preservation ledger.

Each module must answer:

- What from Figma is being adopted directly?
- What is being adapted because of TERP route / contract / terminology reality?
- What is being preserved from current TERP that the artboard does not show explicitly?
- What is deferred because the current system does not yet own it?
- What is rejected because it would violate guardrails or erase functionality?

## The Required Mapping Packet Per Module

Every module should be turned into the same packet before design implementation or engineering work begins.

### A. Module Snapshot

- module name
- current owner route
- current owner page / surface
- spreadsheet-native target route
- golden flow anchor

### B. Figma Intent Summary

- dominant table shape
- support regions
- interaction model
- visual hierarchy and tone
- what the Figma is trying to optimize for

### C. TERP Reality Summary

- actual workflow states
- actual contracts / procedures
- current handoffs
- route / embedding constraints
- terminology constraints

### D. Reality Status

Assign one status bucket before the mapping decision is written:

- `Aligned`
- `Adapt`
- `Under-modeled`
- `Missing`

### E. Mapping Decision

Use these exact buckets:

- `Adopt` - design can carry over directly
- `Adapt` - keep the design principle but change the literal implementation shape
- `Preserve` - current TERP capability not explicit in Figma but must remain
- `Defer` - design suggests something that current TERP does not yet own
- `Reject` - cannot be adopted because it breaks system truth or guardrails

### F. Acceptance Gate

A module is not ready until all seven questions are answered:

1. Does the mapped module still honor the live TERP route and ownership seam?
2. Does it preserve all current no-regression functionality?
3. Does it preserve the Figma design principle, not just the current UI?
4. Does it respect TERP terminology and workflow policies?
5. Does it preserve seeded entry, draft lifecycle, and trust-critical commit boundaries?
6. Does it clearly separate sheet-owned actions from adjacent-owned actions?
7. Does it explicitly call out meaningful TERP areas the artboard does not yet identify?

## The Systematic Workflow

### Step 1. Decode The Artboard

For each Figma artboard, identify:

- dominant table
- support cards / strips
- inspector role
- primary workflow action
- explicit cross-sheet CTA
- visual signals that imply save, stage, commit, or risk

### Step 2. Build The Current-State Oracle

Cross-check each artboard against:

- current route owner
- current page / work-surface owner
- current router contracts
- current terminology rules
- current user-guide behavior if it still matches the code

### Step 3. Reconcile Terminology First

Before deciding the implementation shape, write down every term that must change.

Minimum checks:

- `Receiving` -> `Intake` when the product term is intake
- `Sale` -> `Sales Order` when the document is an order
- `Shipping` -> `Fulfillment` when the artboard refers to the wider lifecycle

Do not let draft Figma shorthand leak into implementation briefs without this rewrite.

### Step 4. Run The No-Loss Guardrail Check

Assume the artboard is missing important behavior unless proven otherwise.

Check for:

- hidden draft states
- seed / import paths
- quote vs sales-order branching
- explicit commit boundaries
- audit / status persistence after action
- handoffs to other modules
- permissions / adjustment gates
- output / print / export / share behavior

### Step 5. Run The Missing Area Discovery Pass

Interrogate the owning workbook and its adjacent routes.

Look for:

- sibling tabs that the pack does not represent
- deeper lifecycle branches in the code or reference docs
- support widgets, allocation systems, or expiring-state alerts
- reporting, printing, PDF, manifest, share-link, or export seams
- terminology drift spread across multiple artboards

### Step 6. Assign The Reality Status And Write The Mapping Ledger

Every artboard gets:

- one reality status bucket: `Aligned`, `Adapt`, `Under-modeled`, or `Missing`
- one mapping ledger using `Adopt`, `Adapt`, `Preserve`, `Defer`, and `Reject`

Example pattern:

- Figma wants a side-by-side review workspace.
- TERP already supports the core data and route shape.
- Therefore we mark the artboard `Adapt`, adopt the split layout, adapt the labels, preserve seeded entry paths, and keep adjacent accounting or fulfillment actions explicit.

### Step 7. Convert To Implementation Briefs

Once the mapping is stable, convert each module into implementation-ready work using the same sections:

- layout spec
- interaction spec
- route / state spec
- contract spec
- copy / terminology spec
- preservation checklist
- missing-area follow-up checklist
- QA proof checklist

## Launch Strategy

The cleanest launch order is not by workspace tab count. It is by seam risk.

### Wave 1. High-Risk Seam Modules

These modules have the most trust, routing, or ownership sensitivity:

- Sales Order document
- Sales Sheets
- Payments
- Client Ledger
- Returns

Why first:

- they carry route seeding, commit boundaries, cross-sheet adjacency, or standalone-route exceptions
- if these are mapped badly, the rest of the pack will drift

### Wave 2. Operations Flow Modules

- Intake
- Purchase Orders
- Fulfillment / Pick & Pack

Why second:

- these depend heavily on terminology accuracy and handoff boundaries
- they are easier once Wave 1 defines the ownership grammar and visible-adjacency rules

### Wave 3. Extended Registry Modules

- Invoices
- Samples

Why third:

- these are easier to align once the trust, handoff, and support-card grammar is already stable

## Non-Negotiable Design Translation Rules

- Do not let Figma remove hidden current-state capabilities just because the artboard is cleaner.
- Do not let current UI limitations block the new spreadsheet-native direction if the real contract already supports it.
- Do not move adjacent-owned work into a sheet merely because the Figma makes it look elegant.
- Do not preserve legacy naming if it violates TERP terminology policy.
- Do not treat support cards, summary strips, or inspectors as ornamental; each must justify a real workflow role.

## Success Condition

This mapping system succeeds when a product lead or engineer can take any spreadsheet-native Figma artboard and answer, with evidence:

- what is pure design direction
- what is real TERP functionality
- what must be preserved even if the artboard does not show it
- what must be renamed or re-scoped to fit TERP truth
- what can ship now versus what belongs in a later expansion
