# Wave 5: Polish & Enhancement - Complete Agent Prompt

**Copy this entire prompt to give to a new agent.**
**Prerequisites:** Waves 0-4 must be complete.

---

# PART 1: AGENT ONBOARDING

## 🏢 Project Overview

**TERP** is a comprehensive ERP system for cannabis businesses. Wave 5 focuses on:
- Fixing remaining @ts-nocheck files
- Cleaning up technical debt
- Updating documentation
- Final polish

**Production URL:** https://terp-app-b9s35.ondigitalocean.app
**Repository:** https://github.com/EvanTenenbaum/TERP

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, TypeScript, Vite, TailwindCSS, shadcn/ui |
| **Backend** | Node.js, Express, tRPC |
| **Database** | MySQL (TiDB), Drizzle ORM |

---

## 🚨 CRITICAL CONSTRAINTS

### NEVER DO:
```
❌ Modify drizzle/schema.ts
❌ Run migrations
❌ Use `: any` types
❌ Add @ts-nocheck or @ts-ignore
❌ Skip tests before committing
```

### ALWAYS DO:
```
✅ Run pnpm check after EVERY change
✅ Run pnpm test after EVERY change
✅ Verify deployment succeeds
```

---

# PART 2: YOUR TASK - WAVE 5 POLISH

## 🎯 Mission

Fix remaining @ts-nocheck files and clean up technical debt.

**Goal:** All @ts-nocheck removed, documentation updated, roadmap accurate
**Estimated Time:** 21-34 hours
**Dependencies:** Waves 0-4 complete

---

## 📁 Remaining @ts-nocheck Files

### Client Pages (2 files)
```
client/src/pages/settings/FeatureFlagsPage.tsx
client/src/pages/InterestListPage.tsx
```

### Server Routers (11 files)
```
server/routers/alerts.ts
server/routers/audit.ts
server/routers/referrals.ts
server/routers/receipts.ts
server/routers/flowerIntake.ts
server/routers/inventoryShrinkage.ts
server/routers/quickCustomer.ts
server/routers/customerPreferences.ts
server/routers/vendorReminders.ts
server/routers/analytics.ts
server/routers/unifiedSalesPortal.ts
```

---

## 📋 Task Checklist

### Task 1: Fix FeatureFlagsPage (2-3 hours)
**Path:** `client/src/pages/settings/FeatureFlagsPage.tsx`

Admin-only page for managing feature flags.

```bash
sed -i '1d' client/src/pages/settings/FeatureFlagsPage.tsx
pnpm check 2>&1 | grep "FeatureFlagsPage"
```

### Task 2: Fix InterestListPage (2-3 hours)
**Path:** `client/src/pages/InterestListPage.tsx`

Enhancement feature for tracking customer interests.

```bash
sed -i '1d' client/src/pages/InterestListPage.tsx
pnpm check 2>&1 | grep "InterestListPage"
```

### Task 3: Evaluate Server Routers (15-25 hours)

For each server router with @ts-nocheck, determine:
1. Is it actively used? (Check for frontend references)
2. Does it have a working alternative?
3. Can it be fixed with simple type changes?
4. Should it be deleted?

**Decision Matrix:**

| Router | Frontend Refs | Alternative? | Action |
|--------|---------------|--------------|--------|
| alerts.ts | 0 | inventoryAlerts.ts | Consider delete |
| audit.ts | 5 | None | Fix |
| referrals.ts | 4 | None | Fix |
| receipts.ts | 2 | None | Fix |
| flowerIntake.ts | 0 | inventory.ts | Consider delete |
| inventoryShrinkage.ts | 0 | None | Consider delete |
| quickCustomer.ts | 0 | clients.ts | Consider delete |
| customerPreferences.ts | 0 | None | Consider delete |
| vendorReminders.ts | 0 | None | Consider delete |
| analytics.ts | 7 | None | Fix |
| unifiedSalesPortal.ts | 7 | None | Fix |

**For routers to FIX:**
```bash
sed -i '1d' server/routers/[filename].ts
pnpm check 2>&1 | grep "[filename].ts"
# Fix errors
```

**For routers to DELETE:**
1. Remove from `server/routers.ts`
2. Delete the file
3. Verify no runtime errors

### Task 4: Update Roadmap Documentation (2-3 hours)

Update `docs/roadmaps/MASTER_ROADMAP.md` to reflect reality:
- Change false "COMPLETE" statuses to accurate status
- Add "BLOCKED" or "NEEDS_FIX" where appropriate
- Remove duplicate entries
- Add missing items

---

## 🔧 Router Fix Patterns

### Pattern 1: Simple Column Rename
```typescript
// Before
const name = product.name;

// After
const name = product.nameCanonical;
```

### Pattern 2: Missing Join
```typescript
// Before (error - strain not on batch)
const strain = batch.strain;

// After (need join)
const batchWithProduct = await db.query.batches.findFirst({
  where: eq(batches.id, batchId),
  with: {
    product: {
      with: { strain: true }
    }
  }
});
const strain = batchWithProduct?.product?.strain?.name;
```

### Pattern 3: JSON Metadata
```typescript
// Some data is stored in metadata JSON field
const metadata = JSON.parse(batch.metadata ?? '{}');
const intakeType = metadata.intakeType ?? 'STANDARD';
```

---

## 🗑️ Safe Deletion Process

For routers that should be deleted:

```bash
# 1. Verify no frontend references
grep -r "routerName" client/src --include="*.tsx" --include="*.ts"

# 2. Remove from routers.ts
# Edit server/routers.ts to remove the import and registration

# 3. Delete the file
rm server/routers/[filename].ts

# 4. Verify TypeScript still passes
pnpm check

# 5. Verify tests still pass
pnpm test

# 6. Commit
git add -A
git commit -m "chore: remove unused [routerName] router"
```

---

## 📊 Documentation Updates

### MASTER_ROADMAP.md Updates Needed

1. **WS-007 through WS-012** - Change from "COMPLETE" to "BLOCKED - Schema mismatch"
2. **BUG-002** - Remove duplicate entry
3. **BUG-050** - Add if missing
4. **FEATURE-021** - Add if missing

### New Documentation to Create

1. `docs/technical/SCHEMA_REALITY.md` - Document actual vs expected schema
2. `docs/technical/DELETED_ROUTERS.md` - Document why routers were deleted

---

## ✅ Exit Criteria

Wave 5 is complete when:

- [ ] `FeatureFlagsPage.tsx` has no @ts-nocheck
- [ ] `InterestListPage.tsx` has no @ts-nocheck
- [ ] All fixable server routers have no @ts-nocheck
- [ ] Unused routers are deleted (with documentation)
- [ ] `MASTER_ROADMAP.md` reflects reality
- [ ] `pnpm check` passes with 0 errors
- [ ] `pnpm test` passes
- [ ] Deployment verified successful

---

## 🔄 Git Workflow

```bash
# After each fix
pnpm check && pnpm test
git add -A
git commit -m "fix/chore: [description]"
git push origin main

# Verify deployment
git fetch origin build-status
git show origin/build-status:.github/BUILD_STATUS.md
```

---

## 🆘 Escalation

If you encounter issues:
1. Document in `WAVE_5_BLOCKERS.md`
2. Include file, line, error, attempts
3. Move to next file
4. Flag for human review

---

## 🚀 Getting Started

```bash
cd ~/TERP
git pull origin main
pnpm install
pnpm check  # Must pass (Waves 0-4 should be complete)

# Check remaining @ts-nocheck files
grep -r "@ts-nocheck" client/src server --include="*.ts" --include="*.tsx"

# Start with simplest file
sed -i '1d' client/src/pages/settings/FeatureFlagsPage.tsx
pnpm check 2>&1 | grep "FeatureFlagsPage"
```

**Good luck! This is the final cleanup wave.**
