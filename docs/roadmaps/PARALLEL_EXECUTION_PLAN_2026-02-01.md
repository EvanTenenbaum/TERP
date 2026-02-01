# Parallel Execution Plan - Feb 1, 2026

**Created:** 2026-02-01
**Purpose:** Fix security audit findings while continuing roadmap execution
**Total New Tasks:** 35 security issues + existing roadmap items
**Strategy:** 4 parallel tracks per wave, security-first prioritization

---

## Execution Philosophy

1. **Security First**: Critical security issues (SEC-042, SEC-048) take priority
2. **Parallel Tracks**: 4 concurrent workstreams per wave
3. **No Dependencies Between Tracks**: Each track is independently completable
4. **Verification Gates**: Each wave ends with `pnpm check && pnpm test`

---

## Wave 1: Critical Security & Quick Wins (Est: 2-3h)

| Track | Task    | Description                                              | Est | Risk        |
| ----- | ------- | -------------------------------------------------------- | --- | ----------- |
| 1A    | SEC-042 | Fix hardcoded userId=1 in orderService.ts:86             | 2h  | 🔴 CRITICAL |
| 1B    | SEC-048 | Fix BUG-103 backend - remove password from qaAuth.ts:374 | 1h  | 🔴 HIGH     |
| 1C    | SEC-041 | Delete dangerous \*.backup files from routers/           | 30m | 🔴 HIGH     |
| 1D    | SEC-040 | Fix SSE-001 last instance liveShopping.ts:1324           | 1h  | 🟡 MEDIUM   |

**Wave 1 Deliverables:**

- [ ] orderService.ts uses actorId parameter, not hardcoded 1
- [ ] qaAuth.ts /api/qa-auth/roles no longer returns password
- [ ] No .backup files in server/routers/
- [ ] liveShopping.ts uses `data:` not `payload:` consistently

**Verification:**

```bash
pnpm check && pnpm lint && pnpm test
grep -r "password:" server/_core/qaAuth.ts  # Should not find in response
ls server/routers/*.backup* 2>/dev/null     # Should be empty
```

---

## Wave 2: Actor Attribution - Routers (Est: 4-6h)

| Track | Task    | Description                                      | Est | Files                  |
| ----- | ------- | ------------------------------------------------ | --- | ---------------------- |
| 2A    | SEC-038 | Add actor tracking to settings.ts (11 mutations) | 4h  | settings.ts            |
| 2B    | SEC-039 | Complete advancedTagFeatures.ts (5 mutations)    | 2h  | advancedTagFeatures.ts |
| 2C    | SEC-036 | Add actor tracking to tags.ts (3 mutations)      | 2h  | tags.ts                |
| 2D    | SEC-037 | Add actor tracking to locations.ts (4 mutations) | 2h  | locations.ts           |

**Wave 2 Pattern:**

```typescript
// BEFORE (each mutation)
.mutation(async ({ input }) => {
  await db.insert(table).values({ ...input });
});

// AFTER (add actor from context)
.mutation(async ({ input, ctx }) => {
  const actorId = getAuthenticatedUserId(ctx);
  await db.insert(table).values({
    ...input,
    createdBy: actorId,
  });
});
```

**Verification:**

```bash
pnpm check && pnpm test
grep -n "getAuthenticatedUserId" server/routers/settings.ts  # Should have matches
```

---

## Wave 3: Actor Attribution - Services (Est: 4-6h)

| Track | Task              | Description                                      | Est | Files                                   |
| ----- | ----------------- | ------------------------------------------------ | --- | --------------------------------------- |
| 3A    | SEC-043           | Add actor tracking to clientBalanceService.ts    | 2h  | clientBalanceService.ts                 |
| 3B    | SEC-044           | Fix actor storage in catalogPublishingService.ts | 2h  | catalogPublishingService.ts             |
| 3C    | SEC-045           | Add actor tracking to vipPortalAdminService.ts   | 2h  | vipPortalAdminService.ts                |
| 3D    | SEC-046 + SEC-047 | Add actor to weightService + priceAlertsService  | 2h  | weightService.ts, priceAlertsService.ts |

**Wave 3 Pattern (Service Layer):**

```typescript
// BEFORE
async function updateBalance(clientId: number, amount: number) {
  await db.update(clients).set({ balance: amount });
}

// AFTER
async function updateBalance(
  clientId: number,
  amount: number,
  actorId: number
) {
  await db.update(clients).set({
    balance: amount,
    updatedBy: actorId,
    updatedAt: new Date(),
  });
}
```

---

## Wave 4: Soft Delete Expansion (Est: 4h)

| Track | Task      | Description                                              | Est | Files                  |
| ----- | --------- | -------------------------------------------------------- | --- | ---------------------- |
| 4A    | ST-059B-1 | Convert photography.ts hard deletes                      | 1h  | photography.ts         |
| 4B    | ST-059B-2 | Convert vipPortal.ts hard deletes                        | 1h  | vipPortal.ts           |
| 4C    | ST-059B-3 | Convert calendarsManagement.ts hard deletes              | 1h  | calendarsManagement.ts |
| 4D    | ST-059B-4 | Fix freeformNotesDb.ts (HAS deletedAt, uses hard delete) | 1h  | freeformNotesDb.ts     |

**Wave 4 Pattern:**

```typescript
// BEFORE (hard delete)
await db.delete(productImages).where(eq(productImages.id, input.imageId));

// AFTER (soft delete)
await db
  .update(productImages)
  .set({ deletedAt: new Date() })
  .where(eq(productImages.id, input.imageId));
```

---

## Wave 5: Legacy Db Layer Cleanup (Est: 4h)

| Track | Task      | Description                                     | Est | Files                           |
| ----- | --------- | ----------------------------------------------- | --- | ------------------------------- |
| 5A    | ST-059B-5 | Convert clientNeedsDb + commentsDb hard deletes | 2h  | clientNeedsDb.ts, commentsDb.ts |
| 5B    | ST-059B-6 | Convert inboxDb + todoListsDb hard deletes      | 2h  | inboxDb.ts, todoListsDb.ts      |
| 5C    | ST-059B-7 | Convert todoTasksDb hard delete                 | 1h  | todoTasksDb.ts                  |
| 5D    | DOCS-001  | Update CLAUDE.md with new security patterns     | 1h  | CLAUDE.md                       |

---

## Wave 6: Existing Roadmap Continuation (Est: 8h)

| Track | Task          | Description                          | Est | Source         |
| ----- | ------------- | ------------------------------------ | --- | -------------- |
| 6A    | BUG-107       | Fallback user ID in salesSheetsDb.ts | 1h  | MASTER_ROADMAP |
| 6B    | BUG-108       | Fix stale Vite HMR cache clearing    | 2h  | MASTER_ROADMAP |
| 6C    | INFRA-017     | Migration architecture planning      | 4h  | MASTER_ROADMAP |
| 6D    | TEST-INFRA-07 | Fix tRPC mock missing useUtils       | 2h  | MASTER_ROADMAP |

---

## Dependency Graph

```
Wave 1 (Critical Security)
    │
    ├──→ Wave 2 (Router Actor Attribution)
    │         │
    │         └──→ Wave 3 (Service Actor Attribution)
    │
    └──→ Wave 4 (Soft Delete - Routers)
              │
              └──→ Wave 5 (Soft Delete - Db Layer)

Wave 6 (Roadmap Continuation) ──→ Can run parallel to Waves 2-5
```

**Key Insight:** Wave 6 has NO dependencies on Waves 2-5 and can run in parallel.

---

## Optimized Parallel Schedule

### Option A: Maximum Parallelism (4 agents)

| Time Block | Agent 1   | Agent 2   | Agent 3   | Agent 4       |
| ---------- | --------- | --------- | --------- | ------------- |
| Block 1    | SEC-042   | SEC-048   | SEC-041   | SEC-040       |
| Block 2    | SEC-038   | SEC-039   | SEC-036   | SEC-037       |
| Block 3    | SEC-043   | SEC-044   | SEC-045   | SEC-046+047   |
| Block 4    | ST-059B-1 | ST-059B-2 | ST-059B-3 | ST-059B-4     |
| Block 5    | ST-059B-5 | ST-059B-6 | ST-059B-7 | DOCS-001      |
| Block 6    | BUG-107   | BUG-108   | INFRA-017 | TEST-INFRA-07 |

**Total Time:** ~6 blocks × 2h average = 12h elapsed (48h work compressed)

### Option B: Conservative (2 agents, security focus)

| Time Block | Agent 1 (Security)        | Agent 2 (Roadmap)    |
| ---------- | ------------------------- | -------------------- |
| Block 1    | SEC-042, SEC-048          | BUG-107, BUG-108     |
| Block 2    | SEC-041, SEC-040          | TEST-INFRA-07        |
| Block 3    | SEC-038, SEC-039          | INFRA-017 (research) |
| Block 4    | SEC-036, SEC-037          | ST-059B-1, ST-059B-2 |
| Block 5    | SEC-043, SEC-044          | ST-059B-3, ST-059B-4 |
| Block 6    | SEC-045, SEC-046, SEC-047 | ST-059B-5,6,7        |

---

## Root Cause Analysis & Systemic Fixes

### RC-001: No Architectural Enforcement of Actor Attribution

**Symptom:** 35 mutations across routers/services lack actor tracking
**Root Cause:** Actor attribution is a convention, not an architectural constraint

**Systemic Fix (ARCH-SEC-001):**

```typescript
// Create a new base procedure that REQUIRES actor
export const auditedProcedure = protectedProcedure.use(
  async ({ ctx, next }) => {
    const actorId = getAuthenticatedUserId(ctx);
    return next({
      ctx: {
        ...ctx,
        actorId, // Always available, enforced by TypeScript
      },
    });
  }
);

// All mutations MUST use auditedProcedure instead of protectedProcedure
// This makes missing actor a compile-time error, not a runtime bug
```

**Add to Wave 7:**
| Task | Description | Est |
|------|-------------|-----|
| ARCH-SEC-001 | Create auditedProcedure base with mandatory actorId | 4h |
| ARCH-SEC-002 | Migrate all mutations to use auditedProcedure | 8h |

---

### RC-002: Db Layer Accepts Actor as Parameter

**Symptom:** ordersDb.ts, recurringOrdersDb.ts accept `createdBy` from callers
**Root Cause:** Db layer designed before security conventions existed

**Systemic Fix (ARCH-SEC-003):**

```typescript
// CURRENT: Db layer accepts actor (vulnerable)
async function createOrder(input: { createdBy: number }) { ... }

// BETTER: Db layer REQUIRES context, derives actor itself
async function createOrder(input: OrderInput, ctx: TRPCContext) {
  const actorId = getAuthenticatedUserId(ctx);
  // ...
}

// BEST: Db layer is just SQL, router handles all business logic
// This is the "thin Db layer" pattern
```

**Add to Wave 7:**
| Task | Description | Est |
|------|-------------|-----|
| ARCH-SEC-003 | Refactor \*Db.ts to not accept actor parameters | 16h |

---

### RC-003: No Pre-Commit Hook for Hard Deletes

**Symptom:** 15+ hard delete locations despite ST-059 "complete"
**Root Cause:** Pre-commit hooks check for actor patterns but not `db.delete()`

**Systemic Fix (INFRA-SEC-001):**

```bash
# Add to .husky/pre-commit
echo "Checking for hard delete patterns..."
if grep -r "db\.delete(" --include="*.ts" server/ | grep -v "test"; then
  echo "❌ Hard delete found. Use soft delete with deletedAt."
  exit 1
fi
```

**Add to Wave 7:**
| Task | Description | Est |
|------|-------------|-----|
| INFRA-SEC-001 | Add hard delete detection to pre-commit hook | 1h |
| INFRA-SEC-002 | Add allowlist for intentional hard deletes | 1h |

---

### RC-004: Backup Files Not Gitignored

**Symptom:** .backup files with vulnerabilities in repo
**Root Cause:** No gitignore rule for backup files

**Immediate Fix (add to Wave 1):**

```bash
# Add to .gitignore
*.backup
*.backup-*
*.bak
```

---

### RC-005: QA Auth Design Flaw

**Symptom:** Password exposed via API despite "dev only" intent
**Root Cause:** `FORCE_QA_AUTH` flag can bypass production check

**Systemic Fix (SEC-049):**

1. Remove `FORCE_QA_AUTH` entirely - it's a backdoor
2. Never return password in any API response
3. QA accounts should use same auth flow, just with known credentials

**Add to Wave 1:**
| Task | Description | Est |
|------|-------------|-----|
| SEC-049 | Remove FORCE_QA_AUTH bypass from qaAuth.ts | 30m |

---

### RC-006: Missing Soft Delete Column on Many Tables

**Symptom:** Some tables can't use soft delete because they lack `deletedAt`
**Root Cause:** Schema wasn't designed with soft delete in mind

**Systemic Fix (SCHEMA-SEC-001):**

```typescript
// Add deletedAt to these tables via migration:
// - productImages
// - clientDraftInterests
// - clientCatalogViews
// - appointmentTypes
// - calendarBlockedDates
// - clientNeeds
// - comments
// - inboxItems
// - todoLists
// - todoTasks
```

**Add to Wave 4 (prerequisite for soft delete conversion):**
| Task | Description | Est |
|------|-------------|-----|
| SCHEMA-SEC-001 | Add deletedAt column to 10 tables | 4h |

---

## Updated Wave Structure (With Root Causes)

### Wave 1: Critical Security + Root Cause Quick Fixes

| Track | Task                        | Type             |
| ----- | --------------------------- | ---------------- |
| 1A    | SEC-042                     | Fix              |
| 1B    | SEC-048 + SEC-049           | Fix + Root Cause |
| 1C    | SEC-041 + .gitignore update | Fix + Root Cause |
| 1D    | SEC-040                     | Fix              |

### Wave 4 (Revised): Schema + Soft Delete

| Track | Task                                   | Type       |
| ----- | -------------------------------------- | ---------- |
| 4A    | SCHEMA-SEC-001 (add deletedAt columns) | Root Cause |
| 4B    | ST-059B-1,2 (photography, vipPortal)   | Fix        |
| 4C    | ST-059B-3,4 (calendars, freeformNotes) | Fix        |
| 4D    | INFRA-SEC-001,002 (pre-commit hook)    | Root Cause |

### Wave 7 (NEW): Architectural Hardening

| Track | Task                             | Type       |
| ----- | -------------------------------- | ---------- |
| 7A    | ARCH-SEC-001 (auditedProcedure)  | Root Cause |
| 7B    | ARCH-SEC-002 (migrate mutations) | Root Cause |
| 7C    | ARCH-SEC-003 (Db layer refactor) | Root Cause |
| 7D    | Documentation + training         | Root Cause |

---

## Risk Mitigation

| Risk                                  | Mitigation                                       |
| ------------------------------------- | ------------------------------------------------ |
| Breaking changes to orderService      | Write integration test BEFORE changing           |
| Missing actor parameter propagation   | Grep for all callers before modifying signature  |
| Soft delete breaking existing queries | Check for `.where(isNull(deletedAt))` filters    |
| Backup file secrets in git history    | Note: deleting files doesn't remove from history |

---

## Success Criteria

After all waves complete:

1. **Security:**
   - [ ] `grep -r "userId.*=.*1" server/services/` returns 0 matches
   - [ ] `grep -r "password:" server/_core/qaAuth.ts` not in response objects
   - [ ] `ls server/routers/*.backup*` returns nothing

2. **Actor Attribution:**
   - [ ] All 23 router mutations have `getAuthenticatedUserId(ctx)`
   - [ ] All 7 service mutations accept and use `actorId` parameter

3. **Soft Deletes:**
   - [ ] `grep -r "db.delete(" server/` returns only authorized exceptions
   - [ ] All tables with `deletedAt` column use soft delete

4. **Tests:**
   - [ ] `pnpm check` passes
   - [ ] `pnpm test` passes
   - [ ] No new lint warnings

---

## Launch Command

To start Wave 1 immediately:

```
Launch 4 parallel subagents:
- Track 1A: SEC-042 (orderService.ts userId=1)
- Track 1B: SEC-048 (qaAuth.ts password removal)
- Track 1C: SEC-041 (delete backup files)
- Track 1D: SEC-040 (liveShopping.ts SSE fix)
```
