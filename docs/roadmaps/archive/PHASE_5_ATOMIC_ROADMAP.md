# 🎯 Phase 5 Atomic Strategic Roadmap

**Created:** December 19, 2025  
**Status:** 🔴 ACTIVE  
**Remaining Tasks:** QUAL-002, DATA-004

---

## ⚠️ CRITICAL CONSTRAINTS

### BUG-034 Conflict Avoidance

**BUG-034** (Pagination Standard Implementation) is a massive refactoring task touching:
- **11 router files**: accounting, clients, inbox, inventory, orders, purchaseOrders, samples, strains, todoLists, todoTasks, vendors
- **13 DB files**: inventoryDb, ordersDb, clientsDb, accountingDb, arApDb, cashExpensesDb, todoListsDb, todoTasksDb, inboxDb, samplesDb, strainsDb, purchaseOrdersDb, vendorsDb

**DO NOT modify these files** for QUAL-002 or DATA-004 to avoid merge conflicts.

---

## 📊 Completed Phase 5 Tasks

| Task | Description | Status | Commit |
|------|-------------|--------|--------|
| BUG-M001 | Mobile responsive sidebar | ✅ Complete | `7aed4142` |
| BUG-M003 | Mobile-friendly tables | ✅ Complete | `15137583` |

---

## 🔄 Remaining Tasks - Atomic Breakdown

### QUAL-002: Comprehensive Input Validation (32h estimated)

**Goal:** Add Zod validation schemas to all API endpoints that lack proper validation.

**Scope Reduction (avoiding BUG-034 conflicts):**
Focus on routers NOT touched by BUG-034:
- ✅ calendar.ts
- ✅ calendarParticipants.ts
- ✅ comments.ts
- ✅ communications.ts
- ✅ contacts.ts
- ✅ debug.ts (if exists)
- ✅ documents.ts
- ✅ notifications.ts
- ✅ pricing.ts
- ✅ reports.ts
- ✅ search.ts
- ✅ system.ts
- ✅ users.ts
- ✅ vipPortal.ts
- ✅ vipPortalAdmin.ts

#### Atomic Operations for QUAL-002

| Op # | Operation | File | Est Time | Dependencies |
|------|-----------|------|----------|--------------|
| Q-01 | Audit calendar.ts for missing validation | server/routers/calendar.ts | 15 min | None |
| Q-02 | Add Zod schemas to calendar mutations | server/routers/calendar.ts | 30 min | Q-01 |
| Q-03 | Audit calendarParticipants.ts | server/routers/calendarParticipants.ts | 10 min | None |
| Q-04 | Add Zod schemas to calendarParticipants | server/routers/calendarParticipants.ts | 20 min | Q-03 |
| Q-05 | Audit comments.ts for missing validation | server/routers/comments.ts | 10 min | None |
| Q-06 | Add Zod schemas to comments mutations | server/routers/comments.ts | 20 min | Q-05 |
| Q-07 | Audit communications.ts | server/routers/communications.ts | 10 min | None |
| Q-08 | Add Zod schemas to communications | server/routers/communications.ts | 20 min | Q-07 |
| Q-09 | Audit contacts.ts | server/routers/contacts.ts | 10 min | None |
| Q-10 | Add Zod schemas to contacts | server/routers/contacts.ts | 20 min | Q-09 |
| Q-11 | Audit documents.ts | server/routers/documents.ts | 10 min | None |
| Q-12 | Add Zod schemas to documents | server/routers/documents.ts | 20 min | Q-11 |
| Q-13 | Audit notifications.ts | server/routers/notifications.ts | 10 min | None |
| Q-14 | Add Zod schemas to notifications | server/routers/notifications.ts | 20 min | Q-13 |
| Q-15 | Audit pricing.ts | server/routers/pricing.ts | 15 min | None |
| Q-16 | Add Zod schemas to pricing | server/routers/pricing.ts | 30 min | Q-15 |
| Q-17 | Audit users.ts | server/routers/users.ts | 10 min | None |
| Q-18 | Add Zod schemas to users | server/routers/users.ts | 20 min | Q-17 |
| Q-19 | Audit vipPortal.ts | server/routers/vipPortal.ts | 15 min | None |
| Q-20 | Add Zod schemas to vipPortal | server/routers/vipPortal.ts | 30 min | Q-19 |
| Q-21 | Audit vipPortalAdmin.ts | server/routers/vipPortalAdmin.ts | 15 min | None |
| Q-22 | Add Zod schemas to vipPortalAdmin | server/routers/vipPortalAdmin.ts | 30 min | Q-21 |
| Q-23 | Create shared validation schemas | server/_core/validationSchemas.ts | 45 min | None |
| Q-24 | Add validation error messages | server/_core/validationSchemas.ts | 30 min | Q-23 |
| Q-25 | Run full test suite | - | 15 min | Q-01 to Q-24 |
| Q-26 | Update roadmap | docs/roadmaps/MVP_ROADMAP.md | 5 min | Q-25 |

**Total Atomic Operations:** 26
**Estimated Time:** ~8 hours (reduced from 32h by avoiding BUG-034 files)

---

### DATA-004: N+1 Query Optimization (40h estimated)

**Goal:** Identify and fix N+1 query patterns in the codebase.

**Scope Reduction (avoiding BUG-034 conflicts):**
Focus on:
- Frontend data fetching patterns (useQuery calls)
- Non-conflicting server files
- Drizzle relation optimizations

**⚠️ RECOMMENDATION:** Defer DATA-004 until BUG-034 is complete.

**Rationale:**
1. Most N+1 issues are in the DB files that BUG-034 will refactor
2. BUG-034 will change the data fetching patterns significantly
3. Optimizing now would create merge conflicts and duplicate work
4. After BUG-034, N+1 patterns can be addressed in the new pagination infrastructure

#### If DATA-004 Must Proceed (Frontend-Only Scope)

| Op # | Operation | File | Est Time | Dependencies |
|------|-----------|------|----------|--------------|
| D-01 | Audit React Query usage patterns | client/src/**/*.tsx | 30 min | None |
| D-02 | Identify redundant API calls | client/src/**/*.tsx | 30 min | D-01 |
| D-03 | Consolidate duplicate queries | Various client files | 2h | D-02 |
| D-04 | Add query deduplication | client/src/lib/trpc.ts | 30 min | D-03 |
| D-05 | Optimize calendar queries | client/src/pages/Calendar*.tsx | 1h | None |
| D-06 | Optimize dashboard queries | client/src/pages/Dashboard*.tsx | 1h | None |
| D-07 | Run performance audit | - | 30 min | D-01 to D-06 |
| D-08 | Update roadmap | docs/roadmaps/MVP_ROADMAP.md | 5 min | D-07 |

**Total Atomic Operations (Frontend-Only):** 8
**Estimated Time:** ~6 hours

---

## 📋 Execution Strategy

### Recommended Order

1. **QUAL-002** (Input Validation) - Can proceed immediately
   - Low risk, additive changes
   - No BUG-034 conflicts if scoped correctly
   - Improves security posture

2. **DATA-004** (N+1 Optimization) - Defer or frontend-only
   - High conflict risk with BUG-034
   - Recommend deferring until BUG-034 complete
   - If must proceed, limit to frontend optimizations

### Sprint Execution Protocol

For each atomic operation:

1. **Before:**
   - Pull latest: `git pull origin main`
   - Check for BUG-034 branch activity
   - Verify file not modified by BUG-034

2. **During:**
   - Make minimal, focused changes
   - Run `pnpm tsc --noEmit` after each file
   - Run `getDiagnostics` on modified files

3. **After:**
   - Run relevant tests
   - Commit with descriptive message
   - Push to main

### QA Protocol

After completing each task section (e.g., all calendar validation):

```
WORK CLASSIFICATION:
- Type: PRODUCTION
- Persistence: DURABLE
- Risk: LOW (additive validation)
- Consumers: INTERNAL

QA LEVEL: 🟢 LEVEL 1 (Fast Sanity Check)
- TypeScript compiles
- No new errors introduced
- Validation works as expected
```

---

## 📊 Progress Tracking

### QUAL-002 Progress

| Section | Operations | Status | Commit |
|---------|------------|--------|--------|
| Calendar | Q-01, Q-02 | ⏳ Ready | - |
| CalendarParticipants | Q-03, Q-04 | ⏳ Ready | - |
| Comments | Q-05, Q-06 | ⏳ Ready | - |
| Communications | Q-07, Q-08 | ⏳ Ready | - |
| Contacts | Q-09, Q-10 | ⏳ Ready | - |
| Documents | Q-11, Q-12 | ⏳ Ready | - |
| Notifications | Q-13, Q-14 | ⏳ Ready | - |
| Pricing | Q-15, Q-16 | ⏳ Ready | - |
| Users | Q-17, Q-18 | ⏳ Ready | - |
| VIP Portal | Q-19, Q-20 | ⏳ Ready | - |
| VIP Portal Admin | Q-21, Q-22 | ⏳ Ready | - |
| Shared Schemas | Q-23, Q-24 | ⏳ Ready | - |
| Final QA | Q-25, Q-26 | ⏳ Ready | - |

### DATA-004 Progress

| Section | Operations | Status | Commit |
|---------|------------|--------|--------|
| Frontend Audit | D-01, D-02 | ⏳ Deferred | - |
| Query Consolidation | D-03, D-04 | ⏳ Deferred | - |
| Page Optimization | D-05, D-06 | ⏳ Deferred | - |
| Final QA | D-07, D-08 | ⏳ Deferred | - |

---

## 🎯 Success Criteria

### QUAL-002 Complete When:
- [ ] All non-BUG-034 routers have Zod validation
- [ ] Shared validation schemas created
- [ ] User-friendly error messages added
- [ ] TypeScript compiles without errors
- [ ] All tests pass

### DATA-004 Complete When:
- [ ] Frontend query patterns optimized
- [ ] No redundant API calls
- [ ] Performance metrics improved
- [ ] TypeScript compiles without errors
- [ ] All tests pass

---

_This atomic roadmap enables incremental progress while avoiding BUG-034 conflicts._
