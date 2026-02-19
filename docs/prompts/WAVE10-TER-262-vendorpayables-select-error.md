# TER-262: vendorPayables.create SELECT Query Error

**Wave:** 10 — Infrastructure & Edge Cases
**Priority:** HIGH | **Mode:** STRICT
**Estimate:** 4h

---

## Context

The `vendorPayables.create` mutation fails at runtime with a query error. The issue is in the pre-insert SELECT that checks for existing payables, or in the INSERT itself.

## Root Cause Analysis

The `vendorPayables` table schema (`drizzle/schema.ts` line 7367) uses:

- `vendorPayableStatusEnum = mysqlEnum("vendor_payable_status", [...])` (line 7340)
- Used as: `status: vendorPayableStatusEnum.notNull().default("PENDING")` (line 7407)

**CRITICAL BUG (mysqlEnum naming rule from CLAUDE.md):** The first argument to `mysqlEnum()` MUST match the actual database column name. The enum is defined with `"vendor_payable_status"` as its first arg, which makes the DB column name `vendor_payable_status`. But the column should likely be named `status` (matching other tables in the codebase).

If the production DB was created with `status ENUM(...)` but the schema says `mysqlEnum("vendor_payable_status", ...)`, every query touching the `status` column will fail with "Unknown column 'vendor_payable_status'".

## Investigation Steps

1. Read `drizzle/schema.ts` — find `vendorPayables` table (line 7367) and `vendorPayableStatusEnum` (line 7340)
2. Read `server/services/payablesService.ts` — the `createPayable` function (line 88)
3. Read `server/routers/vendorPayables.ts` — the `create` mutation (line 191)
4. Check if the `vendor_payables` table exists in production by looking at migration files
5. Check all `mysqlEnum` definitions used by `vendorPayables` for naming mismatches

## Required Fix

### Fix 1: Correct the mysqlEnum naming

```typescript
// BEFORE (line 7340 of schema.ts) — enum type name, NOT column name
export const vendorPayableStatusEnum = mysqlEnum("vendor_payable_status", [...]);

// AFTER — matches the actual DB column name
export const vendorPayableStatusEnum = mysqlEnum("status", [...]);
```

**However**, this enum may be defined as a reusable enum that's used in multiple tables. If so, it can't be a standalone definition — it must be inlined in the table definition:

```typescript
// In the vendorPayables table definition:
status: mysqlEnum("status", ["PENDING", "DUE", "PARTIAL", "PAID", "VOID"])
  .notNull()
  .default("PENDING"),
```

### Fix 2: Check for other column mismatches

Also verify:

- `payableNotificationTypeEnum = mysqlEnum("payable_notification_type", [...])` — is this used as a column? If so, same bug.
- All FK columns (`vendor_client_id`, `batch_id`, `lot_id`) — verify these match production DB

### Fix 3: Add error handling in the router

The router's `create` mutation (line 194) calls `payablesService.createPayable()` without try/catch. Add proper TRPCError wrapping.

## Key Files

| File                                    | Purpose                              |
| --------------------------------------- | ------------------------------------ |
| `drizzle/schema.ts:7340`                | `vendorPayableStatusEnum` definition |
| `drizzle/schema.ts:7367`                | `vendorPayables` table definition    |
| `server/services/payablesService.ts:88` | `createPayable` implementation       |
| `server/routers/vendorPayables.ts:191`  | `create` router mutation             |

## Verification Checklist

- [ ] All `mysqlEnum` first args match actual DB column names
- [ ] `pnpm check` passes
- [ ] `pnpm lint` — no new errors in modified files
- [ ] `pnpm test` passes
- [ ] `pnpm build` passes
- [ ] If schema changes: `pnpm test:schema` passes (requires DB)

## Acceptance Criteria

1. `vendorPayables.create` no longer throws a SELECT/INSERT query error
2. Enum column names match production DB schema
3. No regressions in payable list/get/update operations
