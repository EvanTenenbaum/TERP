# Agent Prompt: Wave 4A - Critical Performance & Safety

## 1. Onboarding

**Welcome!** You are an AI agent tasked with fixing critical performance and safety issues in TERP.

### Your Mission

Fix the dashboard performance bottleneck and add proper safety confirmations to prevent accidental data loss.

### Key Documents to Read First

1. **Master Roadmap:** `docs/roadmaps/MASTER_ROADMAP.md`
2. **Strategic Plan:** `docs/roadmaps/STRATEGIC_PATH_TO_COMPLETION_20260106_v2.md`
3. **Performance Spec:** Search for "PERF-004" in MASTER_ROADMAP.md

### Repository Setup

```bash
gh repo clone EvanTenenbaum/TERP
cd TERP
pnpm install
git checkout -b fix/wave4-performance-safety
```

### File Ownership

**You have permission to modify these files:**

- `server/inventoryDb.ts` (for PERF-004)
- `server/routers/inventory.ts` (for PERF-004)
- `client/src/components/**/*.tsx` (for BUG-007 - confirmation dialogs)
- `client/src/components/ui/alert-dialog.tsx` (create if needed)

---

## 2. Your Tasks (6-8h total)

| Task ID  | Title                                         | Est. Hours | Priority    |
| -------- | --------------------------------------------- | ---------- | ----------- |
| PERF-004 | Refactor getDashboardStats to SQL Aggregation | 4h         | P0 CRITICAL |
| BUG-007  | Missing Permissions & Safety Checks           | 2-4h       | P0 CRITICAL |

### Task 1: PERF-004 - Refactor getDashboardStats to SQL Aggregation

**Problem:** `inventoryDb.getDashboardStats` fetches ALL batches into memory for calculation, causing performance issues as inventory grows.

**Current Implementation (BAD):**

```typescript
// Fetches ALL batches, then calculates in JavaScript
const batches = await db.select().from(batches);
const totalValue = batches.reduce((sum, b) => sum + b.value, 0);
```

**Required Implementation (GOOD):**

```typescript
// Use SQL aggregation - database does the work
const result = await db
  .select({
    totalBatches: count(batches.id),
    totalValue: sum(batches.value),
    totalQuantity: sum(batches.onHandQty),
    // ... other aggregations
  })
  .from(batches)
  .where(isNull(batches.deletedAt));
```

**Deliverables:**

- [ ] Rewrite `getDashboardStats` to use Drizzle/SQL aggregation functions (SUM, COUNT, GROUP BY)
- [ ] Remove in-memory calculation logic
- [ ] Verify dashboard stats remain accurate (compare before/after values)
- [ ] Add performance logging to measure improvement
- [ ] All tests passing
- [ ] Zero TypeScript errors

**Files to Modify:**

- `server/inventoryDb.ts` - Rewrite `getDashboardStats` function
- `server/routers/inventory.ts` - Update router if needed

### Task 2: BUG-007 - Missing Permissions & Safety Checks

**Problem:** `window.confirm()` is used instead of proper dialogs, and there's no confirmation for clearing cart.

**Current Implementation (BAD):**

```typescript
// Unprofessional browser dialog
if (window.confirm("Are you sure?")) {
  deleteItem();
}
```

**Required Implementation (GOOD):**

```typescript
// Use shadcn AlertDialog component
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive">Delete</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
      <AlertDialogDescription>
        This action cannot be undone.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={deleteItem}>Delete</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

**Deliverables:**

- [ ] Search codebase for all `window.confirm` usages
- [ ] Replace with shadcn AlertDialog component
- [ ] Add confirmation dialog for "Clear Cart" action
- [ ] Add confirmation for any destructive actions (delete, clear, reset)
- [ ] Ensure consistent styling across all confirmation dialogs
- [ ] All tests passing
- [ ] Zero TypeScript errors

**Files to Search:**

```bash
grep -r "window.confirm" client/src/
grep -r "window.alert" client/src/
```

---

## 3. Testing Requirements

### PERF-004 Testing

```bash
# Before your changes, note the dashboard load time
# After your changes, verify:
# 1. Dashboard stats are identical
# 2. Load time is significantly reduced
# 3. No TypeScript errors
pnpm check
```

### BUG-007 Testing

- Manually test all confirmation dialogs
- Verify Cancel button works correctly
- Verify destructive action only happens after confirmation

---

## 4. Completion Protocol

1. **Implement all tasks** on your `fix/wave4-performance-safety` branch
2. **Run `pnpm check`** to ensure no TypeScript errors
3. **Create a Pull Request** to `main` with this format:

```
fix: Wave 4A - Critical performance and safety fixes

PERF-004: Refactor getDashboardStats to SQL Aggregation
- Replaced in-memory calculation with SQL aggregation
- Performance improvement: [X]ms → [Y]ms

BUG-007: Missing Permissions & Safety Checks
- Replaced [N] window.confirm usages with AlertDialog
- Added confirmation for Clear Cart action
```

4. **Generate a Reviewer Prompt** for QA:

```markdown
# Reviewer Prompt: QA Wave 4A

**Branch:** `fix/wave4-performance-safety`

**Tasks to Verify:**

- [ ] PERF-004: Dashboard stats load faster and values are accurate
- [ ] BUG-007: All window.confirm replaced with AlertDialog

**Test Commands:**
\`\`\`bash
pnpm check
pnpm test
\`\`\`
```

---

## 5. Success Criteria

| Metric                | Before | Target  |
| --------------------- | ------ | ------- |
| Dashboard API Latency | ~2s    | < 500ms |
| window.confirm usages | >0     | 0       |
| TypeScript errors     | 0      | 0       |

---

Good luck! These fixes are critical for production stability.
