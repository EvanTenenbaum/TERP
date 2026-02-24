# TERP Golden-Flow Revamp: Score-to-90 Execution Roadmap

## Purpose

Raise the adversarial quality score from **62/100** to **>=90/100** for the current frontend revamp branch by fixing critical gaps in:

- Technical correctness and regression safety
- UX/UI consistency and discoverability
- Golden-flow business outcomes
- Guardrail strength and reproducibility

This roadmap is **Codex-only**, **staging-first**, and uses strict pass/fail gates per atomic task.

## Scope and Constraints (Locked)

- Preserve existing functional access (no route/functionality loss).
- Powersheet UX standard remains required for applicable contexts (`PO`, `Orders`, `Receiving`).
- Keep `/direct-intake` and `/receiving` route compatibility.
- No new explicit `any` in changed files.
- No placeholder/stub behavior in MVP flows.
- Schema strategy: additive only, map-to-existing canonical models.
- Validation target: `http://terp-staging-yicld.ondigitalocean.app`.

## Scoring Model (Adversarial)

- Technical correctness and regression resistance: **35 points**
- UX/UI logic consistency and usability quality: **25 points**
- Golden-flow business fidelity: **25 points**
- Guardrails, test trustworthiness, and reproducibility: **15 points**

### Target profile for >=90

- No P1 findings open.
- At most 1 low-impact P2 finding.
- Golden-flow tests assert business outcomes (not just visibility/navigation).
- All gates green locally and on staging validation pass.

## Global Gate Stack (Run at Every Work Package Exit)

```bash
pnpm typecheck
pnpm lint
DATABASE_URL=<valid_db_url> pnpm audit:schema-drift:strict
DATABASE_URL=<valid_db_url> pnpm audit:schema-fingerprint:strict
pnpm gate:invariants
pnpm gate:parity
```

## Atomic Work Packages

### WP-01: Fix Receiving bulk-remove data integrity bug (P1)

**Problem**
Bulk remove clears media and selection even when deletion is blocked by guard.

**Files**

- `/Users/evan/spec-erp-docker/TERP/TERP/client/src/components/work-surface/DirectIntakeWorkSurface.tsx`
- `/Users/evan/spec-erp-docker/TERP/TERP/tests-e2e/golden-flows/gf-001-direct-intake.spec.ts`

**Atomic tasks**

1. Return early from `handleRemoveSelected` before side effects when removal guard fails.
2. Ensure media cleanup only runs when rows are actually removed.
3. Add regression test for “attempt remove all pending rows” preserving row + media state.

**Exit criteria**

- Guarded remove does not mutate row/media/selection state.
- GF-001 still passes.

**Expected score lift**: +8

---

### WP-02: Make Receiving submit-selected resilient (P1)

**Problem**
`isSubmitting` can remain stuck true if an exception escapes loop.

**Files**

- `/Users/evan/spec-erp-docker/TERP/TERP/client/src/components/work-surface/DirectIntakeWorkSurface.tsx`
- `/Users/evan/spec-erp-docker/TERP/TERP/client/src/components/work-surface/__tests__/DirectIntakeWorkSurface.test.tsx` (add if missing)

**Atomic tasks**

1. Wrap `handleSubmitSelected` in `try/finally` to always reset loading state.
2. Add unit/component test that injects failure and verifies action controls recover.

**Exit criteria**

- No permanent submit lock after injected failure.
- Error toast/state present and controls re-enabled.

**Expected score lift**: +4

---

### WP-03: Enforce unified navigation contract across Sidebar + Command Palette + Quicklinks (P1)

**Problem**
Command palette and quicklink customization can bypass feature-flag/availability filtering.

**Files**

- `/Users/evan/spec-erp-docker/TERP/TERP/client/src/config/navigation.ts`
- `/Users/evan/spec-erp-docker/TERP/TERP/client/src/components/layout/Sidebar.tsx`
- `/Users/evan/spec-erp-docker/TERP/TERP/client/src/components/CommandPalette.tsx`
- `/Users/evan/spec-erp-docker/TERP/TERP/client/src/hooks/useNavigationState.ts`
- `/Users/evan/spec-erp-docker/TERP/TERP/client/src/components/layout/AppSidebar.test.tsx`

**Atomic tasks**

1. Introduce a single exported `buildNavigationAccessModel(...)` from nav config that returns filtered nav + command + quicklink candidates.
2. Update Sidebar and Command Palette to consume the same filtered source.
3. Restrict quicklink customization list to only currently accessible destinations.
4. Add test proving feature-flagged routes are absent from both sidebar and command palette when disabled.

**Exit criteria**

- Sidebar/quicklinks/command palette produce identical accessible route set.
- No inaccessible or feature-disabled quicklink can be pinned.

**Expected score lift**: +9

---

### WP-04: Complete PO powersheet parity (P2)

**Problem**
PO draft is inline but missing full powersheet interaction contract.

**Files**

- `/Users/evan/spec-erp-docker/TERP/TERP/client/src/components/work-surface/PurchaseOrdersWorkSurface.tsx`
- `/Users/evan/spec-erp-docker/TERP/TERP/client/src/hooks/powersheet/usePowersheetSelection.ts`
- `/Users/evan/spec-erp-docker/TERP/TERP/client/src/types/powersheet.ts`
- `/Users/evan/spec-erp-docker/TERP/TERP/tests-e2e/golden-flows/gf-002-procure-to-pay.spec.ts`

**Atomic tasks**

1. Add row selection checkboxes for PO draft rows.
2. Add bulk actions: duplicate, delete, apply qty/cost to selection.
3. Add deterministic focus behavior after duplicate/delete/add.
4. Add keyboard traversal contract (Enter/Tab/Arrows/Escape) to PO draft rows.
5. Add running total and selected-count strip parity with Orders/Receiving.

**Exit criteria**

- PO draft supports same core powersheet affordances as Orders/Receiving.
- GF-002 passes with at least one bulk action scenario.

**Expected score lift**: +8

---

### WP-05: Terminology and IA consistency cleanup (P2)

**Problem**
Nav says “Receiving” while core page title still says “Direct Intake”.

**Files**

- `/Users/evan/spec-erp-docker/TERP/TERP/client/src/components/work-surface/DirectIntakeWorkSurface.tsx`
- `/Users/evan/spec-erp-docker/TERP/TERP/client/src/components/layout/AppBreadcrumb.tsx`
- `/Users/evan/spec-erp-docker/TERP/TERP/client/src/config/navigation.ts`

**Atomic tasks**

1. Update primary page heading/eyebrow copy to “Receiving” while retaining backend route compatibility.
2. Verify breadcrumb labels are consistent for both `/receiving` and `/direct-intake`.
3. Verify quicklink/action labels remain consistent (“Record Receipt”).

**Exit criteria**

- No user-visible IA term conflict in target flows.

**Expected score lift**: +3

---

### WP-06: Replace weak E2E assertions with business-outcome assertions (P1)

**Problem**
Some tests can pass without validating business logic.

**Files**

- `/Users/evan/spec-erp-docker/TERP/TERP/tests-e2e/golden-flows/gf-003-order-to-cash.spec.ts`
- `/Users/evan/spec-erp-docker/TERP/TERP/tests-e2e/golden-flows/gf-004-invoice-payment.spec.ts`
- `/Users/evan/spec-erp-docker/TERP/TERP/tests-e2e/golden-flows/gf-005-pick-pack-complete.spec.ts`
- `/Users/evan/spec-erp-docker/TERP/TERP/tests-e2e/golden-flows/gf-007-inventory-management.spec.ts`

**Atomic tasks**

1. Remove always-true assertion patterns (`>= 0`, non-assertive visibility-only checks).
2. For GF-003: assert order creation artifacts + invoice linkage + ledger/AR state change.
3. For GF-004: assert payment posting changes invoice/payment status.
4. For GF-005: assert pick/pack completion state transition for an order.
5. For GF-007: assert inventory adjustment causes measurable quantity/value change.
6. Add helper assertions that fail hard on missing data where seeded data is required.

**Exit criteria**

- Every critical spec has at least one business-state assertion.
- No tautological assertions remain.

**Expected score lift**: +9

---

### WP-07: Add trust guards against future weak tests (P2)

**Problem**
Weak assertion patterns can creep back.

**Files**

- `/Users/evan/spec-erp-docker/TERP/TERP/scripts/qa/` (new checker script)
- `/Users/evan/spec-erp-docker/TERP/TERP/package.json`
- `/Users/evan/spec-erp-docker/TERP/TERP/tests-e2e/golden-flows/`

**Atomic tasks**

1. Add static QA guard script to fail on known bad patterns in golden-flow specs:
   - `expect(...).toBeGreaterThanOrEqual(0)` on counts
   - assertions that only test visibility where named business expectation is required
2. Add `pnpm gate:e2e-quality` and include it in local release checklist.

**Exit criteria**

- Guard fails on intentionally injected weak assertion and passes on clean specs.

**Expected score lift**: +4

---

### WP-08: Strengthen 90/20 coverage in critical contracts (P2)

**Problem**
Current tests don’t fully lock high-risk contract points.

**Files**

- `/Users/evan/spec-erp-docker/TERP/TERP/client/src/components/orders/LineItemTable.test.tsx`
- `/Users/evan/spec-erp-docker/TERP/TERP/client/src/hooks/powersheet/usePowersheetSelection.test.ts`
- `/Users/evan/spec-erp-docker/TERP/TERP/client/src/hooks/useNavigationState.test.ts`

**Atomic tasks**

1. Add test: bulk COGS update sets override note and preserves non-selected rows.
2. Add test: selection reconciliation after row deletion keeps valid rows only.
3. Add test: nav scope isolation across two users for pinned quicklinks.
4. Add test: `/direct-intake` normalization behaves identically to `/receiving` for active-state logic.

**Exit criteria**

- New tests pass and protect known failure modes.

**Expected score lift**: +4

---

### WP-09: Staging self-heal validation run (hard release gate)

**Problem**
Local green != staging green. Must validate against live URL and self-heal failures.

**Commands**

```bash
pnpm seed:mvp-redesign
PLAYWRIGHT_BASE_URL=http://terp-staging-yicld.ondigitalocean.app pnpm test:e2e tests-e2e/golden-flows/gf-00*.spec.ts --project=chromium --workers=1
ORACLE_RUN_MODE=tier1 PLAYWRIGHT_BASE_URL=http://terp-staging-yicld.ondigitalocean.app pnpm qa:test:flow
```

**Self-heal loop (max 3 cycles)**

1. Classify: app regression vs selector drift vs test-data issue vs env instability.
2. Fix in that order: data/setup -> app bug -> selectors.
3. Re-run full critical pack.
4. Stop and open blocker tickets if still failing on cycle 3.

**Exit criteria**

- `0 FAIL`, `0 BLOCKED` on MVP-critical golden flows.

**Expected score lift**: +7

---

### WP-10: Linear issue hygiene and debt continuity (required)

**Problem**
Deferred work can vanish after MVP pressure.

**Atomic tasks**

1. Create/update Linear issues for any unresolved item with required fields:
   - impacted flow
   - repro path
   - artifact path
   - owner
   - acceptance criteria
2. Status discipline:
   - blockers: not `Backlog`
   - post-MVP debt: explicit `[POST-MVP-DEBT]`

**Exit criteria**

- No unresolved defer without Linear ID.

**Expected score lift**: +2

## Recommended Execution Order

1. WP-01
2. WP-02
3. WP-03
4. WP-06
5. WP-07
6. WP-04
7. WP-05
8. WP-08
9. WP-09
10. WP-10

This order removes high-severity risk first, then closes test-trust gaps, then completes parity and polish.

## Definition of Done for Score >=90

- All P1 issues closed.
- PO/Orders/Receiving powersheet contracts behaviorally aligned.
- Golden-flow tests validate business outcomes and pass on staging.
- All strict gates pass with no new explicit `any`.
- Remaining non-blocking debt is tracked in Linear with clear ownership.
