# Agent Prompt: Wave 4C - Systemic Data Access Fix

## 1. Onboarding

**Welcome!** You are an AI agent tasked with investigating and fixing the most critical bug in the system.

### Your Mission
Fix the widespread "No data found" issues across all modules. This is the ROOT CAUSE of many apparent bugs and must be resolved for the application to function.

### Key Documents to Read First
1. **Master Roadmap:** `docs/roadmaps/MASTER_ROADMAP.md`
2. **Strategic Plan:** `docs/roadmaps/STRATEGIC_PATH_TO_COMPLETION_20260106.md`
3. **QA Backlog:** `docs/roadmaps/QA_TASKS_BACKLOG.md` (QA-005)

### Repository Setup
```bash
gh repo clone EvanTenenbaum/TERP
cd TERP
pnpm install
git checkout -b wave-4/data-access
```

### File Ownership
**You have permission to modify files across the codebase as needed:**
- `server/routers/*` (query fixes)
- `server/_core/auth/*` (auth middleware)
- `server/_core/db/*` (database connection)
- `drizzle/` (schema if needed)
- Configuration files

---

## 2. Your Task (16-24h)

| Task ID | Title | Est. Hours |
|---------|-------|------------|
| QA-005 | Investigate and Fix Systemic Data Access Issues | 16-24h |

### Problem Statement

**Symptoms Observed:**
- Orders module shows 4,400 total orders in metrics but 0 in table
- Inventory shows $96M value but "No inventory found"
- Clients shows "No clients found"
- All data tables are empty despite metrics showing data exists

**This indicates a disconnect between:**
1. Aggregate queries (working) - showing totals
2. List queries (broken) - returning empty arrays

---

## 3. Investigation Checklist

### Step 1: Database Connection Verification
```bash
# Check database is accessible
pnpm db:studio  # Opens Drizzle Studio

# Or via command line
pnpm db:push --dry-run  # Verify schema matches
```

**Questions to Answer:**
- Is the database connection configured correctly?
- Are credentials valid for the environment?
- Is the connection pool working?

### Step 2: Authentication Middleware Audit
```typescript
// Check these files:
// server/_core/auth/session.ts
// server/_core/auth/middleware.ts
// server/routers/_app.ts

// Look for:
// - User context being passed to queries
// - Permission checks that might filter all data
// - Session validation issues
```

**Questions to Answer:**
- Is the user session being established correctly?
- Are permission checks too restrictive?
- Is the user ID being passed to queries?

### Step 3: Query Analysis
```typescript
// For each router showing empty data, check:
// 1. The query itself
// 2. Any WHERE clauses
// 3. Permission filters
// 4. Pagination parameters

// Example investigation for orders:
// server/routers/orders.ts
// - Check getAll procedure
// - Check if userId filter is applied
// - Check if pagination defaults are wrong (offset too high?)
```

### Step 4: API Response Testing
```bash
# Start the dev server
pnpm dev

# In another terminal, test API directly
curl -X POST http://localhost:3000/api/trpc/orders.getAll \
  -H "Content-Type: application/json" \
  -d '{"json":{"limit":10,"offset":0}}'
```

### Step 5: Frontend Query Verification
```typescript
// Check how frontend calls the API:
// client/src/pages/OrdersPage.tsx
// - Verify useQuery parameters
// - Check if filters are being applied incorrectly
// - Verify the data transformation
```

---

## 4. Common Root Causes to Check

### Cause 1: Incorrect User Scoping
```typescript
// BAD: Always filters by userId even for admin
const orders = await db.query.orders.findMany({
  where: eq(orders.userId, ctx.user.id)  // Admin sees nothing
});

// GOOD: Check role before filtering
const orders = await db.query.orders.findMany({
  where: ctx.user.role === 'admin' 
    ? undefined 
    : eq(orders.userId, ctx.user.id)
});
```

### Cause 2: Pagination Defaults
```typescript
// BAD: Default offset is too high
const { limit = 10, offset = 1000 } = input;  // Skips all data!

// GOOD: Sensible defaults
const { limit = 50, offset = 0 } = input;
```

### Cause 3: Soft Delete Filter
```typescript
// BAD: Soft delete filter excludes all data
const orders = await db.query.orders.findMany({
  where: isNull(orders.deletedAt)  // If deletedAt column doesn't exist, returns nothing
});

// GOOD: Check if column exists
const orders = await db.query.orders.findMany({
  where: orders.deletedAt ? isNull(orders.deletedAt) : undefined
});
```

### Cause 4: Environment Mismatch
```bash
# Check environment variables
cat .env.local
# Verify DATABASE_URL points to correct database
# Verify it's not pointing to empty dev/test database
```

---

## 5. Fix Implementation

Once you identify the root cause, implement fixes following these principles:

1. **Minimal Changes:** Fix the root cause, don't refactor unrelated code
2. **Backward Compatible:** Don't break existing functionality
3. **Well Documented:** Comment why the fix was needed
4. **Tested:** Verify data displays in all affected modules

### Example Fix Pattern
```typescript
// Before: Broken query
export const ordersRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(z.object({ limit: z.number(), offset: z.number() }))
    .query(async ({ ctx, input }) => {
      // BUG: Missing data due to [root cause]
      return await db.query.orders.findMany({
        limit: input.limit,
        offset: input.offset,
      });
    }),
});

// After: Fixed query
export const ordersRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(z.object({ 
      limit: z.number().default(50),  // Sensible default
      offset: z.number().default(0),   // Start from beginning
    }))
    .query(async ({ ctx, input }) => {
      // FIX: [Description of fix] - Wave 4C
      return await db.query.orders.findMany({
        limit: input.limit,
        offset: input.offset,
        // Additional fix details...
      });
    }),
});
```

---

## 6. Testing Requirements

Before submitting your PR:

1. **Data Verification:**
   - Orders page shows orders in table (not just metrics)
   - Inventory page shows inventory items
   - Clients page shows client list
   - All modules display data consistently

2. **Automated Testing:**
   ```bash
   pnpm check  # Zero TypeScript errors
   pnpm test   # All tests pass
   ```

3. **Manual Testing:**
   - Log in as different user roles
   - Verify data access is appropriate per role
   - Check pagination works (page 1, page 2, etc.)

---

## 7. Completion Protocol

1. **Document your findings** in a `INVESTIGATION_NOTES.md` file

2. **Implement fixes** on your `wave-4/data-access` branch

3. **Run verification:**
   ```bash
   pnpm check
   pnpm test
   ```

4. **Create a Pull Request** to `main` with:
   - Clear title: `fix(data): resolve systemic data access issues [Wave 4C]`
   - **Detailed root cause analysis** in description
   - Before/after screenshots showing data now displays
   - List of all files changed and why

5. **Generate a Reviewer Prompt:**

```markdown
# Reviewer Prompt: QA & Merge Wave 4C - Data Access Fix

**Branch:** `wave-4/data-access`

**Root Cause:** [Your findings here]

**Tasks to Verify:**
- [ ] **QA-005:** Orders page shows orders in table
- [ ] **QA-005:** Inventory page shows inventory items  
- [ ] **QA-005:** Clients page shows client list
- [ ] **QA-005:** Data displays for both admin and regular users
- [ ] **QA-005:** Pagination works correctly

**Instructions:**
1. Checkout the branch
2. Run `pnpm check` and `pnpm test`
3. Log in and verify data displays in all modules
4. Test with different user roles
5. If approved, merge to main (HIGH PRIORITY)
```

---

## 8. Coordination Notes

**Priority:** This is the HIGHEST priority task in Wave 4. Other agents' work may depend on this fix.

**Parallel Agents:**
- Agent 4A is working on Todo and COGS Settings
- Agent 4B is working on Accounting and Analytics
- Both may need your fix before their data displays correctly

**Communication:**
- If you find the fix, notify other agents via PR comment
- Consider creating a draft PR early so others can track progress
- Tag `@EvanTenenbaum` if you need database access or credentials

---

Good luck! Your work unblocks the entire application.
