# E2E Stabilization Remediation Plan

**Goal**: Turn a D+ (3.5/10) into a 9.5/10 by actually delivering what was promised.

**Principle**: Delete what's unused, integrate what's useful, fix what's broken, and report honestly.

---

## Phase 0: Prune Dead Infrastructure (15 min)

The 5 utility modules have zero imports. Either make them useful or delete them.

### 0a. DELETE `tests-e2e/utils/selectors.ts`

- **Reason**: Pure abstraction over Playwright APIs. `button(page, "Submit")` is not better than `page.getByRole("button", { name: "Submit" })`. No spec uses it, no spec should use it.

### 0b. DELETE `tests-e2e/utils/test-tags.ts`

- **Reason**: `tagSuite()` is fundamentally broken (annotations aren't matched by `--grep`). Tags are already manually embedded in `test.describe()` titles, which IS the correct approach. This file adds nothing.

### 0c. SIMPLIFY `tests-e2e/utils/wait-helpers.ts`

- Remove thin wrappers that just call one Playwright method (`waitForNetworkIdle` = `page.waitForLoadState("networkidle")`)
- Keep only functions with real composite logic:
  - `waitForLoadingComplete()` (waits for skeleton/spinner to disappear — useful)
  - `waitForTableReady()` (combines skeleton wait + row wait — useful)
- Remove duplicate `waitForToast()` (golden-flow-helpers.ts already has the one that's actually used)
- Remove `waitForNavigation()`, `waitForDialog()`, `waitForSearchResults()` (thin wrappers)
- Fix `.catch(() => false)` inside the module itself (the infrastructure shouldn't use the anti-pattern it replaces)

### 0d. KEEP `tests-e2e/utils/environment.ts` (used by preconditions.ts)

- No changes needed, but it only becomes valuable once preconditions.ts is adopted

### 0e. REFACTOR `tests-e2e/utils/preconditions.ts`

- Rename `skipUnlessProduction()` → `skipIfNotProduction()` (clearer name)
- Add a new helper: `requireOneOf(page, selectors[], failReason)` — for the `expect(x || y).toBeTruthy()` pattern
- Ensure `requireElement()` and `requireDataRows()` work correctly

### 0f. UPDATE `tests-e2e/ENVIRONMENT_CONTRACT.md`

- Remove references to deleted utilities
- Document what's actually used vs. available

---

## Phase 1: Eliminate `.catch(() => false)` Anti-Pattern (the big one)

**Scope**: 401 instances across 44 spec files.

**Categorization** (from audit):

- ~75% are Category A (precondition guard pattern — `.catch(() => false)` + `test.skip()` or conditional block). These are functionally correct but should use `requireElement()` for clarity.
- ~25% are Category B (silent swallowing — result used in `expect(x || y)` or silently changes code path). These are genuinely broken.

### Strategy

**Category B fixes (Priority — these are the real bugs):**

Replace all `expect(x || y).toBeTruthy()` patterns (26 instances across 11 files) with one of:

1. `await expect(page.locator('selector1, selector2')).toBeVisible()` — when checking for alternative UI renderings of the same thing
2. Separate assertions with clear failure messages — when checking distinct success conditions
3. `requireOneOf()` precondition guard + `test.skip()` — when the test can't proceed without one of these elements

**Category A cleanups (Lower priority — correct but messy):**

Replace verbose inline patterns:

```typescript
// BEFORE (correct but verbose, 5 lines)
const isVisible = await element.isVisible().catch(() => false);
if (!isVisible) {
  test.skip(true, "Element not available");
  return;
}

// AFTER (1 line, same behavior)
await requireElement(page, "selector", "Element not available");
```

This is a mechanical transformation. Apply to the highest-count files first.

### Work Packages (parallelizable)

| Package                           | Files                                                                                                                                   | `.catch(() => false)` count | Priority                         |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | -------------------------------- |
| **WP-1a: RBAC specs**             | sales-rep-flows (39), accounting-flows (32), inventory-manager-flows (25)                                                               | 96                          | HIGH — most Category B instances |
| **WP-1b: Critical paths group 1** | order-fulfillment (25), returns-workflow (21), sales-client-management (20)                                                             | 66                          | MEDIUM — mostly Category A       |
| **WP-1c: Critical paths group 2** | client-credit (18), inventory-intake (13), pick-pack (12), sales-sheet (10)                                                             | 53                          | MEDIUM                           |
| **WP-1d: Golden flows**           | cmd-k (12), invoice-to-payment (11), order-creation (11), order-to-invoice (9), pick-pack-fulfillment (9)                               | 52                          | MEDIUM                           |
| **WP-1e: Critical paths group 3** | leaderboard (9), kpi-actionability (9), accounting-quick-payment (9), calendar-events (8), locations-mgmt (6), vip-admin (5)            | 46                          | MEDIUM                           |
| **WP-1f: Remaining specs**        | clients-crud (8), must-hit (7), visual (7), inventory-crud (7), resilience (8), a11y (7), journey-gen (5), security (4), remaining (40) | 88                          | LOW                              |

**Each work package must**:

1. Import `requireElement`, `requireDataRows`, `requireOneOf` from `../utils/preconditions`
2. Replace every `.catch(() => false)` with the appropriate precondition helper
3. Replace every `expect(x || y).toBeTruthy()` with a proper assertion or precondition guard
4. Run `pnpm check` to verify TypeScript
5. No new anti-patterns introduced

---

## Phase 2: Eliminate `waitForTimeout` Calls

**Scope**: 30 actionable calls across 8 spec files (4 are intentional test pacing — keep those).

### Replacements by type

**DELETE (10 calls)** — redundant, `networkidle` already called on prior line:

- `visual.spec.ts` lines 41, 52, 62, 72, 95, 105, 187, 241, 257
- `concurrency.spec.ts` line 185

**Replace with `waitForLoadState("networkidle")` (4 calls):**

- `security.spec.ts:193`, `performance.spec.ts:157`, `accessibility.spec.ts:151`, `journey-generator.spec.ts:280`

**Replace with `element.waitFor({ state: "visible" })` (12 calls):**

- Theme toggles (visual.spec.ts:130,154; journey-generator:219) → `page.waitForFunction(() => document.documentElement.classList.contains('dark'))` or inverse
- Command palette opens (visual:214,222; a11y:138; journey-gen:205) → `page.locator('[role="dialog"]').first().waitFor({ state: "visible", timeout: 2000 })`
- Modal/popup (journey-gen:263,318) → `page.locator('[role="dialog"]').first().waitFor()`
- Error/toast (security:70; resilience:63) → `page.locator('[role="alert"], .toast').first().waitFor()`
- Charts (visual:85) → `page.locator('canvas, .chart-container').first().waitFor({ state: "visible", timeout: 3000 })`

**KEEP (4 calls)** — intentional test design:

- `security.spec.ts:221` (rate limit pacing)
- `resilience.spec.ts:109` (offline simulation)
- `journey-generator.spec.ts:406` (action pacing)
- `concurrency.spec.ts:136` (race condition test)

Add a `// Intentional: <reason>` comment to each kept instance.

### Work Package

Single agent: **WP-2: waitForTimeout cleanup** — all 8 files, 26 changes + 4 annotations.

---

## Phase 3: Fix `expect(x || y).toBeTruthy()` Soft Assertions

**Scope**: 26 instances across 11 files. These overlap with Phase 1 (the `.catch(() => false)` often feeds into these).

**Fix strategy per pattern**:

| Pattern                                                              | Count | Fix                                                                                                       |
| -------------------------------------------------------------------- | ----- | --------------------------------------------------------------------------------------------------------- |
| `expect(hasTable \|\| hasCards).toBeTruthy()`                        | 5     | `await expect(page.locator('table, [role="grid"], .card')).toBeVisible()` — single locator with CSS comma |
| `expect(hasError \|\| stillOnLogin).toBeTruthy()`                    | 3     | Use `expect.soft()` for each, OR `expect(page.url()).toMatch(/login\|error/)`                             |
| `expect(isRedirected \|\| hasAccessDenied \|\| has404).toBeTruthy()` | 4     | RBAC guard: `expect(page.url()).not.toContain('/admin')` + `expect` on specific denial indicator          |
| `expect(url.includes("x") \|\| url.includes("y")).toBeTruthy()`      | 3     | `expect(page.url()).toMatch(/accounting\|invoices/)` — regex                                              |
| `expect(paletteVisible \|\| searchFocused).toBeTruthy()`             | 3     | `await expect(page.locator('[role="dialog"], [data-command-palette], input:focus')).toBeVisible()`        |
| `expect(detailsVisible \|\| urlChanged).toBeTruthy()`                | 3     | Navigation assertion: `await expect(page).toHaveURL(/location\|clients/)`                                 |
| Other OR patterns                                                    | 5     | Case-by-case with proper Playwright assertions                                                            |

**Note**: These fixes are done AS PART of Phase 1 work packages. No separate agent needed — just ensure WP-1a through WP-1f address these when they encounter them.

---

## Phase 4: Wire Up `waitForLoadingComplete` and `waitForTableReady`

After Phase 1 integrates `preconditions.ts`, also integrate the two surviving `wait-helpers.ts` functions into specs that navigate to table pages.

**Target**: Any spec that does `page.goto('/someTablePage')` followed by `waitForLoadState("networkidle")` could benefit from `waitForTableReady()` which also waits for skeletons to disappear and rows to appear.

**Scope**: ~20 specs that navigate to table-heavy pages (clients, inventory, orders).

This is lower priority — the current `networkidle` approach works, this just makes it more robust. Include in Phase 1 work packages where it naturally fits.

---

## Phase 5: Rewrite Deliverable Reports

After all code changes are complete, regenerate all 6 reports in `qa-results/` to accurately reflect:

- Actual counts before/after for each anti-pattern
- Which utilities are used vs. deleted
- Honest assessment of remaining gaps
- Real numbers, not aspirational claims

---

## Execution Plan

### Agent Parallelization

**Wave 1** (parallel — no dependencies):

- Agent A: Phase 0 (prune infrastructure) — 15 min
- Agent B: WP-2 (waitForTimeout cleanup) — 20 min

**Wave 2** (parallel — depends on Phase 0 for the refactored preconditions.ts):

- Agent C: WP-1a (RBAC specs — 96 instances, highest Category B density)
- Agent D: WP-1b (critical paths group 1 — 66 instances)
- Agent E: WP-1c (critical paths group 2 — 53 instances)
- Agent F: WP-1d (golden flows — 52 instances)

**Wave 3** (parallel — remaining files):

- Agent G: WP-1e (critical paths group 3 — 46 instances)
- Agent H: WP-1f (remaining specs — 88 instances)

**Wave 4** (sequential):

- QA agent: Verify zero remaining anti-patterns via grep
- Report agent: Phase 5 (rewrite reports)

### Verification Gates

After each wave, verify:

```bash
# Zero soft assertions
grep -r '|| true)\.toBeTruthy' tests-e2e/ --include="*.spec.ts" | wc -l  # Must be 0
grep -r 'expect(.*||.*).toBeTruthy' tests-e2e/ --include="*.spec.ts" | wc -l  # Must be 0

# Zero unintentional waitForTimeout (only 4 annotated "Intentional" ones remain)
grep -r 'waitForTimeout' tests-e2e/ --include="*.spec.ts" | grep -v 'Intentional' | wc -l  # Must be 0

# .catch(() => false) eliminated or wrapped in precondition helpers
grep -r '\.catch(() => false)' tests-e2e/ --include="*.spec.ts" | wc -l  # Must be 0

# Utility adoption
grep -r "from.*preconditions" tests-e2e/ --include="*.spec.ts" | wc -l  # Must be > 30

# TypeScript + lint + tests
pnpm check && pnpm lint && pnpm test
```

### Success Criteria (9.5/10)

| Dimension                 | Target | Metric                                                      |
| ------------------------- | ------ | ----------------------------------------------------------- |
| Suite separation          | 9.5    | Tags correct on all specs, config works                     |
| Anti-pattern removal      | 9.5    | 0 silent catches, 0 soft asserts, ≤4 intentional waits      |
| Utility adoption          | 9.5    | preconditions.ts imported by 30+ specs, wait-helpers by 15+ |
| Infrastructure quality    | 9.5    | Dead code deleted, remaining modules have real value        |
| Report accuracy           | 10     | Every number backed by grep evidence                        |
| Real stabilization impact | 9.5    | Tests skip explicitly instead of silently passing           |
| Code harm                 | 10     | Nothing broken, all checks pass                             |

---

## Risk Factors

1. **Scale**: 401 `.catch(() => false)` across 44 files is a LOT of mechanical changes. Risk of introducing typos.
   - Mitigation: TypeScript will catch most errors. Run `pnpm check` after each file.

2. **Behavioral changes**: Replacing silent catches with `test.skip()` means tests that previously "passed" silently will now show as "skipped." This is correct behavior but may surprise people.
   - Mitigation: Document in reports that skip count will increase.

3. **Some `.catch(() => false)` may be legitimate**: Not every instance is an anti-pattern. Element visibility checks in if/else branches are acceptable.
   - Mitigation: Use `requireElement()` which preserves the behavior but adds logging. For if/else branches, keep the pattern but add comments.

4. **Merge conflicts**: This touches 44+ files. If anyone else is working on E2E tests, conflicts are likely.
   - Mitigation: Do it all in one focused session, push immediately.
