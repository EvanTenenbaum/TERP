# Authority Source Register

**Version**: 1.0.0
**Created**: 2026-03-05
**Status**: Authoritative

This document maps every business term used in TERP to its single authoritative source of truth. Where conflicts existed between DB schema, UI labels, API fields, and Evan's vocabulary, this register resolves them.

---

## How to Read This Document

Each entry defines:

- **Term** — the canonical name
- **Authority Source** — where the definition lives (DB schema wins for structural terms; Evan's vocabulary wins for user-facing terms)
- **DB Column/Table** — the exact schema reference
- **API Field** — the tRPC/REST field name
- **UI Label** — what appears in the interface
- **Deprecated Aliases** — names that MUST NOT appear in new code

---

## Source Precedence (Machine-Referenceable)

Source precedence is defined in [source-precedence.json](./source-precedence.json).
When terms conflict, resolve by ascending `rank` (1 is highest authority).

| Rank | Source Type            | Citation ID          | Evidence Path                                                   |
| ---- | ---------------------- | -------------------- | --------------------------------------------------------------- |
| 1    | Golden flow specs      | `GF-001`             | `docs/golden-flows/specs/GF-001-DIRECT-INTAKE.md`               |
| 2    | Meeting decisions      | `MEETING-2026-01-11` | `docs/meeting-analysis-2026-01-11/TERP_Final_Unified_Report.md` |
| 3    | UX charter             | `UX-CHARTER`         | `docs/reviews/TERP_UIUX_Analysis_Report.md`                     |
| 4    | Protocols              | `PROTOCOL-NAMING`    | `docs/protocols/NAMING_CONVENTIONS.md`                          |
| 5    | Current implementation | `CODEBASE-SCHEMA`    | `drizzle/schema.ts`                                             |

---

## Party Family

### Client

| Field                  | Value                                                                                                                      |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Canonical Term**     | Client                                                                                                                     |
| **Authority Source**   | DB Schema (`drizzle/schema.ts`)                                                                                            |
| **DB Table**           | `clients`                                                                                                                  |
| **DB Column**          | `clients.id`, `clients.name`, `clients.isBuyer`, `clients.isSeller`                                                        |
| **API Field**          | `clientId`, `clients.list`, `clients.get`                                                                                  |
| **UI Label**           | "Client"                                                                                                                   |
| **Deprecated Aliases** | ~~Contact~~, ~~Customer~~ (as a standalone type — Customer is a role, not a type)                                          |
| **Notes**              | All business entities (buyers, sellers, brands, referees, contractors) live in the `clients` table with boolean role flags |

### Supplier

| Field                  | Value                                                                                                                               |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Canonical Term**     | Supplier                                                                                                                            |
| **Authority Source**   | DB Schema + Evan's vocabulary                                                                                                       |
| **DB Table**           | `clients` (with `is_seller = true`) + `supplier_profiles`                                                                           |
| **DB Column**          | `clients.isSeller`, `supplier_profiles.clientId`                                                                                    |
| **API Field**          | `clientTypes: ['seller']`, `supplierClientId`                                                                                       |
| **UI Label**           | "Supplier"                                                                                                                          |
| **Deprecated Aliases** | ~~Vendor~~ (table deprecated as of 2025-12-16), ~~vendors~~ (table), ~~vendorId~~ (use `supplierClientId`)                          |
| **Notes**              | Supplier is the canonical term for entities who provide inventory. The `vendors` table is DEPRECATED. Never use `db.query.vendors`. |

### Buyer (Customer)

| Field                  | Value                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------ |
| **Canonical Term**     | Buyer (or Customer when contextually appropriate)                                    |
| **Authority Source**   | DB Schema                                                                            |
| **DB Table**           | `clients` (with `is_buyer = true`)                                                   |
| **DB Column**          | `clients.isBuyer`                                                                    |
| **API Field**          | `clientTypes: ['buyer']`                                                             |
| **UI Label**           | "Customer" (UI), "Buyer" (API/schema)                                                |
| **Deprecated Aliases** | None                                                                                 |
| **Notes**              | "Customer" is acceptable in user-facing UI labels. "Buyer" is preferred in code/API. |

### Brand

| Field                  | Value                                                                                                                                                                             |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Canonical Term**     | Brand                                                                                                                                                                             |
| **Authority Source**   | DB Schema                                                                                                                                                                         |
| **DB Table**           | `brands`                                                                                                                                                                          |
| **DB Column**          | `brands.id`, `brands.name`, `products.brandId`                                                                                                                                    |
| **API Field**          | `brandId`, `brands.getAll`                                                                                                                                                        |
| **UI Label**           | "Brand" (non-flower categories) / "Farmer" (flower categories) — see Brand/Farmer Policy                                                                                          |
| **Deprecated Aliases** | None                                                                                                                                                                              |
| **Notes**              | The data model uses "Brand" universally; UI dynamically switches between "Brand" and "Farmer" based on product category via `getBrandLabel()` in `client/src/lib/nomenclature.ts` |

---

## Product Family

### Batch

| Field                  | Value                                                                                                                                          |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Canonical Term**     | Batch                                                                                                                                          |
| **Authority Source**   | DB Schema                                                                                                                                      |
| **DB Table**           | `batches`                                                                                                                                      |
| **DB Column**          | `batches.id`, `batches.code`, `batches.sku`, `batches.batchStatus`                                                                             |
| **API Field**          | `batchId`, `inventory.getBatches`                                                                                                              |
| **UI Label**           | "Batch"                                                                                                                                        |
| **Deprecated Aliases** | ~~Inventory Item~~ (colloquial — Batch is specific; Inventory Item is ambiguous), ~~Item~~ (ambiguous)                                         |
| **Notes**              | A Batch is a discrete received quantity of a specific Product within a Lot. Each Batch has its own `batchStatus`, COGS, and quantity tracking. |

### Inventory Item

| Field                  | Value                                                                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Canonical Term**     | Inventory Item (colloquial, refers to a Batch in context)                                                                             |
| **Authority Source**   | Evan's vocabulary                                                                                                                     |
| **DB Table**           | N/A (maps to `batches`)                                                                                                               |
| **DB Column**          | N/A                                                                                                                                   |
| **API Field**          | N/A                                                                                                                                   |
| **UI Label**           | "Item" (in order line items), "Batch" (in inventory management)                                                                       |
| **Deprecated Aliases** | None — but prefer "Batch" in technical contexts                                                                                       |
| **Notes**              | "Inventory Item" is acceptable as a user-facing description of a Batch in sales/order contexts. Do not use it as a type name in code. |

### SKU

| Field                  | Value                                                                                    |
| ---------------------- | ---------------------------------------------------------------------------------------- |
| **Canonical Term**     | SKU                                                                                      |
| **Authority Source**   | DB Schema                                                                                |
| **DB Table**           | `batches`                                                                                |
| **DB Column**          | `batches.sku`                                                                            |
| **API Field**          | `sku`                                                                                    |
| **UI Label**           | "SKU"                                                                                    |
| **Deprecated Aliases** | None                                                                                     |
| **Notes**              | Each Batch has exactly one SKU. The SKU is auto-generated and unique across all batches. |

### Product

| Field                  | Value                                                                                           |
| ---------------------- | ----------------------------------------------------------------------------------------------- |
| **Canonical Term**     | Product                                                                                         |
| **Authority Source**   | DB Schema                                                                                       |
| **DB Table**           | `products`                                                                                      |
| **DB Column**          | `products.id`, `products.nameCanonical`, `products.category`                                    |
| **API Field**          | `productId`, `products.getAll`                                                                  |
| **UI Label**           | "Product"                                                                                       |
| **Deprecated Aliases** | None                                                                                            |
| **Notes**              | A Product is the template/definition. A Batch is a physical instance of a Product in inventory. |

### Lot

| Field                  | Value                                                       |
| ---------------------- | ----------------------------------------------------------- |
| **Canonical Term**     | Lot                                                         |
| **Authority Source**   | DB Schema                                                   |
| **DB Table**           | `lots`                                                      |
| **DB Column**          | `lots.id`, `lots.code`, `lots.supplierClientId`             |
| **API Field**          | `lotId`                                                     |
| **UI Label**           | "Lot"                                                       |
| **Deprecated Aliases** | None                                                        |
| **Notes**              | A Lot groups Batches from the same supplier delivery event. |

---

## Intake Family

### Purchase Order

| Field                  | Value                                                                                                                                                |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Canonical Term**     | Purchase Order                                                                                                                                       |
| **Authority Source**   | DB Schema + Evan's vocabulary                                                                                                                        |
| **DB Table**           | `purchaseOrders`                                                                                                                                     |
| **DB Column**          | `purchaseOrders.id`, `purchaseOrders.poNumber`, `purchaseOrders.supplierClientId`                                                                    |
| **API Field**          | `purchaseOrderId`, `poNumber`, `purchaseOrders.list`                                                                                                 |
| **UI Label**           | "Purchase Order"                                                                                                                                     |
| **Deprecated Aliases** | ~~PO~~ (abbreviation acceptable in UI but spell out in code)                                                                                         |
| **Notes**              | A Purchase Order is a formal commitment to purchase from a Supplier before goods arrive. It precedes a Direct Intake (which records actual receipt). |

### Direct Intake

| Field                  | Value                                                                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Canonical Term**     | Direct Intake                                                                                                                        |
| **Authority Source**   | Evan's vocabulary                                                                                                                    |
| **DB Table**           | N/A (workflow that creates Lots + Batches without a PO)                                                                              |
| **DB Column**          | N/A                                                                                                                                  |
| **API Field**          | `inventory.createLotAndBatch` (intake flow router)                                                                                   |
| **UI Label**           | "Direct Intake"                                                                                                                      |
| **Deprecated Aliases** | ~~Direct Entry~~, ~~Manual Intake~~                                                                                                  |
| **Notes**              | Direct Intake is the workflow where inventory is received without a preceding Purchase Order. It directly creates a Lot and Batches. |

### Intake

| Field                  | Value                                                                                                                                                                                  |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Canonical Term**     | Intake                                                                                                                                                                                 |
| **Authority Source**   | Evan's vocabulary                                                                                                                                                                      |
| **DB Table**           | `intake_sessions`                                                                                                                                                                      |
| **DB Column**          | `intake_sessions.id`, `intake_sessions.session_number`                                                                                                                                 |
| **API Field**          | `intakeSessionId`, `intakeSessions`                                                                                                                                                    |
| **UI Label**           | "Intake" / "Product Intake"                                                                                                                                                            |
| **Deprecated Aliases** | ~~Receiving~~, ~~Receiving Session~~                                                                                                                                                   |
| **Notes**              | "Intake" is the umbrella term for the process of recording received inventory. Can refer to both Purchase Order receiving and Direct Intake. "Product Intake" is acceptable in the UI. |

---

## Sales Family

### Sales Order

| Field                  | Value                                                                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Canonical Term**     | Sales Order                                                                                                                           |
| **Authority Source**   | Evan's vocabulary                                                                                                                     |
| **DB Table**           | `orders` (with `orderType = 'SALE'`)                                                                                                  |
| **DB Column**          | `orders.orderType`, `orders.saleStatus`, `orders.orderNumber`                                                                         |
| **API Field**          | `orderType: 'SALE'`, `orders.createSale`                                                                                              |
| **UI Label**           | "Sales Order"                                                                                                                         |
| **Deprecated Aliases** | ~~Sale~~ (too ambiguous; refers to the transaction, not the document), ~~Order~~ (ambiguous without context — could be Quote or Sale) |
| **Notes**              | The DB uses `orderType enum('QUOTE', 'SALE')` — a Sales Order is an `orders` record where `orderType = 'SALE'`.                       |

### Quote

| Field                  | Value                                                                                         |
| ---------------------- | --------------------------------------------------------------------------------------------- |
| **Canonical Term**     | Quote                                                                                         |
| **Authority Source**   | DB Schema + Evan's vocabulary                                                                 |
| **DB Table**           | `orders` (with `orderType = 'QUOTE'`)                                                         |
| **DB Column**          | `orders.orderType`, `orders.quoteStatus`                                                      |
| **API Field**          | `orderType: 'QUOTE'`, `orders.createQuote`                                                    |
| **UI Label**           | "Quote"                                                                                       |
| **Deprecated Aliases** | ~~Estimate~~                                                                                  |
| **Notes**              | A Quote is an `orders` record where `orderType = 'QUOTE'`. Can be converted to a Sales Order. |

### Invoice

| Field                  | Value                                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------- |
| **Canonical Term**     | Invoice                                                                                                 |
| **Authority Source**   | DB Schema                                                                                               |
| **DB Table**           | `invoices`                                                                                              |
| **DB Column**          | `invoices.id`, `orders.invoiceId`                                                                       |
| **API Field**          | `invoiceId`, `invoices.list`                                                                            |
| **UI Label**           | "Invoice"                                                                                               |
| **Deprecated Aliases** | None                                                                                                    |
| **Notes**              | An Invoice is generated from a Sales Order when payment tracking begins. An order can have one Invoice. |

### Fulfillment

| Field                  | Value                                                                                                                               |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Canonical Term**     | Fulfillment                                                                                                                         |
| **Authority Source**   | DB Schema                                                                                                                           |
| **DB Table**           | `orders`                                                                                                                            |
| **DB Column**          | `orders.fulfillmentStatus` (enum: PENDING, PACKED, SHIPPED, DELIVERED, CANCELLED)                                                   |
| **API Field**          | `fulfillmentStatus`                                                                                                                 |
| **UI Label**           | "Fulfillment" / "Pick & Pack"                                                                                                       |
| **Deprecated Aliases** | ~~Shipping~~ (Fulfillment is broader)                                                                                               |
| **Notes**              | Fulfillment tracks the physical movement of goods after a Sales Order is created. Statuses: PENDING → PACKED → SHIPPED → DELIVERED. |

---

## Brand/Farmer Family

### Farmer

| Field                  | Value                                                                                                                                                                                                                                                                                                                             |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Canonical Term**     | Farmer (in UI context only, for flower products)                                                                                                                                                                                                                                                                                  |
| **Authority Source**   | Evan's vocabulary + `client/src/lib/nomenclature.ts`                                                                                                                                                                                                                                                                              |
| **DB Table**           | `brands` (same table — "Farmer" is a UI label, not a separate data type)                                                                                                                                                                                                                                                          |
| **DB Column**          | `brands.id`, `brands.name`                                                                                                                                                                                                                                                                                                        |
| **API Field**          | `brandId` (same API field)                                                                                                                                                                                                                                                                                                        |
| **UI Label**           | "Farmer" (when category is flower/pre-roll/smalls/shake/trim), "Brand" (all other categories)                                                                                                                                                                                                                                     |
| **Deprecated Aliases** | None                                                                                                                                                                                                                                                                                                                              |
| **Notes**              | "Farmer" is a UI-only terminology switch. The underlying data model always uses the `brands` table. The switch is governed by `isFarmerCategory()` in `nomenclature.ts`. Categories that trigger "Farmer": flower, pre-roll, pre-rolls, preroll, prerolls, indoor flower, outdoor flower, greenhouse flower, smalls, shake, trim. |

---

## Conflict Resolution Log (Categorized By Family)

The following ambiguities were identified and resolved during LEX-001. Each row
includes explicit citation IDs from the precedence chain.

| Family  | Ambiguity                         | Resolution                                                | Citation IDs                                               | Rationale                                                                                           |
| ------- | --------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| party   | "Vendor" vs "Supplier"            | **Supplier** wins                                         | `MEETING-2026-01-11`, `PROTOCOL-NAMING`, `CODEBASE-SCHEMA` | DB migration completed (`vendors` deprecated 2025-12-16); `clients` + `isSeller=true` is canonical. |
| party   | "Customer" vs "Buyer"             | **Buyer** in code; "Customer" acceptable in UI            | `GF-001`, `UX-CHARTER`, `CODEBASE-SCHEMA`                  | `isBuyer` is schema truth; "Customer" is clearer for user-facing copy.                              |
| product | "Batch" vs "Inventory Item"       | **Batch** wins for technical contexts                     | `GF-001`, `MEETING-2026-01-11`, `CODEBASE-SCHEMA`          | `batches` table is canonical; "Inventory Item" is UI colloquial only.                               |
| intake  | "Receiving" vs "Intake"           | **Intake** wins                                           | `MEETING-2026-01-11`, `GF-001`, `PROTOCOL-NAMING`          | Meeting decisions and flow specs align on Intake terminology.                                       |
| intake  | "Direct Intake" vs "Direct Entry" | **Direct Intake** wins                                    | `MEETING-2026-01-11`, `GF-001`                             | "Direct Intake" reflects approved operational wording.                                              |
| intake  | "PO" vs "Purchase Order"          | **Purchase Order** in code; "PO" acceptable in UI         | `GF-001`, `UX-CHARTER`                                     | Full term in code reduces ambiguity; UI may abbreviate.                                             |
| sales   | "Sale" vs "Sales Order"           | **Sales Order** wins                                      | `MEETING-2026-01-11`, `GF-001`, `PROTOCOL-NAMING`          | Distinguishes document term from accounting concept.                                                |
| sales   | "Order" (alone)                   | Must specify "Sales Order" or "Quote"                     | `GF-001`, `CODEBASE-SCHEMA`                                | `orders` table contains both `QUOTE` and `SALE`; unqualified "Order" is ambiguous.                  |
| brand   | "Farmer" vs "Brand"               | **Brand** in DB/API; "Farmer" in UI for flower categories | `MEETING-2026-01-11`, `UX-CHARTER`, `CODEBASE-SCHEMA`      | `brands` remains data model term; UI label is context-sensitive.                                    |
