# RC-001 Validation: Pricing Defaults Fix

**Date:** 2026-01-10
**Status:** Code Complete - Requires Production Validation

## Changes Made

### 1. `scripts/seed-pricing.ts`
- Fixed column name: `category` → `product_category`
- Added "OTHER", "DEFAULT", and additional categories
- Now seeds 12 categories instead of 8

### 2. `scripts/generators/pricing.ts`
- Fixed interface: `category` → `productCategory`, `defaultMargin` → `defaultMarginPercent`
- Added "OTHER", "DEFAULT" to PRODUCT_CATEGORIES array
- Updated generatePricing function to use correct field names

### 3. `server/services/pricingService.ts`
- Added 4-level fallback chain:
  1. Customer-specific margin from customPricingRules
  2. Default margin by exact category
  3. Fallback to "OTHER" category
  4. Fallback to "DEFAULT" category
  5. Return null (manual input required)

### 4. `server/routers/orders.ts`
- Use batch's `productCategory` instead of hardcoded "OTHER"
- Added 30% fallback margin with warning log if no pricing defaults found
- Prevents silent failure with 0% margin

## Validation Steps

### Step 1: Seed Pricing Defaults
```bash
pnpm seed:pricing
```

Expected output:
```
✓ Seeded 12 pricing defaults
```

### Step 2: Verify Database
```sql
SELECT * FROM pricing_defaults;
```

Expected: 12 rows including "OTHER" and "DEFAULT" categories

### Step 3: Test Order Creation
1. Login as QA Sales Manager
2. Go to Sales → Orders → New Order
3. Select a customer
4. Add an inventory item
5. Click "Preview & Finalize"
6. Click "Finalize"

Expected: Order finalizes successfully without "missing pricing defaults" error

### Step 4: Test Fallback Chain
1. Delete a specific category from pricing_defaults (e.g., "Flower")
2. Create an order with a Flower product
3. Should use "OTHER" or "DEFAULT" fallback
4. Check server logs for fallback warning

## Success Criteria

- [ ] Pricing defaults seed successfully (12 categories)
- [ ] Orders can be created and finalized
- [ ] No "missing pricing defaults" errors
- [ ] Fallback chain works when specific category missing
- [ ] Server logs show appropriate warnings when using fallback

## Related Bugs Fixed

- BUG-084: Pricing Defaults Table Missing
- BUG-086: Cannot finalize sales order due to missing pricing defaults
