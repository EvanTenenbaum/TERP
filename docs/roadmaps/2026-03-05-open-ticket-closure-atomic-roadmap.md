# Atomic Execution Roadmap — Open Ticket Closure
**Date**: 2026-03-05
**Author**: Claude (planning session)
**Branch**: `claude/execution-roadmap-planning-0UpCG`
**Autonomy Mode**: STRICT (features/UI) with SAFE segments (docs/closeout)

---

## Ticket Scope

### Group A — Dashboard / Inventory UX
| Ticket | Title | Status |
|--------|-------|--------|
| TER-523 | High-priority UX parent tracker | Pending (closes when TER-525–529 close) |
| TER-524 | Secondary UX parent tracker | Pending (closes when TER-535 closes) |
| TER-525 | H1: Prevent invalid batch deletions pre-click | **Code done** — tests + evidence missing |
| TER-526 | H2: Single blocked-delete error banner | **Code done** — tests + evidence missing |
| TER-527 | H3: Focused selection mode | **Code done** — tests + evidence missing |
| TER-529 | H4: Persistent undo + icon a11y hardening | **Partially done** — persistent button + aria-labels missing |
| TER-535 | S4: Dashboard path retention decision | Decision doc + Linear close required |

### Group B — Terminology Program
| Ticket | Title | Status |
|--------|-------|--------|
| TER-546 | LEX Terminology Bible (parent) | **Complete** — Linear closeout + evidence packet |
| TER-558 | Unknown — Linear lookup required in Wave 0 | TBD |

### Group C — Sales-Sheet Conversion / Action Integrity
| Ticket | Title | Status |
|--------|-------|--------|
| TER-189 | Action Reliability | **Complete** — Linear closeout only |
| TER-233 | Unknown — Linear lookup required in Wave 0 | TBD |
| TER-320 | Quantity Model Normalization | **Complete** — Linear closeout only |
| TER-323 | Conversion Contract Parity | **Complete** — Linear closeout only |
| TER-345 | Conversion Integrity | **Complete** — Linear closeout only |

---

## Pre-Flight Assessment (Code-Grounded)

### What's Already Done

| Ticket | Evidence File | Key Evidence |
|--------|--------------|--------------|
| TER-525 H1 | `client/src/components/work-surface/InventoryWorkSurface.tsx:1058–1071` | `blockedFromDelete` memo; delete button disabled when `blockedFromDelete.size > 0`; tooltip with count |
| TER-526 H2 | `InventoryWorkSurface.tsx:597, 1931–1970` | `bulkDeleteError` state; single in-surface banner at line 1932; error toast suppressed for business-rule errors |
| TER-527 H3 | `InventoryWorkSurface.tsx:1818–1832, 1972–2002` | Filter panel collapsed when `selectedBatchIds.size > 0`; stats grid hidden during selection |
| TER-529 H4 (partial) | `InventoryWorkSurface.tsx:2494` | "· Undo available" text in status bar only — **no persistent button** |
| TER-546 | `docs/terminology/LEX_CLOSURE_REPORT.md` | Full 16/16 LEX subtasks complete; all tests pass |
| TER-189 | `docs/roadmaps/checkpoint-bundles/2026-03-04-queue-clean-nonqa-ledger.md:NQ-08` | Line totals visible, clipboard/PDF exports include qty breakdown |
| TER-320 | Same ledger NQ-04 | Total calc fixed to `SUM(price * qty)` in client + server |
| TER-323 | Same ledger NQ-06 | `convertToOrder()` recalculates from items, not stored total |
| TER-345 | Same ledger NQ-07 | Both conversion paths wrapped in `db.transaction()` |

### What Remains Missing

| Gap | Ticket | Files to Touch |
|-----|--------|---------------|
| Persistent "Undo last delete" button in status bar | TER-529 | `InventoryWorkSurface.tsx` |
| `aria-label` on AppHeader theme toggle button | TER-529 | `client/src/components/layout/AppHeader.tsx:139–151` |
| `aria-label` on AppHeader settings button | TER-529 | `AppHeader.tsx:154–162` |
| Unit tests for H1–H4 behaviors | TER-525–529 | `client/src/components/work-surface/__tests__/InventoryWorkSurface.test.tsx` |
| E2E test for inventory bulk-delete flow | TER-525–527 | `tests-e2e/golden-flows/gf-00x-inventory-bulk-delete.spec.ts` (new) |
| Dashboard path decision document | TER-535 | `docs/uiux/2026-03-05-dashboard-path-decision.md` (new) |
| Linear evidence packets + status = Done | TER-189, 320, 323, 345, 546 | Linear only |
| TER-558, TER-233 scope | both | Linear lookup in Wave 0 |

---

## Dependency Graph

```
Wave 0 (Recon)
  └── TER-558 scope confirmed
  └── TER-233 scope confirmed
  └── CI baseline: pnpm check / lint / test PASS

Wave 1 (SAFE — docs/closeout)
  ├── TER-189 → Linear Done + evidence
  ├── TER-320 → Linear Done + evidence
  ├── TER-323 → Linear Done + evidence
  └── TER-345 → Linear Done + evidence

Wave 2 (STRICT — implement remaining code)
  └── TER-529: persistent undo button + aria-labels
      [depends on Wave 0 CI baseline]

Wave 3 (STRICT — testing)
  ├── Unit tests: TER-525, 526, 527, 529 behaviors
  ├── E2E: new gf-00x-inventory-bulk-delete spec
  └── Full verification gate (pnpm check / lint / test / build)
      [depends on Wave 2]

Wave 4 (SAFE — decision + doc)
  └── TER-535: dashboard path decision doc + Linear close
      [parallel with Wave 3]

Wave 5 (SAFE — terminology closeout)
  ├── TER-546: Linear close + evidence attach
  └── TER-558: implement or close (from Wave 0 scope)
      [parallel with Waves 3–4]

Wave 6 (STRICT — unknown tickets)
  └── TER-233: implement or close (from Wave 0 scope)
      [depends on Wave 0 scope resolution]

QA Gate
  └── pnpm check / lint / test / build → all PASS
  └── Staging deploy + smoke verify
  └── Linear evidence packets attached
  └── All parents (TER-523, TER-524) closed
```

---

## Wave 0: Reconnaissance + Baseline

**Mode**: SAFE
**Est**: 15–20 min
**Executor**: Agent or Evan

| Step | Action | Acceptance |
|------|--------|------------|
| 0.1 | Open Linear and read TER-233 description, acceptance criteria, and any child issues | Scope known: implementation size categorized (Quick Close / Code Required) |
| 0.2 | Open Linear and read TER-558 description, acceptance criteria, and any child issues | Same |
| 0.3 | Run `pnpm check && pnpm lint && pnpm test && pnpm build` | All PASS — establishes green baseline before any changes |

**Decision gate**: If TER-233 or TER-558 require code changes > 1 day each, split into a separate sub-roadmap. If ≤ 4h each, fold into Wave 3 or Wave 6 below.

---

## Wave 1: Sales-Sheet Closeout (Linear Evidence + Done)

**Mode**: SAFE
**Est**: 30–45 min
**Executor**: Evan or agent
**Risk**: Near-zero — no code changes

### Evidence Packets (attach to each Linear ticket)

#### TER-320 — Quantity Model Normalization
- **Evidence**: commit `c2c17dd` (reference ledger NQ-04)
- **Changed files**: `client/src/components/sales/SalesSheetPreview.tsx`, `server/routers/salesSheets.ts`
- **Summary**: Fixed `SUM(price)` → `SUM(price * quantity)` in client display and server validation
- **Action**: Set status = Done in Linear, paste evidence summary

#### TER-323 — Conversion Contract Parity
- **Evidence**: same batch, ledger NQ-06
- **Changed files**: `server/salesSheetsDb.ts`
- **Summary**: `convertToOrder()` recalculates total from items, handles legacy sheets
- **Action**: Set status = Done in Linear, paste evidence summary

#### TER-345 — Conversion Integrity
- **Evidence**: ledger NQ-07
- **Changed files**: `server/salesSheetsDb.ts`
- **Summary**: `convertToOrder()` + `convertToLiveSession()` wrapped in `db.transaction()`
- **Action**: Set status = Done in Linear, paste evidence summary

#### TER-189 — Action Reliability
- **Evidence**: ledger NQ-08
- **Changed files**: `client/src/components/sales/SalesSheetPreview.tsx`, `client/src/pages/SharedSalesSheetPage.tsx`
- **Summary**: Line totals visible in SortableItem; shared page shows Line Total column; exports include qty breakdown
- **Action**: Set status = Done in Linear, paste evidence summary

**Verification gate (Wave 1)**: No code changes, no re-verification needed. Confirm test suite still green via CI result from Wave 0.

---

## Wave 2: TER-529 — Persistent Undo Button + Accessibility Hardening

**Mode**: STRICT
**Est**: 45–60 min
**Executor**: Agent (terp-implementer)

### 2.1 — Persistent "Undo last delete" button

**File**: `client/src/components/work-surface/InventoryWorkSurface.tsx`
**Location**: `WorkSurfaceStatusBar` center section (line ~2489–2495)

**Current**:
```tsx
center={
  selectedItem?.batch
    ? `Selected: ${selectedItem.batch.sku}`
    : `${selectedBatchIds.size} selected${undo.state.canUndo ? " · Undo available" : ""}`
}
```

**Target behavior**:
- When `undo.state.canUndo` is true and no item is selected in inspector: show clickable `<Button>Undo last delete</Button>` in center slot
- Keep existing text label for non-undo states
- Button calls `undo.undo()` (existing hook)
- Button disappears when `canUndo` becomes false (undo window expired)

**Acceptance criteria**:
- Keyboard user can tab to and activate "Undo last delete" without depending on toast timing
- Button is only visible while undo window is active
- Existing Cmd+Z shortcut behavior unchanged

### 2.2 — AppHeader aria-labels

**File**: `client/src/components/layout/AppHeader.tsx`

| Line | Current | Target |
|------|---------|--------|
| ~144 | `title="Switch to dark/light mode"` | Add `aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}` |
| ~159 | `title="System Settings"` | Add `aria-label="System Settings"` |

**Acceptance criteria**:
- Both icon-only buttons have explicit `aria-label` (not just `title`)
- `title` can remain for hover tooltip; `aria-label` ensures AT coverage

### Verification gate (Wave 2)
```bash
pnpm check   # 0 TypeScript errors
pnpm lint    # 0 lint errors
```

---

## Wave 3: Testing — H1–H4 Coverage + E2E

**Mode**: STRICT
**Est**: 90–120 min
**Executor**: Agent (terp-implementer)
**Depends on**: Wave 2 complete

### 3.1 — Unit tests: InventoryWorkSurface H1–H4

**File**: `client/src/components/work-surface/__tests__/InventoryWorkSurface.test.tsx`
**Add test suites** (do not remove existing):

| Suite | Test Cases | Covers |
|-------|-----------|--------|
| H1: Pre-click eligibility gate | (a) All selected rows eligible → delete enabled; (b) Mixed selection → delete disabled; (c) "Select eligible only" updates selection to eligible IDs only | TER-525 |
| H2: Single error banner | (a) Blocked delete triggers banner only, no error toast; (b) Banner dismiss clears error; (c) Success delete shows success (not banner) | TER-526 |
| H3: Focused selection mode | (a) `selectedBatchIds.size > 0` → filter panel not rendered; (b) `selectedBatchIds.size > 0` → stats grid not rendered; (c) Clearing selection restores both panels | TER-527 |
| H4: Persistent undo button | (a) `undo.state.canUndo = true` → "Undo last delete" button rendered; (b) `undo.state.canUndo = false` → button not rendered; (c) Button click calls `undo.undo()` | TER-529 |

### 3.2 — E2E: Inventory Bulk Delete Flow

**New file**: `tests-e2e/golden-flows/gf-00x-inventory-bulk-delete.spec.ts`
**Smoke path only** (no broad suite expansion):

| Step | Assertion |
|------|-----------|
| Select batch with onHandQty > 0 | "Delete Selected" button is disabled |
| See pre-click tooltip | Tooltip contains "Cannot delete: 1" |
| Click "Select eligible only" | Selection updates; delete button re-enables if eligible rows exist |
| Force blocked delete path (select blocked row, attempt delete) | Banner appears; no error toast in DOM |
| Click banner dismiss | Banner clears |
| Perform valid delete on eligible batches | Success message appears; "Undo last delete" button appears in status bar |
| Click "Undo last delete" | Undo confirmation appears or batch restored |

**Note**: If staging data does not have batches with onHandQty > 0, the E2E uses mocked data at component level (msw or vitest mock).

### Verification gate (Wave 3)
```bash
pnpm check   # 0 TypeScript errors
pnpm lint    # 0 lint errors
pnpm test    # All existing + new tests pass
pnpm build   # Production build succeeds
```

**All four must PASS before proceeding to Wave 5 closeout.**

---

## Wave 4: TER-535 — Dashboard Path Decision

**Mode**: SAFE
**Est**: 20–30 min
**Executor**: Evan (decision-maker) + agent (document author)
**Parallel with**: Wave 3

### Decision criteria

| Question | Signal | Source |
|----------|--------|--------|
| Is `OwnerCommandCenterDashboard` now the validated primary owner path? | Feature flag enabled in staging; `OwnerAppointmentsWidget` + all 5 core widgets present | Code review of `OwnerCommandCenterDashboard.tsx` |
| Can `DashboardV3` be safely deprecated? | No active user sessions routed there; feature flag toggleable; rollback is instant (flip flag) | `DashboardHomePage.tsx` feature flag check |
| Any regressions from owner dashboard rollout? | Staging error logs clean; no Linear bug tickets referencing dashboard v3 | Staging logs + Linear |

### Deliverable

New file: `docs/uiux/2026-03-05-dashboard-path-decision.md`

```markdown
# Dashboard Path Decision — 2026-03-05

## Decision
[KEEP DUAL / CONVERGE / DEFER]

## Rationale
[Evidence summary]

## Action
- If KEEP DUAL: DashboardV3 remains as feature-flag fallback, no further action.
- If CONVERGE: Create follow-up ticket to remove DashboardV3 and make OwnerCommandCenter the default.
- If DEFER: Reopen TER-535 for next sprint with explicit criteria.

## Linear Close
TER-535: Done — decision documented.
```

**Close TER-535 in Linear** with decision doc link as evidence.
**Close TER-524** (parent) once TER-535 is the only outstanding child in scope.

---

## Wave 5: Terminology Closeout

**Mode**: SAFE
**Est**: 20–30 min
**Executor**: Agent or Evan
**Parallel with**: Waves 3–4

### 5.1 — TER-546 Linear Closeout

**Evidence packet** to attach in Linear:

```
LEX Terminology Bible — Evidence Packet
========================================
Report:      docs/terminology/LEX_CLOSURE_REPORT.md
Term Map:    docs/terminology/term-map.json (15 terms, 5 policy locks)
Tests:       tests/unit/terminology/term-map.test.ts (55+ cases, all PASS)
Scripts:     scripts/terminology-census.sh, scripts/terminology-drift-audit.sh
CI Gate:     pnpm gate:terminology → exit 0

Subtasks Complete: 16/16 (LEX-001 through LEX-016)
Policy Locks Active: Supplier, Brand/Farmer, Batch, Intake, Sales Order

Key commits:
  89f2d11  docs(lex): Gate 1 review — Evan approves 5 policy locks
  16dc324  feat(lex): normalize Receiving→Intake
  b933ad3  feat(lex): normalize Sales Order and Quote
  0f5ccd6  feat(lex): normalize Vendor→Supplier
  6eb1c8c  docs(lex): bulk normalize 284 docs files
  3868bd2  chore(merge): integrate STX/LEX closure
```

**Action**: Set TER-546 = Done in Linear.

### 5.2 — TER-558 (from Wave 0 scope)

Branch on Wave 0 outcome:

| If TER-558 is... | Action |
|-----------------|--------|
| A sub-ticket of TER-546 (LEX-00x) already completed | Mark Done with pointer to LEX_CLOSURE_REPORT.md |
| A new terminology UI normalization task (LEX-008 to LEX-012) | Confirm these are done (all LEX-008–012 completed per git log) and close with commit evidence |
| Unrelated scope | Implement per acceptance criteria; estimate separately |

---

## Wave 6: TER-233 — Unknown Ticket (from Wave 0)

**Mode**: TBD (determined by Wave 0 scope)
**Est**: 4h–1d (estimated after Wave 0)
**Depends on**: Wave 0 scope resolution

### Branch conditions

| If TER-233 is... | Action |
|-----------------|--------|
| Already completed (code exists, evidence not attached) | Close with evidence, same pattern as TER-189/320/323/345 |
| A gap in SalesSheetPreview or SharedSalesSheetPage not yet addressed | Implement: edit relevant file, add unit test, run verification gate |
| A separate domain (non-sales-sheet) | Scope separately; implement with full STRICT mode verification |

---

## QA Gate — All Waves Complete

**Gate must be passed before any Linear ticket is marked Done for Wave 2–3 tickets.**

```bash
# Full verification gate
pnpm check        # TypeScript: 0 errors
pnpm lint         # ESLint: 0 errors
pnpm test         # All tests pass (including new H1–H4 suite)
pnpm build        # Production build succeeds
```

### V4 QA Gate Checklist

- [ ] **Requirements Coverage**: Each AC for TER-525/526/527/529 mapped to a test or screenshot
- [ ] **Functional Validation**: Inventory delete flow verified in browser on staging
- [ ] **Blast Radius Review**:
  - `InventoryWorkSurface.tsx` — selection, delete, undo, focused mode
  - `AppHeader.tsx` — theme + settings buttons (aria-label only, no behavior change)
  - `tests-e2e/golden-flows/gf-007-inventory-management.spec.ts` — existing spec must still pass
  - Sales sheet files — no new changes; existing tests still pass
  - Terminology files — no new changes; pnpm gate:terminology exits 0
- [ ] **Adversarial Review**: Try blocked delete from keyboard only; try undo without toast; try mixed-selection flows
- [ ] **Staging Verification**: Deploy to staging; load `/inventory`; confirm H1–H4 behaviors visible

### Completion Output Template

```
VERIFICATION RESULTS — 2026-03-05 Open Ticket Closure
=======================================================
TypeScript: PASS | FAIL
Lint:       PASS | FAIL
Tests:      PASS | FAIL (X/Y passing)
Build:      PASS | FAIL
Deployment: VERIFIED | PENDING
V4 QA Gate: PASS | FAIL
Blast Radius: InventoryWorkSurface, AppHeader, SalesSheetPreview, SalesSheetDb, Terminology (no change)

Tickets closed:
  TER-525 — H1 Prevent Invalid Batch Deletions: DONE
  TER-526 — H2 Single Error Banner: DONE
  TER-527 — H3 Focused Selection Mode: DONE
  TER-529 — H4 Persistent Undo + A11y: DONE
  TER-523 — High Priority UX Parent: DONE
  TER-535 — S4 Dashboard Decision: DONE
  TER-524 — Secondary UX Parent: DONE
  TER-546 — LEX Terminology Bible: DONE
  TER-558 — [determined Wave 0]: DONE | FOLLOW-UP
  TER-189 — Action Reliability: DONE
  TER-233 — [determined Wave 0]: DONE | FOLLOW-UP
  TER-320 — Quantity Model Normalization: DONE
  TER-323 — Conversion Contract Parity: DONE
  TER-345 — Conversion Integrity: DONE
```

---

## Execution Order Summary

| Wave | Tasks | Mode | Est | Parallel? |
|------|-------|------|-----|-----------|
| 0 | Recon: TER-233 + TER-558 scope; CI baseline | SAFE | 15–20m | No (must be first) |
| 1 | Linear closeout: TER-189, 320, 323, 345 | SAFE | 30–45m | After Wave 0 |
| 2 | Code: persistent undo button + aria-labels (TER-529) | STRICT | 45–60m | After Wave 0 |
| 3 | Tests: H1–H4 unit + E2E bulk delete | STRICT | 90–120m | After Wave 2 |
| 4 | Decision doc: TER-535 | SAFE | 20–30m | Parallel with Wave 3 |
| 5 | Terminology closeout: TER-546, TER-558 | SAFE | 20–30m | Parallel with Wave 3–4 |
| 6 | TER-233 implementation (TBD) | TBD | 4h–1d | After Wave 0 scope |
| QA | Full V4 gate + staging verify | STRICT | 30–45m | After all waves |

**Total estimated time (known scope, excludes TER-233 and TER-558 unknowns)**: ~5–7h across two implementation sessions

---

## File Touch Map

| File | Wave | Change Type |
|------|------|------------|
| `client/src/components/work-surface/InventoryWorkSurface.tsx` | Wave 2 | Add persistent undo button |
| `client/src/components/layout/AppHeader.tsx` | Wave 2 | Add aria-labels to theme + settings buttons |
| `client/src/components/work-surface/__tests__/InventoryWorkSurface.test.tsx` | Wave 3 | Add H1–H4 test suites |
| `tests-e2e/golden-flows/gf-00x-inventory-bulk-delete.spec.ts` | Wave 3 | New E2E spec |
| `docs/uiux/2026-03-05-dashboard-path-decision.md` | Wave 4 | New decision document |
| Linear: TER-189, 320, 323, 345, 546 | Waves 1, 5 | Status update + evidence attachment |
| Linear: TER-525, 526, 527, 529, 535 | After Wave 3/4 | Status update + evidence attachment |
| Linear: TER-523, 524 | After children close | Close parent trackers |

**No schema changes. No migrations. No new tRPC routers.**

---

## Guardrails

- All code changes in `InventoryWorkSurface.tsx` and `AppHeader.tsx` are **frontend-only**, no backend impact
- The persistent undo button reuses the existing `undo.undo()` call and `undo.state.canUndo` — no new state
- Do NOT rename existing component symbols or move files
- Do NOT add tests that require database connections — mock inventory data at the component boundary
- E2E spec must pass in CI without staging data assumptions (use mocks for blocked-batch scenario)
- TER-558 and TER-233: if scope is > 1 day of work, escalate to Evan before implementing — do not absorb unbounded scope into this roadmap
