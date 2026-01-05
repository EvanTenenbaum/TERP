# Parallel Execution Guide

## Overview

After Wave 0 completes, Waves 1, 3, and 4 can run **simultaneously** with 3 separate agents.

```
Wave 0 (Complete) ──┬──► Wave 1: Sales (Agent A)
                    ├──► Wave 3: Inventory (Agent B)
                    └──► Wave 4: Operations (Agent C)
```

---

## File Ownership Matrix

| File | Wave 1 | Wave 3 | Wave 4 |
|------|--------|--------|--------|
| **Client Pages** |
| UnifiedSalesPortalPage.tsx | ✅ OWN | ❌ | ❌ |
| Quotes.tsx | ✅ OWN | ❌ | ❌ |
| Orders.tsx | ✅ OWN | ❌ | ❌ |
| PhotographyPage.tsx | ❌ | ✅ OWN | ❌ |
| VendorsPage.tsx | ❌ | ✅ OWN | ❌ |
| PurchaseOrdersPage.tsx | ❌ | ✅ OWN | ❌ |
| NotificationsPage.tsx | ❌ | ❌ | ✅ OWN |
| NotificationPreferences.tsx | ❌ | ❌ | ✅ OWN |
| CalendarPage.tsx | ❌ | ❌ | ✅ OWN |
| **Server Routers** |
| orders.ts | ✅ OWN | ❌ | ❌ |
| quotes.ts | ✅ OWN | ❌ | ❌ |
| unifiedSalesPortal.ts | ✅ OWN | ❌ | ❌ |
| photography.ts | ❌ | ✅ OWN | ❌ |
| inventory.ts | ❌ | ✅ OWN | ❌ |
| vendors.ts | ❌ | ✅ OWN | ❌ |
| notifications.ts | ❌ | ❌ | ✅ OWN |
| calendar.ts | ❌ | ❌ | ✅ OWN |
| todoTasks.ts | ❌ | ❌ | ✅ OWN |
| **Shared (READ ONLY)** |
| clients.ts | 📖 READ | 📖 READ | 📖 READ |
| batches.ts | 📖 READ | 📖 READ | 📖 READ |
| users.ts | 📖 READ | 📖 READ | 📖 READ |
| accounting.ts | 📖 READ | 📖 READ | 📖 READ |

---

## Launch Instructions

### Step 1: Verify Wave 0 Complete

```bash
cd ~/TERP
git pull origin main
pnpm install
pnpm check  # Must show 0 errors

# Verify Wave 0 files are fixed
grep -l "@ts-nocheck" client/src/pages/Inventory.tsx \
  client/src/pages/OrderCreatorPage.tsx \
  client/src/pages/vip-portal/VIPDashboard.tsx \
  client/src/pages/accounting/Invoices.tsx
# Should return nothing (no matches)
```

### Step 2: Launch 3 Agents

**Agent A - Sales (Wave 1):**
```
Copy contents of: docs/prompts/parallel/PARALLEL-WAVE-1-SALES.md
```

**Agent B - Inventory (Wave 3):**
```
Copy contents of: docs/prompts/parallel/PARALLEL-WAVE-3-INVENTORY.md
```

**Agent C - Operations (Wave 4):**
```
Copy contents of: docs/prompts/parallel/PARALLEL-WAVE-4-OPERATIONS.md
```

### Step 3: Monitor Progress

Each agent will create a blockers file if stuck:
- `WAVE_1_BLOCKERS.md`
- `WAVE_3_BLOCKERS.md`
- `WAVE_4_BLOCKERS.md`

Check these periodically for issues requiring human intervention.

---

## Conflict Resolution

### If Two Agents Need the Same File

1. **Stop** - Do not edit shared files without coordination
2. **Document** - Note the conflict in your BLOCKERS file
3. **Wait** - Human will assign ownership or merge changes

### If Git Push Fails (Conflict)

```bash
# Pull latest changes
git pull origin main --rebase

# If conflicts, resolve them
# Only edit YOUR files, accept theirs for other files
git add -A
git rebase --continue

# Push again
git push origin main
```

### If TypeScript Check Fails After Pull

Another agent may have introduced an error. Check:
```bash
pnpm check 2>&1 | head -20
```

If error is in YOUR files → Fix it
If error is in THEIR files → Document and continue

---

## Completion Checklist

### Wave 1 Complete When:
- [ ] UnifiedSalesPortalPage.tsx - no @ts-nocheck
- [ ] unifiedSalesPortal.ts - no @ts-nocheck
- [ ] Sales flow tested end-to-end

### Wave 3 Complete When:
- [ ] PhotographyPage.tsx - no @ts-nocheck
- [ ] photography.ts - no @ts-nocheck
- [ ] Inventory intake flow tested

### Wave 4 Complete When:
- [ ] NotificationsPage.tsx - no @ts-nocheck
- [ ] NotificationPreferences.tsx - no @ts-nocheck
- [ ] Calendar/notification flow tested

---

## After All Parallel Waves Complete

Once Waves 1, 3, and 4 are all done:

1. **Wave 2 (VIP Portal)** can start - depends on Wave 1 backend
2. **Wave 5 (Polish)** can start after Wave 2

```
Waves 1+3+4 Complete ──► Wave 2: VIP Portal
                    └──► Wave 5: Polish (can start in parallel with Wave 2)
```

---

## Emergency Contacts

If critical issues arise:
1. Create detailed blocker document
2. Stop work on that file
3. Continue with other tasks
4. Flag for human review

**Do NOT:**
- Add @ts-nocheck to "fix" issues
- Edit files outside your scope
- Push broken code to main
