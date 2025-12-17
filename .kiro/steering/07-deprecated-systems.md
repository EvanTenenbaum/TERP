---
inclusion: always
---

# ⛔ TERP Deprecated Systems Registry

**Version**: 1.0  
**Last Updated**: 2025-12-16  
**Status**: MANDATORY - READ BEFORE ANY CODE CHANGES

This document lists all deprecated systems, patterns, and code paths. **Using deprecated systems will break the codebase.**

---

## 🚨 CRITICAL: Pre-Work Checklist

Before writing ANY code, verify you are NOT using:

1. ❌ `vendors` table directly (use `clients` with `isSeller=true`)
2. ❌ `vendorId` for new FKs (use `clientId` or `supplierClientId`)
3. ❌ `customerId` for new columns (use `clientId`)
4. ❌ Hard deletes (use soft deletes with `deletedAt`)
5. ❌ `ctx.user?.id || 1` fallback pattern (use `getAuthenticatedUserId(ctx)`)
6. ❌ Railway deployment references (we use DigitalOcean)

---

## Deprecated Tables

### `vendors` Table

**Status**: DEPRECATED as of 2025-12-16  
**Replacement**: `clients` table with `isSeller=true` + `supplier_profiles`  
**Removal Target**: Q2 2026

```typescript
// ❌ DEPRECATED - DO NOT USE
const vendors = await db.query.vendors.findMany();
const vendor = await db.query.vendors.findFirst({
  where: eq(vendors.id, vendorId),
});

// ✅ CORRECT - Use clients with supplier filter
const suppliers = await db.query.clients.findMany({
  where: eq(clients.isSeller, true),
  with: { supplierProfile: true },
});

// ✅ For legacy vendor ID lookup during migration
const supplier = await db.query.supplierProfiles.findFirst({
  where: eq(supplierProfiles.legacyVendorId, vendorId),
  with: { client: true },
});
```

**Migration Path**:

1. Vendors have been copied to `clients` with `isSeller=true`
2. Vendor-specific data is in `supplier_profiles`
3. `supplier_profiles.legacyVendorId` maps to old `vendors.id`
4. Update code to use `clients.id` instead of `vendors.id`

---

## Deprecated Column Patterns

### `vendorId` Foreign Keys (in new tables)

**Status**: DEPRECATED for new code  
**Replacement**: `clientId` or `supplierClientId`

```typescript
// ❌ DEPRECATED - Don't add new vendorId columns
export const myTable = mysqlTable("my_table", {
  vendorId: int("vendor_id").references(() => vendors.id), // WRONG
});

// ✅ CORRECT - Use clientId referencing clients table
export const myTable = mysqlTable("my_table", {
  supplierClientId: int("supplier_client_id").references(() => clients.id),
});
```

**Existing `vendorId` columns** (in `lots`, `brands`, `expenses`):

- These are being migrated to `supplierClientId`
- During migration, both columns may exist
- New code should use `supplierClientId`

### `customerId` Column Name

**Status**: LEGACY - will be renamed  
**Replacement**: `clientId`

```typescript
// ⚠️ LEGACY - Existing code, don't change without migration
invoices.customerId → clients.id  // Works, but naming is legacy

// ✅ PREFERRED for new columns
myTable.clientId → clients.id
```

---

## Deprecated Code Patterns

### Fallback User ID Pattern

**Status**: FORBIDDEN  
**Security Risk**: Allows unauthenticated mutations

```typescript
// ❌ FORBIDDEN - Security vulnerability
const userId = ctx.user?.id || 1;
const createdBy = ctx.user?.id ?? 1;

// ✅ CORRECT - Use helper function
import { getAuthenticatedUserId } from "../_core/trpc";
const userId = getAuthenticatedUserId(ctx); // Throws if not authenticated
```

### Direct Database Deletes

**Status**: DEPRECATED  
**Replacement**: Soft deletes

```typescript
// ❌ DEPRECATED - Hard delete
await db.delete(clients).where(eq(clients.id, id));

// ✅ CORRECT - Soft delete
await db
  .update(clients)
  .set({
    deletedAt: new Date(),
    // Optionally set deletedBy if tracking actor
  })
  .where(eq(clients.id, id));
```

### Any Type Usage

**Status**: FORBIDDEN  
**Replacement**: Proper TypeScript types

```typescript
// ❌ FORBIDDEN
function processData(data: any) { ... }
const result = response as any;

// ✅ CORRECT
interface DataInput { value: string; }
function processData(data: DataInput) { ... }
```

---

## Deprecated Infrastructure

### Railway Deployment

**Status**: DEPRECATED as of 2025-12-16  
**Current Platform**: DigitalOcean App Platform

```bash
# ❌ DEPRECATED - Don't use Railway
railway deploy
railway logs

# ✅ CORRECT - Use DigitalOcean
doctl apps list
doctl apps logs <APP_ID>
./scripts/watch-deploy.sh
```

**Files to ignore**:

- `railway.json` - Historical reference only
- `railway.json.md` - Documentation of old config
- Any docs mentioning Railway as "current" platform

### Old Router Patterns

**Status**: CONSOLIDATED  
**Note**: Some routers were merged

```typescript
// ❌ REMOVED - ordersEnhancedV2Router
// Was consolidated into ordersRouter (RF-001)

// ✅ CORRECT - Use main orders router
import { ordersRouter } from "./routers/orders";
```

---

## Deprecated File Locations

### Legacy Data Access Files

**Pattern**: `server/[feature]Db.ts` at root level  
**Status**: LEGACY - new code should use services

```
server/
├── clientsDb.ts          # Legacy - still in use
├── ordersDb.ts           # Legacy - still in use
├── inventoryDb.ts        # Legacy - still in use
└── services/             # Preferred location for new code
    └── myFeatureService.ts
```

**Guidance**:

- Don't create new `*Db.ts` files at server root
- New business logic goes in `server/services/`
- Existing `*Db.ts` files work but won't be extended

---

## Migration Status Tracker

| System              | Status     | Replacement                     | Target Date |
| ------------------- | ---------- | ------------------------------- | ----------- |
| `vendors` table     | Deprecated | `clients` + `supplier_profiles` | Q2 2026     |
| `vendorId` FKs      | Migrating  | `supplierClientId`              | Q1 2026     |
| `customerId` naming | Legacy     | `clientId`                      | Q1 2026     |
| Railway deployment  | Removed    | DigitalOcean                    | Complete    |
| `ordersEnhancedV2`  | Removed    | `orders` router                 | Complete    |

---

## How to Handle Deprecated Code

### If You Encounter Deprecated Code

1. **Don't extend it** - Don't add new features using deprecated patterns
2. **Don't break it** - Existing code still works, don't remove without migration
3. **Flag it** - Add TODO comments noting deprecation
4. **Report it** - Note in session file if significant deprecated usage found

### If You Need to Use a Deprecated System

1. **Check if migration exists** - There may be a new way to do it
2. **Ask for guidance** - If unclear, ask the user
3. **Document why** - If you must use deprecated code, document the reason
4. **Create migration task** - Add to roadmap for future cleanup

### If You're Unsure

```
When in doubt:
1. Check this document
2. Check docs/protocols/CANONICAL_DICTIONARY.md
3. Check docs/protocols/NAMING_CONVENTIONS.md
4. Ask the user before proceeding
```

---

## Enforcement

### Automated Checks

- TypeScript compiler catches type issues
- ESLint catches `any` usage
- Schema validation catches FK issues
- Pre-commit hooks run checks

### Manual Review

- Code reviews check for deprecated patterns
- Session files should note any deprecated usage
- Roadmap tasks track migration progress

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────┐
│                    DEPRECATED SYSTEMS                        │
├─────────────────────────────────────────────────────────────┤
│ ❌ vendors table      → ✅ clients (isSeller=true)          │
│ ❌ vendorId (new)     → ✅ supplierClientId                 │
│ ❌ customerId (new)   → ✅ clientId                         │
│ ❌ ctx.user?.id || 1  → ✅ getAuthenticatedUserId(ctx)      │
│ ❌ hard deletes       → ✅ soft deletes (deletedAt)         │
│ ❌ Railway            → ✅ DigitalOcean                     │
│ ❌ any types          → ✅ proper TypeScript types          │
└─────────────────────────────────────────────────────────────┘
```

---

**Violating these deprecation rules will cause bugs, data integrity issues, or security vulnerabilities. When in doubt, ask.**
