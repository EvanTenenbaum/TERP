# QUAL-002 & DATA-004: Parallel Execution Prompt

**Task IDs:** QUAL-002, DATA-004  
**Priority:** MEDIUM  
**Estimated Time:** 8-12 hours (reduced scope)  
**Parallel With:** BUG-034 (Pagination Standardization)

---

## 🚨 CRITICAL: FILE CONFLICT AVOIDANCE

**Another agent is working on BUG-034** which touches these files. **DO NOT MODIFY:**

### ❌ FORBIDDEN FILES (BUG-034 Scope)

**Router Files:**
- `server/routers/accounting.ts`
- `server/routers/clients.ts`
- `server/routers/inbox.ts`
- `server/routers/inventory.ts`
- `server/routers/orders.ts`
- `server/routers/purchaseOrders.ts`
- `server/routers/samples.ts`
- `server/routers/strains.ts`
- `server/routers/todoLists.ts`
- `server/routers/todoTasks.ts`
- `server/routers/vendors.ts`

**DB Files:**
- `server/inventoryDb.ts`
- `server/ordersDb.ts`
- `server/clientsDb.ts`
- `server/accountingDb.ts`
- `server/arApDb.ts`
- `server/cashExpensesDb.ts`
- `server/todoListsDb.ts`
- `server/todoTasksDb.ts`
- `server/inboxDb.ts`
- `server/samplesDb.ts`
- `server/strainsDb.ts`
- `server/purchaseOrdersDb.ts`
- `server/vendorsDb.ts`

---

## ✅ ALLOWED FILES (Your Scope)

### QUAL-002: Input Validation - Safe Routers

You MAY work on these routers:
- `server/routers/calendar.ts` ✅
- `server/routers/calendarParticipants.ts` ✅
- `server/routers/calendarReminders.ts` ✅
- `server/routers/calendarRecurrence.ts` ✅
- `server/routers/comments.ts` ✅
- `server/routers/communications.ts` ✅
- `server/routers/contacts.ts` ✅
- `server/routers/documents.ts` ✅
- `server/routers/notifications.ts` ✅
- `server/routers/pricing.ts` ✅
- `server/routers/reports.ts` ✅
- `server/routers/search.ts` ✅
- `server/routers/system.ts` ✅
- `server/routers/users.ts` ✅
- `server/routers/vipPortal.ts` ✅
- `server/routers/vipPortalAdmin.ts` ✅

### DATA-004: N+1 Optimization - Safe Scope

You MAY work on:
- **Frontend query optimization** (all `client/src/**/*.tsx` files)
- **React Query deduplication** (`client/src/lib/trpc.ts`)
- **Non-conflicting DB files** (calendarDb.ts, commentsDb.ts, etc.)

---

## 📋 QUAL-002: Comprehensive Input Validation

### Objective
Add or improve Zod validation schemas on API endpoints that lack proper validation.

### Audit Checklist

For each allowed router, check:
1. [ ] All `.input()` calls have Zod schemas
2. [ ] String fields have `.min()` and `.max()` constraints
3. [ ] Number fields have `.min()` and `.max()` constraints
4. [ ] Email fields use `.email()`
5. [ ] No `z.any()` types (replace with proper types)
6. [ ] User-friendly error messages added

### Known Issues to Fix

**pricing.ts** - Uses `z.any()`:
```typescript
// ❌ CURRENT
conditions: z.record(z.string(), z.any()),

// ✅ FIX - Define proper condition schema
const pricingConditionSchema = z.object({
  field: z.string(),
  operator: z.enum(["eq", "ne", "gt", "lt", "gte", "lte", "contains", "in"]),
  value: z.union([z.string(), z.number(), z.array(z.string())]),
});
conditions: z.array(pricingConditionSchema),
```

### Deliverables

1. [ ] Audit all allowed routers for validation gaps
2. [ ] Create `server/_core/validationSchemas.ts` with shared schemas
3. [ ] Fix `z.any()` usage in pricing.ts
4. [ ] Add user-friendly error messages
5. [ ] Run `pnpm tsc --noEmit` - zero errors
6. [ ] Update MVP_ROADMAP.md

---

## 📋 DATA-004: N+1 Query Optimization (Frontend Focus)

### Objective
Optimize frontend data fetching to reduce redundant API calls.

### Scope (Frontend Only)

Since backend DB files conflict with BUG-034, focus on:

1. **React Query Deduplication**
   - Ensure queries with same key are deduplicated
   - Add proper `staleTime` and `cacheTime` settings

2. **Redundant Query Elimination**
   - Find components making duplicate API calls
   - Consolidate into parent components or shared hooks

3. **Query Batching**
   - Identify opportunities to batch related queries
   - Use `useQueries` for parallel fetching

### Audit Process

```bash
# Find all useQuery calls
grep -r "useQuery\|trpc\." client/src --include="*.tsx" | wc -l

# Find potential duplicates (same query in multiple files)
grep -rh "trpc\.[a-zA-Z]*\.[a-zA-Z]*\.useQuery" client/src --include="*.tsx" | sort | uniq -c | sort -rn | head -20
```

### Deliverables

1. [ ] Audit frontend for redundant queries
2. [ ] Document findings in `docs/TECHNICAL_DEBT.md`
3. [ ] Fix top 5 most impactful redundant queries
4. [ ] Add query deduplication config to trpc client
5. [ ] Run `pnpm tsc --noEmit` - zero errors
6. [ ] Update MVP_ROADMAP.md

---

## 🔄 Execution Protocol

### Before Starting

```bash
# 1. Pull latest
git pull origin main

# 2. Check active sessions
cat docs/ACTIVE_SESSIONS.md

# 3. Register your session
SESSION_ID="Session-$(date +%Y%m%d)-QUAL002-DATA004-$(openssl rand -hex 4)"
echo "- $SESSION_ID: QUAL-002/DATA-004 (Parallel with BUG-034)" >> docs/ACTIVE_SESSIONS.md

# 4. Commit registration
git add docs/ACTIVE_SESSIONS.md
git commit -m "chore: register session $SESSION_ID"
git push origin main
```

### During Execution

1. **Work in small commits** - One router or one optimization at a time
2. **Pull frequently** - `git pull --rebase origin main` before each commit
3. **Check for conflicts** - If BUG-034 agent modified a file you need, STOP and coordinate
4. **Run validation** - `pnpm tsc --noEmit` after each change

### After Each Task

```bash
# Commit changes
git add .
git commit -m "feat(QUAL-002): Add validation to [router]"
git push origin main

# Or for DATA-004
git commit -m "perf(DATA-004): Optimize [component] queries"
git push origin main
```

### Completion

```bash
# 1. Update MVP_ROADMAP.md
# Mark QUAL-002 and/or DATA-004 as complete

# 2. Archive session
mv docs/sessions/active/$SESSION_ID.md docs/sessions/completed/

# 3. Remove from ACTIVE_SESSIONS.md
# Edit and remove your line

# 4. Final commit
git add .
git commit -m "chore: complete QUAL-002/DATA-004, archive session"
git push origin main
```

---

## 📊 Success Criteria

### QUAL-002 Complete When:
- [ ] All allowed routers audited
- [ ] No `z.any()` types in allowed routers
- [ ] Shared validation schemas created
- [ ] User-friendly error messages added
- [ ] TypeScript compiles without errors

### DATA-004 Complete When:
- [ ] Frontend query audit complete
- [ ] Top redundant queries documented
- [ ] At least 5 optimizations implemented
- [ ] Query deduplication configured
- [ ] TypeScript compiles without errors

---

## ⚠️ Conflict Resolution

If you encounter a merge conflict:

1. **STOP** - Don't force push
2. **Check** - Is the conflict in a BUG-034 file?
3. **If yes** - Abandon that change, work on different file
4. **If no** - Resolve normally with `git pull --rebase`

If BUG-034 completes before you:
- Pull latest: `git pull origin main`
- Your changes to allowed files should merge cleanly
- Continue with remaining work

---

## 📝 Notes

- This is a **reduced scope** version of QUAL-002 and DATA-004
- Full scope will be possible after BUG-034 completes
- Focus on **high-impact, low-conflict** improvements
- Document any deferred work in `docs/TECHNICAL_DEBT.md`

---

**Good luck! Coordinate with the BUG-034 agent if needed.**
