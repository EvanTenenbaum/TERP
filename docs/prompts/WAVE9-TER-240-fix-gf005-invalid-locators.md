# TER-240: Fix Invalid Locator Syntax in GF-005 Pick & Pack E2E Tests

## Task Summary

Fix all invalid Playwright locator selectors across Pick & Pack E2E test files. Two categories of bugs:

1. **`:text("...")` pseudo-selector** — NOT valid Playwright CSS. Use `page.getByText()` or `:has-text()` instead.
2. **`text=/regex/` inside CSS strings** — Cannot mix `text=` engine inside CSS. Use `.or()` chains.

## Verification Mode: STRICT

## Changes Required (5 fixes across 3 files)

### File 1: `tests-e2e/golden-flows/gf-005-pick-pack.spec.ts`

**Line 26** — Replace `:text("No orders to pick")`:
```typescript
// BEFORE
.or(page.locator(':text("No orders to pick")'));
// AFTER
.or(page.getByText("No orders to pick"));
```

### File 2: `tests-e2e/golden-flows/gf-005-pick-pack-complete.spec.ts`

**Lines 241-243** — Replace mixed `text=` in CSS string:
```typescript
// BEFORE
const emptyMessage = page.locator(
  '[data-testid="order-queue-empty"], text=/no.*found/i, text=/no orders/i'
);
// AFTER
const emptyMessage = page.locator('[data-testid="order-queue-empty"]')
  .or(page.getByText(/no.*found/i))
  .or(page.getByText(/no orders/i));
```

**Do NOT change** lines 499, 505 — standalone `text=` engine locators are valid.

### File 3: `tests-e2e/golden-flows/pick-pack-fulfillment.spec.ts`

**Line 28**:
```typescript
// BEFORE
const stats = page.locator(':text("Pending"), :text("Picking"), :text("Packed")');
// AFTER
const stats = page.getByText("Pending").or(page.getByText("Picking")).or(page.getByText("Packed"));
```

**Line 46**:
```typescript
// BEFORE
const details = page.locator(':text("Order"), :text("Items")');
// AFTER
const details = page.getByText("Order").or(page.getByText("Items"));
```

**Line 173**:
```typescript
// BEFORE
const details = page.locator(':text("Details"), :text("Location"), :text("Quantity")');
// AFTER
const details = page.getByText("Details").or(page.getByText("Location")).or(page.getByText("Quantity"));
```

**Do NOT change** `:has-text()` selectors — those are valid Playwright CSS.

## Verification Protocol

```bash
pnpm check   # TypeScript — must pass
pnpm lint    # ESLint — must pass
pnpm test    # Unit tests — must pass
pnpm build   # Build — must succeed
```

## Commit Format

```
fix(e2e): replace invalid :text() and text= locators in GF-005 pick-pack tests (TER-240)
```
