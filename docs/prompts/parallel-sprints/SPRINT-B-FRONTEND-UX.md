# 🟢 Sprint B: Frontend UX & UI Components

---

## Agent Identity & Context

You are an AI agent working on TERP, a cannabis ERP system. Your prime directive: **Leave the code better than you found it.**

You are assigned to execute **Sprint B** of the TERP ERP parallel sprint plan. This sprint focuses on Frontend UX and UI Components. You will work in parallel with two other agents (Sprint C and Sprint D) who are working on different file domains.

---

## Before ANY Work

1. Read `UNIVERSAL_AGENT_RULES.md` for complete protocols
2. Pull latest: `git pull origin main`
3. Check active sessions: `cat docs/ACTIVE_SESSIONS.md`
4. Check roadmap: `cat docs/roadmaps/MASTER_ROADMAP.md`
5. Register your session (mandatory)
6. **Verify Sprint A is complete** - Schema must be stable

---

## Critical Rules (NEVER BREAK)

- ❌ **NO `any` types** - Use proper TypeScript types always
- ❌ **NO skipping tests** - TDD is mandatory (write tests BEFORE code)
- ❌ **NO editing files another agent is working on** - Check ACTIVE_SESSIONS.md
- ❌ **NO editing files outside your Sprint B domain** - See File Ownership below
- ❌ **NO marking tasks complete without deployment verification**
- ❌ **NO committing without validation** - Run `pnpm typecheck && pnpm lint && pnpm test`

---

## Session Registration (MANDATORY)

Before starting work:
```bash
SESSION_ID="Session-$(date +%Y%m%d)-SPRINT-B-$(openssl rand -hex 3)"
# Create docs/sessions/active/$SESSION_ID.md
# Add to docs/ACTIVE_SESSIONS.md
# Commit and push IMMEDIATELY
```

---

## Development Standards

### TypeScript
- Explicit return types on all functions
- Use type guards, not assertions
- Handle null/undefined explicitly

### React
- Use `React.memo` for reusable components
- Use `useCallback` for event handlers
- Use `useMemo` for expensive computations

### Testing
- Write tests BEFORE implementation (TDD)
- 80%+ coverage for business logic
- Test behavior, not implementation

### Database
- snake_case for tables/columns
- Index ALL foreign keys
- Use soft deletes (`is_deleted`)

---

## Git Workflow

```bash
git pull origin main                         # Always pull first
git checkout -b sprint-b/frontend-ux         # Your sprint branch
git commit -m "feat(scope): description"     # Conventional commits
git push origin sprint-b/frontend-ux         # Push after each phase
```

---

## Deployment

**Platform**: DigitalOcean App Platform
**URL**: https://terp-app-b9s35.ondigitalocean.app

```bash
git push origin main                         # Triggers deployment (after merge)
bash scripts/watch-deploy.sh                 # Monitor
curl https://terp-app-b9s35.ondigitalocean.app/health  # Verify
```

---

## Pre-Commit Checklist

- [ ] `pnpm typecheck` - No errors
- [ ] `pnpm lint` - No errors
- [ ] `pnpm test` - All pass
- [ ] `pnpm roadmap:validate` - If roadmap changed
- [ ] `git pull origin main` - Latest code
- [ ] Session file updated
- [ ] No conflicts with active sessions
- [ ] No files modified outside Sprint B domain

---

## Essential Commands

```bash
pnpm roadmap:validate          # Validate roadmap
pnpm roadmap:capacity          # Check capacity
pnpm test                      # Run tests
pnpm typecheck                 # Check types
pnpm lint                      # Check linting
pnpm generate                  # Regenerate types after schema changes
bash scripts/watch-deploy.sh   # Monitor deployment
```

---

## Essential Files

- `docs/roadmaps/MASTER_ROADMAP.md` - Task tracking
- `docs/roadmaps/PARALLEL_SPRINT_PLAN.md` - Sprint coordination
- `docs/ACTIVE_SESSIONS.md` - Who's working on what
- `UNIVERSAL_AGENT_RULES.md` - Complete protocols
- `docs/specs/ux-improvements/` - UX specifications for this sprint

---

## When Stuck

1. Read `UNIVERSAL_AGENT_RULES.md`
2. Check existing code for patterns
3. Search: `grep -r "pattern" src/`
4. Check spec files in `docs/specs/ux-improvements/`
5. Ask user for clarification

---

**Follow these rules precisely. Your work affects other agents and production.**

**#Terp-Dev #Sprint-B**

---
---

## 🚨 SPRINT B SPECIFIC INSTRUCTIONS

### Prerequisites
1. **Sprint A must be complete** - Verify schema is stable before starting
2. **Pull latest code** - `git pull origin main` to get Sprint A changes
3. **Regenerate types** - `pnpm generate` to update TypeScript types
4. **Create your branch** - `git checkout -b sprint-b/frontend-ux`

### File Ownership Rules (STRICTLY ENFORCED)
You have **EXCLUSIVE WRITE ACCESS** to these files only:
```
client/src/components/ui/
client/src/components/dashboard/
client/src/components/layout/AppSidebar.tsx
client/src/components/layout/DashboardLayout.tsx
client/src/pages/DashboardPage.tsx
client/src/pages/Orders.tsx
client/src/pages/ClientsListPage.tsx
client/src/pages/Inventory.tsx
client/src/pages/TodoListsPage.tsx
client/src/pages/Analytics.tsx
client/src/pages/Leaderboard.tsx
client/src/contexts/
client/src/hooks/
```

**DO NOT MODIFY** any files outside this list. Other agents are working on:
- Sprint C owns: `client/src/pages/accounting/`, `client/src/pages/vip-portal/`, `client/src/pages/ClientProfilePage.tsx`
- Sprint D owns: `client/src/pages/SalesSheetCreatorPage.tsx`, `client/src/pages/LocationsPage.tsx`, `client/src/pages/PickPackPage.tsx`

---

## 📋 Sprint Tasks

### Phase 1: Stabilize the Core (CRITICAL) - 18h

#### STAB-001: Fix Broken Modules (8h)
**Spec:** `docs/specs/ux-improvements/STAB-001-SPEC.md`

**Problem:** 5 modules have critical issues (Tasks, Fulfillment, Procurement, Accounting sidebar, Sales Portal)

**Deliverables:**
- [ ] Tasks page loads without errors
- [ ] Fulfillment page displays data correctly
- [ ] Procurement page is accessible
- [ ] Accounting sidebar navigation works
- [ ] Sales Portal renders properly

**🔴 REDHAT QA GATE 1.1:**
```
Before marking STAB-001 complete:
□ Navigate to each of the 5 modules in browser
□ Verify no console errors
□ Verify no infinite loading states
□ Verify data displays correctly
□ Screenshot each working module
□ Document any issues found
```

#### STAB-002: Fix Data Integrity Display Issues (6h)
**Spec:** `docs/specs/ux-improvements/STAB-002-SPEC.md`

**Problem:** Orders KPI mismatch, profit calculation errors, floating point display issues

**Deliverables:**
- [ ] Orders KPI cards match table data
- [ ] Profit calculations return accurate values
- [ ] No floating point display errors (e.g., $10.000000001)

**🔴 REDHAT QA GATE 1.2:**
```
Before marking STAB-002 complete:
□ Compare KPI card totals to table row counts
□ Verify profit calculation with manual check
□ Search for any floating point artifacts in UI
□ Test with various data sets
□ Document calculation logic
```

#### STAB-003: Fix UI Bugs (4h)
**Spec:** `docs/specs/ux-improvements/STAB-003-SPEC.md`

**Problem:** Duplicate navigation, non-functional KPI cards, inconsistent empty states

**Deliverables:**
- [ ] Single navigation bar (no duplicates)
- [ ] All KPI cards are functional
- [ ] Empty states are consistent

**🔴 REDHAT QA GATE 1.3 (PHASE 1 COMPLETE):**
```
Before proceeding to Phase 2:
□ All 27 navigation items lead to functional pages
□ Zero 404 errors
□ Zero infinite loading states
□ All Phase 1 deliverables verified
□ Run: pnpm typecheck && pnpm lint && pnpm test (all pass)
□ Run: pnpm build (no TypeScript errors)
□ Commit with message: "feat(sprint-b): Phase 1 - Stabilize Core [REDHAT QA PASSED]"
□ Push to sprint-b/frontend-ux branch
```

---

### Phase 2: Universal Actionability (HIGH) - 28h

#### ACT-001: Make KPI Cards Actionable (8h)
**Spec:** `docs/specs/ux-improvements/ACT-001-SPEC.md`

**Problem:** KPI cards are display-only, clicking does nothing

**Deliverables:**
- [ ] Clicking KPI card filters corresponding table
- [ ] URL state reflects filter (shareable links)
- [ ] Visual feedback on hover/click
- [ ] Active state indicator

**🔴 REDHAT QA GATE 2.1:**
```
Before marking ACT-001 complete:
□ Test each KPI card click behavior
□ Verify URL updates with filter params
□ Verify table filters correctly
□ Test browser back/forward navigation
□ Test direct URL access with params
□ Verify hover states work
```

#### ACT-002: Make Data Tables Actionable (12h)
**Spec:** `docs/specs/ux-improvements/ACT-002-SPEC.md`

**Problem:** Table rows not clickable, no bulk actions, cells not interactive

**Deliverables:**
- [ ] Row click navigates to detail view
- [ ] Checkbox selection for bulk actions
- [ ] Bulk action menu (delete, export, status change)
- [ ] Email/phone cells are clickable links
- [ ] Action menu on each row

**🔴 REDHAT QA GATE 2.2:**
```
Before marking ACT-002 complete:
□ Test row click on Orders, Clients, Inventory tables
□ Test checkbox selection (single, all, range)
□ Test each bulk action
□ Verify email links open mailto:
□ Verify phone links open tel:
□ Test action menu items
□ Verify no conflicts with row click
```

#### ACT-003: Make Widgets Actionable (8h)
**Spec:** `docs/specs/ux-improvements/ACT-003-SPEC.md`

**Problem:** Dashboard widgets are display-only

**Deliverables:**
- [ ] Widget rows are clickable
- [ ] Chart segments drill down to filtered view
- [ ] Values link to relevant pages

**🔴 REDHAT QA GATE 2.3 (PHASE 2 COMPLETE):**
```
Before proceeding to Phase 3:
□ All KPI cards interactive
□ All table rows clickable
□ All widgets actionable
□ Run: pnpm typecheck && pnpm lint && pnpm test (all pass)
□ Run: pnpm build (no TypeScript errors)
□ Manual E2E test of critical paths
□ Commit with message: "feat(sprint-b): Phase 2 - Universal Actionability [REDHAT QA PASSED]"
□ Push to sprint-b/frontend-ux branch
```

---

### Phase 3: Enhance and Refine (MEDIUM) - 20h

#### ENH-001: Implement Collapsible Navigation (10h)
**Spec:** `docs/specs/ux-improvements/ENH-001-SPEC.md`

**Problem:** Flat navigation with 27+ items is overwhelming

**Deliverables:**
- [ ] Navigation grouped into 7 sections (Core, Sales, Fulfillment, Inventory, Finance, Insights, System)
- [ ] Sections collapsible/expandable
- [ ] Pinned items feature
- [ ] State persisted to localStorage

**🔴 REDHAT QA GATE 3.1:**
```
Before marking ENH-001 complete:
□ Verify all 7 groups exist
□ Test collapse/expand behavior
□ Test pin/unpin functionality
□ Verify state persists across page refresh
□ Verify state persists across sessions
□ Test keyboard navigation
```

#### ENH-002: Improve Empty States (6h)
**Spec:** `docs/specs/ux-improvements/ENH-002-SPEC.md`

**Problem:** Empty pages show blank space without guidance

**Deliverables:**
- [ ] All empty states have icon
- [ ] All empty states have title
- [ ] All empty states have description
- [ ] All empty states have primary CTA

**🔴 REDHAT QA GATE 3.2:**
```
Before marking ENH-002 complete:
□ Audit all pages for empty states
□ Verify each empty state has all 4 elements
□ Test CTA buttons work correctly
□ Verify consistent styling
```

#### ENH-003: Consolidate Duplicate Pages (4h)
**Spec:** `docs/specs/ux-improvements/ENH-003-SPEC.md`

**Problem:** Duplicate pages cause confusion (Locations, Pricing)

**Deliverables:**
- [ ] `/locations` redirects to `/settings?tab=locations`
- [ ] `/pricing` shows tabbed interface with Rules and Profiles

**🔴 REDHAT QA GATE 3.3 (PHASE 3 COMPLETE):**
```
Before marking sprint complete:
□ All Phase 3 deliverables verified
□ Run: pnpm typecheck && pnpm lint && pnpm test (all pass)
□ Run: pnpm build (no TypeScript errors)
□ Full manual regression test
□ No regressions from Phase 1 or 2
□ Commit with message: "feat(sprint-b): Phase 3 - Enhance & Refine [REDHAT QA PASSED]"
□ Push to sprint-b/frontend-ux branch
```

---

## 🔴 FINAL REDHAT QA GATE (SPRINT COMPLETE)

Before submitting your branch for merge:

### Code Quality
- [ ] `pnpm typecheck` - No errors
- [ ] `pnpm lint` - No errors
- [ ] `pnpm test` - All tests pass
- [ ] `pnpm build` - Zero TypeScript errors
- [ ] No `console.log` statements left in code
- [ ] No commented-out code blocks
- [ ] All new components have proper TypeScript types
- [ ] No `any` types introduced

### Functional Verification
- [ ] All 27 navigation items functional
- [ ] All KPI cards interactive
- [ ] All table rows clickable
- [ ] All widgets actionable
- [ ] All empty states implemented
- [ ] Navigation groups working
- [ ] No regressions in existing functionality

### Documentation
- [ ] Update task status in MASTER_ROADMAP.md
- [ ] Document any deviations from spec
- [ ] Note any technical debt created
- [ ] Update session file

### Git Hygiene
- [ ] All commits have descriptive messages (conventional commits)
- [ ] No merge conflicts with main
- [ ] Branch is rebased on latest main

### Final Commit
```bash
git add .
git commit -m "feat(sprint-b): Complete - Frontend UX & UI Components [REDHAT QA PASSED]

Phase 1: Stabilize Core (STAB-001, STAB-002, STAB-003)
Phase 2: Universal Actionability (ACT-001, ACT-002, ACT-003)
Phase 3: Enhance & Refine (ENH-001, ENH-002, ENH-003)

All Redhat QA gates passed.
Ready for integration."

git push origin sprint-b/frontend-ux
```

---

## Completing Work

1. Archive session: `mv docs/sessions/active/$SESSION_ID.md docs/sessions/completed/`
2. Remove from `docs/ACTIVE_SESSIONS.md`
3. Update `docs/roadmaps/MASTER_ROADMAP.md` - Mark Sprint B tasks as `complete`
4. Run `pnpm roadmap:validate`
5. Commit and push
6. Create Pull Request to main
7. Verify deployment succeeded after merge

---

## 🚫 ROLLBACK PROCEDURES

If you introduce a regression or break existing functionality:

### Level 1: Revert Last Commit
```bash
git revert HEAD
```

### Level 2: Revert to Phase Checkpoint
```bash
git log --oneline  # Find checkpoint commit
git revert <commit_hash>..HEAD
```

### Level 3: Abandon Branch
```bash
git checkout main
git branch -D sprint-b/frontend-ux
git checkout -b sprint-b/frontend-ux  # Start fresh
```

---

## 📞 ESCALATION

If you encounter:
- **File conflicts with other sprints** → STOP and report immediately
- **Schema/type errors after Sprint A** → Run `pnpm generate` and retry
- **Blocking bugs in Sprint A code** → Document and escalate
- **Unclear requirements** → Check spec files first, then escalate

---

## ⏱️ TIME ESTIMATES

| Phase | Tasks | Estimate | Checkpoint |
|-------|-------|----------|------------|
| Phase 1 | STAB-001, STAB-002, STAB-003 | 18h | QA Gate 1.3 |
| Phase 2 | ACT-001, ACT-002, ACT-003 | 28h | QA Gate 2.3 |
| Phase 3 | ENH-001, ENH-002, ENH-003 | 20h | QA Gate 3.3 |
| **Total** | | **66h** | Final QA Gate |

---

## 🎯 SUCCESS CRITERIA

Sprint B is successful when:
1. All 9 tasks completed and verified
2. All Redhat QA gates passed
3. Zero regressions in existing functionality
4. Branch ready for merge (no conflicts)
5. Documentation updated
6. Session properly closed

**DO NOT submit your branch until ALL criteria are met.**
