# TERP Canonical Dictionary

**Version**: 1.0  
**Last Updated**: 2025-12-16  
**Status**: MANDATORY

This document defines the canonical terms, table mappings, ID field rules, and authorization requirements for the TERP system.

---

## Term Definitions

### Party Model

| Term         | Definition                                                                 | Database Table                  |
| ------------ | -------------------------------------------------------------------------- | ------------------------------- |
| **Client**   | Any business entity that interacts with TERP (buyer, seller, or both)      | `clients`                       |
| **Supplier** | A client with `isSeller=true` who sells products to TERP                   | `clients` + `supplier_profiles` |
| **Customer** | A client who purchases products from TERP                                  | `clients`                       |
| **Vendor**   | **DEPRECATED** - Legacy term for supplier, use Client with `isSeller=true` | `vendors` (deprecated)          |
| **User**     | An internal TERP system user (employee, admin)                             | `users`                         |

### Transaction Model

| Term               | Definition                                            | Database Table    |
| ------------------ | ----------------------------------------------------- | ----------------- |
| **Invoice**        | A bill sent to a customer for products/services       | `invoices`        |
| **Bill**           | A bill received from a supplier for products/services | `bills`           |
| **Payment**        | A financial transaction (AR or AP)                    | `payments`        |
| **Order**          | A customer order for products                         | `orders`          |
| **Purchase Order** | An order placed with a supplier                       | `purchase_orders` |

### Inventory Model

| Term        | Definition                                         | Database Table |
| ----------- | -------------------------------------------------- | -------------- |
| **Product** | A product definition (SKU, category, etc.)         | `products`     |
| **Batch**   | A specific lot of a product with quantity and cost | `batches`      |
| **Lot**     | A received shipment from a supplier                | `lots`         |

---

## Table Mappings

### Canonical Party Model

```
┌─────────────────────────────────────────────────────────────┐
│                        clients                               │
│  (Single source of truth for all business entities)         │
├─────────────────────────────────────────────────────────────┤
│  id              │ Primary key                               │
│  name            │ Business name                             │
│  teriCode        │ Unique identifier (e.g., "CLI-001")       │
│  isSeller        │ true = can sell to TERP (supplier)        │
│  isBuyer         │ true = can buy from TERP (customer)       │
│  totalOwed       │ Current AR balance                        │
│  vipPortalEnabled│ Has VIP portal access                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ 1:1 (for suppliers)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    supplier_profiles                         │
│  (Extended supplier-specific data)                          │
├─────────────────────────────────────────────────────────────┤
│  id              │ Primary key                               │
│  clientId        │ FK → clients.id                           │
│  legacyVendorId  │ FK → vendors.id (migration tracking)      │
│  licenseNumber   │ State license                             │
│  paymentTerms    │ Net 30, etc.                              │
│  preferredPayment│ Check, ACH, etc.                          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    vendors (DEPRECATED)                      │
│  DO NOT USE - Migrate to clients + supplier_profiles        │
└─────────────────────────────────────────────────────────────┘
```

### ID Field Rules

| Field Pattern                | References                     | Notes                                               |
| ---------------------------- | ------------------------------ | --------------------------------------------------- |
| `clientId`                   | `clients.id`                   | Canonical party reference                           |
| `customerId`                 | `clients.id`                   | **LEGACY** - Will be renamed to `clientId`          |
| `vendorId` (in payments)     | `clients.id`                   | References supplier (client with `isSeller=true`)   |
| `vendorId` (in lots, brands) | `vendors.id`                   | **LEGACY** - Will be migrated to `supplierClientId` |
| `userId`                     | `users.id`                     | Internal user reference                             |
| `createdBy`                  | `users.id`                     | Actor who created the record                        |
| `updatedBy`                  | `users.id`                     | Actor who last updated the record                   |
| `actorId`                    | `users.id` or `vip:{clientId}` | Audit trail actor                                   |

### Foreign Key Reference Guide

```typescript
// ✅ CORRECT - New code should use these patterns
invoices.customerId → clients.id      // Customer who owes money
payments.customerId → clients.id      // AR payment from customer
payments.vendorId → clients.id        // AP payment to supplier (isSeller=true)
sales.customerId → clients.id         // Customer who made purchase

// ⚠️ LEGACY - Existing code, will be migrated
lots.vendorId → vendors.id            // Will become supplierClientId → clients.id
brands.vendorId → vendors.id          // Will become supplierClientId → clients.id
expenses.vendorId → vendors.id        // Will become supplierClientId → clients.id
```

---

## Write Authorization Rules

### Authentication Requirements

| Procedure Type               | Authentication               | Use Case                              |
| ---------------------------- | ---------------------------- | ------------------------------------- |
| `publicProcedure`            | None                         | Read-only public data, auth endpoints |
| `protectedProcedure`         | User required                | General authenticated operations      |
| `strictlyProtectedProcedure` | Real user required (no demo) | Mutations requiring attribution       |
| `adminProcedure`             | Admin role required          | Administrative operations             |
| `vipPortalProcedure`         | VIP session required         | VIP portal mutations                  |

### Actor Attribution Rules

1. **All mutations must have actor attribution**
   - Internal users: `ctx.user.id`
   - VIP portal: `vip:{clientId}`

2. **Actor fields must come from context, not input**

   ```typescript
   // ✅ CORRECT
   const createdBy = ctx.user.id;

   // ❌ WRONG
   const createdBy = input.createdBy;
   ```

3. **No fallback user patterns**

   ```typescript
   // ❌ FORBIDDEN
   const userId = ctx.user?.id || 1;

   // ✅ CORRECT
   const userId = getAuthenticatedUserId(ctx);
   ```

### Secured Routers

| Router                    | Procedure Type               | Notes               |
| ------------------------- | ---------------------------- | ------------------- |
| `orders`                  | `strictlyProtectedProcedure` | All mutations       |
| `invoices`                | `protectedProcedure`         | Read/write          |
| `payments`                | `strictlyProtectedProcedure` | Financial mutations |
| `calendar.*`              | `strictlyProtectedProcedure` | All mutations       |
| `vipPortal.marketplace.*` | `vipPortalProcedure`         | VIP mutations       |
| `vipPortal.liveCatalog.*` | `vipPortalProcedure`         | VIP mutations       |
| `admin.*`                 | `adminProcedure`             | Admin only          |

---

## Migration Timeline

### Phase 1: Vendor Migration (Current)

**Status**: In Progress

1. Create `supplier_profiles` table ✅
2. Migrate vendors to clients with `isSeller=true`
3. Create supplier profile for each migrated vendor
4. Update FK references to use `clients.id`

### Phase 2: Column Normalization (Planned)

**Target**: Q1 2026

1. Add `clientId` alias columns to invoices, sales, payments
2. Dual-write period (both `customerId` and `clientId`)
3. Update application code to use `clientId`
4. Remove `customerId` columns

### Phase 3: Vendor Table Deprecation (Planned)

**Target**: Q2 2026

1. Mark `vendors` table as deprecated
2. Add console warnings on vendor queries
3. Create vendor query mapping layer
4. Remove `vendors` table after verification

---

## Data Integrity Rules

### Referential Integrity

1. **All FK columns must have constraints**

   ```typescript
   customerId: int("customerId").references(() => clients.id, {
     onDelete: "restrict",
   });
   ```

2. **All FK columns must have indexes**

   ```typescript
   customerIdIdx: index("idx_invoices_customer_id").on(table.customerId);
   ```

3. **Soft deletes preferred over hard deletes**
   ```typescript
   isDeleted: boolean("is_deleted").default(false);
   deletedAt: timestamp("deleted_at");
   ```

### Orphan Prevention

1. **No orphaned records allowed**
   - Run orphan detection before migrations
   - Resolve orphans before adding FK constraints

2. **Cascade rules**
   - Parent records: `onDelete: 'restrict'`
   - Child records (line items): `onDelete: 'cascade'`

---

## Query Patterns

### Finding Suppliers

```typescript
// ✅ CORRECT - Use clients table with isSeller filter
const suppliers = await db.query.clients.findMany({
  where: eq(clients.isSeller, true),
  with: {
    supplierProfile: true,
  },
});

// ❌ DEPRECATED - Don't query vendors table directly
const vendors = await db.query.vendors.findMany();
```

### Finding Customers

```typescript
// ✅ CORRECT - Use clients table
const customers = await db.query.clients.findMany({
  where: eq(clients.isBuyer, true),
});
```

### Getting Supplier by Legacy Vendor ID

```typescript
// For migration compatibility
const supplier = await db.query.supplierProfiles.findFirst({
  where: eq(supplierProfiles.legacyVendorId, vendorId),
  with: {
    client: true,
  },
});
```

---

## Glossary

| Term           | Definition                               |
| -------------- | ---------------------------------------- |
| **AR**         | Accounts Receivable - money owed to TERP |
| **AP**         | Accounts Payable - money TERP owes       |
| **FK**         | Foreign Key                              |
| **COGS**       | Cost of Goods Sold                       |
| **SKU**        | Stock Keeping Unit                       |
| **VIP Portal** | Client-facing portal for self-service    |
| **tRPC**       | TypeScript RPC framework used for API    |
| **Drizzle**    | TypeScript ORM used for database         |

---

**This dictionary is the authoritative source for TERP terminology and data model conventions.**
