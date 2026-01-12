# Specification: ENH-007 - Apply Nomenclature Changes (Brand → Farmer)

**Status:** Draft
**Priority:** LOW
**Estimate:** 8h
**Module:** Frontend / Across System
**Dependencies:** None
**Spec Author:** Claude AI
**Spec Date:** 2026-01-12

---

## 1. Problem Statement

Throughout the system, the term "Brand" is used for product suppliers. However, for flower products specifically, the business refers to suppliers as "Farmers" rather than "Brands". The UI needs to dynamically use the appropriate terminology based on the product category.

**User Quote:**
> "vendors, vendor, brand becomes farmer for all categories, except for anything non-flower... brand should be farmer."

## 2. User Stories

1. **As a user**, I want to see "Farmer" instead of "Brand" for flower products, so that the terminology matches our business language.

## 3. Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | "Brand" label changes to "Farmer" for Flower category | Must Have |
| FR-02 | All other categories retain "Brand" label | Must Have |
| FR-03 | Change applies across: Inventory, Products, Orders, Reports | Must Have |
| FR-04 | Database column names remain unchanged | Must Have |

## 4. Technical Specification

### 4.1 Utility Function

**File:** `/home/user/TERP/client/src/lib/nomenclature.ts`

```typescript
/**
 * Returns the appropriate label for brand/farmer based on category
 *
 * @param category - Product category
 * @returns "Farmer" for Flower category, "Brand" for all others
 */
export function getBrandLabel(category?: string): string {
  if (!category) return "Brand/Farmer";

  const flowerCategories = ["Flower", "flower", "FLOWER", "Pre-Roll", "pre-roll"];
  return flowerCategories.some(fc =>
    category.toLowerCase().includes(fc.toLowerCase())
  ) ? "Farmer" : "Brand";
}

/**
 * Returns plural form of brand/farmer label
 */
export function getBrandLabelPlural(category?: string): string {
  return getBrandLabel(category) + "s";
}

/**
 * Formats brand name with appropriate label
 */
export function formatBrandWithLabel(brandName: string, category?: string): string {
  const label = getBrandLabel(category);
  return `${label}: ${brandName}`;
}
```

### 4.2 Affected Components

The following components need updates to use the nomenclature utility:

| Component | File Path | Change Required |
|-----------|-----------|-----------------|
| Inventory Table | `/client/src/components/inventory/InventoryBrowserTable.tsx` | Column header |
| Product Form | `/client/src/components/products/ProductForm.tsx` | Field label |
| Product Details | `/client/src/pages/ProductDetailsPage.tsx` | Display label |
| In-line Creation Modal | `/client/src/components/products/InlineProductCreationModal.tsx` | Section header |
| Order Line Items | `/client/src/components/orders/OrderLineItems.tsx` | Column header |
| Batch Details | `/client/src/components/inventory/BatchDetails.tsx` | Display label |
| Reports | `/client/src/pages/reports/*` | Various labels |
| Search Results | `/client/src/components/search/SearchResults.tsx` | Result labels |

### 4.3 Implementation Example

**File:** `/home/user/TERP/client/src/components/inventory/InventoryBrowserTable.tsx`

```typescript
import { getBrandLabel } from "@/lib/nomenclature";

// In column definitions:
const columns = [
  // ... other columns
  {
    id: "brandName",
    // Dynamic header based on filtered category or mixed
    header: ({ table }) => {
      const categories = table.getRowModel().rows.map(r => r.original.category);
      const uniqueCategories = [...new Set(categories)];
      if (uniqueCategories.length === 1) {
        return getBrandLabel(uniqueCategories[0]);
      }
      return "Brand/Farmer"; // Mixed categories
    },
    accessor: (item) => item.brandName,
  },
  // ...
];
```

**File:** `/home/user/TERP/client/src/components/products/ProductForm.tsx`

```typescript
import { getBrandLabel } from "@/lib/nomenclature";

// In JSX:
const watchCategory = form.watch("category");

<div>
  <Label>{getBrandLabel(watchCategory)}</Label>
  <BrandCombobox
    value={form.watch("brandId")}
    onChange={(v) => form.setValue("brandId", v)}
    placeholder={`Select ${getBrandLabel(watchCategory).toLowerCase()}...`}
  />
</div>
```

### 4.4 Places NOT to Change

- **Database schema**: Column remains `brandId`, `brandName`
- **API contracts**: Fields remain `brandId`, `brandName`
- **Internal code variables**: Use `brand` internally
- **Documentation**: Can use either term with explanation

## 5. UI/UX Specification

### 5.1 Behavioral Examples

| Context | Category | Displayed Label |
|---------|----------|-----------------|
| Inventory table header | All Flower | "Farmer" |
| Inventory table header | Mixed | "Brand/Farmer" |
| Product form | Flower | "Farmer" |
| Product form | Concentrate | "Brand" |
| Order line item | Flower product | "Farmer: Green Thumb" |
| Order line item | Edible product | "Brand: Extract Co." |

### 5.2 Acceptance Criteria

- [ ] Flower products show "Farmer" label
- [ ] Non-flower products show "Brand" label
- [ ] Mixed views show "Brand/Farmer"
- [ ] All forms update label when category changes
- [ ] Search/filter maintains correct terminology
- [ ] No database or API changes required

## 6. Testing Requirements

### 6.1 Unit Tests
- [ ] `getBrandLabel` returns correct values
- [ ] Edge cases handled (null, empty, unknown category)

### 6.2 Integration Tests
- [ ] Label updates when category filter changes
- [ ] Correct labels in all affected components

### 6.3 E2E Tests
- [ ] Navigate through system, verify consistent labeling

## 7. Migration & Rollout

### 7.1 Rollout Plan

This is a UI-only change with no data migration. Deploy directly.

### 7.2 Feature Flag

Not required - low-risk UI change.

---

**Approval:**
- [ ] Product Owner
- [ ] Tech Lead
- [ ] QA Lead
