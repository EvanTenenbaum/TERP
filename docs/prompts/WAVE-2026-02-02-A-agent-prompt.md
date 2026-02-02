# REL Sprint: WAVE-2026-02-02-A - Reliability Hardening

> **Wave:** WAVE-2026-02-02-A  
> **Parallel Tasks:** None - sequential execution required

---

## Mission

Complete 4 reliability tasks that harden TERP's financial and database operations against partial failures and concurrent edit conflicts.

| Field | Value |
|-------|-------|
| Risk Level | 🔴 HIGH |
| Total Estimate | 20h |
| Depends On | REL-001 ✅ (complete) |
| Blocks | Beta release reliability |

---

## Context

TERP handles financial transactions (payments, orders, invoices) that MUST be atomic. The current codebase has 3 payment transactions without rollback handling, order confirmation without transaction wrapper, and zero optimistic locking on critical tables. These gaps can cause data corruption under failure or concurrent access.

**Execution Order:** REL-003 → REL-006 → REL-005 → REL-017

---

## Task 1: REL-003 - Add Transaction Rollback to Payments

### Problem
3 transactions in `server/routers/payments.ts` at lines ~300, ~692, ~892 lack explicit rollback handling.

### Deliverables
- [ ] Add try/catch with explicit rollback to line ~300 transaction
- [ ] Add try/catch with explicit rollback to line ~692 transaction  
- [ ] Add try/catch with explicit rollback to line ~892 transaction
- [ ] Log transaction failures to Sentry
- [ ] Enable the skipped tests in `payments.test.ts` if possible

### Implementation Pattern
```typescript
// ❌ CURRENT (no rollback)
await db.transaction(async (tx) => {
  await tx.insert(payments).values(paymentData);
  await tx.update(invoices).set({ amountPaid: newPaid });
});

// ✅ REQUIRED (explicit rollback)
try {
  await db.transaction(async (tx) => {
    await tx.insert(payments).values(paymentData);
    await tx.update(invoices).set({ amountPaid: newPaid });
  });
} catch (error) {
  // Transaction auto-rolls back, but we need to:
  // 1. Log to Sentry
  Sentry.captureException(error, {
    tags: { operation: 'payment_record' },
    extra: { invoiceId, amount }
  });
  // 2. Re-throw with context
  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Payment failed - transaction rolled back',
    cause: error
  });
}
```

### Verification
```bash
pnpm check && pnpm lint && pnpm test && pnpm build
grep -n "db.transaction" server/routers/payments.ts  # Should all have try/catch
```

---

## Task 2: REL-006 - Wrap Order Confirmation in Transaction

### Problem
Order confirmation has no transaction wrapper - partial state possible if any step fails.

### Deliverables
- [ ] Wrap confirm procedure in db.transaction()
- [ ] Include: status update, inventory reservation, GL entries
- [ ] Add explicit rollback on any failure
- [ ] Log complete transaction to audit trail
- [ ] Add integration test for partial failure recovery

### Implementation Location
Find the order confirmation procedure in `server/routers/orders.ts` - look for status transition to CONFIRMED.

### Implementation Pattern
```typescript
// Wrap entire confirmation in transaction
await db.transaction(async (tx) => {
  // 1. Update order status
  await tx.update(orders)
    .set({ status: 'CONFIRMED', updatedBy: ctx.user.id })
    .where(eq(orders.id, orderId));
  
  // 2. Reserve inventory
  for (const item of lineItems) {
    await reserveInventory(tx, item.batchId, item.quantity);
  }
  
  // 3. Create GL entries
  await createOrderGLEntries(tx, order);
  
  // 4. Audit trail
  await tx.insert(orderStatusHistory).values({
    orderId,
    fromStatus: 'DRAFT',
    toStatus: 'CONFIRMED',
    changedBy: ctx.user.id,
    changedAt: new Date()
  });
});
```

### Verification
```bash
pnpm check && pnpm lint && pnpm test && pnpm build
```

---

## Task 3: REL-005 - Add Optimistic Locking to Critical Tables

### Problem
0 of 39 tables have version fields - concurrent edits silently overwrite.

### Target Tables
- orders
- batches
- invoices
- payments
- clients

### Deliverables
- [ ] Add `version` column to 5 critical tables (migration)
- [ ] Create `server/utils/optimisticLock.ts` helper
- [ ] Update all update operations to check version
- [ ] Return 409 Conflict on version mismatch
- [ ] Frontend: Handle 409 with "Data changed, please refresh"

### Migration
```sql
-- drizzle/migrations/XXXX_add_optimistic_locking.sql
ALTER TABLE orders ADD COLUMN version INT NOT NULL DEFAULT 1;
ALTER TABLE batches ADD COLUMN version INT NOT NULL DEFAULT 1;
ALTER TABLE invoices ADD COLUMN version INT NOT NULL DEFAULT 1;
ALTER TABLE payments ADD COLUMN version INT NOT NULL DEFAULT 1;
ALTER TABLE clients ADD COLUMN version INT NOT NULL DEFAULT 1;
```

### Schema Update
```typescript
// drizzle/schema.ts - add to each table
version: int('version').notNull().default(1),
```

### Helper Utility
```typescript
// server/utils/optimisticLock.ts
import { TRPCError } from '@trpc/server';
import { eq, and, sql } from 'drizzle-orm';

export async function updateWithOptimisticLock<T extends { version: number }>(
  tx: Transaction,
  table: Table,
  id: number,
  expectedVersion: number,
  updates: Partial<T>
) {
  const result = await tx.update(table)
    .set({ ...updates, version: sql`${table.version} + 1` })
    .where(and(
      eq(table.id, id),
      eq(table.version, expectedVersion)
    ));
  
  if (result.rowsAffected === 0) {
    throw new TRPCError({
      code: 'CONFLICT',
      message: 'Data has been modified by another user. Please refresh and try again.'
    });
  }
  
  return result;
}
```

### Frontend Error Handling
```typescript
// In mutation error handlers
if (error.data?.code === 'CONFLICT') {
  toast.error('Data changed by another user. Refreshing...');
  await utils.orders.getById.invalidate({ id: orderId });
}
```

### Verification
```bash
pnpm check && pnpm lint && pnpm test && pnpm build
# Test manually: Open same order in 2 tabs, edit both, verify conflict detected
```

---

## Task 4: REL-017 - Add Tests for Fingerprint Retry Logic

### Problem
Critical retry logic for schema fingerprint checks lacks test coverage.

### Deliverables
- [ ] Create unit tests for `verifySchemaFingerprint` retry logic
- [ ] Test first-attempt success scenario
- [ ] Test single retry success scenario
- [ ] Test three failures (max retries exceeded)
- [ ] Verify correct backoff delays (3s, 6s)

### Test File Location
Create `server/__tests__/autoMigrate.test.ts`

### Test Structure
```typescript
import { describe, it, expect, vi } from 'vitest';

describe('verifySchemaFingerprint', () => {
  it('succeeds on first attempt', async () => {
    // Mock db query to succeed
    // Verify no retries
  });
  
  it('succeeds after one retry', async () => {
    // Mock db query to fail once, then succeed
    // Verify exactly one retry
    // Verify 3s delay was applied
  });
  
  it('succeeds after two retries', async () => {
    // Mock db query to fail twice, then succeed
    // Verify 3s then 6s delays
  });
  
  it('fails after max retries exceeded', async () => {
    // Mock db query to always fail
    // Verify throws after 3 attempts
    // Verify all backoff delays applied
  });
});
```

### Verification
```bash
pnpm test server/__tests__/autoMigrate.test.ts
pnpm check && pnpm lint && pnpm test && pnpm build
```

---

## Technical Constraints (MUST Follow)

### Forbidden Patterns — Instant PR Rejection

| Pattern | Why Forbidden | Correct Approach |
|---------|---------------|------------------|
| `ctx.user?.id \|\| 1` | Corrupts audit trail | `getAuthenticatedUserId(ctx)` |
| `ctx.user?.id ?? 1` | Same issue | `getAuthenticatedUserId(ctx)` |
| `input.createdBy` | Security: actor from server | Get from `ctx.user.id` |
| `input.userId` | Security: never trust client | Get from `ctx.user.id` |
| `: any` | Destroys type safety | Use proper types or `unknown` |
| `db.delete(...)` | Hard delete = data loss | Soft delete with `deletedAt` |
| `vendorId` (new) | Deprecated table | Use `clientId` |
| `customerId` (new) | Inconsistent naming | Use `clientId` |

### Actor Attribution

Every mutation MUST record who did it:
```typescript
createdBy: ctx.user.id,  // From context, NEVER from input
updatedBy: ctx.user.id,
```

---

## Preflight & Incremental Verification

### Before Writing Any Code

```bash
# Clone and setup
gh repo clone EvanTenenbaum/TERP terp-repo 2>/dev/null || true
cd terp-repo
git fetch origin
git checkout main && git pull origin main
git checkout -b claude/rel-sprint-wave-a-$(openssl rand -hex 3)
pnpm install

# === PREFLIGHT CHECK ===
pnpm check   # Must pass
pnpm lint    # Must pass
pnpm test    # Must pass

# If ANY fail → STOP and report "Baseline broken"
```

### During Implementation

After EACH file you modify:
```bash
pnpm check  # Fix immediately if errors appear
```

Do NOT batch all changes then check at the end.

### Before Writing Database Code

```bash
# Read actual schema first — do not guess column names
cat drizzle/schema.ts
```

Use the EXACT column names and types from the schema.

---

## Self-QA (MANDATORY — Do NOT Skip)

### Technical Verification

```bash
pnpm check    # Must show 0 errors
pnpm lint     # Must show 0 errors
pnpm test     # Must show all pass
pnpm build    # Must succeed
```

**If any fail, fix before proceeding.**

### Forbidden Pattern Scan

```bash
CHANGED=$(git diff main --name-only | grep -E '\.(ts|tsx)$')
for f in $CHANGED; do
  echo "=== Scanning $f ==="
  grep -n "\.id.*||.*[0-9]" "$f" || true
  grep -n "\.id.*??.*[0-9]" "$f" || true
  grep -n "createdBy:.*input" "$f" || true
  grep -n "userId:.*input" "$f" || true
  grep -n "db\.delete(" "$f" || true
  grep -n ": any" "$f" || true
  grep -n "vendorId" "$f" || true
done
```

### Adversarial Testing

Test your code with these inputs:
- `null` and `undefined` for version fields
- Concurrent updates (same record, different tabs)
- Transaction failures mid-operation
- Network timeouts during transaction
- Invalid version numbers (0, -1, very large)

Document at least 5 adversarial scenarios you tested.

---

## Create Pull Request

```bash
git push -u origin HEAD

gh pr create --title "fix(reliability): WAVE-2026-02-02-A - transaction rollback, optimistic locking, order confirmation" --body "$(cat <<'EOF'
## Wave

WAVE-2026-02-02-A: REL Sprint Continuation

## Tasks Completed

- REL-003: Add Transaction Rollback to Payments
- REL-005: Add Optimistic Locking to Critical Tables
- REL-006: Wrap Order Confirmation in Transaction
- REL-017: Add Tests for Fingerprint Retry Logic

## Changes

- Added try/catch with explicit rollback to 3 payment transactions
- Added `version` column to orders, batches, invoices, payments, clients tables
- Created `server/utils/optimisticLock.ts` helper utility
- Wrapped order confirmation in db.transaction()
- Added unit tests for schema fingerprint retry logic

## Verification

| Check | Result |
|-------|--------|
| pnpm check | ✅ 0 errors |
| pnpm lint | ✅ 0 errors |
| pnpm test | ✅ X/X passing |
| pnpm build | ✅ success |
| Forbidden patterns | ✅ clean |

## Adversarial Scenarios Tested

1. [Concurrent edit] → [409 Conflict] → [Actual] ✅
2. [Transaction failure mid-payment] → [Full rollback] → [Actual] ✅
3. [Invalid version number] → [Conflict error] → [Actual] ✅
4. [Order confirm with inventory failure] → [Clean rollback] → [Actual] ✅
5. [Schema fingerprint timeout] → [Retry with backoff] → [Actual] ✅

## Files Changed

- `server/routers/payments.ts` — Added transaction rollback handling
- `server/routers/orders.ts` — Wrapped confirmation in transaction
- `server/utils/optimisticLock.ts` — NEW: Optimistic locking helper
- `drizzle/schema.ts` — Added version columns
- `drizzle/migrations/XXXX_add_optimistic_locking.sql` — NEW: Migration
- `server/__tests__/autoMigrate.test.ts` — NEW: Retry logic tests
- `client/src/hooks/useOptimisticError.ts` — NEW: 409 error handling

## Migration Notes

This PR includes a database migration that adds `version` columns to 5 tables.
Migration is safe (ADD COLUMN with DEFAULT) and backward compatible.
EOF
)"
```

---

## Completion Report (REQUIRED FORMAT)

When done, report using this EXACT structure:

```markdown
## Task Completion Report

### Summary

| Field | Value |
|-------|-------|
| Wave | WAVE-2026-02-02-A |
| Tasks | REL-003, REL-005, REL-006, REL-017 |
| Status | ✅ COMPLETE / ⚠️ PARTIAL / ❌ BLOCKED |
| Branch | claude/[branch-name] |
| PR | #[number] |
| Risk | 🔴 HIGH |

### Verification Results

| Check | Result |
|-------|--------|
| pnpm check | ✅ 0 errors |
| pnpm lint | ✅ 0 errors |
| pnpm test | ✅ X/X passing |
| pnpm build | ✅ success |
| Forbidden patterns | ✅ clean |

### What Was Done

[2-3 sentences per task summarizing the implementation approach]

### Files Changed

- `path/to/file1.ts` — [what changed]
- `path/to/file2.tsx` — [what changed]

### Adversarial Scenarios Tested

1. [Input] → [Expected] → [Actual] ✅
2. [Input] → [Expected] → [Actual] ✅
3. [Input] → [Expected] → [Actual] ✅

### Risks or Concerns

[Any edge cases, assumptions, or areas needing extra review during PM review]

### Blockers (if PARTIAL or BLOCKED)

[What prevented completion, what's needed to unblock]
```

---

## If You Get Stuck

| Situation | Action |
|-----------|--------|
| Build/test failures you can't fix | Report with full error output |
| Unclear requirements | Report what's unclear, propose interpretation |
| Need to modify shared files | STOP, report conflict to PM |
| Scope creep discovered | Report additional work needed, don't do it |
| Environment issues | Report with diagnostic output |

**Do NOT:**
- Guess at unclear requirements
- Modify files outside your task scope
- Skip self-QA to save time
- Report "complete" if any check fails
