# P2 Tranche 1 — Design

## Seam 2: LIVE-First Defaults

**Current state:** `useInventoryFilters.ts` defaults `status: []` (all statuses). `AdvancedFilters.tsx` shows all checkboxes unchecked.

**Change:**

1. `useInventoryFilters.ts` — change `defaultFilters.status` from `[]` to `["LIVE"]`
2. `AdvancedFilters.tsx` — LIVE checkbox checked by default
3. URL deep linking already works — `?status=LIVE` will match the default

**Status label mapping:**
Create a `statusLabels` map in a shared location (e.g., `client/src/lib/statusTokens.ts` which already has `INVENTORY_STATUS_TOKENS`):

```typescript
export const BATCH_STATUS_LABELS: Record<string, string> = {
  AWAITING_INTAKE: "Incoming",
  LIVE: "Available",
  ON_HOLD: "On Hold",
  QUARANTINED: "Quarantined",
  SOLD_OUT: "Sold Out",
  CLOSED: "Closed",
};
```

Apply in: `BatchStatusBadge`, `AdvancedFilters`, `FilterChips`, `InventoryWorkSurface`, `InventoryBrowser`, `CommandPalette` search results.

**Files to change:**

- `client/src/hooks/useInventoryFilters.ts`
- `client/src/lib/statusTokens.ts`
- `client/src/components/inventory/AdvancedFilters.tsx`
- `client/src/components/inventory/FilterChips.tsx`
- All components rendering `batchStatus` directly
- `client/src/components/sales/InventoryBrowser.tsx`
- `client/src/components/CommandPalette.tsx`

## Seam 3: Product Identity

**Current state:**

- Inventory grid columns: SKU, Product, Brand/Farmer, Supplier, Grade, Status, On Hand, Reserved, Available, Stock Status, Age, Cost
- "Product" column shows `product.nameCanonical`
- "Brand/Farmer" shows `brand.name`
- "Supplier" shows `vendor.name` (supplierClient)
- Category and subcategory are filterable but not displayed as columns

**Design:**

- Rename "Product" column to show strain/product name prominently (already does)
- Keep Brand/Farmer as separate column (grower identity matters per Evan feedback)
- Add a compact "Type" indicator showing `category · subcategory` (e.g., "Flower · Premium Indoor") as a tertiary badge or subtitle
- Apply same hierarchy in InventoryBrowser, SalesCatalogueSurface, and search results

**Files to change:**

- `client/src/components/work-surface/InventoryWorkSurface.tsx` — add type indicator
- `client/src/components/sales/InventoryBrowser.tsx` — update product display
- `client/src/components/spreadsheet-native/SalesCatalogueSurface.tsx` — update product display
- `client/src/components/CommandPalette.tsx` — update search result rendering

## Seam 7: Consignment Payout Narrative

**Current state:**

- `vendorPayables` table tracks: vendorClientId, batchId, unitsSold, cogsPerUnit, totalAmount, amountPaid, amountDue, status
- `orderLineItems` table tracks: originalRangeMin, originalRangeMax, isBelowVendorRange, belowRangeReason
- `vendorPayablesRouter` has: list, getById, getByBatchId, getByVendor, getSummary
- Client profile Money tab shows payable summary

**Design:**

- Extend `vendorPayablesRouter.getByVendor` to include sale price vs range data per batch
- Join `orderLineItems` on `batchId` to get actual sale prices and range flags
- Add a "Range Compliance" section to the vendor payable detail view
- Show: agreed range, actual avg sale price, % in-range, flagged below-range sales with reasons

**New component:** `ConsignmentRangePanel` in vendor payable detail
**Backend change:** Extend `getByVendor` query to join orderLineItems for range data

**Files to change:**

- `server/routers/vendorPayables.ts` — extend getByVendor query
- New: `client/src/components/accounting/ConsignmentRangePanel.tsx`
- `client/src/pages/ClientProfilePage.tsx` — add range panel to Money tab for suppliers
