# QA Strategy: Golden-Flow UX Revamp

**Branch**: `codex/golden-revamp-a386d3`
**Commit**: `be63947` — feat: complete golden-flow UX revamp and staging validation hardening
**Authored**: 2026-02-24
**Scope**: 32 files, +1943 / -983 lines across UI, navigation, powersheet selection, E2E tests, and design system

---

## 1. Change Summary & Risk Map

| Domain | Files | Risk | Rationale |
|--------|-------|------|-----------|
| **Powersheet selection + bulk actions** (LineItemTable, DirectIntake) | 5 | 🔴 RED | Touches order line-item mutation, multi-row submission, pricing calculations |
| **Purchase Orders work surface** | 1 | 🟡 STRICT | Modal → inline form refactor; form state persists alongside list |
| **Navigation state hook** | 2 | 🟡 STRICT | Complete rewrite; localStorage key migration; per-user scoping |
| **Sidebar + Quick Links** | 2 | 🟡 STRICT | Customizable quick links; pin/unpin UI; label renames (Sales→Sell, Inventory→Buy) |
| **Command Palette** | 1 | 🟢 SAFE | Refactored to derive from nav config; structurally simpler |
| **Design system (CSS)** | 1 | 🟢 SAFE | Fonts, colors, border-radius; visual-only but brand-wide |
| **E2E golden-flow tests** | 4 | 🟢 SAFE | More resilient selectors; fallback patterns; longer timeouts |
| **New unit tests** | 3 | 🟢 SAFE | New coverage for powersheet hooks and LineItemTable |
| **Type definitions** | 2 | 🟢 SAFE | New `powersheet.ts` interfaces; no runtime impact |

---

## 2. QA Phases

### Phase 0: Automated Gate (Pre-QA)

**Tools**: `pnpm check`, `pnpm lint`, `pnpm test`, `pnpm build`

Run the full Definition of Done gate against the branch to establish a baseline before any manual QA work begins. This catches regressions immediately.

```bash
# Checkout and verify
git checkout codex/golden-revamp-a386d3
git pull origin codex/golden-revamp-a386d3
pnpm install
pnpm check && pnpm lint && pnpm test && pnpm build
```

**Pass criteria**: Zero errors across all four commands.

---

### Phase 1: Schema & Pattern Audit

**Skill**: `/audit:schema`

Run the schema audit against the branch to detect any forbidden patterns introduced by the revamp. This is critical because the branch modifies business logic in LineItemTable and DirectIntakeWorkSurface.

**What it catches**:
- P0: Fallback user IDs (`ctx.user?.id || 1`)
- P0: Actor from input (`input.createdBy`)
- P0: `any` types
- P1: Hard deletes, vendors table usage
- Enum alignment drift

**Specific focus areas for this branch**:
1. `LineItemTable.tsx` — new bulk action handlers must not introduce `any` types
2. `DirectIntakeWorkSurface.tsx` — `handleSubmitSelected()` must use authenticated context, not input-derived actor
3. `PurchaseOrdersWorkSurface.tsx` — inline form handlers must preserve actor attribution
4. New `powersheet.ts` types — verify generic constraints are sound (no `any` escape hatches)

---

### Phase 2: terp-qa-reviewer (5-Lens Adversarial Review)

**Agent**: `terp-qa-reviewer`

This is the highest-leverage QA step for this branch. The terp-qa-reviewer runs a 5-lens adversarial analysis specifically designed to catch the kinds of bugs that slip through automated checks:

1. **Security lens** — Actor attribution in new bulk mutation handlers; no client-provided IDs trusted
2. **Correctness lens** — Bulk margin/COGS application math; selection state ↔ item array synchronization
3. **Regression lens** — Navigation localStorage key change breaks existing user state; route alias handling
4. **Performance lens** — `usePowersheetSelection` uses `Array.includes` for selection check (O(n) per row); `useMemo` dependency arrays in LineItemTable
5. **Edge-case lens** — Empty selection + "Apply Margin" click; duplicate all rows then delete all; zero-item order submission

**Why Opus 4.6 excels here**: The adversarial review requires holding 32 files of context simultaneously while reasoning about cross-file interaction patterns (e.g., "if the user pins `/direct-intake` but the route was renamed to `/receiving`, does the quick link still work?"). Opus 4.6's extended reasoning and large effective context window make it uniquely suited for this multi-file, cross-concern analysis.

---

### Phase 3: Golden Flows Audit

**Skill**: `/audit:golden-flows`

The branch modifies 4 of the golden-flow E2E specs. Run the golden-flows audit to verify that the critical business paths remain intact:

| Flow | Spec File | Changes | Risk |
|------|-----------|---------|------|
| GF-003: Order-to-Cash | `gf-003-order-to-cash.spec.ts` | Added timeout, explicit `data-testid` waits | Low |
| GF-004: Invoice & Payment | `gf-004-invoice-payment.spec.ts` | Refactored to role-based selectors, fallback row selection | Medium |
| GF-005: Pick & Pack | `gf-005-pick-pack-complete.spec.ts` | New `assertPickPackHeaderVisible` helper, flexible detail panel detection | Medium |
| GF-007: Inventory Management | `gf-007-inventory-management.spec.ts` | Simplified header assertion | Low |

**Key verification points**:
- E2E tests still pass against the revamped UI (new selectors match new markup)
- Tests don't become false-positives due to overly lenient `.catch(() => false)` patterns
- `data-testid` attributes referenced in tests actually exist in the component markup

---

### Phase 4: Targeted Unit Test Verification

**Existing tests on this branch** (run with `pnpm test`):

| Test File | What It Covers | Gap Analysis |
|-----------|---------------|--------------|
| `usePowersheetSelection.test.ts` | toggle, toggleAll, setSelection, dedup | ✅ Core selection logic covered |
| `LineItemTable.test.tsx` | Duplicate selected, bulk margin apply | ⚠️ Missing: delete selected, COGS apply, empty selection edge cases |
| `useNavigationState.test.ts` | Group collapse/expand, pin/unpin | ⚠️ Missing: scopeKey isolation, maxPinnedPaths enforcement, localStorage corruption recovery |
| `AppSidebar.test.tsx` | Sidebar renders with new labels | ✅ Label rename covered |

**Recommended additional unit tests** (Phase 4b):

1. **LineItemTable — delete selected rows**
   - Select all → delete → verify at least one row remains (or appropriate empty state)
   - Select none → click delete → verify no-op

2. **LineItemTable — bulk COGS application**
   - Apply COGS to subset → verify only selected rows updated
   - Apply invalid COGS (NaN, negative) → verify graceful handling

3. **usePowersheetSelection — stale selection cleanup**
   - Selected row IDs that no longer exist in the row list
   - Rapid toggle sequences (race conditions)

4. **useNavigationState — localStorage edge cases**
   - Corrupted JSON in localStorage → falls back to defaults
   - Different scopeKey → isolated state
   - maxPinnedPaths exceeded → truncated

5. **DirectIntakeWorkSurface — bulk submit**
   - Submit with mixed valid/invalid rows
   - Submit with no selection → no-op
   - Duplicate then submit duplicated rows

---

### Phase 5: Cross-Cutting Concern Analysis

These are the concerns that span multiple files and require holistic review. This is where Opus 4.6's reasoning depth provides the most value.

#### 5a. Selection State Consistency

The powersheet selection model is used in three places:
- `LineItemTable.tsx` (order line items)
- `DirectIntakeWorkSurface.tsx` (receiving grid)
- `LineItemRow.tsx` (individual row checkbox)

**Verify**:
- Selection IDs derived from `getRowSelectionId()` remain stable when items are reordered, duplicated, or deleted
- `useEffect` syncing `selectedRowId` → `rowSelection.setSelection` doesn't cause infinite render loops
- Checkbox state in `LineItemRow` correctly reflects `selected` prop from parent

#### 5b. Navigation Route Aliasing

The branch introduces `/receiving` as the primary route for what was `/direct-intake`:

```tsx
// App.tsx
Route("/receiving", DirectIntakeWorkSurface)
Route("/direct-intake", DirectIntakeWorkSurface) // backward compat
```

**Verify**:
- Sidebar active state highlights correctly for both `/receiving` and `/direct-intake`
- Quick link pinning works for either path
- Command palette navigates to `/receiving` (not the deprecated path)
- `normalizePath()` in Sidebar correctly maps aliases
- E2E tests use the correct routes

#### 5c. localStorage Migration

The navigation state storage key changed from `terp-navigation-state` to `terp-navigation-state:{scopeKey}`.

**Verify**:
- Existing users' pinned paths are NOT silently lost (either migrate or gracefully fall back to defaults)
- The old key is not orphaned in localStorage indefinitely
- Per-user scoping works when user changes (logout → login as different user)

#### 5d. Design System Accessibility

New OKLCH color palette:
- Primary: `oklch(0.53 0.13 44)` (terracotta)
- Sidebar: `oklch(0.135 0.01 60)` (near-black)
- Sidebar foreground: `oklch(0.93 0.01 60)` (near-white)

**Verify**:
- Contrast ratio of sidebar text on sidebar background meets WCAG AA (4.5:1 minimum)
- Active state border (`oklch(0.53 0.13 44)`) is distinguishable from inactive (`transparent`)
- New font stack (`Instrument Sans`, `Fraunces`, `DM Mono`) renders correctly when web fonts fail to load (system-ui fallbacks)
- `font-variant-numeric: tabular-nums` in `.font-mono-data` aligns numbers in data tables

---

### Phase 6: Inventory Audit (Regression Guard)

**Skill**: `/audit:inventory`

Even though this branch doesn't directly modify inventory business logic, it changes:
- The receiving/intake work surface (which creates inventory batches)
- The navigation that users use to access inventory pages
- The design system that renders inventory data

Run the inventory audit to verify that known recurring bugs (Pattern 1: $0 display, Pattern 2: "No inventory found") haven't been reintroduced.

---

## 3. Execution Plan

### Sequence (Dependencies →)

```
Phase 0 ──→ Phase 1 ──→ Phase 2 ──→ Phase 3
  (gate)     (schema)    (adversarial) (golden-flows)
                              │
                              ├──→ Phase 4 (unit tests)
                              │
                              └──→ Phase 5 (cross-cutting)
                                       │
                                       └──→ Phase 6 (inventory)
```

- **Phase 0** is blocking — if it fails, stop and fix before proceeding
- **Phases 1-3** run sequentially (each informs the next)
- **Phases 4-5** can run in parallel after Phase 2 (the adversarial review surfaces the specific areas to test)
- **Phase 6** runs last as a final regression guard

### Agent Assignment

| Phase | Agent/Skill | Model Strengths Used |
|-------|------------|---------------------|
| 0 | `Bash` (pnpm commands) | Deterministic; no reasoning needed |
| 1 | `/audit:schema` skill | Pattern matching across codebase |
| 2 | `terp-qa-reviewer` agent | **Opus 4.6 adversarial reasoning**: holds 32-file context, reasons about cross-file state flows, identifies edge cases humans miss |
| 3 | `/audit:golden-flows` skill | Structured business-flow verification |
| 4 | `terp-implementer` agent | Write and run missing unit tests |
| 4b | `terp-qa-reviewer` agent | Verify new tests aren't false-positives |
| 5 | **Manual Opus 4.6 analysis** | Deep cross-cutting reasoning across selection state, routing aliases, localStorage migration, and accessibility — this is where Opus 4.6's extended reasoning chain and ability to hold complex multi-file state graphs provides the highest signal |
| 6 | `/audit:inventory` skill | Known-pattern regression check |

---

## 4. Risk-Specific Test Scenarios

### 🔴 RED: Order Line Item Bulk Operations

| # | Scenario | Expected | Covers |
|---|----------|----------|--------|
| R1 | Select 2 of 5 line items → Apply 30% margin | Only selected rows get 30% margin; others unchanged | Bulk margin correctness |
| R2 | Select all → Duplicate → Verify new rows | Duplicated rows have no `id`, same data, correct count | Bulk duplicate |
| R3 | Select 1 row → Delete → Verify removal | Row removed; selection cleared; totals recalculated | Bulk delete |
| R4 | Select 0 rows → Click "Apply Margin" | No-op; no error thrown | Empty selection guard |
| R5 | Select row → Change COGS → Apply to selected | Only selected rows get new COGS; margin recalculated | COGS bulk apply |
| R6 | Rapid select/deselect while data loading | No stale selection IDs; no render loop | Race condition |

### 🔴 RED: Direct Intake Multi-Submit

| # | Scenario | Expected | Covers |
|---|----------|----------|--------|
| R7 | Select 3 pending rows → Submit | All 3 submitted; selection cleared | Bulk submit |
| R8 | Select mix of pending + completed → Submit | Only pending rows submitted | Status filtering |
| R9 | Delete all rows → Attempt submit | At least one row preserved; empty state handled | Boundary guard |
| R10 | Duplicate 5 rows rapidly → Verify IDs | All duplicated rows have unique IDs | ID generation |

### 🟡 STRICT: Navigation & Sidebar

| # | Scenario | Expected | Covers |
|---|----------|----------|--------|
| S1 | Navigate to `/direct-intake` | Renders receiving surface; sidebar shows "Receiving" active | Route alias |
| S2 | Pin 5 quick links (max is 4) | 5th pin rejected or replaces oldest | Max pin limit |
| S3 | Unpin all quick links | Defaults restored on next load | Default fallback |
| S4 | Log in as User A → pin links → log in as User B | User B sees their own (default) pins | Scope isolation |
| S5 | Corrupt localStorage → Reload | Graceful fallback to defaults; no crash | Error recovery |
| S6 | Open Command Palette → Type "receiving" | Shows "Receiving" command; navigates to `/receiving` | Palette sync |

### 🟢 SAFE: Design System

| # | Scenario | Expected | Covers |
|---|----------|----------|--------|
| G1 | View sidebar in light mode | Terracotta active border visible; text readable | Contrast |
| G2 | View sidebar in dark mode | Same contrast requirements met | Dark mode |
| G3 | Disable web fonts → Reload | System-ui fallback renders; layout doesn't break | Font fallback |
| G4 | View order table with monetary values | Numbers align in columns (tabular-nums) | Typography |

---

## 5. Definition of Done for QA

All of these must pass before the branch is approved for merge:

- [ ] **Phase 0**: `pnpm check && pnpm lint && pnpm test && pnpm build` — zero errors
- [ ] **Phase 1**: Schema audit — zero P0 blockers
- [ ] **Phase 2**: terp-qa-reviewer — SHIP verdict (no NO_SHIP findings)
- [ ] **Phase 3**: Golden-flows audit — all 4 modified flows verified
- [ ] **Phase 4**: New unit tests pass; gap tests written and passing
- [ ] **Phase 5a**: Selection state consistency verified across 3 consumers
- [ ] **Phase 5b**: Route aliasing works in sidebar, quick links, and command palette
- [ ] **Phase 5c**: localStorage migration doesn't silently drop user state
- [ ] **Phase 5d**: WCAG AA contrast ratios met for new color palette
- [ ] **Phase 6**: Inventory audit — no regressions in known patterns
- [ ] **All scenarios R1-R10, S1-S6, G1-G4**: Verified or covered by automated test

---

## 6. Why This Strategy Works for Opus 4.6

This QA strategy is designed to maximize the unique capabilities of Claude Opus 4.6:

1. **Extended reasoning chains** (Phase 2, 5): The adversarial review and cross-cutting analysis require holding complex state machine models in memory — selection state flowing from hook → parent component → child row → back to hook. Opus 4.6 can trace these flows across 10+ files without losing context.

2. **Multi-file context window** (Phase 2): The terp-qa-reviewer agent reads all 32 changed files and reasons about their interactions holistically, catching issues like "the E2E test asserts `data-testid="pick-pack-header"` exists but the component only adds it conditionally."

3. **Pattern recognition against known bugs** (Phase 1, 6): The audit skills encode TERP's specific recurring bug patterns. Opus 4.6's instruction-following precision ensures every check in `.claude/known-bug-patterns.md` is actually executed against the diff, not skipped.

4. **Adversarial thinking** (Phase 2): The 5-lens review is specifically designed to think like an attacker/tester rather than a developer. Opus 4.6's ability to switch perspectives — from "how was this intended to work" to "how could this break" — is critical for catching the edge cases in R4 (empty selection), R9 (delete all rows), and S5 (corrupt localStorage).

5. **Test gap identification** (Phase 4): By first understanding the full change set and then comparing against existing test coverage, Opus 4.6 can precisely identify which scenarios are uncovered rather than redundantly testing already-covered paths.

---

## 7. Quick-Start Commands

```bash
# Phase 0: Automated gate
pnpm check && pnpm lint && pnpm test && pnpm build

# Phase 1: Schema audit
# (use /audit:schema skill)

# Phase 2: Adversarial review
# (use terp-qa-reviewer agent against the branch diff)

# Phase 3: Golden flows audit
# (use /audit:golden-flows skill)

# Phase 4: Run existing tests
pnpm test -- --reporter=verbose

# Phase 6: Inventory audit
# (use /audit:inventory skill)
```
