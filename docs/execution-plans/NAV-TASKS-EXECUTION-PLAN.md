# Navigation Accessibility Enhancement - Strategic Execution Plan

**Version:** 1.0
**Created:** 2026-01-20
**Status:** Ready for Execution
**Total Tasks:** 11 (NAV-006 through NAV-016)
**Estimated Duration:** ~1.5 hours

---

## Executive Summary

This execution plan completes all 11 open non-beta MVP tasks. All tasks are part of the Navigation Accessibility Enhancement initiative, which surfaces 8 hidden high-value routes in the sidebar navigation and Command Palette.

### Pre-Execution Verification Completed

| Check                    | Status   | Notes                                               |
| ------------------------ | -------- | --------------------------------------------------- |
| Routes exist in App.tsx  | VERIFIED | All 8 routes already implemented                    |
| Pages render correctly   | VERIFIED | Components exist and are imported                   |
| No duplicate task IDs    | VERIFIED | Grep search returned no duplicates                  |
| No conflicting tasks     | VERIFIED | All NAV tasks target different routes               |
| TERP protocol compliance | PARTIAL  | Tasks use table format (acceptable for micro-tasks) |

---

## Task Inventory

| Task    | Description                        | File               | Dependencies | Status |
| ------- | ---------------------------------- | ------------------ | ------------ | ------ |
| NAV-006 | Add Leaderboard to Sales nav       | navigation.ts      | None         | ready  |
| NAV-007 | Add Client Needs to Sales nav      | navigation.ts      | None         | ready  |
| NAV-008 | Add Matchmaking to Sales nav       | navigation.ts      | None         | ready  |
| NAV-009 | Add Quotes to Sales nav            | navigation.ts      | None         | ready  |
| NAV-010 | Add Returns to Sales nav           | navigation.ts      | None         | ready  |
| NAV-011 | Add Vendor Supply to Inventory nav | navigation.ts      | None         | ready  |
| NAV-012 | Add Pricing Rules to Finance nav   | navigation.ts      | None         | ready  |
| NAV-013 | Add Workflow Queue to Admin nav    | navigation.ts      | None         | ready  |
| NAV-014 | Add 8 routes to Command Palette    | CommandPalette.tsx | None         | ready  |
| NAV-015 | Verify TypeScript compilation      | -                  | NAV-006..014 | ready  |
| NAV-016 | Manual QA verification             | -                  | NAV-015      | ready  |

---

## Dependency Graph

```
         ┌─────────────────────────────────────────┐
         │          PHASE 1 (PARALLEL)             │
         │                                         │
         │  ┌─────────────────┐  ┌──────────────┐  │
         │  │ Agent A         │  │ Agent B      │  │
         │  │ NAV-006..013    │  │ NAV-014      │  │
         │  │ (navigation.ts) │  │ (Command     │  │
         │  │                 │  │  Palette.tsx)│  │
         │  └────────┬────────┘  └──────┬───────┘  │
         │           │                   │         │
         └───────────┼───────────────────┼─────────┘
                     │                   │
                     └─────────┬─────────┘
                               │
                     ┌─────────▼─────────┐
                     │     PHASE 2       │
                     │ NAV-015: TypeScript│
                     │ Verification       │
                     └─────────┬─────────┘
                               │
                     ┌─────────▼─────────┐
                     │     PHASE 3       │
                     │ NAV-016: QA       │
                     │ Verification      │
                     └───────────────────┘
```

---

## Execution Phases

### Phase 1: Parallel Implementation (~30 minutes)

**Goal:** Add all 8 navigation items and 8 Command Palette entries simultaneously.

#### Agent A: Navigation Sidebar (NAV-006 through NAV-013)

**File:** `client/src/config/navigation.ts`

**Tasks:** Add 8 navigation items in a single edit session.

**Implementation Details:**

```typescript
// Required icon imports to add:
import {
  Trophy,      // NAV-006: Leaderboard
  Target,      // NAV-007: Client Needs
  Sparkles,    // NAV-008: Matchmaking
  FileQuestion,// NAV-009: Quotes
  PackageX,    // NAV-010: Returns
  PackagePlus, // NAV-011: Vendor Supply
  DollarSign,  // NAV-012: Pricing Rules (already imported as Coins - verify)
  ListOrdered, // NAV-013: Workflow Queue
} from "lucide-react";

// Add to navigationItems array:

// Sales group additions (after existing sales items):
{ name: "Leaderboard", path: "/leaderboard", icon: Trophy, group: "sales", ariaLabel: "View team performance and rankings" },
{ name: "Client Needs", path: "/needs", icon: Target, group: "sales", ariaLabel: "Manage client product needs and preferences" },
{ name: "Matchmaking", path: "/matchmaking", icon: Sparkles, group: "sales", ariaLabel: "Match client needs with available inventory" },
{ name: "Quotes", path: "/quotes", icon: FileQuestion, group: "sales", ariaLabel: "Manage quotes and pricing proposals" },
{ name: "Returns", path: "/returns", icon: PackageX, group: "sales", ariaLabel: "Process and track product returns" },

// Inventory group addition:
{ name: "Vendor Supply", path: "/vendor-supply", icon: PackagePlus, group: "inventory", ariaLabel: "View vendor supply and availability" },

// Finance group addition:
{ name: "Pricing Rules", path: "/pricing/rules", icon: DollarSign, group: "finance", ariaLabel: "Configure pricing rules and discounts" },

// Admin group addition:
{ name: "Workflow Queue", path: "/workflow-queue", icon: ListOrdered, group: "admin", ariaLabel: "Manage workflow tasks and approvals" },
```

**Safeguards:**

- [ ] Backup current navigation.ts before editing
- [ ] Verify icon imports don't conflict with existing imports
- [ ] Maintain existing array structure and formatting

---

#### Agent B: Command Palette (NAV-014)

**File:** `client/src/components/CommandPalette.tsx`

**Task:** Add 8 navigation commands to the Navigation group.

**Implementation Details:**

```typescript
// Required icon imports to add:
import {
  Trophy,
  Target,
  Sparkles,
  FileQuestion,
  PackageX,
  PackagePlus,
  ListOrdered,
} from "lucide-react";

// Add to Navigation group items array:
{
  id: "leaderboard",
  label: "Leaderboard",
  icon: Trophy,
  action: () => { setLocation("/leaderboard"); onOpenChange(false); },
},
{
  id: "client-needs",
  label: "Client Needs",
  icon: Target,
  action: () => { setLocation("/needs"); onOpenChange(false); },
},
{
  id: "matchmaking",
  label: "Matchmaking",
  icon: Sparkles,
  action: () => { setLocation("/matchmaking"); onOpenChange(false); },
},
{
  id: "quotes",
  label: "Quotes",
  icon: FileQuestion,
  action: () => { setLocation("/quotes"); onOpenChange(false); },
},
{
  id: "returns",
  label: "Returns",
  icon: PackageX,
  action: () => { setLocation("/returns"); onOpenChange(false); },
},
{
  id: "vendor-supply",
  label: "Vendor Supply",
  icon: PackagePlus,
  action: () => { setLocation("/vendor-supply"); onOpenChange(false); },
},
{
  id: "pricing-rules",
  label: "Pricing Rules",
  icon: DollarSign,
  action: () => { setLocation("/pricing/rules"); onOpenChange(false); },
},
{
  id: "workflow-queue",
  label: "Workflow Queue",
  icon: ListOrdered,
  action: () => { setLocation("/workflow-queue"); onOpenChange(false); },
},
```

**Safeguards:**

- [ ] Backup current CommandPalette.tsx before editing
- [ ] Verify no duplicate command IDs
- [ ] Maintain existing component structure

---

### Phase 2: Verification (NAV-015) (~5 minutes)

**Prerequisites:** Phase 1 complete

**Commands:**

```bash
# TypeScript compilation check
pnpm type-check

# Or if type-check script not available:
pnpm exec tsc --noEmit

# Build verification
pnpm build
```

**Success Criteria:**

- [ ] Zero TypeScript errors
- [ ] Build completes successfully
- [ ] No runtime errors in console

**Rollback Trigger:**
If TypeScript errors occur, review the icon imports and fix any type mismatches before proceeding.

---

### Phase 3: QA Verification (NAV-016) (~15 minutes)

**Prerequisites:** Phase 2 complete (build successful)

**QA Checklist:**

#### Sidebar Navigation Verification

| Route           | Nav Item Visible | Click Works | Icon Correct |
| --------------- | ---------------- | ----------- | ------------ |
| /leaderboard    | [ ]              | [ ]         | [ ]          |
| /needs          | [ ]              | [ ]         | [ ]          |
| /matchmaking    | [ ]              | [ ]         | [ ]          |
| /quotes         | [ ]              | [ ]         | [ ]          |
| /returns        | [ ]              | [ ]         | [ ]          |
| /vendor-supply  | [ ]              | [ ]         | [ ]          |
| /pricing/rules  | [ ]              | [ ]         | [ ]          |
| /workflow-queue | [ ]              | [ ]         | [ ]          |

#### Command Palette Verification (Cmd+K / Ctrl+K)

| Command        | Appears in Search | Navigation Works |
| -------------- | ----------------- | ---------------- |
| Leaderboard    | [ ]               | [ ]              |
| Client Needs   | [ ]               | [ ]              |
| Matchmaking    | [ ]               | [ ]              |
| Quotes         | [ ]               | [ ]              |
| Returns        | [ ]               | [ ]              |
| Vendor Supply  | [ ]               | [ ]              |
| Pricing Rules  | [ ]               | [ ]              |
| Workflow Queue | [ ]               | [ ]              |

#### Group Placement Verification

| Group     | Expected Items | Actual Count |
| --------- | -------------- | ------------ |
| Sales     | 13             | [ ]          |
| Inventory | 8              | [ ]          |
| Finance   | 4              | [ ]          |
| Admin     | 7              | [ ]          |

---

## Rollback Protocol

### Immediate Rollback (Build Failure)

If build fails after Phase 1:

```bash
# Restore navigation.ts
git checkout HEAD -- client/src/config/navigation.ts

# Restore CommandPalette.tsx
git checkout HEAD -- client/src/components/CommandPalette.tsx

# Verify restoration
pnpm build
```

### Partial Rollback (Single File Issue)

If only one file has issues:

```bash
# Restore just navigation.ts
git checkout HEAD -- client/src/config/navigation.ts

# Or restore just CommandPalette.tsx
git checkout HEAD -- client/src/components/CommandPalette.tsx
```

### Feature Flag Rollback (Production Issue)

If issues discovered after deployment:

1. Navigate to `/settings/feature-flags`
2. Disable any problematic routes via feature flags
3. Investigate and fix in development

---

## Risk Assessment

| Risk                         | Likelihood | Impact | Mitigation                    |
| ---------------------------- | ---------- | ------ | ----------------------------- |
| Icon import conflicts        | LOW        | LOW    | Verify imports before editing |
| Build failure                | LOW        | MEDIUM | Rollback protocol ready       |
| Route permission issues      | LOW        | LOW    | Routes already have RBAC      |
| Navigation overflow (mobile) | MEDIUM     | LOW    | Test responsive design        |
| Duplicate command IDs        | LOW        | LOW    | Verify ID uniqueness          |

---

## Success Metrics

| Metric                   | Before | After | Verification                |
| ------------------------ | ------ | ----- | --------------------------- |
| Sidebar navigation items | 24     | 32    | Count in navigation.ts      |
| Command Palette items    | 9      | 17    | Count in CommandPalette.tsx |
| Hidden routes            | 14     | 6     | Audit remaining routes      |
| TypeScript errors        | 0      | 0     | `pnpm type-check`           |
| Build status             | PASS   | PASS  | `pnpm build`                |

---

## Post-Execution Tasks

1. **Update Roadmap:**
   - Mark NAV-006 through NAV-016 as complete
   - Update MVP Summary: 196 completed, 0 open
   - Update Overall Summary: MVP 100% complete

2. **Create Commit:**

   ```bash
   git add client/src/config/navigation.ts client/src/components/CommandPalette.tsx
   git commit -m "feat(nav): surface 8 hidden routes in sidebar and command palette

   - Add Leaderboard, Client Needs, Matchmaking, Quotes, Returns to Sales nav
   - Add Vendor Supply to Inventory nav
   - Add Pricing Rules to Finance nav
   - Add Workflow Queue to Admin nav
   - Add all 8 routes to Command Palette (Cmd+K)

   Resolves: NAV-006, NAV-007, NAV-008, NAV-009, NAV-010, NAV-011, NAV-012, NAV-013, NAV-014, NAV-015, NAV-016"
   ```

3. **Push to Branch:**
   ```bash
   git push -u origin claude/review-roadmap-tasks-RsgUw
   ```

---

## Execution Command

To execute this plan with parallel agents:

```
Execute Phase 1 with 2 parallel agents:
- Agent A: Edit navigation.ts (NAV-006 through NAV-013)
- Agent B: Edit CommandPalette.tsx (NAV-014)

After both complete, run verification (NAV-015) and QA (NAV-016).
```

---

**Plan Author:** Claude
**Review Status:** Ready for approval
**Next Step:** User approval to proceed with execution
