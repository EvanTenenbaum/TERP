# Golden Flow Initiative - Execution Plan v2.0

**Created:** 2026-01-29
**Status:** READY FOR EXECUTION
**Target:** 8/8 Golden Flows WORKING
**Remaining:** 7 tasks (~44h estimated)

---

## Dependency Graph

```
                    ┌─────────────────────────────────────────────┐
                    │         CRITICAL PATH (Sequential)          │
                    │                                             │
                    │   ST-051 (8h) ──────► ARCH-001 (8h)        │
                    │   Transaction        OrderOrchestrator      │
                    │   Boundaries         Service                │
                    │                                             │
                    │   Blocks: GF-003, GF-005                    │
                    └─────────────────────────────────────────────┘
                                        │
                                        ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                    PARALLEL POOL (All Independent)                            │
├───────────────────┬───────────────────┬─────────────────┬────────────────────┤
│   TERP-0014 (6h)  │   TERP-0017 (8h)  │  SCHEMA-011 (2h)│    ST-053 (8h)     │
│   Token Revoke    │   Protected       │  deletedAt for  │    any→proper      │
│   + Rate Limit    │   Routers         │  pricingRules   │    types           │
│                   │                   │                 │                    │
│   Blocks: All GF  │   Blocks: All GF  │  Blocks: GF-002 │  Blocks: GF-001,3  │
└───────────────────┴───────────────────┴─────────────────┴────────────────────┘
                                        │
                    ┌───────────────────┴───────────────────┐
                    │           TERP-0019 (4h)              │
                    │     Verify inventory SQL aliases      │
                    │        Blocks: GF-003                 │
                    └───────────────────────────────────────┘
```

---

## Execution Waves

### Wave A: Critical Path + High-Value Parallel (Phase 1)

**Duration:** ~8h (parallel execution)
**Agents:** 4 concurrent

| Agent | Task | Est | Mode | Branch | Files |
|-------|------|-----|------|--------|-------|
| **Agent 1** | ST-051: Transaction Boundaries | 8h | RED | `claude/st-051-txn-boundaries-{id}` | ordersDb.ts, orders.ts |
| **Agent 2** | TERP-0014: Token Revocation | 6h | RED | `claude/terp-0014-token-revoke-{id}` | simpleAuth.ts, auth.ts |
| **Agent 3** | TERP-0017: Protected Routers | 8h | STRICT | `claude/terp-0017-protected-{id}` | vendors.ts, tags.ts, etc. |
| **Agent 4** | SCHEMA-011: deletedAt Column | 2h | STRICT | `claude/schema-011-deletedat-{id}` | pricingRules schema |

**Why this grouping:**
- ST-051 is critical path - must start immediately
- TERP-0014 and TERP-0017 are security tasks blocking ALL Golden Flows
- SCHEMA-011 is quick (2h) and blocks GF-002

### Wave B: Critical Path Completion + Remaining Tasks (Phase 2)

**Duration:** ~8h (parallel execution)
**Agents:** 3 concurrent
**Starts when:** ST-051 completes (Agent 1 frees up)

| Agent | Task | Est | Mode | Branch | Files |
|-------|------|-----|------|--------|-------|
| **Agent 1** | ARCH-001: OrderOrchestrator | 8h | RED | `claude/arch-001-orchestrator-{id}` | server/services/orderOrchestrator.ts |
| **Agent 5** | ST-053: Eliminate `any` Types | 8h | STRICT | `claude/st-053-any-types-{id}` | Orders.tsx, ordersDb.ts, orders.ts |
| **Agent 6** | TERP-0019: Inventory SQL | 4h | SAFE | `claude/terp-0019-sql-aliases-{id}` | Dashboard widgets |

**Why this grouping:**
- ARCH-001 depends on ST-051 - Agent 1 transitions seamlessly
- ST-053 and TERP-0019 are independent and can run in parallel
- ST-053 is high value (unblocks GF-001, GF-003)

### Wave C: E2E Verification (Phase 3)

**Duration:** ~4h
**Agents:** 1 coordinator + QA
**Starts when:** All Wave A/B tasks complete

| Agent | Task | Est | Mode |
|-------|------|-----|------|
| **QA Agent** | E2E Golden Flow Verification | 4h | RED |

**Verification Matrix:**
| GF | Flow | Test Case | Expected Result |
|----|------|-----------|-----------------|
| GF-001 | Direct Intake | Create intake with new vendor | Batch created, quantities correct |
| GF-002 | Procure-to-Pay | Create PO, receive, pay | Full flow, soft delete works |
| GF-003 | Order-to-Cash | Create order, confirm, fulfill | Transaction atomicity verified |
| GF-004 | Invoice & Payment | Create invoice, record payment | Invoice PAID, GL balanced |
| GF-005 | Pick & Pack | Pick and pack order | Uses OrderOrchestrator |
| GF-006 | Client Ledger | View client ledger | All transactions, running balance |
| GF-007 | Inventory Mgmt | Adjust inventory | Movement recorded, CHECK passes |
| GF-008 | Sample Request | Create sample request | Token auth validated |

---

## Agent Prompts

### Agent 1: ST-051 - Transaction Boundaries

```markdown
# Agent Task: ST-051 - Add Transaction Boundaries

**Branch:** claude/st-051-txn-boundaries-{session-id}
**Mode:** RED (Financial/Data Integrity)
**Priority:** P0 CRITICAL PATH

## Objective
Wrap all multi-step order operations in single database transactions to ensure atomicity.

## Files to Modify
- `server/ordersDb.ts` (lines 724-787, 1137-1161)
- `server/routers/orders.ts` (lines 1355-1428, 1434-1494)

## Pattern to Apply
```typescript
// Use existing transaction helper
import { withTransaction } from "../_core/dbTransaction";

// Wrap multi-step operations
await withTransaction(async (tx) => {
  // Step 1: Update order status
  await tx.update(orders).set({ status: 'CANCELLED' })...

  // Step 2: Restore inventory (uses same tx)
  await restoreInventory(tx, orderId);

  // Step 3: Reverse GL entries (uses same tx)
  await reverseGLEntries(tx, orderId);

  // All or nothing - any failure rolls back
});
```

## Acceptance Criteria
- [ ] deleteOrder uses single transaction
- [ ] confirmDraftOrder uses single transaction
- [ ] shipOrder uses single transaction
- [ ] deliverOrder uses single transaction
- [ ] All tests pass
- [ ] No partial state possible on failure

## Verification (MANDATORY)
```bash
pnpm check && pnpm lint && pnpm test && pnpm build
```

## Forbidden Patterns
- `ctx.user?.id || 1` - Use `getAuthenticatedUserId(ctx)`
- Multiple separate `await db.` calls for related operations
- Catching and swallowing transaction errors
```

### Agent 2: TERP-0014 - Token Revocation

```markdown
# Agent Task: TERP-0014 - Token Invalidation & Rate Limiting

**Branch:** claude/terp-0014-token-revoke-{session-id}
**Mode:** RED (Security Critical)
**Priority:** P0

## Objective
Implement server-side token revocation on logout and add rate limiting to auth endpoints.

## Files to Modify
- `server/_core/simpleAuth.ts`
- `server/routers/auth.ts`

## Implementation Requirements

### Token Revocation
1. Create token blacklist storage (in-memory Map with TTL or database table)
2. Add token to blacklist on logout
3. Check blacklist in auth middleware before accepting token
4. Add cleanup job to prevent unbounded growth (tokens expire in 30 days)

### Rate Limiting
1. Add rate limiter to login endpoint (5 attempts per 15 minutes per IP)
2. Add rate limiter to password reset (3 attempts per hour per IP)
3. Return 429 Too Many Requests when exceeded

## Acceptance Criteria
- [ ] Tokens invalidated server-side on logout
- [ ] Auth middleware checks revocation list
- [ ] Login rate limited to 5/15min
- [ ] Security tests cover all scenarios
- [ ] No memory leak in blacklist storage

## Verification (MANDATORY)
```bash
pnpm check && pnpm lint && pnpm test server/routers/auth.test.ts && pnpm build
```
```

### Agent 3: TERP-0017 - Protected Routers

```markdown
# Agent Task: TERP-0017 - Convert Public Routers to Protected

**Branch:** claude/terp-0017-protected-{session-id}
**Mode:** STRICT
**Priority:** P1

## Objective
Convert remaining public routers to require authentication.

## Files to Modify
- `server/routers/vendors.ts`
- `server/routers/vendorSupply.ts`
- `server/routers/dashboardEnhanced.ts`
- `server/routers/tags.ts`

## Pattern to Apply
```typescript
// BEFORE
export const vendorsRouter = router({
  list: publicProcedure.query(async () => {...}),
});

// AFTER
export const vendorsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    // Now requires authentication
    const userId = getAuthenticatedUserId(ctx);
    // Add RBAC check if needed
    ...
  }),
});
```

## Acceptance Criteria
- [ ] All procedures in listed routers use `protectedProcedure`
- [ ] Unauthorized access returns 401/403
- [ ] RBAC permissions enforced where appropriate
- [ ] VIP portal flows still work (if tags needed)

## Verification (MANDATORY)
```bash
pnpm check && pnpm lint && pnpm test && pnpm build
```
```

### Agent 4: SCHEMA-011 - deletedAt Column

```markdown
# Agent Task: SCHEMA-011 - Add deletedAt to pricingRules

**Branch:** claude/schema-011-deletedat-{session-id}
**Mode:** STRICT
**Priority:** P1

## Objective
Add `deletedAt` column to `pricingRules` table for soft delete support.

## Files to Modify
- `drizzle/schema.ts` (pricingRules table definition)
- `server/autoMigrate.ts` (add column if missing)
- Create migration: `drizzle/0057_add_pricing_rules_deleted_at.sql`

## Migration SQL
```sql
-- drizzle/0057_add_pricing_rules_deleted_at.sql
ALTER TABLE `pricingRules`
  ADD COLUMN `deletedAt` DATETIME NULL DEFAULT NULL;

CREATE INDEX `idx_pricing_rules_deleted_at` ON `pricingRules` (`deletedAt`);
```

## Schema Update
```typescript
// Add to pricingRules table
deletedAt: datetime('deletedAt'),
```

## Acceptance Criteria
- [ ] pricingRules has deletedAt column
- [ ] autoMigrate adds column if missing
- [ ] Migration is idempotent
- [ ] Existing queries filter by isNull(deletedAt)

## Verification (MANDATORY)
```bash
pnpm check && pnpm build
```
```

### Agent 5: ST-053 - Eliminate `any` Types

```markdown
# Agent Task: ST-053 - Eliminate `any` Types in Critical Paths

**Branch:** claude/st-053-any-types-{session-id}
**Mode:** STRICT
**Priority:** P1

## Objective
Replace `any` types with proper TypeScript types in critical order/inventory paths.

## Priority Files (Block GF-001, GF-003)
1. `client/src/pages/Orders.tsx` (~15 `any` types)
2. `server/ordersDb.ts` (~10 `any` types)
3. `server/routers/orders.ts` (~8 `any` types)

## Approach
1. Identify `any` usage: `grep -n ": any" <file>`
2. Replace with:
   - Proper interface if structure is known
   - `unknown` + type guard if truly unknown
   - Generic parameter if flexible type needed
3. Document any justified `any` uses

## Common Patterns
```typescript
// BEFORE
function processOrder(data: any) {...}

// AFTER
interface OrderData {
  id: number;
  status: OrderStatus;
  items: OrderItem[];
}
function processOrder(data: OrderData) {...}
```

## Acceptance Criteria
- [ ] No `any` in Orders.tsx
- [ ] No `any` in ordersDb.ts
- [ ] No `any` in orders.ts router
- [ ] TypeScript check passes
- [ ] All tests pass

## Verification (MANDATORY)
```bash
pnpm check && pnpm lint && pnpm test && pnpm build
```
```

### Agent 6: TERP-0019 - Inventory SQL Aliases

```markdown
# Agent Task: TERP-0019 - Verify Inventory Snapshot SQL

**Branch:** claude/terp-0019-sql-aliases-{session-id}
**Mode:** SAFE
**Priority:** P2

## Objective
Verify and fix SQL aliases in inventory snapshot dashboard widget.

## Files to Check
- `server/routers/dashboardEnhanced.ts`
- `server/inventoryDb.ts` (getInventorySnapshot)

## Investigation Steps
1. Check all SQL column aliases match TypeScript types
2. Verify GROUP BY columns are correct
3. Ensure SUM/COUNT aggregations have proper aliases
4. Test with actual dashboard data

## Common Issues
```typescript
// Missing alias causes undefined
.select({ total: sql`SUM(qty)` })  // BAD - no alias
.select({ total: sql`SUM(qty)`.as('total') })  // GOOD
```

## Acceptance Criteria
- [ ] All SQL aliases match TypeScript types
- [ ] Dashboard inventory widget displays correct data
- [ ] No undefined values in widget response

## Verification (MANDATORY)
```bash
pnpm check && pnpm test && pnpm build
```
```

---

## Parallel Execution Timeline

```
Hour 0-8 (Wave A):
├── Agent 1: ST-051 ████████████████████████████████████████ (8h)
├── Agent 2: TERP-0014 ██████████████████████████████ (6h) → idle
├── Agent 3: TERP-0017 ████████████████████████████████████████ (8h)
└── Agent 4: SCHEMA-011 ████████ (2h) → idle

Hour 8-16 (Wave B):
├── Agent 1: ARCH-001 ████████████████████████████████████████ (8h)
├── Agent 5: ST-053 ████████████████████████████████████████ (8h)
└── Agent 6: TERP-0019 ████████████████ (4h) → idle

Hour 16-20 (Wave C):
└── QA Agent: E2E Verification ████████████████ (4h)

TOTAL ELAPSED: ~20h (vs 44h sequential = 55% time savings)
```

---

## Success Criteria

### Per-Task Gates
Each agent MUST pass before merge:
- [ ] `pnpm check` - No TypeScript errors
- [ ] `pnpm lint` - No linting errors
- [ ] `pnpm test` - All tests pass
- [ ] `pnpm build` - Build succeeds

### Initiative Gates (After All Tasks)
- [ ] All 8 Golden Flows pass E2E testing
- [ ] `pnpm gate:invariants` passes
- [ ] No critical race conditions
- [ ] All database constraints active
- [ ] No `any` types in critical paths

### Golden Flow Status After Completion

| GF | Flow | Expected Status |
|----|------|-----------------|
| GF-001 | Direct Intake | **READY** |
| GF-002 | Procure-to-Pay | **READY** (SCHEMA-011 done) |
| GF-003 | Order-to-Cash | **READY** (ST-051, ARCH-001 done) |
| GF-004 | Invoice & Payment | **READY** |
| GF-005 | Pick & Pack | **READY** (depends on GF-003) |
| GF-006 | Client Ledger | **READY** |
| GF-007 | Inventory Mgmt | **READY** |
| GF-008 | Sample Request | **READY** |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| ST-051 takes longer | ARCH-001 can wait; parallel tasks continue |
| Token revocation complex | Start with in-memory Map, upgrade to DB later |
| `any` types overwhelming | Focus ONLY on 3 critical files, defer rest |
| Tests fail after changes | QA reviewer catches before merge |

---

## Commands to Launch

### Start Wave A (4 agents parallel)
```bash
# Run from TERP root - use claude code's Task tool with terp-implementer subagent
```

### QA Review (after each task)
```bash
# Use terp-qa-reviewer subagent for adversarial review
```
