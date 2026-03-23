# Spreadsheet-Native Remediation Execution Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all verified user-facing integrity risks, surfacing gaps, proof debt, and doc drift across the 13-module spreadsheet-native rollout program.

**Architecture:** 5-phase remediation: truth reconciliation (docs-only), then visible-user-risk code fixes, then pilot surfacing/toggle wiring, then adversarial proof, then roadmap rebuild. Each phase gates the next. Tasks within a phase are independent and can be parallelized with `isolation: worktree`.

**Tech Stack:** React 19, tRPC, Drizzle ORM (MySQL), Vitest, Tailwind 4, shadcn/ui

**Source of truth:** `docs/remediation/2026-03-22-spreadsheet-native-remediation-roadmap.md`

**Verification commands (run before every commit):**

```bash
pnpm check    # TypeScript — zero errors
pnpm lint     # ESLint
pnpm test     # Vitest unit tests
pnpm build    # Production build
```

---

## Tranche 0: Truth Reconciliation (docs only — no code changes)

**Gate in:** None — start here.
**Gate out:** Every doc claim verified against current code. All ledger/roadmap corrections committed. Matrix accurate.
**Parallelization:** All tasks independent — run all in parallel.

---

### Task 0.1: Update rollout roadmap README to reflect implementation reality

**Files:**

- Modify: `docs/roadmaps/spreadsheet-native-full-rollout/README.md`

- [ ] **Step 1: Read the current README and matrix from the remediation roadmap**

Read `docs/roadmaps/spreadsheet-native-full-rollout/README.md` (especially lines 40-60, 80-165).
Read `docs/remediation/2026-03-22-spreadsheet-native-remediation-roadmap.md` section 1 for verified state.

- [ ] **Step 2: Update the "Pack-Level Only" section**

The README lists 7 modules as "Pack-Level Only (NOT build-ready)" at line 50. In reality, all 7 have pilot surfaces built and 5 have QA verdicts. Update each row:

- Fulfillment: has pilot, SHIP verdict
- Invoices: has pilot, NO-SHIP verdict
- Payments: has pilot, NO-SHIP verdict
- Client Ledger: has pilot, SHIP verdict
- Returns: has pilot, CONDITIONAL SHIP verdict
- Samples: has pilot, no verdict
- Shared contracts: still pack-level only

- [ ] **Step 3: Update wave briefs status in the wave tables**

Update Wave 1 table (lines 84-89): Payments and Client Ledger now have pilots + verdicts.
Update Wave 2 table (lines 127-131): Fulfillment now has pilot + SHIP verdict.
Update Wave 3 table (lines 157-162): Invoices, Returns, Quotes, Samples all have pilots.

- [ ] **Step 4: Add implementation-reality note at top**

Add a note after the Status line: "Implementation outran wave gates. All 13 modules have pilot surfaces. See `docs/remediation/2026-03-22-spreadsheet-native-remediation-roadmap.md` for current verified state."

- [ ] **Step 5: Commit**

```bash
git add docs/roadmaps/spreadsheet-native-full-rollout/README.md
git commit -m "docs(roadmap): reconcile rollout README with implementation reality

All 13 modules have pilot surfaces built. 5 have QA verdicts. Wave gates
were not enforced — README now reflects actual repo state."
```

---

### Task 0.2: Update Payments and Client Ledger briefs

**Files:**

- Modify: `docs/roadmaps/spreadsheet-native-full-rollout/briefs/W1C-payments.md`
- Modify: `docs/roadmaps/spreadsheet-native-full-rollout/briefs/W1D-client-ledger.md`

- [ ] **Step 1: Read both briefs**

Both currently say "Pilot surface: DOES NOT EXIST" — this is false.

- [ ] **Step 2: Update W1C-payments.md**

Change line 12 from `Pilot surface: DOES NOT EXIST` to:
`Pilot surface: EXISTS — PaymentsPilotSurface.tsx. QA verdict: NO-SHIP (PAY-P1: cache namespace stale grids). See consolidated-verdict.md.`

- [ ] **Step 3: Update W1D-client-ledger.md**

Change line 13 from `Pilot surface: DOES NOT EXIST` to:
`Pilot surface: EXISTS — ClientLedgerPilotSurface.tsx. QA verdict: SHIP (2 P2, 1 P3). See consolidated-verdict.md.`

- [ ] **Step 4: Commit**

```bash
git add docs/roadmaps/spreadsheet-native-full-rollout/briefs/W1C-payments.md docs/roadmaps/spreadsheet-native-full-rollout/briefs/W1D-client-ledger.md
git commit -m "docs(briefs): update Payments and Client Ledger briefs — pilots exist"
```

---

### Task 0.3: Update quotes capability ledger

**Files:**

- Modify: `docs/specs/spreadsheet-native-ledgers/quotes-capability-ledger-summary.md`

- [ ] **Step 1: Read current ledger**

Read `docs/specs/spreadsheet-native-ledgers/quotes-capability-ledger-summary.md`, especially the Discrepancies section.

- [ ] **Step 2: Update DISC-QUO-003**

DISC-QUO-003 says "quotes.reject exists but no UI — staff cannot reject quotes." This is now partially resolved: `QuotesPilotSurface.tsx:746-756` implements the rejection mutation. Update status to: "Resolved in pilot (QuotesPilotSurface.tsx:746). Classic path still lacks rejection UI."

- [ ] **Step 3: Commit**

```bash
git add docs/specs/spreadsheet-native-ledgers/quotes-capability-ledger-summary.md
git commit -m "docs(ledger): update quotes DISC-QUO-003 — rejection UI exists in pilot"
```

---

### Task 0.4: Update samples capability ledger

**Files:**

- Modify: `docs/specs/spreadsheet-native-ledgers/samples-capability-ledger-summary.md`

- [ ] **Step 1: Read current ledger**

- [ ] **Step 2: Update DISC-SAM-001**

Currently says "samples.fulfillRequest implemented with FOR UPDATE lock but never wired in UI." Update to: "Partially resolved in pilot (SamplesPilotSurface.tsx:445 wires fulfillRequest). Classic SampleManagement.tsx still lacks this action. setExpirationDate (SAM-002) remains unwired in both surfaces."

- [ ] **Step 3: Commit**

```bash
git add docs/specs/spreadsheet-native-ledgers/samples-capability-ledger-summary.md
git commit -m "docs(ledger): update samples DISC-SAM-001 — fulfill wired in pilot only"
```

---

### Task 0.5: Update returns capability ledger

**Files:**

- Modify: `docs/specs/spreadsheet-native-ledgers/returns-capability-ledger-summary.md`

- [ ] **Step 1: Read ledger and verify pilot state**

Ledger says approve/reject/receive/process have "no UI" (RET-017 through RET-021). Verify: read `client/src/components/spreadsheet-native/ReturnsPilotSurface.tsx` around line 1008 to confirm pilot has these actions.

- [ ] **Step 2: Update RET-017 through RET-021 migration decisions**

Change from "Adopt — no UI" to "Adopt — pilot UI exists (ReturnsPilotSurface.tsx), classic ReturnsPage still lacks these actions."

- [ ] **Step 3: Commit**

```bash
git add docs/specs/spreadsheet-native-ledgers/returns-capability-ledger-summary.md
git commit -m "docs(ledger): update returns RET-017-021 — approval workflow exists in pilot"
```

---

### Task 0.6: Update invoices capability ledger

**Files:**

- Modify: `docs/specs/spreadsheet-native-ledgers/invoices-capability-ledger-summary.md`

- [ ] **Step 1: Read ledger and identify stale entries**

- [ ] **Step 2: Update entries where pilot has fixes not reflected in ledger**

Cross-reference with `InvoicesPilotSurface.tsx` to identify which documented gaps are now addressed in the pilot.

- [ ] **Step 3: Commit**

```bash
git add docs/specs/spreadsheet-native-ledgers/invoices-capability-ledger-summary.md
git commit -m "docs(ledger): update invoices ledger to reflect pilot state"
```

---

### Task 0.7: Update payments capability ledger

**Files:**

- Modify: `docs/specs/spreadsheet-native-ledgers/payments-capability-ledger-summary.md`

- [ ] **Step 1: Verify pilot has void UI**

Read `client/src/components/spreadsheet-native/PaymentsPilotSurface.tsx` around line 881. Confirm void action exists.

- [ ] **Step 2: Update DISC-PAY-005**

Currently says "payments void has no UI surface." Update to: "Resolved in pilot (PaymentsPilotSurface.tsx:881). Classic Payments page still routes void through a different path."

- [ ] **Step 3: Commit**

```bash
git add docs/specs/spreadsheet-native-ledgers/payments-capability-ledger-summary.md
git commit -m "docs(ledger): update payments DISC-PAY-005 — void UI exists in pilot"
```

---

### Task 0.8: Update fulfillment capability ledger

**Files:**

- Modify: `docs/specs/spreadsheet-native-ledgers/fulfillment-capability-ledger-summary.md`

- [ ] **Step 1: Verify DISC-FUL-006 is resolved**

Read `client/src/components/spreadsheet-native/FulfillmentPilotSurface.tsx` lines 607-610. Confirm `orders:update` is used for management permission.

- [ ] **Step 2: Update DISC-FUL-006 status**

Change from open/high to: "Resolved in pilot (FulfillmentPilotSurface.tsx:607). Pilot gates management with orders:update consistent with server."

- [ ] **Step 3: Commit**

```bash
git add docs/specs/spreadsheet-native-ledgers/fulfillment-capability-ledger-summary.md
git commit -m "docs(ledger): update fulfillment DISC-FUL-006 — permission mismatch resolved in pilot"
```

---

### Task 0.9: Cross-check adversarial review against remediation matrix

**Files:**

- Read: `docs/specs/spreadsheet-native-ledgers/pilot-ledgers-adversarial-review.md`
- Modify: `docs/remediation/2026-03-22-spreadsheet-native-remediation-roadmap.md` (if corrections needed)

- [ ] **Step 1: Read pilot-ledgers-adversarial-review.md fully**

This doc (especially around line 153) warns about summary classification drift. Check every warning against the remediation roadmap's matrix (section 1). Specifically look for: proof-state misclassifications, capability coverage overclaims, and missing discrepancy cross-references.

- [ ] **Step 2: For each warning, verify if the remediation matrix already captures it**

If it does, no action. If not, add the issue to the Crack Registry or update the matrix row.

- [ ] **Step 3: Commit any corrections**

```bash
git add docs/remediation/2026-03-22-spreadsheet-native-remediation-roadmap.md
git commit -m "docs(remediation): incorporate adversarial review cross-check"
```

---

### Task 0.10: Document shared contracts (CROSS-001 through CROSS-005) status

**Files:**

- Read: `docs/roadmaps/spreadsheet-native-full-rollout/README.md` (line 60 — defines CROSS-001 through CROSS-005)
- Read: `docs/specs/SPREADSHEET-NATIVE-INTERACTION-SOURCE-OF-TRUTH-CONTRACT.md`
- Modify: `docs/remediation/2026-03-22-spreadsheet-native-remediation-roadmap.md` (expand cross-cutting section)

- [ ] **Step 1: Read the shared contract definitions**

Read `docs/roadmaps/spreadsheet-native-full-rollout/README.md` line 60 area. The shared contracts are `CROSS-001` through `CROSS-005` — these are cross-module interaction contracts (e.g., shared selection model, clipboard, fill, edit policy, keyboard hints).

- [ ] **Step 2: For each CROSS-NNN, determine current state**

Check whether the contract is:

- Fully implemented in the shared runtime (PowersheetGrid, SpreadsheetPilotGrid, etc.)
- Partially implemented (some modules use it, others don't)
- Not started

- [ ] **Step 3: Add a concrete status row per contract to the remediation roadmap's cross-cutting section**

- [ ] **Step 4: Commit**

```bash
git add docs/remediation/2026-03-22-spreadsheet-native-remediation-roadmap.md
git commit -m "docs(remediation): document shared contracts CROSS-001 through CROSS-005 status"
```

---

## Tranche 1: Fix Visible-User Risks (CRITICAL + HIGH)

**Gate in:** Tranche 0 complete — all docs reconciled.
**Gate out:** All CRITICAL and HIGH risks fixed. `pnpm check && pnpm lint && pnpm test && pnpm build` green. Each fix has targeted test coverage.
**Parallelization:** All tasks independent — use `isolation: worktree` per task.

---

### Task 1.1: Invoices — server-side invoice numbering

**Risk:** R1 CRITICAL — client-side `INV-${Date.now()}` creates collision risk
**Files:**

- Modify: `server/routers/invoices.ts` (create mutation)
- Modify: `client/src/components/work-surface/InvoicesWorkSurface.tsx` (~line 1252)
- Create: `server/routers/__tests__/invoices-numbering.test.ts`

- [ ] **Step 1: Read the current create mutation server-side**

Read `server/routers/invoices.ts` and find the create/insert mutation. Understand how `invoiceNumber` is currently handled.

- [ ] **Step 2: Read the client-side invoice creation**

Read `client/src/components/work-surface/InvoicesWorkSurface.tsx` around line 1252. Confirm `INV-${Date.now()}` pattern.

- [ ] **Step 3: Write failing test for server-side numbering**

```typescript
// server/routers/__tests__/invoices-numbering.test.ts
import { describe, it, expect } from "vitest";

describe("invoice numbering", () => {
  it("should generate invoice number server-side when not provided", async () => {
    // Test that the create mutation generates a unique invoice number
    // when the client does not provide one
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `pnpm test -- invoices-numbering`
Expected: FAIL

- [ ] **Step 5: Implement server-side invoice number generation**

In the create mutation in `server/routers/invoices.ts`:

- Query for the max existing invoice number
- Generate the next sequential number (e.g., `INV-000001`)
- Use this instead of trusting client input

- [ ] **Step 6: Remove client-side generation**

In `InvoicesWorkSurface.tsx`, remove the `INV-${Date.now()}` pattern. Either omit the field (let server generate) or display "Auto-generated" placeholder.

- [ ] **Step 7: Run test to verify it passes**

Run: `pnpm test -- invoices-numbering`
Expected: PASS

- [ ] **Step 8: Run full verification**

Run: `pnpm check && pnpm lint && pnpm test && pnpm build`
Expected: All green

- [ ] **Step 9: Commit**

```bash
git add server/routers/invoices.ts client/src/components/work-surface/InvoicesWorkSurface.tsx server/routers/__tests__/invoices-numbering.test.ts
git commit -m "fix(invoices): server-side invoice numbering replaces client-side Date.now()

Removes INV-\${Date.now()} collision risk. Server generates sequential
invoice numbers in the create mutation."
```

---

### Task 1.2: Invoices — wire version param to existing server guard

**Risk:** R1 CRITICAL — void/mark-paid mutations don't pass `version` so server check never runs
**Files:**

- Modify: `client/src/components/work-surface/InvoicesWorkSurface.tsx` (~lines 712-745)
- Create: `client/src/components/work-surface/__tests__/InvoicesWorkSurface-version.test.tsx`

- [ ] **Step 1: Read the server-side version check**

Read `server/routers/invoices.ts` around line 480. Understand the existing version check logic.

- [ ] **Step 2: Read the client-side mutations**

Read `client/src/components/work-surface/InvoicesWorkSurface.tsx` lines 712-745 (markPaidMutation, voidMutation). Also check lines 777 and 839 for where version tracking already exists in the component.

- [ ] **Step 3: Write failing test**

Test that the void and mark-paid mutations include the `version` field from the selected invoice state.

- [ ] **Step 4: Run test to verify it fails**

Run: `pnpm test -- InvoicesWorkSurface-version`
Expected: FAIL

- [ ] **Step 5: Wire version into mutation calls**

In the `markPaidMutation` and `voidMutation` call sites, pass `version` from the currently-selected invoice's state. The component already tracks version — it just doesn't send it.

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm test -- InvoicesWorkSurface-version`
Expected: PASS

- [ ] **Step 7: Run full verification**

Run: `pnpm check && pnpm lint && pnpm test && pnpm build`

- [ ] **Step 8: Commit**

```bash
git add client/src/components/work-surface/InvoicesWorkSurface.tsx client/src/components/work-surface/__tests__/InvoicesWorkSurface-version.test.tsx
git commit -m "fix(invoices): wire version param to void/mark-paid mutations

Server version check at invoices.ts:480 already exists but never received
the version. Now passes version from selected invoice state."
```

---

### Task 1.3: Returns — fix double-credit risk

**Risk:** R2 CRITICAL — `returns.create` and `returns.process` both issue credit memos
**Files:**

- Modify: `server/routers/returns.ts` (create and process mutations)
- Create: `server/routers/__tests__/returns-credit-idempotency.test.ts`

- [ ] **Step 1: Audit both credit paths**

Read `server/routers/returns.ts`. Find `returns.create` and `returns.process` mutations. Map exactly where each issues a credit memo. Understand the intended flow.

- [ ] **Step 2: Implement idempotency guard (approach decided)**

**Use approach (b): idempotency guard.** Before issuing a credit memo in either `returns.create` or `returns.process`, query for an existing credit memo linked to this return ID. If one exists, skip creation. This is safest because:

- Approach (a) (remove from `returns.create`) could break existing returns already in-flight that expect credit at creation
- Approach (c) (flag) requires a schema migration and retroactive backfill
- The idempotency guard is additive, handles both paths, and is safe for existing data

- [ ] **Step 3: Write failing test for double-credit prevention**

```typescript
describe("returns credit idempotency", () => {
  it("should not issue duplicate credit memos for the same return", async () => {
    // Create a return (which issues credit)
    // Process the same return
    // Assert only one credit memo exists
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

- [ ] **Step 5: Implement the idempotency guard**

Before issuing a credit memo, check if one already exists for this return ID. If so, skip creation.

- [ ] **Step 6: Run test to verify it passes**

- [ ] **Step 7: Run full verification**

Run: `pnpm check && pnpm lint && pnpm test && pnpm build`

- [ ] **Step 8: Commit**

```bash
git add server/routers/returns.ts server/routers/__tests__/returns-credit-idempotency.test.ts
git commit -m "fix(returns): prevent double credit memo issuance (DISC-RET-001)

returns.create and returns.process both issued credit independently.
Added idempotency guard to check for existing credit before creating."
```

---

### Task 1.4: Returns — surface approval workflow in classic

**Risk:** R3 HIGH — 4 procedures (approve/reject/receive/process) have zero UI
**Files:**

- Modify: `client/src/pages/ReturnsPage.tsx`
- Reference: `client/src/components/spreadsheet-native/ReturnsPilotSurface.tsx` (~line 1008)
- Create: `client/src/pages/__tests__/ReturnsPage-approval.test.tsx`

- [ ] **Step 1: Read the pilot's approval implementation**

Read `ReturnsPilotSurface.tsx` around line 1008 to understand how approve/reject/receive/process are wired.

- [ ] **Step 2: Read the classic ReturnsPage**

Read `client/src/pages/ReturnsPage.tsx`. Understand the current UI structure and where actions could be added.

- [ ] **Step 3: Write failing tests for approval actions**

Test that approve, reject, receive, and process actions are available on the returns detail view.

- [ ] **Step 4: Implement approval actions in classic**

Port the approve/reject/receive/process action buttons from the pilot pattern into ReturnsPage. Each action should:

- Show a confirmation dialog
- Call the corresponding tRPC mutation
- Invalidate the returns query on success
- Show success/error toast

- [ ] **Step 5: Run tests**

- [ ] **Step 6: Run full verification**

Run: `pnpm check && pnpm lint && pnpm test && pnpm build`

- [ ] **Step 7: Commit**

```bash
git add client/src/pages/ReturnsPage.tsx client/src/pages/__tests__/ReturnsPage-approval.test.tsx
git commit -m "feat(returns): surface approve/reject/receive/process in classic UI

Ports approval workflow actions from ReturnsPilotSurface pattern.
Addresses DISC-RET-004 — 4 procedures previously had zero UI."
```

---

### Task 1.5: Quotes — migrate both surfaces to quotes router

**Risk:** R4 HIGH — both classic and pilot use `orders.getAll` with type filter
**Files:**

- Modify: `client/src/components/work-surface/QuotesWorkSurface.tsx` (~line 464)
- Modify: `client/src/components/spreadsheet-native/QuotesPilotSurface.tsx` (~line 591)
- Create: `client/src/components/work-surface/__tests__/QuotesWorkSurface-router.test.tsx`

- [ ] **Step 1: Read the quotes router**

Read `server/routers/quotes.ts` to understand what query endpoints exist. Look for a `list` or `getAll` equivalent.

- [ ] **Step 2: Read both client surfaces**

Read `QuotesWorkSurface.tsx:460-470` and `QuotesPilotSurface.tsx:588-595`. Both use `trpc.orders.getAll.useQuery({ orderType: "QUOTE" })`.

- [ ] **Step 3: Write failing test**

Test that QuotesWorkSurface uses `trpc.quotes.*` (not `trpc.orders.getAll`).

- [ ] **Step 4: Migrate classic surface**

In `QuotesWorkSurface.tsx`, replace `trpc.orders.getAll.useQuery({ orderType: "QUOTE" })` with the appropriate `trpc.quotes.*` query. Adjust response mapping if the shape differs.

- [ ] **Step 5: Migrate pilot surface**

In `QuotesPilotSurface.tsx`, make the same replacement.

- [ ] **Step 6: Run tests**

- [ ] **Step 7: Run full verification**

Run: `pnpm check && pnpm lint && pnpm test && pnpm build`

- [ ] **Step 8: Commit**

```bash
git add client/src/components/work-surface/QuotesWorkSurface.tsx client/src/components/spreadsheet-native/QuotesPilotSurface.tsx client/src/components/work-surface/__tests__/QuotesWorkSurface-router.test.tsx
git commit -m "fix(quotes): migrate both surfaces from orders.getAll to quotes router

Classic and pilot both queried orders.getAll with type filter instead of
using the quotes-owned router. Fixes DISC-QUO-001 data ownership violation."
```

---

### Task 1.6: Quotes — surface rejection in classic

**Risk:** R4 HIGH — classic has no rejection UI
**Files:**

- Modify: `client/src/components/work-surface/QuotesWorkSurface.tsx`
- Create: `client/src/components/work-surface/__tests__/QuotesWorkSurface-reject.test.tsx`
- Reference: `client/src/components/spreadsheet-native/QuotesPilotSurface.tsx` (~lines 746-756)

- [ ] **Step 1: Read pilot's rejection implementation**

Read `QuotesPilotSurface.tsx:746-756` for the `quotes.reject` mutation pattern.

- [ ] **Step 2: Write failing test**

Test that QuotesWorkSurface exposes a reject action for quotes.

- [ ] **Step 3: Implement rejection in classic**

Add a "Reject" action button/menu item to QuotesWorkSurface. Wire it to `trpc.quotes.reject.useMutation()` with confirmation dialog, success refetch, and error toast.

- [ ] **Step 4: Run tests + full verification**

Run: `pnpm check && pnpm lint && pnpm test && pnpm build`

- [ ] **Step 5: Commit**

```bash
git add client/src/components/work-surface/QuotesWorkSurface.tsx client/src/components/work-surface/__tests__/QuotesWorkSurface-reject.test.tsx
git commit -m "feat(quotes): add rejection action to classic QuotesWorkSurface

Ports quotes.reject pattern from pilot. Addresses DISC-QUO-003."
```

---

### Task 1.7: Samples — surface fulfill in classic

**Risk:** R5 HIGH — backend `samples.fulfillRequest` exists, no UI in classic
**Files:**

- Modify: `client/src/pages/SampleManagement.tsx` (~lines 375-420)
- Create: `client/src/pages/__tests__/SampleManagement-fulfill.test.tsx`

- [ ] **Step 1: Read pilot's fulfill implementation**

Read `SamplesPilotSurface.tsx:445` for the `samples.fulfillRequest` pattern.

- [ ] **Step 2: Read classic surface**

Read `SampleManagement.tsx:375-420` for the existing action structure.

- [ ] **Step 3: Write failing test**

- [ ] **Step 4: Add fulfill action to classic**

Add a "Fulfill" action to the sample actions area. Wire to `trpc.samples.fulfillRequest.useMutation()` with confirmation, success invalidation, and toast.

- [ ] **Step 5: Add setExpirationDate action to classic**

Also wire `trpc.samples.setExpirationDate.useMutation()` (server-side at `samples.ts:554`). Add a date picker dialog that calls this mutation. Note: the pilot also does NOT wire this — this is new UI for both surfaces.

- [ ] **Step 6: Write test for setExpirationDate**

Add a test to `SampleManagement-fulfill.test.tsx` that verifies the expiration date action is available and calls the correct mutation.

- [ ] **Step 7: Run tests + full verification**

Run: `pnpm check && pnpm lint && pnpm test && pnpm build`

- [ ] **Step 8: Commit**

```bash
git add client/src/pages/SampleManagement.tsx client/src/pages/__tests__/SampleManagement-fulfill.test.tsx
git commit -m "feat(samples): add fulfill and set-expiration actions to classic SampleManagement

Wires samples.fulfillRequest (DISC-SAM-001) and samples.setExpirationDate
(DISC-SAM-002) that existed backend-only."
```

---

### Task 1.8: Payments — fix cache namespace stale grids

**Risk:** R6 HIGH — cross-surface stale data after payment recording
**Files:**

- Modify: `client/src/components/spreadsheet-native/PaymentsPilotSurface.tsx`
- Modify: `client/src/components/spreadsheet-native/InvoicesPilotSurface.tsx`
- Create: `client/src/components/spreadsheet-native/__tests__/payments-cache-invalidation.test.tsx`

- [ ] **Step 1: Map the cache namespace split**

Read `PaymentsPilotSurface.tsx` — identify which tRPC query key it uses for listing payments.
Read `InvoicesPilotSurface.tsx` — identify which key it invalidates after recording a payment.
From consolidated-verdict.md: PaymentsPilotSurface queries `trpc.accounting.payments.list` but voids via `trpc.payments.void`. InvoicesPilotSurface invalidates `utils.payments.list` (top-level).

- [ ] **Step 2: Write failing test**

Test that after a payment recording from Invoices context, the Payments query cache is invalidated.

- [ ] **Step 3: Align cache invalidation**

Either:
a) Make both surfaces query from the same namespace, OR
b) Add cross-namespace invalidation in the mutation's `onSuccess` callback

- [ ] **Step 4: Run tests + full verification**

Run: `pnpm check && pnpm lint && pnpm test && pnpm build`

- [ ] **Step 5: Commit**

```bash
git add client/src/components/spreadsheet-native/PaymentsPilotSurface.tsx client/src/components/spreadsheet-native/InvoicesPilotSurface.tsx client/src/components/spreadsheet-native/__tests__/payments-cache-invalidation.test.tsx
git commit -m "fix(payments): align cache namespace to prevent stale grids (PAY-P1)

Recording payment from Invoices now invalidates Payments query cache.
Fixes cross-surface stale data from consolidated-verdict PAY-P1."
```

---

## Tranche 2: Fix Surfacing Truth

**Gate in:** Tranche 1 complete — all CRITICAL/HIGH risks fixed, verification green.
**Gate out:** Every pilot passes all 4 reachability checkpoints. Route/UI tests added per toggle.
**Parallelization:** All tasks independent — can run 3-4 in parallel.

---

### Task 2.1: Samples — add toggle to command strip

**Files:**

- Modify: `client/src/pages/InventoryWorkspacePage.tsx` (lines 142-160)
- Modify: `client/src/pages/ConsolidatedWorkspaces.test.tsx` (if pilot toggle tests exist)

- [ ] **Step 1: Read the command strip conditional**

Read `InventoryWorkspacePage.tsx:142-160`. Currently:

```tsx
activeTab === "inventory" ? <SheetModeToggle ... /> :
activeTab === "intake" ? <SheetModeToggle ... /> :
activeTab === "shipping" ? <SheetModeToggle ... /> : null
```

- [ ] **Step 2: Add samples to the conditional**

Add after the shipping branch:

```tsx
: activeTab === "samples" ? (
  <SheetModeToggle
    enabled={samplesPilotEnabled}
    surfaceMode={samplesSurfaceMode}
    onSurfaceModeChange={setSamplesSurfaceMode}
  />
) : null
```

- [ ] **Step 3: Write route/UI test**

Test that when `activeTab === "samples"` and the pilot flag is on, the SheetModeToggle renders.

- [ ] **Step 4: Run full verification**

Run: `pnpm check && pnpm lint && pnpm test && pnpm build`

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/InventoryWorkspacePage.tsx
git commit -m "fix(samples): render SheetModeToggle in command strip for samples tab

Samples had pilotSurfaceSupported=true and hooks wired but the toggle
was missing from the command strip conditional."
```

---

### Task 2.2: Invoices — add to pilotSurfaceSupported + render toggle

**Files:**

- Modify: `client/src/pages/AccountingWorkspacePage.tsx` (line 48, command strip)

- [ ] **Step 1: Read current gating**

Line 48: `const pilotSurfaceSupported = activeTab === "payments";`

- [ ] **Step 2: Expand pilotSurfaceSupported**

Change to: `const pilotSurfaceSupported = activeTab === "payments" || activeTab === "invoices";`

- [ ] **Step 3: Update command strip conditional**

Currently only renders toggle for payments (line 74). Add invoices:

```tsx
commandStrip={
  activeTab === "payments" || activeTab === "invoices" ? (
    <SheetModeToggle ... />
  ) : null
}
```

- [ ] **Step 4: Write route/UI test**

Test all 4 reachability checkpoints for invoices:

1. `pilotSurfaceSupported` is true when tab=invoices
2. Toggle renders in command strip
3. URL `?surface=sheet-native` activates pilot
4. `SHEET_NATIVE_DEFAULTS.invoices` is false (classic by default)

- [ ] **Step 5: Run full verification**

Run: `pnpm check && pnpm lint && pnpm test && pnpm build`

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/AccountingWorkspacePage.tsx
git commit -m "feat(invoices): add pilotSurfaceSupported + toggle for invoices tab

Invoices pilot was route-wired but unreachable — pilotSurfaceSupported
excluded invoices so sheetPilotEnabled was always false."
```

---

### Task 2.3: Quotes + Returns — add both to pilotSurfaceSupported + render toggles

> **Note:** These are merged into one task because both modify the same expression on the same lines of `SalesWorkspacePage.tsx`. Running them as parallel agents would cause merge conflicts.

**Files:**

- Modify: `client/src/pages/SalesWorkspacePage.tsx` (lines 67-70, command strip lines 94-96)
- Create: `client/src/pages/__tests__/SalesWorkspacePage-pilot-toggles.test.tsx`

- [ ] **Step 1: Expand pilotSurfaceSupported for both tabs**

Line 67-70, change from:

```tsx
const pilotSurfaceSupported =
  activeTab === "orders" ||
  activeTab === "create-order" ||
  activeTab === "sales-sheets";
```

To:

```tsx
const pilotSurfaceSupported =
  activeTab === "orders" ||
  activeTab === "create-order" ||
  activeTab === "sales-sheets" ||
  activeTab === "quotes" ||
  activeTab === "returns";
```

- [ ] **Step 2: Update command strip conditional**

Line 94-96, add `quotes` and `returns` to the condition that renders SheetModeToggle.

- [ ] **Step 3: Write route/UI test verifying all 4 checkpoints for BOTH tabs**

Test for quotes:

1. `pilotSurfaceSupported` is true when tab=quotes
2. Toggle renders in command strip
3. URL `?surface=sheet-native` activates QuotesPilotSurface
4. `SHEET_NATIVE_DEFAULTS.quotes` is false (classic by default)

Same 4 checks for returns.

- [ ] **Step 4: Run full verification**

Run: `pnpm check && pnpm lint && pnpm test && pnpm build`

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/SalesWorkspacePage.tsx client/src/pages/__tests__/SalesWorkspacePage-pilot-toggles.test.tsx
git commit -m "feat(sales): add pilotSurfaceSupported + toggles for quotes and returns tabs

Both pilots were route-wired but unreachable — pilotSurfaceSupported
excluded them so sheetPilotEnabled was always false."
```

---

### Task 2.4: Direct Intake — fix legacy route redirects

**Files:**

- Modify: `client/src/App.tsx` (redirect rules for `/product-intake`, `/intake`, `/direct-intake`)
- Create or modify: `client/src/__tests__/App-redirects.test.tsx` (or existing redirect test file)

- [ ] **Step 1: Find the legacy redirects**

Read `client/src/App.tsx` and search for redirects involving `product-intake`, `intake`, or `direct-intake`. Per Codex review (lines ~691, ~756), these redirect to `tab=receiving` instead of `tab=intake`.

- [ ] **Step 2: Update redirects**

Change legacy redirects to point at `tab=intake` (the Direct Intake tab in InventoryWorkspacePage, not the PO-linked receiving tab).

- [ ] **Step 3: Write test verifying the redirect target**

Test that navigating to `/product-intake`, `/intake`, and `/direct-intake` all redirect to a URL containing `tab=intake`.

- [ ] **Step 4: Run full verification**

Run: `pnpm check && pnpm lint && pnpm test && pnpm build`

- [ ] **Step 5: Commit**

```bash
git add client/src/App.tsx client/src/__tests__/App-redirects.test.tsx
git commit -m "fix(routing): legacy intake redirects now point to tab=intake not receiving

/product-intake, /intake, /direct-intake were redirecting to tab=receiving
which is PO-linked, not the Direct Intake tab."
```

---

### Task 2.6: Fulfillment — verify DISC-FUL-006 fix + regression test

**Files:**

- Modify: `docs/specs/spreadsheet-native-ledgers/fulfillment-capability-ledger-summary.md` (if not done in 0.8)
- Create: `client/src/components/spreadsheet-native/__tests__/FulfillmentPilotSurface-permissions.test.tsx`

- [ ] **Step 1: Verify fix in code**

Read `FulfillmentPilotSurface.tsx:607-610`. Confirm `orders:update` is used.

- [ ] **Step 2: Write regression test**

Test that the management actions in FulfillmentPilotSurface require `orders:update` permission.

- [ ] **Step 3: Run full verification**

Run: `pnpm check && pnpm lint && pnpm test && pnpm build`

- [ ] **Step 4: Commit**

```bash
git add client/src/components/spreadsheet-native/__tests__/FulfillmentPilotSurface-permissions.test.tsx
git commit -m "test(fulfillment): add regression test for DISC-FUL-006 permission fix"
```

---

### Task 2.7: Fulfillment — wire version for concurrent-edit detection

**Files:**

- Modify: `client/src/components/spreadsheet-native/FulfillmentPilotSurface.tsx`
- Modify: `server/routers/fulfillment.ts` (or equivalent pick-pack router)

- [ ] **Step 1: Read the server-side version check**

Find the fulfillment/pick-pack mutation that has a version parameter. Understand if the server already has the check (like invoices) or if it needs to be added.

- [ ] **Step 2: Wire version from query response into mutation**

In the pilot's mutation calls, pass the `version` field from the row data.

- [ ] **Step 3: Write test**

- [ ] **Step 4: Run full verification**

Run: `pnpm check && pnpm lint && pnpm test && pnpm build`

- [ ] **Step 5: Commit**

```bash
git add client/src/components/spreadsheet-native/FulfillmentPilotSurface.tsx
git commit -m "fix(fulfillment): wire version param for concurrent-edit detection (DISC-FUL-005)

Version field was present in server schema but never populated in mutations,
making the concurrent-edit check inert."
```

---

## Tranche 3: Proof Debt

**Gate in:** Tranche 2 complete — all toggles reachable, route tests passing.
**Gate out:** Every surfaced module has SHIP or CONDITIONAL SHIP (P3 only). Any NO-SHIP blocks Tranche 4 for that module.
**Parallelization:** Reviews can run 2-3 in parallel. Re-verdicts must follow their prerequisite fixes.

---

### Task 3.1a: Adversarial review — Orders

**Files:**

- Read: `client/src/components/spreadsheet-native/OrdersSheetPilotSurface.tsx`
- Read: `client/src/components/work-surface/OrdersWorkSurface.tsx`
- Read: `docs/specs/spreadsheet-native-ledgers/sales-orders-sheet-capability-ledger-summary.md`
- Create: `docs/qa/2026-03-22-orders-review/verdict.md`

- [ ] **Step 1: Read pilot + classic source**
- [ ] **Step 2: Review against rubric** (mutations, permissions, concurrent-edit, cache, capability coverage vs ledger)
- [ ] **Step 3: Produce verdict** — SHIP/NO-SHIP/CONDITIONAL SHIP with P0-P3 findings
- [ ] **Step 4: Commit**

```bash
git add docs/qa/2026-03-22-orders-review/verdict.md
git commit -m "qa(orders): adversarial review verdict"
```

### Task 3.1b: Adversarial review — Inventory

**Files:**

- Read: `client/src/components/spreadsheet-native/InventorySheetPilotSurface.tsx`
- Read: `client/src/components/work-surface/InventoryWorkSurface.tsx`
- Read: `docs/specs/spreadsheet-native-ledgers/operations-inventory-sheet-capability-ledger-summary.md`
- Create: `docs/qa/2026-03-22-inventory-review/verdict.md`

- [ ] **Step 1-4:** Same pattern as 3.1a

```bash
git add docs/qa/2026-03-22-inventory-review/verdict.md
git commit -m "qa(inventory): adversarial review verdict"
```

### Task 3.1c: Adversarial review — Sales Sheets

**Files:**

- Read: `client/src/components/spreadsheet-native/SalesSheetsPilotSurface.tsx`
- Read: `client/src/pages/SalesSheetCreatorPage.tsx`
- Read: `docs/specs/spreadsheet-native-ledgers/sales-sheets-capability-ledger-summary.md`
- Create: `docs/qa/2026-03-22-sales-sheets-review/verdict.md`

- [ ] **Step 1-4:** Same pattern as 3.1a

```bash
git add docs/qa/2026-03-22-sales-sheets-review/verdict.md
git commit -m "qa(sales-sheets): adversarial review verdict"
```

### Task 3.1d: Adversarial review — Direct Intake

**Files:**

- Read: `client/src/components/spreadsheet-native/IntakePilotSurface.tsx`
- Read: `client/src/components/work-surface/DirectIntakeWorkSurface.tsx`
- Read: `docs/specs/spreadsheet-native-ledgers/direct-intake-capability-ledger-summary.md`
- Create: `docs/qa/2026-03-22-direct-intake-review/verdict.md`

- [ ] **Step 1-4:** Same pattern as 3.1a

```bash
git add docs/qa/2026-03-22-direct-intake-review/verdict.md
git commit -m "qa(direct-intake): adversarial review verdict"
```

### Task 3.1e: Adversarial review — Purchase Orders

**Files:**

- Read: `client/src/components/spreadsheet-native/PurchaseOrdersPilotSurface.tsx`
- Read: `client/src/components/work-surface/PurchaseOrdersWorkSurface.tsx`
- Read: `docs/specs/spreadsheet-native-ledgers/purchase-orders-capability-ledger-summary.md`
- Create: `docs/qa/2026-03-22-purchase-orders-review/verdict.md`

- [ ] **Step 1-4:** Same pattern as 3.1a

```bash
git add docs/qa/2026-03-22-purchase-orders-review/verdict.md
git commit -m "qa(purchase-orders): adversarial review verdict"
```

### Task 3.1f: Adversarial review — Quotes

**Files:**

- Read: `client/src/components/spreadsheet-native/QuotesPilotSurface.tsx`
- Read: `client/src/components/work-surface/QuotesWorkSurface.tsx`
- Read: `docs/specs/spreadsheet-native-ledgers/quotes-capability-ledger-summary.md`
- Create: `docs/qa/2026-03-22-quotes-review/verdict.md`

- [ ] **Step 1-4:** Same pattern as 3.1a

```bash
git add docs/qa/2026-03-22-quotes-review/verdict.md
git commit -m "qa(quotes): adversarial review verdict"
```

### Task 3.1g: Adversarial review — Samples

**Files:**

- Read: `client/src/components/spreadsheet-native/SamplesPilotSurface.tsx`
- Read: `client/src/pages/SampleManagement.tsx`
- Read: `docs/specs/spreadsheet-native-ledgers/samples-capability-ledger-summary.md`
- Create: `docs/qa/2026-03-22-samples-review/verdict.md`

- [ ] **Step 1-4:** Same pattern as 3.1a

```bash
git add docs/qa/2026-03-22-samples-review/verdict.md
git commit -m "qa(samples): adversarial review verdict"
```

---

### Task 3.2: Orders — complete parity proof on staging

**Dependency:** Requires staging deployment with current code. Must follow the proof plan's execution order — NOT a flat re-run of all rows.
**Scope:** SALE-ORD-003 through SALE-ORD-035
**Reference:** `docs/specs/spreadsheet-native-ledgers/pilot-ledgers-parity-proof-plan.md` lines 162-170 ("Next Execution Order")

The proof plan defines 5 sequential proof tranches. Each must close before the next starts:

1. **Shared runtime tranche** — Lock AG Grid Enterprise decision and PowersheetGrid adapter (SALE-ORD-023)
2. **Document-mode tranche** — Re-run SALE-ORD-003 through SALE-ORD-018 on staging (currently `code-proven`)
3. **Queue/support-grid tranche** — Treat existing queue evidence as pre-gate until document-first gate closes
4. **Visibility/trust tranche** — SALE-ORD-024 through SALE-ORD-027, SALE-ORD-033 through SALE-ORD-035 (screenshot-based proof)
5. **Blocked rows** — SALE-ORD-013 (recurring), SALE-ORD-014 (output), SALE-ORD-028 (conversion), SALE-ORD-033 (discoverability), SALE-ORD-034 (workflow ambiguity) — these need product decisions before proof

- [ ] **Step 1: Verify shared runtime decisions are locked**

Check if AG Grid Enterprise and PowersheetGrid adapter path are decided. If not, this blocks the entire proof chain — escalate to Evan.

- [ ] **Step 2: Run document-mode proofs on staging (tranche 2)**

For each of SALE-ORD-003 through SALE-ORD-018 currently at `code-proven`:

- Navigate to the staging URL with `?surface=sheet-native`
- Perform the test action
- Capture evidence (screenshot or staging proof JSON)
- Update the row status to `live-proven` with date

- [ ] **Step 3: Run visibility/trust proofs (tranche 4)**

Only after tranche 2 closes. For SALE-ORD-024 through SALE-ORD-027, SALE-ORD-033 through SALE-ORD-035:

- Capture screenshot-based visibility proof
- Update row status

- [ ] **Step 4: Document blocked rows with explicit reason**

For each `blocked` row, document what product decision is needed and who owns it.

- [ ] **Step 5: Commit**

```bash
git add docs/specs/spreadsheet-native-ledgers/pilot-ledgers-parity-proof-plan.md
git commit -m "qa(orders): update parity proof — staging verification wave

Tranche-ordered proof per proof plan execution order. Blocked rows
documented with explicit product-decision requirements."
```

---

### Task 3.3: Inventory — fix staging bulk delete 500

**Files:**

- Modify: `server/routers/inventory.ts` (bulk.delete mutation)

- [ ] **Step 1: Reproduce the staging 500**

Read the server logs or attempt `inventory.bulk.delete` on staging. Identify the error.

- [ ] **Step 2: Fix the root cause**

- [ ] **Step 3: Write test**

- [ ] **Step 4: Run full verification**

Run: `pnpm check && pnpm lint && pnpm test && pnpm build`

- [ ] **Step 5: Commit**

```bash
git add server/routers/inventory.ts server/routers/__tests__/inventory-bulk-delete.test.ts
git commit -m "fix(inventory): resolve bulk delete staging 500 (OPS-INV-006)"
```

---

### Task 3.4: Payments — re-run verdict after cache fix

**Dependency:** Task 1.8 complete

- [ ] **Step 1: Re-read PaymentsPilotSurface with the cache fix applied**
- [ ] **Step 2: Run adversarial review against the same rubric as consolidated-verdict.md**
- [ ] **Step 3: Verify PAY-P1 is resolved**
- [ ] **Step 4: Produce updated verdict**

Write to `docs/qa/2026-03-22-payments-re-review/verdict.md`

- [ ] **Step 5: Commit**

```bash
git add docs/qa/
git commit -m "qa(payments): re-verdict after PAY-P1 cache fix"
```

---

### Task 3.5: Invoices — re-run verdict after classic fixes

**Dependency:** Tasks 1.1 and 1.2 complete

- [ ] **Step 1: Re-read InvoicesWorkSurface with server numbering and version wired**
- [ ] **Step 2: Re-read InvoicesPilotSurface**
- [ ] **Step 3: Run adversarial review**
- [ ] **Step 4: Produce updated verdict**
- [ ] **Step 5: Commit**

```bash
git add docs/qa/
git commit -m "qa(invoices): re-verdict after classic safety fixes"
```

---

### Task 3.6: Returns — re-run verdict after double-credit fix

**Dependency:** Tasks 1.3 and 1.4 complete

- [ ] **Step 1: Re-read returns router with idempotency guard**
- [ ] **Step 2: Re-read ReturnsPage with approval workflow**
- [ ] **Step 3: Run adversarial review**
- [ ] **Step 4: Produce updated verdict**
- [ ] **Step 5: Commit**

```bash
git add docs/qa/
git commit -m "qa(returns): re-verdict after double-credit and approval workflow fixes"
```

---

## Tranche 4: Roadmap Rebuild

**Gate in:** Tranche 3 complete — all surfaced modules have SHIP or CONDITIONAL SHIP.
**Gate out:** Official roadmap reflects repo truth. Stale artifacts archived. This plan retired.

---

### Task 4.1: Reissue atomic roadmap from repo truth

**Files:**

- Modify: `docs/roadmaps/spreadsheet-native-full-rollout/README.md`

- [ ] **Step 1: Classify every module**

Based on current state after all fixes:

- `visible-and-safe`: SHIP verdict + default or toggle-reachable
- `visible-but-not-safe`: toggle-reachable but NO-SHIP or residual P1/P2
- `built-but-hidden`: pilot exists but toggle not reachable
- `planned-only`: no pilot surface built

- [ ] **Step 2: Rewrite the README with the new classification**

- [ ] **Step 3: Update remediation roadmap status from DRAFT to SUPERSEDED**

- [ ] **Step 4: Commit**

```bash
git add docs/roadmaps/spreadsheet-native-full-rollout/README.md docs/remediation/2026-03-22-spreadsheet-native-remediation-roadmap.md
git commit -m "docs(roadmap): reissue atomic roadmap from verified repo truth

Replaces wave-based structure with evidence-based classification.
Remediation roadmap marked SUPERSEDED."
```

---

### Task 4.2: Archive stale wave briefs

**Files:**

- Move: `docs/roadmaps/spreadsheet-native-full-rollout/briefs/W1C-payments.md` → `briefs/archive/`
- Move: `docs/roadmaps/spreadsheet-native-full-rollout/briefs/W1D-client-ledger.md` → `briefs/archive/`

- [ ] **Step 1: Create archive directory and move stale briefs**

```bash
mkdir -p docs/roadmaps/spreadsheet-native-full-rollout/briefs/archive
git mv docs/roadmaps/spreadsheet-native-full-rollout/briefs/W1C-payments.md docs/roadmaps/spreadsheet-native-full-rollout/briefs/archive/
git mv docs/roadmaps/spreadsheet-native-full-rollout/briefs/W1D-client-ledger.md docs/roadmaps/spreadsheet-native-full-rollout/briefs/archive/
```

- [ ] **Step 2: Commit**

```bash
git commit -m "docs(briefs): archive stale wave briefs that claimed pilots don't exist"
```

---

### Task 4.3: Define default-promotion and classic-retirement criteria

**Files:**

- Modify: `docs/roadmaps/spreadsheet-native-full-rollout/README.md`

- [ ] **Step 1: Document the promotion contract**

Per `searchParams.ts:16-18`, default promotion requires:

1. QA SHIP verdict
2. Soak period of 2 weeks with <5% classic fallback rate
3. No unresolved P1/P2 findings

- [ ] **Step 2: Document classic retirement criteria per module**

For each module:

- SHIP verdict on pilot
- Default promotion complete
- 30-day `?surface=classic` transition window
- Remove classic WorkSurface after transition

- [ ] **Step 3: Commit**

```bash
git add docs/roadmaps/spreadsheet-native-full-rollout/README.md
git commit -m "docs(roadmap): define default-promotion and classic-retirement criteria"
```

---

### Task 4.4: Address shared contracts (CROSS-001 through CROSS-005)

**Files:**

- Read: `docs/roadmaps/spreadsheet-native-full-rollout/README.md` (line 60)
- Read: `docs/specs/SPREADSHEET-NATIVE-INTERACTION-SOURCE-OF-TRUTH-CONTRACT.md`
- Modify: `docs/roadmaps/spreadsheet-native-full-rollout/README.md`

- [ ] **Step 1: Read the CROSS-001 through CROSS-005 definitions**

These are in the README at line 60. They cover shared interaction contracts: selection model, clipboard, fill, edit policy, keyboard hints.

- [ ] **Step 2: For each contract, assess current state**

Based on Task 0.10's output, classify each as:

- `resolved` — fully implemented in shared runtime
- `partial` — some modules use it, others don't
- `deferred` — not started, not blocking any current module
- `blocking` — prevents a module from reaching SHIP

- [ ] **Step 3: For any `blocking` contracts, add them to the roadmap as concrete tasks**

If any contract is blocking a module's SHIP verdict, it needs a work item.

- [ ] **Step 4: For `deferred` contracts, document the decision and rationale**

- [ ] **Step 5: Commit**

```bash
git add docs/roadmaps/spreadsheet-native-full-rollout/README.md
git commit -m "docs(roadmap): resolve shared contracts CROSS-001 through CROSS-005 status"
```

---

### Task 4.5: Create SHEET_NATIVE_DEFAULTS promotion tracking

**Files:**

- Modify: `docs/roadmaps/spreadsheet-native-full-rollout/README.md`

Note: The actual code change to `client/src/lib/spreadsheet-native/searchParams.ts` (flipping `false` → `true` for each module) is a future task, gated on each module achieving:

1. SHIP verdict
2. 2-week soak with <5% classic fallback
3. No unresolved P1/P2

- [ ] **Step 1: Add a promotion tracking table to the roadmap**

| Module               | SHIP Verdict | Soak Start | Fallback Rate | Promoted                 |
| -------------------- | ------------ | ---------- | ------------- | ------------------------ |
| Orders               | —            | —          | —             | **Yes** (already `true`) |
| Create-order         | —            | —          | —             | No                       |
| ... (all 13 modules) |

- [ ] **Step 2: Document that each promotion is a 1-line code change + PR**

The change is in `searchParams.ts` SHEET_NATIVE_DEFAULTS — flip `moduleName: false` → `moduleName: true`.

- [ ] **Step 3: Commit**

```bash
git add docs/roadmaps/spreadsheet-native-full-rollout/README.md
git commit -m "docs(roadmap): add SHEET_NATIVE_DEFAULTS promotion tracking table"
```

---

## Dependency Graph

```
Tranche 0 (all parallel, docs only)
  ├─ 0.1  0.2  0.3  0.4  0.5  0.6  0.7  0.8  0.9  0.10
  └─ GATE: all docs reconciled
           │
Tranche 1 (all parallel, code fixes)
  ├─ 1.1 ──────────────┐
  ├─ 1.2 ──────────────┤
  ├─ 1.3 ──────────────┤
  ├─ 1.4 ──────────────┤
  ├─ 1.5 ──────────────┤
  ├─ 1.6 ──────────────┤
  ├─ 1.7 ──────────────┤
  └─ 1.8 ──────────────┤
                        │
  GATE: all CRITs/HIGHs fixed, pnpm check+lint+test+build green
                        │
Tranche 2 (mostly parallel, surfacing)
  ├─ 2.1 (Samples toggle)          independent
  ├─ 2.2 (Invoices toggle)         independent
  ├─ 2.3 (Quotes+Returns toggles)  independent (merged — same file)
  ├─ 2.4 (Direct Intake redirects) independent
  ├─ 2.5 (Fulfillment perms test)  independent
  └─ 2.6 (Fulfillment version)     independent
  └─ GATE: all 4-checkpoint reachability tests pass
                        │
Tranche 3 (partially parallel, proof)
  ├─ 3.1a-g (7 modules) ── independent, can run in parallel batches
  ├─ 3.2 (Orders parity)  ── needs staging, sequential tranche order
  ├─ 3.3 (Inventory 500)  ── independent
  ├─ 3.4 (Payments)       ── depends on 1.8
  ├─ 3.5 (Invoices)       ── depends on 1.1 + 1.2
  └─ 3.6 (Returns)        ── depends on 1.3 + 1.4
  └─ GATE: all SHIP or CONDITIONAL SHIP
                        │
Tranche 4 (sequential, docs)
  ├─ 4.1 → 4.2 → 4.3 → 4.4 → 4.5
  └─ GATE: roadmap rebuilt, plan retired
```

---

## Task Count Summary

| Tranche                 | Tasks                     | Effort                    | Parallelizable     |
| ----------------------- | ------------------------- | ------------------------- | ------------------ |
| 0: Truth Reconciliation | 10                        | S-M each, ~1-2 days total | Fully parallel     |
| 1: Visible-User Risks   | 8                         | M-L each, ~5-7 days total | Fully parallel     |
| 2: Surfacing Truth      | 6                         | S-M each, ~2-3 days total | Fully parallel     |
| 3: Proof Debt           | 12 (7 reviews + 5 others) | M-L each, ~5-7 days total | Partially parallel |
| 4: Roadmap Rebuild      | 5                         | S-M each, ~1-2 days total | Sequential         |
| **Total**               | **41 tasks**              |                           | **~14-21 days**    |
