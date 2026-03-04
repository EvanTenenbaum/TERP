---
name: deprecated-systems
description: "Deprecated systems reference — vendors table migration, naming conventions, forbidden patterns with replacements, and migration timeline"
---

# TERP Deprecated Systems

## Pre-Work Checklist

Before writing ANY code, verify you are NOT using:

| Deprecated | Use Instead |
|-----------|-------------|
| `vendors` table | `clients` with `isSeller=true` |
| `vendorId` for new FKs | `clientId` or `supplierClientId` |
| `customerId` for new columns | `clientId` |
| Hard deletes | Soft deletes with `deletedAt` |
| `ctx.user?.id \|\| 1` | `getAuthenticatedUserId(ctx)` |
| `ctx.user?.id ?? 1` | `getAuthenticatedUserId(ctx)` |
| `input.createdBy` | `getAuthenticatedUserId(ctx)` |
| Railway references | DigitalOcean |
| `any` types | Proper TypeScript types or `unknown` |
| `console.log` in production | Pino structured logging |
| `server/*Db.ts` (extending) | `server/services/` for new logic |

## Migration Status

| System | Status | Replacement | Target |
|--------|--------|-------------|--------|
| `vendors` table | Deprecated | `clients` + `supplier_profiles` | Q2 2026 |
| `vendorId` FKs | Migrating | `supplierClientId` | Q1 2026 |
| `customerId` naming | Legacy | `clientId` | Q1 2026 |
| Railway | Removed | DigitalOcean | Complete |

## CI-Enforced Patterns

These patterns are detected by the pre-merge workflow. PRs containing them are blocked:

```typescript
// FORBIDDEN — Fallback user ID
const userId = ctx.user?.id || 1;
const createdBy = ctx.user?.id ?? 1;

// FORBIDDEN — Actor from input
const createdBy = input.createdBy;
const userId = input.userId;

// CORRECT — Actor from authenticated context
import { getAuthenticatedUserId } from "../_core/trpc";
const userId = getAuthenticatedUserId(ctx);

// WARNING — Hard deletes (flagged)
await db.delete(clients).where(eq(clients.id, id));

// CORRECT — Soft deletes
await db.update(clients).set({ deletedAt: new Date() }).where(eq(clients.id, id));

// FORBIDDEN — Any types
function process(data: any) { ... }

// CORRECT — Proper types
interface DataInput { value: string; }
function process(data: DataInput) { ... }
```

## Vendors → Clients Migration Notes

The `vendors` table still exists in the schema for backward compatibility with legacy data. New code MUST NOT reference it. Use the party model:

```typescript
// Find suppliers (replaces vendors queries)
const suppliers = await db.query.clients.findMany({
  where: eq(clients.isSeller, true),
  with: { supplierProfile: true },
});

// Extended supplier data
const profile = await db.query.supplierProfiles.findFirst({
  where: eq(supplierProfiles.clientId, clientId),
});
```

## Legacy Data Access Files

Files matching `server/*Db.ts` (e.g., `productsDb.ts`, `inventoryDb.ts`) are legacy data access layers. Do NOT add new methods to them. Instead, create service files in `server/services/` for new business logic.
