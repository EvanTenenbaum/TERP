# TERP Terminology Bible

**Version**: 1.0.0
**Created**: 2026-03-05
**Status**: AUTHORITATIVE — All downstream tasks depend on this document

> This document is the single source of truth for terminology in TERP. It defines what words mean, how they must be used, and what is forbidden. All UI normalization tasks (LEX-008 through LEX-012) must comply with the policies defined here.

---

## Table of Contents

1. [The Five Vocabulary Families](#the-five-vocabulary-families)
2. [Policy Lock: Supplier (Never Vendor)](#policy-1-supplier-never-vendor)
3. [Policy Lock: Brand / Farmer (Dynamic)](#policy-2-brand--farmer-dynamic-rules)
4. [Policy Lock: Batch vs Inventory Item](#policy-3-batch-vs-inventory-item)
5. [Policy Lock: Intake vs Purchase Boundaries](#policy-4-intake-vs-purchase-boundaries)
6. [Policy Lock: Sales Order Standard](#policy-5-sales-order-standard)
7. [Quick Reference Card](#quick-reference-card)
8. [Enforcement](#enforcement)

---

## The Five Vocabulary Families

TERP uses exactly five vocabulary families. Every term belongs to exactly one family.

| Family      | What It Covers           | Key Terms                                |
| ----------- | ------------------------ | ---------------------------------------- |
| **Party**   | Who we work with         | Client, Supplier, Buyer, Brand           |
| **Product** | What we sell             | Batch, SKU, Product, Lot                 |
| **Intake**  | How we receive inventory | Intake, Direct Intake, Purchase Order    |
| **Sales**   | How we sell inventory    | Sales Order, Quote, Invoice, Fulfillment |
| **Brand**   | Product attribution      | Brand, Farmer (dynamic)                  |

---

## Party Family Definitions

### Client

The universal term for any business entity in TERP. All parties — buyers, suppliers, brands, referees, and contractors — are stored in the `clients` table with boolean role flags.

**Use**: Always. This is the root entity.
**DB**: `clients` table, `clients.id`

### Supplier

A Client with `isSeller = true`. The entity that provides inventory to us.

**Use**: In all contexts — code, UI, documentation, API.
**Never use**: Vendor (deprecated), vendorId (use supplierClientId)
**DB**: `clients` table where `is_seller = true`, extended by `supplier_profiles`

### Buyer

A Client with `isBuyer = true`. The entity that purchases inventory from us.

**Use**: In code and API. "Customer" is acceptable in UI labels.
**DB**: `clients` table where `is_buyer = true`

### Brand (as a party)

A product line or label. Brands are separate entities in the `brands` table linked to Products.

**Use**: "Brand" in code/API/DB. In UI, may display as "Farmer" based on category.
**See**: [Policy 2 — Brand/Farmer](#policy-2-brand--farmer-dynamic-rules)

---

## Product Family Definitions

### Batch

All pounds of a certain SKU — a discrete received quantity of a specific Product within a Lot. The atomic unit of inventory.

**Use**: "Batch" and `batchId` in all technical contexts.
**Never use**: "Inventory Item" as a type name, "Item" as a standalone identifier
**DB**: `batches` table

### SKU

The auto-generated unique identifier for a Batch. Always uppercase.

**DB**: `batches.sku`

### Product

The definition template for inventory items (strain, category, brand). A Product can have many Batches.

**DB**: `products` table

### Lot

Groups one or more Batches from the same supplier delivery event.

**DB**: `lots` table

---

## Sales Family Definitions

### Sales Order

A confirmed sale record with `orderType = 'SALE'`.

**Use**: "Sales Order" — always the full phrase.
**Never use**: "Sale" as a noun referring to the document.

### Quote

A price proposal with `orderType = 'QUOTE'`. Can be converted to a Sales Order.

**Never use**: "Estimate"

### Invoice

Financial document generated from a Sales Order for A/R tracking.

**DB**: `invoices` table

### Fulfillment

Physical movement tracking: PENDING → PACKED → SHIPPED → DELIVERED.

**Never use**: "Shipping" as an alternative for the full fulfillment lifecycle.

---

## Intake Family Definitions

### Intake

The process of recording received inventory. Umbrella term.

**Never use**: "Receiving"

### Direct Intake

Receiving inventory without a preceding Purchase Order.

**Never use**: "Direct Entry", "Manual Intake"

### Purchase Order

A formal commitment to purchase from a Supplier before goods arrive.

**Abbreviation**: "PO" is acceptable in UI only.

---

## Policy 1: Supplier (Never Vendor)

**Policy**: The word "Vendor" must never appear in the TERP UI or in new code. The canonical term is "Supplier."

### Rule

```
UI Label:    "Supplier"   ← REQUIRED
Code/API:    supplierClientId, isSeller, getAllSuppliers()
DB:          clients WHERE is_seller = true
Extension:   supplier_profiles table

NEVER:       Vendor, vendor, vendorId, db.query.vendors
```

### Why

The `vendors` table was deprecated on 2025-12-16. All vendor records have been migrated to `clients` with `isSeller = true`. The `vendors` table and legacy `vendorId` columns are backward-compatibility shims being phased out.

### Exceptions (Legacy Code Only)

The following files are exempt because they are backward-compatibility shims. They must NOT be extended:

- `drizzle/schema.ts` — deprecated `vendors` table definition (do not add columns)
- `server/inventoryDb.ts` — deprecated vendor functions with `@deprecated` annotations
- `server/routers/vendors.ts` — vendor router facade (do not add new procedures)
- `server/vendorContextDb.ts` — vendor context (do not extend)
- `server/vendorSupplyDb.ts` — vendor supply (do not extend)
- `server/services/vendorMappingService.ts` — migration mapping only
- `client/src/components/vendors/` — legacy UI components (migrate to client components)
- `client/src/lib/nomenclature.ts` — uses "vendor" in explanation text only

### Checklist for New Code

- [ ] Does your new component use `supplierClientId`, not `vendorId`?
- [ ] Does your new UI say "Supplier", not "Vendor"?
- [ ] Does your new DB query use `clients WHERE is_seller = true`?
- [ ] Have you avoided importing from `server/routers/vendors.ts` in new code?

---

## Policy 2: Brand / Farmer (Dynamic Rules)

**Policy**: "Brand" is the data model term. "Farmer" is a UI display term shown only when the product category is flower-related. All UI components that display brand names must use `getBrandLabel(category)` from `client/src/lib/nomenclature.ts`.

### Rules

```
Data model (always):    brands table, brandId, Brand
UI (context-sensitive): getBrandLabel(category) → "Brand" or "Farmer"
Unknown category:       "Brand/Farmer"
```

### Category Mapping

| Category                                         | UI Label     |
| ------------------------------------------------ | ------------ |
| flower                                           | Farmer       |
| pre-roll / pre-rolls / preroll / prerolls        | Farmer       |
| indoor flower                                    | Farmer       |
| outdoor flower                                   | Farmer       |
| greenhouse flower                                | Farmer       |
| smalls                                           | Farmer       |
| shake                                            | Farmer       |
| trim                                             | Farmer       |
| concentrates, edibles, tinctures, topicals, etc. | Brand        |
| unknown / mixed                                  | Brand/Farmer |

### Implementation

Always import from nomenclature.ts:

```typescript
import { getBrandLabel, getBrandLabelPlural } from "@/lib/nomenclature";

// In a component:
const label = getBrandLabel(product.category); // "Brand" or "Farmer"
const labelPlural = getBrandLabelPlural(product.category); // "Brands" or "Farmers"
```

### What Is Forbidden

- Creating a `farmers` table or `farmerId` field in the DB
- Hard-coding "Farmer" in JSX without using `getBrandLabel()`
- Using "Farmer" in tRPC API field names or TypeScript types
- Using "Brand" hard-coded in JSX when category context is available

### Checklist for New Code

- [ ] Does your component accept a `category` prop?
- [ ] Do you call `getBrandLabel(category)` for any label that says "Brand" or "Farmer"?
- [ ] Does your API field use `brandId` (not `farmerId`)?
- [ ] Does your TypeScript type use `brandId: number` (not a farmer type)?

---

## Policy 3: Batch vs Inventory Item

**Policy**: "Batch" is the canonical technical term. "Inventory Item" is an acceptable colloquial description in user-facing text only. Never use "Inventory Item" as a type name, variable name, or API field.

### Rules

```
Technical contexts:    Batch, batchId, batches table
UI list items:         "Item" is acceptable in order line items
UI inventory view:     "Batch" required
Type names:            Batch, BatchStatus, BatchDetails
API fields:            batchId, batchIds
Variable names:        batch, batches, batchMap
```

### Why

The `batches` table is the canonical inventory unit. "Inventory Item" is vague — it could refer to a Product (the template), a Batch (the physical instance), or an order line item. Batch is specific and unambiguous.

### Acceptable Usage

```typescript
// ✅ CORRECT
const batch: Batch = await getBatchById(batchId);
const lineItem = { batchId: batch.id, quantity: 5, unitPrice: 100 };

// In UI (order line items only)
<td>Item</td>  // acceptable column header in order tables

// ❌ WRONG
const inventoryItem = await getInventoryItem(id);  // use batch
interface InventoryItemType { ... }  // use Batch
const itemId = batch.id;  // use batchId
```

### Checklist for New Code

- [ ] Are your TypeScript types named using "Batch" (not "InventoryItem")?
- [ ] Are your variable names `batch`, `batchId`, `batches` (not `item`, `itemId`)?
- [ ] Are your API fields `batchId`, `batchIds` (not `itemId`, `inventoryItemId`)?

---

## Policy 4: Intake vs Purchase Boundaries

**Policy**: "Purchasing" is for acquiring product (the commercial decision). "Intake" is for the process of physically receiving it from the supplier. "Purchase Order" (or "PO") is the pre-receipt commitment document. These are distinct concepts with clear boundaries.

### Boundary Definitions

| Concept            | Definition                        | Happens When                         |
| ------------------ | --------------------------------- | ------------------------------------ |
| **Purchase Order** | Commitment to buy from a Supplier | Before goods arrive                  |
| **Intake**         | Recording of received goods       | When goods physically arrive         |
| **Direct Intake**  | Receiving without a PO            | Ad-hoc delivery, no prior commitment |
| **PO Receiving**   | Intake linked to a Purchase Order | Goods arrive against an existing PO  |

### Forbidden Terms

| Forbidden         | Use Instead                                              |
| ----------------- | -------------------------------------------------------- |
| Receiving         | Intake                                                   |
| Receiving Session | Intake Session                                           |
| Direct Entry      | Direct Intake                                            |
| Manual Intake     | Direct Intake                                            |
| Receive           | Intake (as a verb: "We intake inventory from suppliers") |

### Flow Boundaries

```
Purchase Order → PO Receiving (Intake tied to PO)
                              ↓
                         Lots + Batches created

No PO → Direct Intake
         ↓
    Lots + Batches created directly
```

Both flows result in Lots and Batches — the difference is whether a Purchase Order exists beforehand.

### Checklist for New Code

- [ ] Does your receiving flow use "Intake" in all labels?
- [ ] Does your Direct Intake flow say "Direct Intake" (not "Direct Entry")?
- [ ] Does your PO flow link `purchaseOrders` to `intake_sessions` via `intakeSessionId`?

---

## Policy 5: Sales Order Standard

**Policy**: Use "Sales Order" as the full term when referring to a confirmed sale document. "Quote" is the pre-sale document. Never use "Sale" as a noun referring to the document.

### Term Hierarchy

```
Quote (orderType = 'QUOTE')
  → Converted to →
Sales Order (orderType = 'SALE')
  → Generates →
Invoice (invoices table)
  → Triggers →
Fulfillment (fulfillmentStatus tracking)
```

### Forbidden Terms

| Forbidden                         | Use Instead                        |
| --------------------------------- | ---------------------------------- |
| Sale (as a noun for the document) | Sales Order                        |
| Estimate                          | Quote                              |
| Order (without qualifier)         | Sales Order or Quote (be specific) |
| Shipping (as the full lifecycle)  | Fulfillment                        |

### Acceptable Abbreviated Usage

| Context         | Acceptable                                            |
| --------------- | ----------------------------------------------------- |
| Navigation tabs | "Orders" (acceptable abbreviation in navigation only) |
| Code variable   | `order` (acceptable when type is clear from context)  |
| DB table        | `orders` (the table name — unchanged)                 |
| Enum value      | `orderType: 'SALE'` (the enum string)                 |

### Checklist for New Code

- [ ] Does your UI heading say "Sales Order" (not just "Sale")?
- [ ] Does your Quote UI say "Quote" (not "Estimate")?
- [ ] Does your fulfillment UI use "Fulfillment" (not "Shipping") for the lifecycle?
- [ ] Does your TypeScript function use `saleStatus` / `quoteStatus` correctly?

---

## Quick Reference Card

Use this card for rapid lookup.

| Say This                | Never Say This                 | Context                       |
| ----------------------- | ------------------------------ | ----------------------------- |
| Supplier                | Vendor                         | All contexts — code, UI, docs |
| supplierClientId        | vendorId                       | API/DB column names           |
| clients WHERE isSeller  | vendors table                  | DB queries                    |
| Brand                   | (hard-coded in UI)             | DB/API/types always           |
| Farmer                  | (hard-coded in UI)             | UI only, flower categories    |
| getBrandLabel(category) | hard-coded "Brand" or "Farmer" | UI implementation             |
| Batch                   | Inventory Item, Item           | Technical/code contexts       |
| batchId                 | itemId, inventoryItemId        | API fields                    |
| Intake                  | Receiving                      | All contexts                  |
| Direct Intake           | Direct Entry, Manual Intake    | UI/docs                       |
| Purchase Order          | (no alias)                     | Full term in code             |
| PO                      | (abbreviation)                 | UI abbreviation only          |
| Sales Order             | Sale (as noun), Order          | Document reference            |
| Quote                   | Estimate                       | Pre-sale document             |
| Fulfillment             | Shipping (as lifecycle)        | Order tracking                |

---

## Enforcement

### Automated Enforcement

Two scripts enforce terminology compliance:

1. **`pnpm terminology:census`** — Scans all `.ts` and `.tsx` files for deprecated term occurrences. Run anytime to get a full report.

2. **`pnpm terminology:audit`** — Checks for deprecated terms in new/modified code. Exits with code 1 if drift is detected. Run before every commit.

3. **`pnpm audit:terminology`** — Generates report artifacts in `docs/audits/`:
   - `docs/audits/terminology-census.json`
   - `docs/audits/terminology-audit.json`
   - `docs/audits/terminology-audit.md`

4. **`pnpm audit:terminology:strict`** — Runs the same report pipeline in strict mode.

### CI Gate

`pnpm terminology:audit` runs in CI as part of the pre-merge gate. A PR with deprecated terminology in new code will be blocked.

### Requesting Exceptions

If you need to use a deprecated term (e.g., in a backward-compatibility shim):

1. Add the file pattern to the `exceptions` array in `docs/terminology/term-map.json` for the relevant term
2. Document the reason in a code comment
3. The exceptions list is reviewed quarterly

---

## Gate 1 Review — APPROVED

**Reviewed by**: Evan Tenenbaum
**Date**: 2026-03-05

All 5 policy locks confirmed with the following clarifications:

1. **Supplier** (not Vendor) — Approved
2. **Farmer** for flower/pre-roll category brands — Approved
3. **Batch** — "A batch is all pounds of a certain SKU" — Approved
4. **Intake vs Purchasing** — "Purchasing is for acquiring product, intake is for the process of receiving it physically from the supplier" — Approved
5. **Sales Order** — Approved

Downstream UI normalization tasks (LEX-008 through LEX-012) are authorized to proceed.
