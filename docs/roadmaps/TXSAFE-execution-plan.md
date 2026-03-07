# TXSAFE: Transaction Safety & Resilience Remediation Plan

**Created:** 2026-03-07
**Source:** Comprehensive Transaction Safety Audit (2026-03-07)
**Overall Score:** 74% → Target 92%+
**Total Estimated Effort:** ~20 hours
**Mode:** RED (financial data, concurrency, audit trail)

---

## Overview

This plan addresses all findings from the 2026-03-07 transaction safety, error handling, and resilience audit. Tasks are organized into three phases by severity, with strict dependency ordering.

**Blocking Production Deployment:** Phase 1 (P0) — 6 tasks, ~10h
**First Sprint:** Phase 2 (P1) — 4 tasks, ~5h
**Next Quarter:** Phase 3 (P2) — 4 tasks, ~5h

---

## Task Registry

| Task ID   | Title                                                | Priority | Phase | Est | Status | Linear |
| --------- | ---------------------------------------------------- | -------- | ----- | --- | ------ | ------ |
| TXSAFE-01 | Fix Payment Invoice Race Condition (FOR UPDATE)      | P0       | 1     | 30m | ready  | TBD    |
| TXSAFE-02 | Fix PO Receiving Check-Then-Act Race Condition       | P0       | 1     | 1h  | ready  | TBD    |
| TXSAFE-03 | Fix Batch Quantity Update Race Condition             | P0       | 1     | 1h  | ready  | TBD    |
| TXSAFE-04 | Remove Forbidden Actor Attribution Patterns          | P0       | 1     | 30m | ready  | TBD    |
| TXSAFE-05 | Migrate Idempotency Cache to Redis                   | P0       | 1     | 6h  | ready  | TBD    |
| TXSAFE-06 | Fix Health Check Silent Failure in Production        | P0       | 1     | 30m | ready  | TBD    |
| TXSAFE-07 | Add .max() Bounds to Monetary Zod Schemas            | P1       | 2     | 45m | ready  | TBD    |
| TXSAFE-08 | Fix String-to-Number Coercion in PO Receiving        | P1       | 2     | 1h  | ready  | TBD    |
| TXSAFE-09 | Add Notification Queue Persistence + Circuit Breaker | P1       | 2     | 2h  | ready  | TBD    |
| TXSAFE-10 | Add Overpayment Tolerance Config + Documentation     | P1       | 2     | 1h  | ready  | TBD    |
| TXSAFE-11 | Support Custom Transaction Isolation Levels          | P2       | 3     | 2h  | ready  | TBD    |
| TXSAFE-12 | Add Circuit Breaker for External Services            | P2       | 3     | 3h  | ready  | TBD    |
| TXSAFE-13 | Add Query-Level Timeout Configuration                | P2       | 3     | 1h  | ready  | TBD    |
| TXSAFE-14 | Add Rate Limiting on Critical Mutations              | P2       | 3     | 1h  | ready  | TBD    |

---

## Cross-Reference: Existing Roadmap Tasks

| Audit Finding                   | Existing Task  | Relationship       |
| ------------------------------- | -------------- | ------------------ |
| Payment race condition          | REL-003        | TXSAFE-01 extends  |
| Idempotency multi-instance      | REL-005 (Beta) | TXSAFE-05 replaces |
| Range validation on Zod schemas | REL-008        | TXSAFE-07 overlaps |
| Optimistic locking              | REL-005 (MVP)  | Complementary      |
| Order confirmation transaction  | REL-006        | Complementary      |

---

## Phase 1: CRITICAL (P0) — Blocks Production

> All tasks in this phase must complete before any production deployment.
> **Total estimate: ~10 hours**

---

### TXSAFE-01: Fix Payment Invoice Race Condition

**Priority:** P0 — CRITICAL
**Estimate:** 30 minutes
**Module:** `server/routers/payments.ts`
**Mode:** RED
**Dependencies:** None
**Extends:** REL-003

#### Problem

Payment recording reads the invoice's `amountPaid` without a `FOR UPDATE` lock. Two concurrent payments can both read `amountPaid=0`, compute independently, and the last write wins — silently losing the first payment.

#### Race Scenario

```
Thread A: SELECT invoice (amountPaid=0) — no lock
Thread B: SELECT invoice (amountPaid=0) — no lock
Thread A: UPDATE amountPaid = 0 + 600 = 600
Thread B: UPDATE amountPaid = 0 + 500 = 500  ← overwrites Thread A
RESULT: $600 payment lost, AR understated by $600
```

#### Fix

Add `FOR UPDATE` lock on invoice read at line ~259:

```typescript
const [invoice] = await tx
  .select()
  .from(invoices)
  .where(eq(invoices.id, input.invoiceId))
  .for("update"); // ← ADD THIS
```

#### Verification

- [ ] `pnpm check` passes
- [ ] `pnpm test` passes
- [ ] `pnpm build` passes
- [ ] Manual test: two concurrent payment requests on same invoice → both recorded correctly
- [ ] AR balance reflects sum of both payments

---

### TXSAFE-02: Fix PO Receiving Check-Then-Act Race Condition

**Priority:** P0 — CRITICAL
**Estimate:** 1 hour
**Module:** `server/routers/poReceiving.ts`
**Mode:** RED
**Dependencies:** None

#### Problem

PO item `quantityReceived` is read without a lock, then checked against `quantityOrdered`. Two concurrent receives can both pass the check and overwrite each other, allowing over-receiving or losing received quantities.

#### Race Scenario

```
PO: 100 units ordered
Thread A: READ quantityReceived = 0, CHECK 0+60 ≤ 100 → YES
Thread B: READ quantityReceived = 0, CHECK 0+60 ≤ 100 → YES
Thread A: UPDATE quantityReceived = 60
Thread B: UPDATE quantityReceived = 60  ← Thread A's receive lost
RESULT: 120 units received but only 60 recorded
```

#### Fix

1. Add `FOR UPDATE` on PO item read at line ~513
2. Move check-then-update into atomic locked section:

```typescript
const [poItem] = await tx
  .select()
  .from(poItems)
  .where(eq(poItems.id, item.poItemId))
  .for("update"); // ← ADD LOCK

const currentReceived = parseFloat(poItem.quantityReceived || "0");
const newReceived = currentReceived + parseFloat(item.quantity);

if (newReceived > quantityOrdered) {
  throw new TRPCError({ code: "BAD_REQUEST", message: "Over-receiving" });
}
```

#### Verification

- [ ] `pnpm check` passes
- [ ] `pnpm test` passes
- [ ] `pnpm build` passes
- [ ] Concurrent receive test: two receives totaling > ordered → error thrown

---

### TXSAFE-03: Fix Batch Quantity Update Race Condition

**Priority:** P0 — CRITICAL
**Estimate:** 1 hour
**Module:** `server/routers/poReceiving.ts`
**Mode:** RED
**Dependencies:** None

#### Problem

Batch `onHandQty` is read-then-updated without a `FOR UPDATE` lock during receiving. Two concurrent receives for the same batch can overwrite each other, losing inventory.

#### Race Scenario

```
Batch onHandQty = 100
Thread A: READ 100, CALC 100+50=150
Thread B: READ 100, CALC 100+40=140
Thread A: UPDATE → 150
Thread B: UPDATE → 140  ← Thread A's 50 units lost
EXPECTED: 190, ACTUAL: 140 — 50 units vanished
```

#### Fix

Add `FOR UPDATE` on batch read at line ~160:

```typescript
const [batch] = await tx
  .select()
  .from(batches)
  .where(eq(batches.id, item.batchId))
  .for("update"); // ← ADD LOCK
```

#### Verification

- [ ] `pnpm check` passes
- [ ] `pnpm test` passes
- [ ] `pnpm build` passes
- [ ] Concurrent batch receive test: both quantities properly summed

---

### TXSAFE-04: Remove Forbidden Actor Attribution Patterns

**Priority:** P0 — CRITICAL
**Estimate:** 30 minutes
**Module:** `server/routers/orders.ts.backup-rf001` (and any live references)
**Mode:** RED
**Dependencies:** None

#### Problem

Forbidden pattern `ctx.user?.id || 1` found in backup file (lines 27-31, 98, 150, 174). If any code references or copies from this backup, all mutations silently default to user ID 1 (admin) when auth context is missing — corrupting the audit trail.

#### Forbidden Patterns (per CLAUDE.md)

```typescript
// ALL BLOCKED:
ctx.user?.id || 1;
ctx.user?.id ?? 1;
input.createdBy;
input.userId;
```

#### Fix

1. Search ALL files (including backups) for forbidden patterns
2. Replace with `getAuthenticatedUserId(ctx)` — which throws if missing
3. Delete or quarantine `.backup-rf001` file to prevent copy-paste

```typescript
// BEFORE (forbidden):
createdBy: ctx.user?.id || 1;

// AFTER (required):
import { getAuthenticatedUserId } from "../_core/trpc";
const actorId = getAuthenticatedUserId(ctx);
createdBy: actorId;
```

#### Verification

- [ ] `pnpm check` passes
- [ ] `grep -r 'ctx.user?.id || 1' server/` returns zero results
- [ ] `grep -r 'ctx.user?.id ?? 1' server/` returns zero results
- [ ] `grep -r 'input.createdBy' server/routers/` returns zero results
- [ ] `pnpm test` passes

---

### TXSAFE-05: Migrate Idempotency Cache to Redis

**Priority:** P0 — CRITICAL
**Estimate:** 6 hours
**Module:** `server/_core/criticalMutation.ts`
**Mode:** RED
**Dependencies:** Redis instance available (DigitalOcean managed Redis or BullMQ's existing Redis)

#### Problem

`criticalMutation.ts` uses an in-memory `Map` for idempotency keys. In a multi-instance deployment (DigitalOcean App Platform with load balancer), each instance has its own cache. A retried request routed to a different instance will execute again, causing duplicate orders, double payments, or duplicate refunds.

#### Architecture

```
CURRENT (BROKEN):
  Client → LB → Instance A (Map: {key: result})
  Client → LB → Instance B (Map: {})  ← cache miss, re-executes

FIXED:
  Client → LB → Instance A → Redis.get(key) → cached result
  Client → LB → Instance B → Redis.get(key) → same cached result
```

#### Fix

1. Use existing BullMQ Redis connection (already in stack)
2. Replace `Map<string, CachedResult>` with Redis GET/SET
3. Use `SET key value EX 86400 NX` for atomic check-and-set
4. Serialize/deserialize with JSON
5. Keep in-memory fallback for development (no Redis)

#### Key Design Decisions

- **TTL:** 24 hours (match current behavior)
- **Key format:** `idempotency:{procedureName}:{key}`
- **Serialization:** JSON (results are already serializable)
- **Fallback:** In-memory Map when `REDIS_URL` not set (dev mode)

#### Verification

- [ ] `pnpm check` passes
- [ ] `pnpm test` passes (mock Redis in tests)
- [ ] `pnpm build` passes
- [ ] Integration test: same idempotency key → same result from different processes
- [ ] Load test: 100 concurrent duplicate requests → exactly 1 execution

---

### TXSAFE-06: Fix Health Check Silent Failure in Production

**Priority:** P0 — HIGH
**Estimate:** 30 minutes
**Module:** `server/_core/connectionPool.ts`
**Mode:** STRICT
**Dependencies:** None

#### Problem

Database health check at startup logs an error but doesn't exit when the database is unreachable. The app continues running and returns mysterious timeouts to clients. DigitalOcean's deployment orchestration can't detect the failure to trigger a restart.

#### Fix

```typescript
pool
  .getConnection()
  .then(async connection => {
    try {
      await connection.ping();
      logger.info("Database connection healthy");
    } catch (error) {
      logger.error({
        msg: "CRITICAL: Database unreachable",
        error: error.message,
      });
      if (process.env.NODE_ENV === "production") {
        process.exit(1); // ← Let orchestrator restart
      }
    }
  })
  .catch(err => {
    logger.error({ msg: "Connection pool init failed", error: err });
    if (process.env.NODE_ENV === "production") {
      process.exit(1); // ← Let orchestrator restart
    }
  });
```

#### Verification

- [ ] `pnpm check` passes
- [ ] `pnpm test` passes
- [ ] `pnpm build` passes
- [ ] Dev mode: app continues on DB failure (existing behavior)
- [ ] Production mode: app exits with code 1 on DB failure

---

## Phase 2: HIGH PRIORITY (P1) — First Sprint

> Address within first sprint after Phase 1.
> **Total estimate: ~5 hours**

---

### TXSAFE-07: Add .max() Bounds to Monetary Zod Schemas

**Priority:** P1 — HIGH
**Estimate:** 45 minutes
**Module:** `server/routers/payments.ts`, `server/routers/invoices.ts`, `server/routers/orders.ts`, `server/routers/refunds.ts`
**Mode:** STRICT
**Dependencies:** None
**Overlaps:** REL-008 (Add Range Validation to Zod Schemas)

#### Problem

Monetary amount fields validated as `.positive()` but without `.max()` — allows recording a $999,999,999,999.99 payment. No sane cannabis transaction exceeds $999,999.99.

#### Fix

Add `.max(999999.99)` to all monetary Zod fields:

```typescript
// payments.ts
amount: z.number().positive().max(999999.99, "Amount exceeds maximum"),

// orders.ts
unitPrice: z.number().nonnegative().max(99999.99),
totalAmount: z.number().nonnegative().max(999999.99),

// refunds.ts
amount: z.number().positive().max(999999.99),
```

#### Verification

- [ ] `pnpm check` passes
- [ ] `pnpm test` passes — update any tests that use absurd amounts
- [ ] `pnpm build` passes
- [ ] API returns validation error for amount > $999,999.99

---

### TXSAFE-08: Fix String-to-Number Coercion in PO Receiving

**Priority:** P1 — HIGH
**Estimate:** 1 hour
**Module:** `server/routers/poReceiving.ts`
**Mode:** STRICT
**Dependencies:** None

#### Problem

`parseFloat(item.receivedQuantity)` called without validation. Inputs like `"abc"`, `""`, `null` produce `NaN`, which silently passes comparison checks and corrupts inventory.

```typescript
parseFloat("abc") → NaN
NaN < quantityOrdered → false (comparison passes!)
UPDATE → onHandQty += NaN → null or 0
```

#### Fix

1. Add Zod validation to receiving input schema:

```typescript
const receiveItemSchema = z.object({
  poItemId: z.number().int().positive(),
  receivedQuantity: z.coerce.number().positive().int(),
  batchId: z.number().int().positive(),
});
```

2. Remove raw `parseFloat()` calls — use validated input directly.

#### Verification

- [ ] `pnpm check` passes
- [ ] `pnpm test` passes
- [ ] `pnpm build` passes
- [ ] API rejects `receivedQuantity: "abc"` with validation error
- [ ] API rejects `receivedQuantity: ""` with validation error

---

### TXSAFE-09: Add Notification Queue Persistence + Circuit Breaker

**Priority:** P1 — MEDIUM
**Estimate:** 2 hours
**Module:** `server/services/notificationService.ts`
**Mode:** STRICT
**Dependencies:** None

#### Problem

Notification processing uses `setImmediate` fire-and-forget with no retry, no circuit breaker, no persistence. If the notification service is down, all notifications in the queue are silently lost. Under sustained failure, repeated attempts waste CPU.

#### Fix

1. Add failure counter and circuit breaker:

```typescript
const CIRCUIT_BREAKER = { failures: 0, threshold: 5, resetMs: 60000 };
```

2. Use BullMQ for notification delivery (already in stack) instead of `setImmediate`:

```typescript
await notificationQueue.add(
  "send",
  { notificationId },
  {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
  }
);
```

3. Persist undelivered notifications in `notification_queue` table.

#### Verification

- [ ] `pnpm check` passes
- [ ] `pnpm test` passes
- [ ] `pnpm build` passes
- [ ] Notifications retry on transient failure
- [ ] Circuit breaker opens after 5 consecutive failures

---

### TXSAFE-10: Add Overpayment Tolerance Config + Documentation

**Priority:** P1 — LOW
**Estimate:** 1 hour
**Module:** `server/routers/payments.ts`
**Mode:** SAFE
**Dependencies:** None

#### Problem

Hard-coded `$0.01` overpayment tolerance with no business rule documentation. Should be configurable and documented for accounting compliance.

#### Fix

1. Move tolerance to system settings table or environment variable
2. Add JSDoc documenting the business rule
3. Add to accounting runbook

#### Verification

- [ ] `pnpm check` passes
- [ ] `pnpm test` passes

---

## Phase 3: MEDIUM PRIORITY (P2) — Next Quarter

> Address when Phase 1 and 2 are complete.
> **Total estimate: ~7 hours**

---

### TXSAFE-11: Support Custom Transaction Isolation Levels

**Priority:** P2 — MEDIUM
**Estimate:** 2 hours
**Module:** `server/_core/dbTransaction.ts`
**Mode:** STRICT
**Dependencies:** None

#### Problem

All transactions use `REPEATABLE_READ` (MySQL default). Some operations may benefit from `SERIALIZABLE` for stronger consistency guarantees.

#### Fix

Add optional `isolationLevel` parameter to `withTransaction()` and `withRetryableTransaction()`.

---

### TXSAFE-12: Add Circuit Breaker for External Services

**Priority:** P2 — MEDIUM
**Estimate:** 3 hours
**Module:** `server/services/` (new: `server/_core/circuitBreaker.ts`)
**Mode:** STRICT
**Dependencies:** None

#### Problem

No circuit breaker pattern for external service calls. A down dependency causes cascading timeouts.

---

### TXSAFE-13: Add Query-Level Timeout Configuration

**Priority:** P2 — MEDIUM
**Estimate:** 1 hour
**Module:** `server/_core/dbTransaction.ts`, `server/_core/connectionPool.ts`
**Mode:** STRICT
**Dependencies:** None

#### Problem

Lock timeout is configured but general query timeout is not. Long-running queries can block connections indefinitely.

---

### TXSAFE-14: Add Rate Limiting on Critical Mutations

**Priority:** P2 — MEDIUM
**Estimate:** 1 hour
**Module:** `server/_core/` (new middleware)
**Mode:** STRICT
**Dependencies:** None

#### Problem

No rate limiting on critical mutations (payment recording, order creation). A misbehaving client can flood the system.

---

## Dependency Graph

```
Phase 1 (P0) — All independent, can run in parallel:
  TXSAFE-01 ─── (no deps)
  TXSAFE-02 ─── (no deps)
  TXSAFE-03 ─── (no deps)
  TXSAFE-04 ─── (no deps)
  TXSAFE-05 ─── (no deps, but largest task)
  TXSAFE-06 ─── (no deps)

Phase 2 (P1) — After Phase 1:
  TXSAFE-07 ─── (no deps, overlaps REL-008)
  TXSAFE-08 ─── (no deps)
  TXSAFE-09 ─── (no deps)
  TXSAFE-10 ─── (no deps)

Phase 3 (P2) — After Phase 2:
  TXSAFE-11 ─── (no deps)
  TXSAFE-12 ─── (no deps)
  TXSAFE-13 ─── (no deps)
  TXSAFE-14 ─── (no deps)
```

## Wave Execution Strategy

### Wave A: Race Conditions + Actor Fix (~3h, parallelizable)

Run TXSAFE-01, TXSAFE-02, TXSAFE-03, TXSAFE-04 in parallel (different files, no conflicts).

### Wave B: Infrastructure (~7h)

Run TXSAFE-05 (Redis migration, largest task) and TXSAFE-06 (health check) sequentially.

### Wave C: Validation Hardening (~5h)

Run TXSAFE-07, TXSAFE-08, TXSAFE-09, TXSAFE-10 after Phase 1 verified.

### Wave D: Resilience Patterns (~7h)

Run TXSAFE-11 through TXSAFE-14 in next quarter sprint.

---

## Success Criteria

| Metric                       | Before | Target |
| ---------------------------- | ------ | ------ |
| Overall Production Readiness | 74%    | 92%+   |
| Transaction Safety           | 85%    | 98%    |
| Race Condition Prevention    | 65%    | 95%    |
| Error Handling               | 75%    | 90%    |
| Resilience                   | 70%    | 90%    |
| Data Validation              | 65%    | 85%    |

## Audit Trail

- **2026-03-07:** Initial audit completed, 14 tasks identified
- **2026-03-07:** Execution plan created (this document)
- **2026-03-07:** Tasks registered in MASTER_ROADMAP.md
- **2026-03-07:** Linear tickets to be created by Evan
