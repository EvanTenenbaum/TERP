# TER-238: Fix Brittle Row-Count Assertion in GF-001 Direct Intake E2E Test

## Task Summary

The E2E golden flow test for Direct Intake (`GF-001`) at `tests-e2e/golden-flows/gf-001-direct-intake.spec.ts` contains a brittle assertion pattern that counts AG Grid rows and will break any time the component's initial row count changes or when test data residue alters the grid state.

## Verification Mode: SAFE (test-only change, no production code modified)

## Problem Analysis

There are **three coupled brittleness points** in the test, all on lines 72-79:

```typescript
const rows = page.locator(".ag-center-cols-container .ag-row");
const initialRowCount = await rows.count();
await addRowButton.click();
await expect(rows).toHaveCount(initialRowCount + 1);
const rowIndex = initialRowCount;
```

**Why this is brittle:**

1. **INITIAL_ROW_COUNT dependency**: The component initializes with `INITIAL_ROW_COUNT = 5` empty rows. If that constant changes, the test becomes fragile.
2. **Race condition on count**: `await rows.count()` is a point-in-time snapshot with NO retry. If AG Grid is still rendering, the count could be partial.
3. **Positional row index assumption**: `const rowIndex = initialRowCount` assumes the newly added row is always at position N. AG Grid row-index attributes can shift with sorting/filtering.

## Fix Approach

Replace lines 72-79 with:

```typescript
const rows = page.locator(".ag-center-cols-container .ag-row");

// Wait for AG Grid to finish rendering initial rows before snapshotting count.
await expect(rows.first()).toBeVisible({ timeout: 10_000 });
const initialRowCount = await rows.count();

await addRowButton.click();

// Wait for at least one new row to appear.
await expect(rows).toHaveCount(initialRowCount + 1, { timeout: 10_000 });

// Derive the new row's AG Grid row-index from the DOM instead of assuming
// it equals initialRowCount.
const lastRow = rows.last();
const rowIndexAttr = await lastRow.getAttribute("row-index");
const rowIndex = rowIndexAttr !== null ? parseInt(rowIndexAttr, 10) : initialRowCount;
```

## Files to Modify

- `tests-e2e/golden-flows/gf-001-direct-intake.spec.ts` (lines 72-79 only)

## Files NOT to Modify

- `tests-e2e/utils/golden-flow-helpers.ts`
- `client/src/components/work-surface/DirectIntakeWorkSurface.tsx`

## Verification Protocol (MANDATORY)

```bash
pnpm check   # TypeScript — must pass
pnpm lint    # ESLint — must pass
pnpm test    # Unit tests — must pass
pnpm build   # Build — must succeed
```

## Adversarial Edge Cases

| # | Scenario | How fix handles it |
|---|----------|-------------------|
| 1 | INITIAL_ROW_COUNT changes from 5 to 1 | DOM-based row-index read |
| 2 | AG Grid hasn't rendered when count() called | `expect(rows.first()).toBeVisible()` gates snapshot |
| 3 | Leftover rows from prior test | Count-then-increment is relative |
| 4 | row-index attribute is null | Fallback to initialRowCount |

## Commit Format

```
fix(e2e): stabilize GF-001 direct intake row-count assertion (TER-238)
```
