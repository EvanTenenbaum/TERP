# TER-261: Data Cleanup — 5 LIVE Batches with Bad Qty

**Wave:** 10 — Infrastructure & Edge Cases
**Priority:** HIGH | **Mode:** RED (production database write)
**Estimate:** 4h

---

## Context

There are 5 batches in production with `batchStatus = 'LIVE'` that have incorrect quantity fields (`onHandQty`, `reservedQty`, etc.). These need to be identified and corrected via a one-time data fix.

## CRITICAL: Production Migration Protocol

**DO NOT connect directly to the database.** Per `docs/runbooks/PRODUCTION_MIGRATION_RUNBOOK.md`, all production data fixes must go through **DigitalOcean App Platform temporary job components**.

This task requires:

1. A TypeScript script that identifies and fixes the bad batches
2. The script deployed as a temporary DO App Platform job
3. The job removed from the app spec after successful execution

## Investigation Steps

1. Read `drizzle/schema.ts` — find the `batches` table definition, understand qty columns (`onHandQty`, `reservedQty`, `sampleQty`, `availableQty`, etc.)
2. Read `server/routers/inventory.ts` — understand how batch quantities are managed
3. Identify the 5 affected batches. Possible approaches:
   - Look for batches where `batchStatus = 'LIVE'` but `onHandQty <= 0`
   - Look for batches where calculated `availableQty` doesn't match stored value
   - Look for batches where `reservedQty > onHandQty`
   - Check for batches with negative quantities

## Required Deliverables

### 1. Diagnostic Script (`scripts/migrations/ter-261-diagnose-live-batches.ts`)

```typescript
// Query all LIVE batches and flag those with inconsistent qty
// Output: batch IDs, current values, what's wrong
// DO NOT modify any data — read-only diagnostic
```

### 2. Fix Script (`scripts/migrations/ter-261-fix-live-batch-qty.ts`)

```typescript
// For each identified bad batch:
// 1. Log current state (full audit trail)
// 2. Calculate correct values based on inventory movements
// 3. Update batch qty fields
// 4. Log new state
// Exit 0 on success, non-zero on any error (triggers DO rollback)
```

### 3. Rollback Plan

Document how to reverse each fix (store original values in script output).

## Key Files

| File                                            | Purpose                       |
| ----------------------------------------------- | ----------------------------- |
| `drizzle/schema.ts`                             | Batches table definition      |
| `server/routers/inventory.ts`                   | Inventory management logic    |
| `docs/runbooks/PRODUCTION_MIGRATION_RUNBOOK.md` | How to run production scripts |
| `scripts/migrations/`                           | Where migration scripts live  |

## Verification Checklist

- [ ] Diagnostic script identifies the 5 affected batches
- [ ] Fix script logs before/after state for audit trail
- [ ] Fix script exits non-zero on any error
- [ ] Script is idempotent (safe to run twice)
- [ ] `pnpm check` passes
- [ ] `pnpm build` passes

## Acceptance Criteria

1. All 5 LIVE batches have correct, consistent quantity fields
2. Full audit trail of what was changed
3. Rollback instructions documented
4. Job component removed from app spec after execution
