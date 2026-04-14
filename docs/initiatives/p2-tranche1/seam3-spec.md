# Seam 3 Spec: Product Identity

**Status**: Specification  
**Date**: 2026-04-07  
**Branch**: p2-phase1-immediate-fixes

---

## 1. Current Identity Pattern by Surface

### 1.1 `InventoryWorkSurface.tsx` — Inventory Management

**Table columns showing product info:**
| Column | Source | Display |
|---|---|---|
| SKU | `batch.sku` | Plain text, sortable |
| Product | `product.nameCanonical` | Plain text, sortable |
| Brand/Farmer | `brand.name` | Plain text, sortable. **Header label is dynamic** via `getMixedBrandLabel(categoryOptions)` — shows "Farmer" for produce, "Brand" for other categories (LEX-011 nomenclature) |
| Supplier | `vendor.name` | Plain text, sortable |
| Grade | `batch.grade` | Badge |
| Category | Not a visible column — only in filters and inspector | — |

**Inspector panel (BatchInspectorContent):**

- Product: `product.nameCanonical` (bold) with `product.category / product.subcategory` below
- Supplier: `vendor.name`
- Brand/Farmer: `brand.name` with dynamic label via `getBrandLabel(product.category)`
- Grade: badge

**Gallery card (BatchGalleryCard):**

- Product name, brand name, vendor name, category (for label resolution), status, quantities, thumbnail

**Current pattern:** `nameCanonical` is primary. Brand/vendor shown in separate columns. Category only appears in inspector detail or filters, never in the main table row.

---

### 1.2 `InventoryBrowser.tsx` — Order Creation Item Picker

**Table columns:**
| Column | Display |
|---|---|
| Item | `item.name` (bold) + `StrainFamilyIndicator` below + detail line below |
| Supplier | `item.vendor` |
| Category | `item.category` as Badge |
| Qty Available | numeric |
| Price/Unit | `item.basePrice` + COGS range annotation |
| Client Price | `item.retailPrice` + pricing rule annotations |
| Gross Margin | Badge with percentage |

**Detail line construction (below item name):**

```
[brand OR vendor] • [subcategory] • [Grade X] • [batchSku]
```

This is the closest thing to a full identity line in the system.

**Search index includes:** name, vendor, brand, category, subcategory, strain, strainFamily, batchSku, grade, status

**Current pattern:** Name is primary, with a secondary "detail line" that opportunistically shows brand/vendor, subcategory, grade, and SKU. Category is its own column as a badge. No structured hierarchy — it's a grab-bag of context.

---

### 1.3 `SalesCatalogueSurface.tsx` — Sales Catalogue Builder

**Inventory browser grid columns:**
| Column | Display |
|---|---|
| Add / Checkbox / Status | Action columns |
| Product | `row.name` (bold) + descriptor subtitle |
| Category | `row.category` (hideable) |
| Strain | `row.strain` (hideable) |
| Supplier | `row.vendor` (hideable) |
| Base / Retail / Markup | Pricing columns |
| Qty | Stock |
| COGS | Conditional |
| Grade | Hideable |

**Product cell renderer uses `buildCatalogueDescriptor`:**

```
[brand OR vendor] · [subcategory OR category] · [batchSku]
```

This renders as a small muted subtitle under the product name.

**Preview grid:** Only shows Item name, Qty, Total — no identity metadata.

**Chat export format:** `• {name} — {descriptor} — {qty} @ ${price}`

**Print export:** Name (h3) + category (p) + descriptor (p) + meta line (qty, markup, vendor)

**Current pattern:** Same grab-bag as InventoryBrowser but with ag-grid column hiding. The descriptor function is reused but the hierarchy is implicit, not enforced.

---

### 1.4 `CommandPalette.tsx` — Global Search

**Product search results:**

- Icon: `Package`
- Title: `product.title` (from `search.global` tRPC response)
- Description: `product.description` (muted, truncated)
- Group heading: "Products & Batches"

**Current pattern:** Title + description from server. No structured identity — depends entirely on what the `search.global` endpoint returns in `title` and `description` fields. **This is the least controlled surface.**

---

### 1.5 Schema: `drizzle/schema.ts`

**`strains` table:**

- `name` (unique, varchar 255)
- `standardizedName` (varchar 255)
- `aliases` (text, JSON array)
- `category` (varchar 50) — "Indica", "Sativa", "Hybrid"
- `parentStrainId` (int, self-ref) — for family grouping
- `baseStrainName` (varchar 255) — extracted base name
- OpenTHC integration fields

**`products` table:**

- `nameCanonical` (varchar 500) — the primary display name
- `brandId` (int, required)
- `supplierClientId` (int, optional)
- `strainId` (int, optional) — link to strain library
- `category` (varchar 100, required) — e.g., "Flower", "Edibles", "Concentrates"
- `subcategory` (varchar 100, optional) — e.g., "Premium Indoor", "Outdoor"
- `uomSellable` (varchar 20, default "EA")
- `description` (text)

**`tags` table:**

- `name`, `standardizedName`
- `category` enum: STATUS, PRIORITY, TYPE, CUSTOM, STRAIN, FLAVOR, EFFECT
- `color` (hex)
- Linked to products via `productTags` junction table

**Key observation:** The schema supports rich identity:

- Product → Strain (name, family, type)
- Product → Brand (via brandId)
- Product → Supplier (via supplierClientId → clients table)
- Product → Category + Subcategory
- Product → Tags (STRAIN, FLAVOR, EFFECT types)

But the **UI surfaces don't consistently use this hierarchy**.

---

## 2. Target Identity Pattern

### Proposed 3-Tier Hierarchy

| Tier          | Content                 | Example                   |
| ------------- | ----------------------- | ------------------------- |
| **Primary**   | Strain / product name   | "White Runtz"             |
| **Secondary** | Grower / farmer / brand | "Green Valley Farms"      |
| **Tertiary**  | Category · Subcategory  | "Flower · Premium Indoor" |

### Rendering Spec

```
┌─────────────────────────────────────────┐
│ White Runtz                        [bold]│
│ Green Valley Farms          [muted, 12px]│
│ Flower · Premium Indoor   [muted, 11px] │
└─────────────────────────────────────────┘
```

When secondary is missing: skip line, don't show "—"  
When tertiary is missing: skip line  
When both missing: just primary name

### Data Resolution Logic

```typescript
function resolveProductIdentity(item: {
  name?: string;
  nameCanonical?: string;
  brand?: string;
  vendor?: string;
  category?: string;
  subcategory?: string;
}) {
  return {
    primary: item.name || item.nameCanonical || "Unknown Product",
    secondary: item.brand || item.vendor || null,
    tertiary: item.category
      ? item.subcategory
        ? `${item.category} · ${item.subcategory}`
        : item.category
      : null,
  };
}
```

---

## 3. Changes Needed Per Surface

### 3.1 `InventoryWorkSurface.tsx`

| Change                                 | Details                                                                                                                | Effort |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------ |
| Merge Product + Brand columns          | Product column renders primary (name) + secondary (brand/farmer) + tertiary (category · subcategory) in a stacked cell | Medium |
| Keep Supplier as separate column       | Supplier (vendor) is a distinct business entity from brand/farmer                                                      | None   |
| Remove standalone Brand column         | Absorbed into Product column                                                                                           | Small  |
| Add category·subcategory to main table | Currently only in inspector                                                                                            | Small  |

**Mobile card (`InventoryCard`):** Already shows productName and brandName — add category·subcategory subtitle.

### 3.2 `InventoryBrowser.tsx`

| Change                      | Details                                                        | Effort |
| --------------------------- | -------------------------------------------------------------- | ------ |
| Restructure Item column     | Replace grab-bag detail line with structured 3-tier rendering  | Small  |
| Keep Supplier column        | Already separate                                               | None   |
| Restructure Category column | Show `category · subcategory` instead of just `category` badge | Small  |

**Current detail line** `[brand OR vendor] • [subcategory] • [Grade X] • [batchSku]` **becomes:**

- Secondary line: brand/farmer name
- Tertiary line: `Category · Subcategory`
- Grade and SKU move to their own display area or tooltip

### 3.3 `SalesCatalogueSurface.tsx`

| Change                            | Details                                                               | Effort |
| --------------------------------- | --------------------------------------------------------------------- | ------ |
| Update Product cell renderer      | Replace `buildCatalogueDescriptor` call with 3-tier identity          | Small  |
| Update `buildCatalogueDescriptor` | Refactor to use resolveProductIdentity for exports (chat, print, CSV) | Small  |
| Preview grid                      | Add secondary line in Item column                                     | Small  |

### 3.4 `CommandPalette.tsx`

| Change                                 | Details                                                                                                                                                                    | Effort       |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| Update product search result rendering | Show structured identity instead of raw `title`/`description`                                                                                                              | Small-Medium |
| Requires server change                 | `search.global` endpoint needs to return `brand`, `category`, `subcategory` in product results, OR the title/description needs to be pre-formatted with the 3-tier pattern | Medium       |

### 3.5 `LineItemTable.tsx` (bonus — found in Seam 4 audit)

| Change                                   | Details                                                                                                                | Effort |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------ |
| Add secondary/tertiary to Product column | Currently only shows `productDisplayName` with no context                                                              | Small  |
| Requires data enrichment                 | `LineItem` interface needs `brand`, `category`, `subcategory` fields (or they need to be resolved from inventory data) | Medium |

---

## 4. Schema Changes Required

### 4.1 No schema changes needed for the target pattern

The schema already has all required fields:

- `products.nameCanonical` → Primary
- `products.brandId` → resolves to brand name → Secondary
- `products.supplierClientId` → resolves to vendor name → Secondary fallback
- `products.category` + `products.subcategory` → Tertiary
- `strains.category` → exists but is strain type (Indica/Sativa/Hybrid), NOT product category

### 4.2 Potential future schema additions (not required for this seam)

- `products.displayName` (varchar 255) — optional override for nameCanonical in customer-facing contexts
- `products.identityVersion` (int) — for cache-busting when identity resolution logic changes

---

## 5. Shared Utility Proposal

Create `client/src/lib/productIdentity.ts`:

```typescript
export interface ProductIdentityInput {
  name?: string | null;
  nameCanonical?: string | null;
  brand?: string | null;
  vendor?: string | null;
  category?: string | null;
  subcategory?: string | null;
}

export interface ProductIdentity {
  primary: string;
  secondary: string | null;
  tertiary: string | null;
}

export function resolveProductIdentity(
  item: ProductIdentityInput
): ProductIdentity {
  return {
    primary: item.name || item.nameCanonical || "Unknown Product",
    secondary: item.brand || item.vendor || null,
    tertiary: item.category
      ? item.subcategory
        ? `${item.category} · ${item.subcategory}`
        : item.category
      : null,
  };
}
```

Create `client/src/components/common/ProductIdentityCell.tsx` — reusable cell renderer for table/grid contexts.

---

## 6. Risk Assessment

- **Low risk**: All data already exists in the API responses (verified in InventoryBrowser which gets brand, vendor, category, subcategory)
- **Medium risk**: LineItemTable's `LineItem` interface doesn't carry brand/category — needs enrichment from inventory data or API response augmentation
- **Low risk**: CommandPalette depends on server-side search response format — may need backend coordination
- **No schema migration required**
