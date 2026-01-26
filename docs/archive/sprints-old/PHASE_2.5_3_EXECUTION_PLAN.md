# Phase 2.5 & Phase 3 Execution Plan

**Created:** November 21, 2025  
**Status:** Ready for Execution

---

## 📋 Summary

I've evaluated the roadmap and created the next two phases:

### Phase 2.5: Critical Workflow Fixes (1 Week)

**Objective:** Fix critical bugs that block core revenue and inventory workflows.

**Tasks:**

- BUG-002: Duplicate Navigation Bar (1-2h) - Prompt exists
- BUG-003: Order Creator Connectivity (4-6h) - ✅ Prompt created
- BUG-004: Purchase/Intake Modal Data Loss (6-8h) - Prompt needed
- BUG-005: Returns Workflow Logic Gap (6-8h) - Prompt needed
- BUG-006: Workflow Queue Missing Entry Point (4-6h) - Prompt needed
- BUG-007: Missing Permissions & Safety Checks (2-4h) - Prompt needed
- ST-019: Fix "Happy Path" Only Testing (4-6h) - Prompt needed

**Total:** 27-40 hours (3-5 days with parallel execution)

### Phase 3: Workflow Integration & Completion (1-2 Weeks)

**Objective:** Ensure all workflows are complete end-to-end and properly integrated.

**Tasks:**

- WF-001: End-to-End Order Creation Workflow (4-6h) - Prompt needed
- WF-002: End-to-End Inventory Intake Workflow (6-8h) - Prompt needed
- WF-003: End-to-End Returns Workflow (4-6h) - Prompt needed
- WF-004: Data Integrity Verification (6-8h) - Prompt needed

**Total:** 20-28 hours (2.5-3.5 days with parallel execution)

---

## ✅ Completed

1. ✅ Added Phase 2.5 and Phase 3 to `docs/roadmaps/MASTER_ROADMAP.md`
2. ✅ Updated roadmap version to 2.3
3. ✅ Created BUG-003 prompt (`docs/prompts/BUG-003.md`)
4. ✅ Committed and pushed to main

---

## 📝 Next Steps

### 1. Create Remaining Prompts

The following prompts need to be created (can be done in parallel):

**Phase 2.5 Prompts:**

- `docs/prompts/BUG-004.md` - Purchase/Intake Modal Data Loss
- `docs/prompts/BUG-005.md` - Returns Workflow Logic Gap
- `docs/prompts/BUG-006.md` - Workflow Queue Missing Entry Point
- `docs/prompts/BUG-007.md` - Missing Permissions & Safety Checks
- `docs/prompts/ST-019.md` - Fix "Happy Path" Only Testing

**Phase 3 Prompts:**

- `docs/prompts/WF-001.md` - End-to-End Order Creation Workflow
- `docs/prompts/WF-002.md` - End-to-End Inventory Intake Workflow
- `docs/prompts/WF-003.md` - End-to-End Returns Workflow
- `docs/prompts/WF-004.md` - Data Integrity Verification

**Template:** Use `docs/prompts/BUG-003.md` as a template. Follow the same structure:

- Context section with background and goals
- Phase 1: Pre-Flight Check
- Phase 2: Session Startup
- Phase 3: Development (with specific implementation steps)
- Phase 4: Completion
- Quick Reference
- Troubleshooting

### 2. Execute Agents Using Swarm Manager

Once prompts are created, use the swarm manager to execute:

```bash
# Check current status
npm run swarm status

# Execute recommended tasks (auto-selects based on priority and conflicts)
npm run swarm execute --auto

# Or execute specific tasks
npm run swarm execute --batch=BUG-002,BUG-003,BUG-004
```

**Execution Strategy:**

1. **First Batch (Parallel - 3-4 agents):**
   - BUG-002 (1-2h) - Quick win
   - BUG-003 (4-6h) - Critical blocker
   - BUG-007 (2-4h) - Quick win
   - ST-019 (4-6h) - Can run in parallel

2. **Second Batch (After first batch completes):**
   - BUG-004 (6-8h) - Data loss critical
   - BUG-005 (6-8h) - Workflow blocker
   - BUG-006 (4-6h) - Workflow blocker

3. **Third Batch (Phase 3 - After Phase 2.5 complete):**
   - WF-001 (4-6h) - Depends on BUG-003
   - WF-002 (6-8h) - Depends on BUG-004, BUG-006
   - WF-003 (4-6h) - Depends on BUG-005
   - WF-004 (6-8h) - Depends on all workflow fixes

---

## 🎯 Priority Order

**Immediate (P0 - Critical Blockers):**

1. BUG-002: Duplicate Navigation (1-2h) - UI blocker
2. BUG-003: Order Creator Connectivity (4-6h) - Revenue blocker
3. BUG-004: Purchase Modal Data Loss (6-8h) - Data loss
4. BUG-005: Returns Workflow (6-8h) - Workflow blocker
5. BUG-006: Workflow Queue Entry (4-6h) - Workflow blocker
6. BUG-007: Safety Checks (2-4h) - Safety issue

**High Priority (P1):** 7. ST-019: Happy Path Testing (4-6h) - Data quality 8. WF-001: Order Workflow (4-6h) - Integration 9. WF-002: Intake Workflow (6-8h) - Integration 10. WF-003: Returns Workflow (4-6h) - Integration 11. WF-004: Data Integrity (6-8h) - Quality

---

## 📊 Expected Outcomes

**Phase 2.5 Completion:**

- ✅ All critical workflow bugs fixed
- ✅ Order creation fully functional
- ✅ Inventory intake saves media files
- ✅ Returns workflow usable by end users
- ✅ Workflow queue can accept new items
- ✅ Professional confirmation dialogs
- ✅ Edge cases handled properly

**Phase 3 Completion:**

- ✅ End-to-end workflows verified
- ✅ Data integrity maintained
- ✅ All workflows tested and documented
- ✅ System ready for production use

---

## 🔗 Related Files

- Roadmap: `docs/roadmaps/MASTER_ROADMAP.md`
- Swarm Manager: `scripts/manager.ts`
- Prompt Template: `docs/prompts/BUG-003.md`
- Session Template: `docs/templates/SESSION_TEMPLATE.md`

---

**Last Updated:** November 21, 2025
