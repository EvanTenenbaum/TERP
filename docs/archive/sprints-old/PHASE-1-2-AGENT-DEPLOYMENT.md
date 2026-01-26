# Phase 1 & 2 Agent Deployment Guide

**Date:** November 21, 2025  
**Purpose:** Launch agents in correct order for Phase 1 (Critical) and Phase 2 (High Priority) tasks

---

## 🚀 Quick Start

### Phase 1: Critical (Deploy Immediately - Sequential)

**Agent 1: BUG-002** - Must complete before Phase 2

### Phase 2: High Priority (Deploy in Parallel - After Phase 1)

**Agents 2, 3, 4, 13** - Can run in parallel after BUG-002 completes

---

## 📋 Phase 1: Critical Priority

### Agent 1: BUG-002 - Duplicate Navigation Bar

**Priority:** P0 (CRITICAL - UI BLOCKER)  
**Estimate:** 1-2 hours  
**Status:** Deploy immediately  
**Prompt:** `docs/prompts/BUG-002.md`

**Deployment Command:**

```
Clone https://github.com/EvanTenenbaum/TERP and execute the prompt at docs/prompts/BUG-002.md

Task: Fix duplicate navigation bar appearing on dashboard
- Investigate Dashboard.tsx and DashboardLayout.tsx
- Remove duplicate navigation rendering
- Verify sidebar navigation works correctly
- Test on mobile and desktop

Priority: P0 CRITICAL
Estimate: 1-2 hours
```

**Why First:**

- Blocks user experience immediately
- Quick fix (1-2 hours)
- Unblocks other UI work
- May reveal other navigation issues

**Wait for completion before starting Phase 2**

---

## 📋 Phase 2: High Priority (Parallel Deployment)

**Deploy these agents AFTER Agent 1 (BUG-002) completes**

### Agent 2: DATA-002-AUGMENT - Augment Seeded Data

**Priority:** P1 (HIGH - DATA QUALITY)  
**Estimate:** 6-8 hours  
**Status:** Deploy after BUG-002  
**Prompt:** `docs/prompts/DATA-002-AUGMENT.md`

**Deployment Command:**

```
Clone https://github.com/EvanTenenbaum/TERP and execute the prompt at docs/prompts/DATA-002-AUGMENT.md

Task: Augment seeded data for realistic relationships
- Audit all foreign key relationships
- Ensure orders have realistic line items
- Link inventory movements to real records
- Create financial transaction chains
- Establish client-product patterns
- Add temporal coherence
- Validate referential integrity

Priority: P1
Estimate: 6-8 hours
```

**Why High Priority:**

- Enables realistic testing
- Improves demo quality
- Reveals hidden bugs
- Foundation for other features

**Can run parallel with:** Agent 3, Agent 4, Agent 13

---

### Agent 3: FEATURE-002 - Change Header Color

**Priority:** P2 (MEDIUM - UI Enhancement)  
**Estimate:** 1-2 hours  
**Status:** Deploy after BUG-002  
**Prompt:** `docs/prompts/FEATURE-002.md`

**Deployment Command:**

```
Clone https://github.com/EvanTenenbaum/TERP and execute the prompt at docs/prompts/FEATURE-002.md

Task: Update header background color
- Update AppHeader.tsx background color
- Ensure accessibility (WCAG compliance)
- Verify theme compatibility (light/dark)
- Test responsive design
- Test across all major pages

Priority: P2
Estimate: 1-2 hours
```

**Why Include:**

- Quick win (1-2 hours)
- No dependencies
- Isolated component
- Improves visual consistency

**Can run parallel with:** Agent 2, Agent 4, Agent 13

---

### Agent 4: QA-028 - Fix Old Sidebar Navigation

**Priority:** P1  
**Estimate:** 4-8 hours  
**Status:** Deploy after BUG-002  
**Prompt:** `docs/prompts/QA-028.md`

**Deployment Command:**

```
Clone https://github.com/EvanTenenbaum/TERP and execute the prompt at docs/prompts/QA-028.md

Task: Fix old sidebar navigation appearing on dashboard
- Remove or fix old sidebar navigation
- Focus on mobile responsiveness
- Ensure only correct navigation visible
- Test on mobile devices

Priority: P1
Estimate: 4-8 hours
```

**Why Include:**

- High user impact (mobile experience)
- Related to BUG-002 (navigation issues)
- Quick to complete

**Can run parallel with:** Agent 2, Agent 3, Agent 13

**Note:** Related to BUG-002 but different issue - safe to run after BUG-002 completes

---

### Agent 13: QA-044-MIGRATION - Apply Database Migration

**Priority:** P1 (CRITICAL - Feature Blocked)  
**Estimate:** 1-2 hours  
**Status:** Deploy after BUG-002  
**Prompt:** `docs/prompts/QA-044-MIGRATION.md`

**Deployment Command:**

```
Clone https://github.com/EvanTenenbaum/TERP and execute the prompt at docs/prompts/QA-044-MIGRATION.md

Task: Apply database migration for event invitations
- Code is already deployed but feature doesn't work
- Apply migration: drizzle/0036_add_event_invitations.sql
- Verify 3 tables created
- Test feature functionality
- Run smoke tests

Priority: P1 CRITICAL
Estimate: 1-2 hours
```

**Why Critical:**

- Code is complete but NOT functional
- Database migration must be applied
- Blocks event invitation feature
- Quick fix (1-2 hours)

**Can run parallel with:** Agent 2, Agent 3, Agent 4

**Note:** This is a CRITICAL follow-up - code exists but feature doesn't work without migration

---

## 📊 Deployment Summary

### Execution Order

**Day 1:**

1. ✅ **Agent 1:** BUG-002 (1-2 hours) - MUST COMPLETE FIRST

**Day 1-2 (After Agent 1 completes):** 2. ✅ **Agent 2:** DATA-002-AUGMENT (6-8 hours) - Parallel 3. ✅ **Agent 3:** FEATURE-002 (1-2 hours) - Parallel 4. ✅ **Agent 4:** QA-028 (4-8 hours) - Parallel 5. ✅ **Agent 13:** QA-044-MIGRATION (1-2 hours) - Parallel

### Parallel Execution Groups

**Group 1 (After BUG-002):**

- Agent 2 (DATA-002-AUGMENT) - Seed scripts, no conflicts
- Agent 3 (FEATURE-002) - Isolated component
- Agent 4 (QA-028) - Different navigation issue
- Agent 13 (QA-044-MIGRATION) - Database migration only

**All can run in parallel safely!**

---

## ⚠️ Important Notes

### Dependencies

1. **BUG-002 must complete first** - Blocks other navigation work
2. **All Phase 2 agents can run in parallel** - No conflicts between them
3. **QA-044-MIGRATION is critical** - Feature blocked without it

### Conflict Analysis

**No Conflicts:**

- DATA-002-AUGMENT: Only seed scripts
- FEATURE-002: Isolated AppHeader component
- QA-028: Different navigation issue (mobile sidebar)
- QA-044-MIGRATION: Database migration only

**Safe to Parallel:**

- All Phase 2 agents can run simultaneously
- Maximum 4 agents in parallel (recommended)

### Success Criteria

**Phase 1 Complete:**

- ✅ BUG-002 fixed and deployed

**Phase 2 Complete:**

- ✅ DATA-002-AUGMENT: Data relationships augmented
- ✅ FEATURE-002: Header color updated
- ✅ QA-028: Old sidebar navigation fixed
- ✅ QA-044-MIGRATION: Database migration applied, feature working

---

## 🎯 Monitoring Progress

### Check Agent Status

```bash
# Check active sessions
cat docs/ACTIVE_SESSIONS.md

# Check roadmap status
grep -A 5 "BUG-002\|DATA-002-AUGMENT\|FEATURE-002\|QA-028\|QA-044" docs/roadmaps/MASTER_ROADMAP.md

# Check recent commits
git log --oneline --since="1 day ago" | head -20
```

### Expected Timeline

- **Hour 0-2:** Agent 1 (BUG-002) completes
- **Hour 2-10:** Agents 2, 3, 4, 13 running in parallel
- **Hour 10:** All Phase 1 & 2 tasks complete

---

## 📝 Deployment Checklist

### Before Deployment

- [ ] Read all prompts
- [ ] Verify no active conflicts in ACTIVE_SESSIONS.md
- [ ] Check database access for QA-044-MIGRATION
- [ ] Verify environment setup

### During Deployment

- [ ] Deploy Agent 1 (BUG-002) first
- [ ] Wait for Agent 1 completion
- [ ] Deploy Agents 2, 3, 4, 13 in parallel
- [ ] Monitor progress in ACTIVE_SESSIONS.md

### After Deployment

- [ ] Verify all tasks marked complete in roadmap
- [ ] Check all commits pushed to main
- [ ] Test features in production
- [ ] Archive all session files

---

## 🚨 Troubleshooting

### Agent 1 (BUG-002) Taking Too Long

- Check session file for blockers
- Review commits for progress
- Consider if investigation reveals larger issue

### Phase 2 Agents Have Conflicts

- Check ACTIVE_SESSIONS.md for overlapping modules
- Verify agents are working on different files
- Coordinate if needed

### QA-044-MIGRATION Fails

- Verify database credentials
- Check migration file syntax
- Review database logs
- Consider rollback if needed

---

**Last Updated:** November 21, 2025  
**Next Steps:** After Phase 1 & 2 complete, proceed to Phase 3 (Stabilization)
