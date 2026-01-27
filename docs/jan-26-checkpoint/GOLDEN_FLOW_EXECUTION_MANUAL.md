# Golden Flow Execution Manual

**Version:** 1.0
**Date:** January 27, 2026
**Authority:** CLAUDE.md + QA Protocol v3.0 + TERP Master Protocol
**Purpose:** Step-by-step guide for executing Golden Flow remediation with maximum quality assurance

---

## Table of Contents

1. [Pre-Execution Checklist](#1-pre-execution-checklist)
2. [Quality Gates](#2-quality-gates)
3. [Phase Execution Protocol](#3-phase-execution-protocol)
4. [Phase 0: Immediate Hotfixes](#4-phase-0-immediate-hotfixes)
5. [Phase 1: Security Hardening](#5-phase-1-security-hardening)
6. [Phase 2: Financial Integrity](#6-phase-2-financial-integrity)
7. [Phase 3: SQL Safety Campaign](#7-phase-3-sql-safety-campaign)
8. [Phase 4: Type Safety & Tests](#8-phase-4-type-safety--tests)
9. [Phase 5: Backend API Completion](#9-phase-5-backend-api-completion)
10. [Phase 6: Frontend Polish](#10-phase-6-frontend-polish)
11. [Phase 7: Prevention & Monitoring](#11-phase-7-prevention--monitoring)
12. [Post-Execution Verification](#12-post-execution-verification)
13. [Rollback Procedures](#13-rollback-procedures)
14. [Appendices](#14-appendices)

---

## 1. Pre-Execution Checklist

### 1.1 Before Starting ANY Phase

Every agent MUST complete these steps before writing code:

```
PRE-EXECUTION CHECKLIST
========================
[ ] 1. Read CLAUDE.md in full (if not already done this session)
[ ] 2. Read this manual's section for the target phase
[ ] 3. Check docs/ACTIVE_SESSIONS.md for conflicts
[ ] 4. Pull latest: git pull --rebase origin main
[ ] 5. Verify clean state: git status (should be clean)
[ ] 6. Run baseline verification:
      [ ] pnpm check (TypeScript)
      [ ] pnpm lint (ESLint)
      [ ] pnpm test (Unit tests)
      [ ] pnpm build (Build)
[ ] 7. Note any pre-existing failures (don't fix unrelated issues)
[ ] 8. Create session file in docs/sessions/active/
[ ] 9. Register in ACTIVE_SESSIONS.md
[ ] 10. Determine Autonomy Mode for this phase:
       - GREEN (SAFE): Documentation, simple fixes
       - YELLOW (STRICT): New features, UI changes
       - RED: Financial, security, database changes
```

### 1.2 Session Registration Template

Create file at `docs/sessions/active/Session-YYYYMMDD-TASK-ID-XXXX.md`:

```markdown
# Session: [TASK-ID] - [Task Title]

**Status**: In Progress
**Started**: [Date/Time]
**Agent**: [Claude Code / Cursor / etc.]
**Mode**: [SAFE / STRICT / RED]
**Branch**: claude/[descriptive-name]-[session-id]

## Target Tasks

- [ ] [Task 1]
- [ ] [Task 2]

## Files Being Modified

- `path/to/file1.ts`
- `path/to/file2.ts`

## Progress Notes

[Notes go here as work proceeds]

## Verification Results

[To be filled after each commit]
```

### 1.3 Autonomy Mode Selection Matrix

| Phase            | Default Mode | Escalation Triggers          |
| ---------------- | ------------ | ---------------------------- |
| 0 (Hotfixes)     | STRICT       | Schema changes → RED         |
| 1 (Security)     | RED          | All security work is RED     |
| 2 (Financial)    | RED          | All financial work is RED    |
| 3 (SQL Safety)   | STRICT       | ordersDb/arApDb → RED        |
| 4 (Type Safety)  | SAFE         | Core infrastructure → STRICT |
| 5 (Backend APIs) | STRICT       | Financial endpoints → RED    |
| 6 (Frontend)     | SAFE         | Auth components → STRICT     |
| 7 (Prevention)   | SAFE         | ESLint rules → STRICT        |

---

## 2. Quality Gates

### 2.1 Definition of Done (8 Criteria)

A task is NOT complete until ALL pass:

```
DEFINITION OF DONE CHECKLIST
============================
[ ] 1. pnpm check      - Zero TypeScript errors
[ ] 2. pnpm lint       - Zero linting errors (warnings OK)
[ ] 3. pnpm test       - All tests pass (or documented pre-existing failures)
[ ] 4. pnpm build      - Build succeeds
[ ] 5. pnpm roadmap:validate - Roadmap valid (if modified)
[ ] 6. E2E tests pass  - (if applicable to this change)
[ ] 7. Deployment verified - (if pushed to main)
[ ] 8. No new errors in production logs - (post-deployment)
```

### 2.2 Verification Output Template

After EVERY commit, produce this output:

```
VERIFICATION RESULTS - [Task ID]
================================
Commit: [hash] [message]
Time: [timestamp]

TypeScript:  ✅ PASS | ❌ FAIL (X errors)
Lint:        ✅ PASS | ❌ FAIL (X warnings)
Tests:       ✅ PASS | ❌ FAIL (X/Y passing)
Build:       ✅ PASS | ❌ FAIL
Roadmap:     ✅ PASS | ❌ FAIL | ⏭️ N/A

[If any failures, list specific errors]

Pre-existing Issues (not caused by this change):
- [List any pre-existing failures that were documented before starting]
```

### 2.3 Five-Lens QA Analysis

Apply to EVERY significant change:

#### Lens 1: Regression Analysis

```
Questions to answer:
- What existing functionality could this break?
- What tests cover the modified code paths?
- Are there edge cases not covered by tests?

Actions:
- Run related test files explicitly
- Manually test happy path + 2 edge cases
- Check for callers of modified functions
```

#### Lens 2: Attack Surface Analysis

```
Questions to answer:
- Does this change authentication/authorization?
- Does it handle user input?
- Does it expose new endpoints?
- Could it leak sensitive data?

Actions:
- Verify protectedProcedure used (not publicProcedure)
- Check for input validation (zod schemas)
- Verify no sensitive data in error messages
- Check for SQL injection vectors
```

#### Lens 3: Data Integrity Analysis

```
Questions to answer:
- Does this modify database state?
- Are operations atomic (transactional)?
- Is there proper error handling?
- Is audit trail maintained?

Actions:
- Verify transaction boundaries
- Check for proper rollback on error
- Verify actor attribution (no fallback user IDs)
- Check soft delete compliance
```

#### Lens 4: Performance Analysis

```
Questions to answer:
- Does this add N+1 queries?
- Are there unbounded result sets?
- Is caching appropriate?
- Are indexes used effectively?

Actions:
- Check for missing LIMIT clauses
- Verify JOIN efficiency
- Look for loops with DB calls inside
```

#### Lens 5: UX Impact Analysis

```
Questions to answer:
- Does this affect user-facing behavior?
- Are error messages user-friendly?
- Is loading state handled?
- Are success/failure states clear?

Actions:
- Check error handling surfaces to UI
- Verify loading indicators exist
- Test with network throttling
```

### 2.4 Commit Quality Standards

#### Commit Message Format

```
type(scope): description

[body - optional but recommended for complex changes]

[footer - always include session link]

https://claude.ai/code/session_XXXXX
```

#### Valid Types

| Type       | Use For                    |
| ---------- | -------------------------- |
| `feat`     | New features               |
| `fix`      | Bug fixes                  |
| `docs`     | Documentation only         |
| `style`    | Formatting, no code change |
| `refactor` | Code restructuring         |
| `perf`     | Performance improvements   |
| `test`     | Adding/fixing tests        |
| `chore`    | Tooling, config changes    |

#### Scope Examples

- `inventory` - Inventory module
- `orders` - Order processing
- `accounting` - Financial operations
- `auth` - Authentication/authorization
- `ui` - User interface
- `db` - Database/schema

---

## 3. Phase Execution Protocol

### 3.1 Standard Phase Workflow

```
┌─────────────────────────────────────────────────────────┐
│ 1. PRE-FLIGHT                                           │
│    - Complete Pre-Execution Checklist (Section 1.1)     │
│    - Read phase-specific instructions                   │
│    - Identify all files to be modified                  │
└─────────────────────┬───────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────┐
│ 2. TASK LOOP (repeat for each task in phase)           │
│                                                         │
│    a. Read current file state                           │
│    b. Apply Five-Lens Analysis                          │
│    c. Make changes (smallest possible unit)             │
│    d. Run verification suite                            │
│    e. If PASS → Commit with proper message              │
│    f. If FAIL → Fix issues, return to (d)               │
│    g. Push to branch                                    │
│    h. Update session notes                              │
└─────────────────────┬───────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────┐
│ 3. PHASE COMPLETION                                     │
│    - All tasks complete                                 │
│    - All verification passes                            │
│    - Session file updated with results                  │
│    - Roadmap updated (status → complete)                │
│    - Create PR (if on feature branch)                   │
└─────────────────────┬───────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────┐
│ 4. POST-PHASE VERIFICATION                              │
│    - Deploy to staging (if applicable)                  │
│    - Run smoke tests                                    │
│    - Monitor logs for 15 minutes                        │
│    - Confirm success criteria met                       │
└─────────────────────────────────────────────────────────┘
```

### 3.2 RED Mode Protocol (Financial/Security/Database)

When operating in RED mode, additional steps required:

```
RED MODE ADDITIONAL REQUIREMENTS
================================

BEFORE making changes:
[ ] Document current state (screenshot, log, or data export)
[ ] Identify rollback procedure
[ ] Get explicit approval if scope exceeds prompt

DURING changes:
[ ] One atomic change per commit
[ ] Run tests after EVERY file change
[ ] No silent error handling (throw or log with severity)
[ ] Verify transaction boundaries

AFTER changes:
[ ] Verify with production-like data (not just test fixtures)
[ ] Check audit logs are populated
[ ] Verify no data corruption possible
[ ] Document any edge cases discovered
```

---

## 4. Phase 0: Immediate Hotfixes

### 4.1 Overview

| Attribute        | Value                                |
| ---------------- | ------------------------------------ |
| **Goal**         | Restore broken inventory features    |
| **Mode**         | STRICT (elevate to RED for ordersDb) |
| **Tasks**        | BUG-110 through BUG-115, PERF-001    |
| **Duration**     | ~8 hours agent time                  |
| **Dependencies** | None                                 |

### 4.2 Task Details

#### BUG-110: productsDb.ts strainId fixes

**File:** `server/productsDb.ts`
**Lines:** 92, 179
**Pattern:** Try-catch with fallback query

```typescript
// BEFORE (vulnerable)
const results = await db
  .select({
    /* ... */
  })
  .from(products)
  .leftJoin(strains, eq(products.strainId, strains.id));
// ...

// AFTER (resilient)
let results;
try {
  results = await db
    .select({
      /* ... */
    })
    .from(products)
    .leftJoin(strains, eq(products.strainId, strains.id));
  // ...
} catch (queryError) {
  logger.warn(
    { error: queryError, context: "productsDb" },
    "Query with strains join failed, falling back to simpler query"
  );
  // Fallback without strains join
  results = await db
    .select({
      // Same fields but strainName: sql<string | null>`NULL`.as('strainName')
    })
    .from(products);
  // ... without strains join
}
```

**Verification:**

```bash
pnpm check
pnpm test -- --grep "productsDb"
# Manual: Products page should load
```

#### BUG-111: search.ts strainId fix

**File:** `server/routers/search.ts`
**Line:** 260
**Pattern:** Same try-catch fallback

**Verification:**

```bash
pnpm check
pnpm test -- --grep "search"
# Manual: Global search should work
```

#### BUG-112: photography.ts remaining fix

**File:** `server/routers/photography.ts`
**Line:** 823 (getAwaitingPhotography)
**Pattern:** Same try-catch fallback
**Note:** getQueue and getBatchesNeedingPhotos already fixed

**Verification:**

```bash
pnpm check
pnpm test -- --grep "photography"
# Manual: Photography queue should load
```

#### BUG-113: catalogPublishingService.ts fix

**File:** `server/services/catalogPublishingService.ts`
**Line:** 310
**Pattern:** Same try-catch fallback

**Verification:**

```bash
pnpm check
pnpm test -- --grep "catalog"
```

#### BUG-114: strainMatchingService.ts fixes

**File:** `server/services/strainMatchingService.ts`
**Lines:** 136, 234
**Pattern:** Graceful degradation with error message
**Note:** This service inherently needs strains - can't just omit

```typescript
// For strain-dependent service
try {
  // Original query
} catch (queryError) {
  logger.error(
    { error: queryError },
    "Strain matching requires strains table - feature unavailable"
  );
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message:
      "Strain matching is temporarily unavailable. Please contact support.",
  });
}
```

#### BUG-115: ordersDb.ts empty array fix

**File:** `server/ordersDb.ts`
**Line:** 1239
**Mode:** RED (order processing)

```typescript
// BEFORE (crashes on empty array)
const batchIds = [...new Set(draftItems.map(item => item.batchId))];
.where(inArray(batches.id, batchIds))

// AFTER (safe)
import { safeInArray } from '../lib/sqlSafety';
const batchIds = [...new Set(draftItems.map(item => item.batchId))];
.where(safeInArray(batches.id, batchIds))
```

**Verification:**

```bash
pnpm check
pnpm test -- --grep "ordersDb"
# Test with empty draftItems array
```

#### PERF-001: Empty catch blocks

**File:** `client/src/hooks/usePerformanceMonitor.ts`
**Lines:** 375, 387, 403

```typescript
// BEFORE
} catch (e) {
  // Empty - silently swallows errors
}

// AFTER
} catch (error) {
  console.error('[PerformanceMonitor] Failed to record metric:', error);
}
```

### 4.3 Phase 0 Completion Checklist

```
PHASE 0 COMPLETION CHECKLIST
============================
[ ] BUG-110 committed and verified
[ ] BUG-111 committed and verified
[ ] BUG-112 committed and verified
[ ] BUG-113 committed and verified
[ ] BUG-114 committed and verified
[ ] BUG-115 committed and verified
[ ] PERF-001 committed and verified
[ ] All tests pass
[ ] Build succeeds
[ ] Pushed to branch

MANUAL VERIFICATION:
[ ] Inventory page shows inventory
[ ] Photography Queue loads without SQL error
[ ] Sales Order Creator can load inventory
[ ] Global search returns results
```

---

## 5. Phase 1: Security Hardening

### 5.1 Overview

| Attribute        | Value                                |
| ---------------- | ------------------------------------ |
| **Goal**         | Close P0 security vulnerabilities    |
| **Mode**         | RED (all security work)              |
| **Tasks**        | SEC-027, SEC-028, SEC-029, SEC-030   |
| **Duration**     | ~6 hours agent time                  |
| **Dependencies** | None (can run parallel with Phase 0) |

### 5.2 Task Details

#### SEC-027: Protect adminSetup endpoints

**File:** `server/routers/adminSetup.ts`
**Lines:** 104-259

```typescript
// BEFORE
listUsers: publicProcedure
  .input(z.object({ setupKey: z.string() }))
  .query(async ({ input }) => {
    if (input.setupKey !== process.env.ADMIN_SETUP_KEY) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }
    // ...
  }),

// AFTER
listUsers: protectedProcedure
  .use(requireRole('SUPER_ADMIN'))
  .query(async ({ ctx }) => {
    // No setupKey needed - auth handled by middleware
    // ...
  }),
```

**Apply to:** `listUsers`, `promoteToAdmin`, `promoteAllToAdmin`

**Five-Lens Analysis:**

- Regression: Verify admin setup flow still works for legit admins
- Attack Surface: Eliminates privilege escalation vector
- Data Integrity: No change
- Performance: No change
- UX: Admin setup requires login first

#### SEC-028: Remove/restrict debug endpoints

**File:** `server/routers/debug.ts`
**Lines:** 18-522

**Option A (Recommended): Remove from production**

```typescript
// At top of file
if (process.env.NODE_ENV === "production") {
  export const debugRouter = createTRPCRouter({});
  // All procedures removed in production
} else {
  // Full debug router for development only
}
```

**Option B: Require Super Admin**

```typescript
checkDatabaseSchema: protectedProcedure
  .use(requireRole('SUPER_ADMIN'))
  .query(/* ... */),
```

#### SEC-029: Fix default permission grants

**File:** `server/services/permissionService.ts`

**Problem:** New users get `read:all` by default
**Fix:** New users get no permissions by default

```typescript
// BEFORE
const defaultPermissions = ["read:all"];

// AFTER
const defaultPermissions: string[] = []; // No default permissions
```

#### SEC-030: Fix VIP portal token validation

**File:** `server/routers/vipPortal.ts`

```typescript
// Add UUID format validation
import { z } from 'zod';

const tokenSchema = z.string().uuid();

// In procedures that accept token
.input(z.object({
  token: z.string().uuid(), // Validates UUID format
}))
```

### 5.3 Phase 1 Completion Checklist

```
PHASE 1 COMPLETION CHECKLIST
============================
[ ] SEC-027 committed and verified
[ ] SEC-028 committed and verified
[ ] SEC-029 committed and verified
[ ] SEC-030 committed and verified
[ ] All tests pass
[ ] Build succeeds
[ ] Pushed to branch

SECURITY VERIFICATION:
[ ] adminSetup endpoints return 401 without auth
[ ] Debug endpoints not accessible in production
[ ] New user has zero permissions
[ ] Invalid UUID token rejected with 400
```

---

## 6. Phase 2: Financial Integrity

### 6.1 Overview

| Attribute        | Value                                                |
| ---------------- | ---------------------------------------------------- |
| **Goal**         | Ensure atomic, correct financial operations          |
| **Mode**         | RED (all changes)                                    |
| **Tasks**        | INV-001 to INV-003, ORD-001, FIN-001, ST-050, ST-051 |
| **Duration**     | ~28 hours agent time                                 |
| **Dependencies** | Phase 0 (BUG-115 fixes inArray issue in ordersDb)    |

### 6.2 Sprint 2A: Order/Inventory Integrity

#### INV-001: Inventory deduction on ship/fulfill

**File:** `server/routers/orders.ts`
**Problem:** Shipping doesn't reduce inventory

```typescript
// In fulfill/ship procedure, add:
await db.transaction(async tx => {
  // 1. Update order status
  await tx
    .update(orders)
    .set({ status: "SHIPPED" })
    .where(eq(orders.id, orderId));

  // 2. Deduct inventory for each line item
  for (const item of orderItems) {
    await tx
      .update(batches)
      .set({
        onHandQty: sql`${batches.onHandQty} - ${item.quantity}`,
      })
      .where(eq(batches.id, item.batchId));
  }

  // 3. Create audit log
  await tx.insert(inventoryAuditLog).values({
    action: "SHIP_DEDUCTION",
    orderId,
    // ...
  });
});
```

#### INV-002: Fix race condition in draft order confirmation

**File:** `server/ordersDb.ts`
**Problem:** Two users can confirm same draft simultaneously

```typescript
// Add optimistic locking
await db.transaction(async tx => {
  // 1. Lock the order row
  const [order] = await tx
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .for("update"); // FOR UPDATE lock

  // 2. Check status
  if (order.status !== "DRAFT") {
    throw new TRPCError({
      code: "CONFLICT",
      message: "Order has already been confirmed",
    });
  }

  // 3. Proceed with confirmation
  // ...
});
```

#### INV-003: Add FOR UPDATE lock in batch allocation

**File:** `server/routers/orders.ts`
**Problem:** Same batch can be allocated to multiple orders

```typescript
// When allocating inventory
const [batch] = await tx
  .select()
  .from(batches)
  .where(eq(batches.id, batchId))
  .for("update"); // Lock row during allocation

if (batch.onHandQty < requestedQty) {
  throw new TRPCError({
    code: "CONFLICT",
    message: `Insufficient inventory. Available: ${batch.onHandQty}`,
  });
}
```

#### ORD-001: Fix invoice creation timing

**File:** `server/ordersDb.ts`
**Problem:** Invoice created before order is confirmed

```typescript
// Invoice should only be created AFTER order is confirmed
// Move invoice creation from order creation to order confirmation

async function confirmOrder(orderId: number, ctx: Context) {
  await db.transaction(async tx => {
    // 1. Update order status to CONFIRMED
    // 2. THEN create invoice
    // 3. Create GL entries
  });
}
```

#### FIN-001: Fix invoice number race condition

**File:** `server/arApDb.ts`
**Problem:** Duplicate invoice numbers possible

```typescript
// Use database sequence or atomic increment
const [result] = await tx.execute(sql`
  SELECT COALESCE(MAX(invoice_number), 1000) + 1 as next_number
  FROM invoices
  FOR UPDATE
`);

// Or use a sequence table with row lock
```

### 6.3 Sprint 2B: Error Handling

#### ST-050: Fix silent error handling

**Files:** `server/ordersDb.ts`, `server/services/*`
**Problem:** Catch blocks swallow errors silently

```typescript
// BEFORE
try {
  await someOperation();
} catch (e) {
  // Silent failure
}

// AFTER - Option 1: Re-throw with context
try {
  await someOperation();
} catch (error) {
  logger.error({ error, context: "operationName" }, "Operation failed");
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "Operation failed",
    cause: error,
  });
}

// AFTER - Option 2: Return error state (for non-critical)
try {
  await someOperation();
  return { success: true };
} catch (error) {
  logger.warn({ error }, "Non-critical operation failed");
  return { success: false, error: "Operation failed" };
}
```

#### ST-051: Add transaction boundaries

**Files:** `server/ordersDb.ts`, `server/routers/orders.ts`
**Problem:** Multi-step operations not atomic

```typescript
// Use the withTransaction wrapper from DI-001
import { withTransaction } from "../lib/transaction";

async function confirmOrder(orderId: number, ctx: Context) {
  return withTransaction(ctx.db, async tx => {
    // Step 1: Update order status
    await tx.update(orders).set({ status: "CONFIRMED" });

    // Step 2: Allocate inventory
    await allocateInventory(tx, orderId);

    // Step 3: Create invoice
    await createInvoice(tx, orderId);

    // Step 4: Create GL entries
    await createGLEntries(tx, orderId);

    // If ANY step fails, ALL are rolled back
  });
}
```

### 6.4 Phase 2 Completion Checklist

```
PHASE 2 COMPLETION CHECKLIST
============================
Sprint 2A:
[ ] INV-001 committed and verified
[ ] INV-002 committed and verified
[ ] INV-003 committed and verified
[ ] ORD-001 committed and verified
[ ] FIN-001 committed and verified

Sprint 2B:
[ ] ST-050 committed and verified
[ ] ST-051 committed and verified

All tests pass: [ ]
Build succeeds: [ ]
Pushed to branch: [ ]

FINANCIAL INTEGRITY VERIFICATION:
[ ] Order confirmation is atomic (all or nothing)
[ ] Inventory deducts on ship
[ ] No duplicate invoice numbers (test with concurrent requests)
[ ] Race condition tests pass
[ ] All operations have transaction boundaries
[ ] No silent error swallowing in RED paths
```

---

## 7. Phase 3: SQL Safety Campaign

### 7.1 Overview

| Attribute        | Value                                   |
| ---------------- | --------------------------------------- |
| **Goal**         | Eliminate crash risk from empty arrays  |
| **Mode**         | STRICT (RED for orders/financial files) |
| **Tasks**        | BUG-116, ST-055                         |
| **Duration**     | ~24 hours agent time                    |
| **Dependencies** | None (can run parallel with Phase 2B)   |

### 7.2 Batch Execution Plan

#### Batch 3A: Critical Path (RED mode)

**Files:** `server/ordersDb.ts`, `server/routers/orders.ts`
**Count:** ~20 replacements

```typescript
// At top of each file, add import
import { safeInArray, safeNotInArray } from "../lib/sqlSafety";

// Find and replace ALL instances:
// inArray(col, arr) → safeInArray(col, arr)
// notInArray(col, arr) → safeNotInArray(col, arr)
```

**Verification per file:**

```bash
pnpm check
pnpm test -- --grep "[filename]"
```

#### Batch 3B: Financial Operations (RED mode)

**Files:** `server/inventoryDb.ts`, `server/arApDb.ts`
**Count:** ~13 replacements

#### Batch 3C: Router Files (STRICT mode)

**Files:** All files in `server/routers/`
**Count:** ~40 replacements

#### Batch 3D: Remaining Files (SAFE mode)

**Files:** All other server files with inArray usage
**Count:** ~54 replacements

### 7.3 Replacement Pattern

```typescript
// Import at top
import { safeInArray, safeNotInArray } from '../lib/sqlSafety';

// Simple replacement - behavior is identical for non-empty arrays
// For empty arrays, safeInArray returns sql`false` (no matches)
// For empty arrays, safeNotInArray returns sql`true` (all match)

// BEFORE
.where(inArray(orders.id, orderIds))

// AFTER
.where(safeInArray(orders.id, orderIds))
```

### 7.4 Phase 3 Completion Checklist

```
PHASE 3 COMPLETION CHECKLIST
============================
Batch 3A (Critical):
[ ] ordersDb.ts - X replacements
[ ] orders.ts router - X replacements

Batch 3B (Financial):
[ ] inventoryDb.ts - X replacements
[ ] arApDb.ts - X replacements

Batch 3C (Routers):
[ ] All router files - X replacements total

Batch 3D (Remaining):
[ ] All other files - X replacements total

All tests pass: [ ]
Build succeeds: [ ]
Pushed to branch: [ ]

VERIFICATION:
[ ] grep -r "from 'drizzle-orm'" --include="*.ts" | grep inArray
    (should return 0 results outside of sqlSafety.ts)
[ ] Empty array edge case test passes
```

---

## 8. Phase 4: Type Safety & Tests

### 8.1 Overview

| Attribute        | Value                                       |
| ---------------- | ------------------------------------------- |
| **Goal**         | Reduce runtime errors, increase coverage    |
| **Mode**         | SAFE (STRICT for core infrastructure)       |
| **Tasks**        | TS-001, ST-053, ST-054, TEST-INFRA-03/04/05 |
| **Duration**     | ~36 hours agent time                        |
| **Dependencies** | Phase 2 complete                            |

### 8.2 Sprint 4A: TypeScript Cleanup

#### Priority Order

1. **ST-054** (4h): Core infrastructure `any` types
   - `featureFlagMiddleware.ts`
   - `monitoring.ts`
   - `connectionPool.ts`
   - `rateLimiter.ts`

2. **TS-001** (16-24h): Fix TypeScript errors
   - Work file-by-file
   - Commit after each file passes

3. **ST-053** (16h): Eliminate `any` types
   - Prioritize RED mode paths
   - Then all other files

#### Pattern for Fixing `any`

```typescript
// BEFORE
function process(data: any) {
  return data.value;
}

// AFTER - Option 1: Known type
interface DataInput {
  value: string;
}
function process(data: DataInput) {
  return data.value;
}

// AFTER - Option 2: Generic
function process<T extends { value: unknown }>(data: T) {
  return data.value;
}

// AFTER - Option 3: unknown with type guard
function process(data: unknown) {
  if (!isDataInput(data)) {
    throw new Error("Invalid input");
  }
  return data.value;
}
```

### 8.3 Sprint 4B: Test Infrastructure

#### TEST-INFRA-03: Fix tRPC router initialization

**Problem:** Tests fail with "router not initialized"
**Solution:** Update test setup to properly mock tRPC context

#### TEST-INFRA-04: Create test fixtures

**Location:** `__tests__/fixtures/`
**Pattern:** Factory functions

```typescript
// __tests__/fixtures/clients.ts
export function createTestClient(overrides?: Partial<Client>): Client {
  return {
    id: faker.number.int(),
    name: faker.company.name(),
    isSeller: false,
    isBuyer: true,
    ...overrides,
  };
}
```

#### TEST-INFRA-05: Fix async element detection

**Problem:** Tests fail with "element not found"
**Solution:** Use `findBy*` instead of `getBy*` for async elements

```typescript
// BEFORE
const element = screen.getByText("Loading...");

// AFTER
const element = await screen.findByText("Loading...");
```

### 8.4 Phase 4 Completion Checklist

```
PHASE 4 COMPLETION CHECKLIST
============================
Sprint 4A:
[ ] ST-054 complete - core infrastructure
[ ] TS-001 complete - all TypeScript errors fixed
[ ] ST-053 complete - any types eliminated in RED paths

Sprint 4B:
[ ] TEST-INFRA-03 complete - tRPC mock fixed
[ ] TEST-INFRA-04 complete - test fixtures created
[ ] TEST-INFRA-05 complete - async detection fixed

All tests pass: [ ]
Build succeeds: [ ]
pnpm check shows 0 errors: [ ]
Pushed to branch: [ ]
```

---

## 9. Phase 5: Backend API Completion

### 9.1 Overview

| Attribute        | Value                                     |
| ---------------- | ----------------------------------------- |
| **Goal**         | Complete missing accounting endpoints     |
| **Mode**         | STRICT (RED for financial endpoints)      |
| **Tasks**        | BE-QA-006, BE-QA-007, BE-QA-008, QUAL-008 |
| **Duration**     | ~36 hours agent time                      |
| **Dependencies** | Phase 4 complete                          |

### 9.2 Standard Endpoint Pattern

```typescript
// Every new endpoint must follow this pattern:

export const newProcedure = protectedProcedure
  // 1. Input validation with zod
  .input(
    z.object({
      // Define all inputs with strict types
    })
  )

  // 2. Permission check (if needed)
  .use(requirePermission("resource:action"))

  // 3. Query or mutation implementation
  .query(async ({ ctx, input }) => {
    // 4. Actor attribution
    const userId = getAuthenticatedUserId(ctx);

    // 5. Business logic with proper error handling
    try {
      const result = await businessOperation(input, userId);
      return result;
    } catch (error) {
      logger.error({ error, input, userId }, "Operation failed");
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Operation failed",
      });
    }
  });
```

### 9.3 Required Tests for Each Endpoint

```typescript
describe("newProcedure", () => {
  it("returns data for authenticated user", async () => {
    // Happy path
  });

  it("rejects unauthenticated requests", async () => {
    // Auth check
  });

  it("validates input schema", async () => {
    // Input validation
  });

  it("handles errors gracefully", async () => {
    // Error handling
  });
});
```

---

## 10. Phase 6: Frontend Polish

### 10.1 Overview

| Attribute        | Value                                   |
| ---------------- | --------------------------------------- |
| **Goal**         | Fix UI issues, improve type safety      |
| **Mode**         | SAFE                                    |
| **Tasks**        | TYPE-001, NAV-017, FE-QA-009, FE-QA-010 |
| **Duration**     | ~17 hours agent time                    |
| **Dependencies** | Phase 5 complete                        |

### 10.2 Component Quality Checklist

For each frontend change:

```
FRONTEND QUALITY CHECKLIST
==========================
[ ] No `as any` casts (use proper types)
[ ] Loading states handled
[ ] Error states handled
[ ] Accessible (keyboard navigation works)
[ ] Mobile responsive (if applicable)
[ ] Uses existing UI components (shadcn/ui)
```

---

## 11. Phase 7: Prevention & Monitoring

### 11.1 Overview

| Attribute        | Value                              |
| ---------------- | ---------------------------------- |
| **Goal**         | Prevent future regressions         |
| **Mode**         | STRICT                             |
| **Tasks**        | ESLint rule, Schema check, BUG-100 |
| **Duration**     | ~30 hours agent time               |
| **Dependencies** | Phase 3 complete                   |

### 11.2 ESLint Rule for inArray

```javascript
// eslint.config.js addition
{
  rules: {
    'no-restricted-imports': ['error', {
      paths: [{
        name: 'drizzle-orm',
        importNames: ['inArray', 'notInArray'],
        message: 'Use safeInArray/safeNotInArray from lib/sqlSafety.ts instead'
      }]
    }]
  }
}
```

### 11.3 Schema Drift Detection

```typescript
// server/startup.ts
async function checkSchemaDrift() {
  const drizzleColumns = Object.keys(products);
  const dbColumns = await getActualColumns("products");

  const missing = drizzleColumns.filter(c => !dbColumns.includes(c));

  if (missing.length > 0) {
    logger.warn(
      { missingColumns: missing },
      "Schema drift detected: Drizzle schema has columns not in database"
    );
  }
}
```

---

## 12. Post-Execution Verification

### 12.1 Full System Verification

After ALL phases complete:

```
FULL SYSTEM VERIFICATION
========================

1. Golden Flow E2E Tests:
[ ] GF-1: Direct Intake → Inventory (create intake, verify in inventory)
[ ] GF-2: Client → Order → Invoice (create order, confirm, verify invoice)
[ ] GF-3: Invoice → Payment → Reconciliation (record payment, verify ledger)

2. Security Audit:
[ ] All public endpoints require auth
[ ] No debug endpoints in production
[ ] VIP tokens validated
[ ] Permissions enforced

3. Data Integrity:
[ ] All financial ops are transactional
[ ] No race conditions (test concurrent requests)
[ ] Audit logs populated
[ ] Soft deletes working

4. Performance:
[ ] No N+1 queries
[ ] Pagination working
[ ] Response times < 500ms

5. Production Health:
[ ] Health endpoint returns 200
[ ] No errors in logs (24h monitoring)
[ ] Memory usage stable
[ ] CPU usage normal
```

### 12.2 Production Monitoring Commands

```bash
# Health check
curl https://terp-app-b9s35.ondigitalocean.app/health

# Recent logs (check for errors)
./scripts/terp-logs.sh run 100 | grep -i "error"

# Deployment status
./scripts/check-deployment-status.sh $(git rev-parse HEAD | cut -c1-7)

# Watch deployment progress
./scripts/watch-deploy.sh
```

---

## 13. Rollback Procedures

### 13.1 Single Commit Rollback

```bash
# Identify bad commit
git log --oneline -10

# Revert specific commit
git revert <commit-hash>

# Push revert
git push origin main

# Monitor deployment
./scripts/watch-deploy.sh
```

### 13.2 Phase Rollback

```bash
# Find commit before phase started
git log --oneline --since="2026-01-27" | tail -1

# Create revert branch
git checkout -b revert-phase-X

# Revert all commits in phase (oldest to newest)
git revert --no-commit <oldest-commit>..<newest-commit>
git commit -m "Revert Phase X due to [reason]"

# Push and create emergency PR
git push origin revert-phase-X
gh pr create --title "EMERGENCY: Revert Phase X" --body "Reason: [reason]"
```

### 13.3 Database Rollback

For schema changes, prepare rollback migration BEFORE making change:

```typescript
// migrations/rollback/YYYY-MM-DD_rollback_feature_X.ts
export async function rollback(db: Database) {
  // Reverse the migration
}
```

---

## 14. Appendices

### 14.1 Quick Reference: Verification Commands

```bash
# Core verification (before EVERY commit)
pnpm check          # TypeScript
pnpm lint           # ESLint
pnpm test           # Unit tests
pnpm build          # Build

# Roadmap verification
pnpm roadmap:validate
pnpm validate:sessions

# Deployment verification
./scripts/watch-deploy.sh
./scripts/terp-logs.sh run 100
curl https://terp-app-b9s35.ondigitalocean.app/health
```

### 14.2 Quick Reference: Forbidden Patterns

```typescript
// ❌ NEVER use these patterns
ctx.user?.id || 1              // Fallback user ID
input.createdBy                // Actor from input
db.delete(table)               // Hard delete
function(data: any)            // Any type
inArray(col, arr)              // Raw inArray (use safeInArray)
publicProcedure                // For mutation endpoints
} catch (e) { }                // Silent error handling
```

### 14.3 Quick Reference: Required Patterns

```typescript
// ✅ ALWAYS use these patterns
getAuthenticatedUserId(ctx)    // Get actor from context
db.update().set({ deletedAt }) // Soft delete
protectedProcedure             // For all mutations
safeInArray(col, arr)          // Safe array operations
logger.error({ error }, msg)   // Error logging
await db.transaction(...)      // For multi-step operations
```

### 14.4 Contact & Escalation

- **Evan (Human Operator)**: Final decision authority
- **Emergency**: If production is down, revert first, investigate second
- **Blocked**: If blocked by unclear requirements, ask before guessing

---

## Version History

| Version | Date       | Changes         |
| ------- | ---------- | --------------- |
| 1.0     | 2026-01-27 | Initial version |

---

**Remember: Verification over persuasion. Prove it works, don't convince yourself it works.**
