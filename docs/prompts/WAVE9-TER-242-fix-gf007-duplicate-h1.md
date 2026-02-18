# TER-242: Fix Duplicate h1 Elements on Inventory Page (GF-007 Strict Mode)

## Task Summary

Playwright strict mode detects multiple h1 elements when navigating to /inventory. The test locator `h1:has-text("Inventory")` matches more than one h1 due to Radix Tabs keeping both TabsContent nodes in the DOM.

## Verification Mode: STRICT

## Root Cause

1. `InventoryWorkspacePage.tsx` (line 23) renders an `<h1>` with `data-testid="inventory-header"` — the workspace-level heading
2. `ProductsWorkSurface.tsx` (line 805) renders an `<h1>` "Product Catalogue" — Radix Tabs keeps BOTH TabsContent nodes in DOM
3. Result: two `<h1>` elements simultaneously

**Systemic issue**: 9 of 10 WorkSurface components use `<h1>` for internal headers. Only `InventoryWorkSurface.tsx` correctly uses `<h2>`.

## Fix Strategy

WorkSurface components are embedded inside WorkspacePages. The WorkspacePage owns the `<h1>`. WorkSurface headers should be `<h2>`.

## Changes Required

### Change 1 (PRIMARY — fixes GF-007):
**File: `client/src/components/work-surface/ProductsWorkSurface.tsx`** line 805:
Change `<h1>` to `<h2>` (and closing tag)

### Change 2 (SYSTEMIC — all WorkSurfaces):
Apply h1 → h2 in ALL these files:
- `OrdersWorkSurface.tsx` (~line 906)
- `QuotesWorkSurface.tsx` (~line 568)
- `ClientsWorkSurface.tsx` (~line 794)
- `VendorsWorkSurface.tsx` (~line 457)
- `ClientLedgerWorkSurface.tsx` (~line 790)
- `PurchaseOrdersWorkSurface.tsx` (~line 694)
- `InvoicesWorkSurface.tsx` (~line 752)
- `PickPackWorkSurface.tsx` (~line 787)
- `DirectIntakeWorkSurface.tsx` (~line 1472)

**DO NOT change** `InventoryWorkSurface.tsx` — already uses `<h2>`.

### Change 3 (TEST HARDENING):
**File: `tests-e2e/golden-flows/gf-007-inventory-management.spec.ts`** lines 21-24:
```typescript
// BEFORE
const header = page
  .locator('[data-testid="inventory-header"]')
  .or(page.locator('main h1:has-text("Inventory")'))
  .or(page.locator('h1:has-text("Inventory")'));
// AFTER
const header = page
  .locator('[data-testid="inventory-header"]')
  .or(page.locator('h1:has-text("Inventory")').first());
```

## Important Notes
- Keep the same CSS classes — only change semantic tag
- Do NOT modify WorkspacePage h1 elements — those are correct
- WCAG 2.1 AA: one h1 per page is best practice

## Verification Protocol

```bash
pnpm check   # TypeScript — must pass
pnpm lint    # ESLint — must pass
pnpm test    # Unit tests — must pass
pnpm build   # Build — must succeed
```

## Commit Format

```
fix(work-surface): demote h1 to h2 in embedded WorkSurface headers (TER-242)
```
