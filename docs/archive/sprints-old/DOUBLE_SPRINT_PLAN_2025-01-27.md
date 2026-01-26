# TERP Double Sprint Plan

## Strategic Roadmap Execution with Dependency-Based Phasing

**Created:** 2025-01-27  
**Project:** TERP (Cannabis ERP System)  
**Roadmap Manager:** PM Agent  
**Version:** 1.0  
**Status:** 🚀 READY FOR EXECUTION

---

## 📋 Executive Summary

**Sprint Duration:** 2 weeks (14 days)  
**Total Tasks:** ~60 tasks across security, data integrity, workflows, and infrastructure  
**Strategic Focus:** Eliminate P0 blockers, prove end-to-end workflows, establish production reliability  
**Execution Method:** Phased approach with strategic parallelization (max 4 agents)

### Key Objectives

1. **Sprint A (Week 1):** Secure foundations — eliminate all P0 security/data integrity vulnerabilities
2. **Sprint B (Week 2):** Workflow proof — validate end-to-end business operations with realistic data

---

## 🎯 Sprint A: Secure Foundations (Week 1)

**Goal:** Eliminate all P0 security, data integrity, and reliability blockers to enable safe workflow verification

### Wave 0: Governance & Preparation (Day 1, Hours 0-2)

**Objective:** Ensure roadmap accuracy and infrastructure readiness

**Tasks:**

1. **ROADMAP-001 Status Check**
   - ✅ Verify consolidated roadmap update processing complete
   - Verify all 35 new tasks added (if not, complete ROADMAP-001)
   - Run roadmap validation
   - Check capacity for parallel execution

2. **INFRA-012 Completion Check**
   - Verify TERP Commander Slack bot deployment status
   - Complete any remaining deployment tasks
   - Test Slack bot commands (status, execute)

**Agents:** 1 (Governance/PM agent)  
**Dependencies:** None  
**Blockers:** None  
**Deliverables:**

- [ ] Roadmap validated and accurate
- [ ] Capacity analysis complete
- [ ] Slack bot operational (if not already)

---

### Wave 1: Authentication & Access Control (Day 1-2, Sequential)

**Objective:** Fix critical permission and authentication vulnerabilities

**Tasks:**

1. **SEC-001: Fix Permission System Bypass** 🔴 P0
   - **Module:** `server/_core/permissionMiddleware.ts`
   - **Estimate:** 2 days (16 hours)
   - **Dependencies:** None
   - **Blockers:** None
   - **Prompt:** `docs/prompts/SEC-001.md` (to be created)

2. **SEC-002: Require JWT_SECRET Environment Variable** 🔴 P0
   - **Module:** `server/_core/simpleAuth.ts`
   - **Estimate:** 2 hours
   - **Dependencies:** None
   - **Blockers:** None
   - **Prompt:** `docs/prompts/SEC-002.md` (to be created)

**Agents:** 1 (Sequential execution - touches shared auth core)  
**Rationale:** Sequential to avoid merge conflicts in auth middleware  
**Deliverables:**

- [ ] Permission bypass removed
- [ ] All protected procedures require authentication
- [ ] JWT_SECRET required at startup
- [ ] All tests passing
- [ ] Zero TypeScript errors

---

### Wave 2: Admin Hardening & Debug Removal (Day 2-3, Parallel)

**Objective:** Remove hardcoded credentials and debug code from production

**Tasks:**

1. **SEC-003: Remove Hardcoded Admin Credentials** 🔴 P0
   - **Module:** `server/_core/index.ts`
   - **Estimate:** 1 day (8 hours)
   - **Dependencies:** None
   - **Blockers:** None
   - **Prompt:** `docs/prompts/SEC-003.md` (to be created)

2. **SEC-004: Remove Debug Code from Production** 🔴 P0
   - **Module:** Multiple files (Orders.tsx, mobile components)
   - **Estimate:** 1 day (8 hours)
   - **Dependencies:** None
   - **Also fixes:** BUG-011 (desktop), BUG-M002 (mobile)
   - **Prompt:** `docs/prompts/SEC-004.md` (to be created)

**Agents:** 2 (Parallel execution)  
**Rationale:** Different modules, no conflicts  
**Coordination:** Ensure ESLint rules added once (in SEC-004)  
**Deliverables:**

- [ ] Hardcoded admin creation removed
- [ ] Environment variables for initial admin setup
- [ ] Debug dashboard removed (desktop + mobile)
- [ ] All console.log replaced with structured logging
- [ ] ESLint no-console rule added
- [ ] All tests passing

---

### Wave 3: Data Integrity Foundation (Day 3-5, Sequential)

**Objective:** Implement transaction safety and locking mechanisms

**Tasks:**

1. **DATA-006: Fix Transaction Implementation** 🔴 P0
   - **Module:** `server/_core/dbTransaction.ts`
   - **Estimate:** 2 days (16 hours)
   - **Dependencies:** None
   - **Blockers:** None
   - **Prompt:** `docs/prompts/DATA-006.md` (to be created)

2. **DATA-003: Add Row-Level Locking to Order Creation** 🔴 P0
   - **Module:** `server/ordersDb.ts`
   - **Estimate:** 3 days (24 hours)
   - **Dependencies:** DATA-006 (transaction support needed first)
   - **Blockers:** DATA-006
   - **Prompt:** `docs/prompts/DATA-003.md` (to be created)

**Agents:** 1 (Sequential - DATA-003 depends on DATA-006)  
**Rationale:** Transaction abstraction must be stable before adding locking  
**Deliverables:**

- [ ] Real transaction support implemented
- [ ] Proper rollback on errors
- [ ] Row-level locking (FOR UPDATE) in order creation
- [ ] Race condition tests passing
- [ ] No negative inventory possible

---

### Wave 4: Production Reliability (Day 4-5, Parallel)

**Objective:** Deploy redundancy and automated backups

**Tasks:**

1. **REL-001: Deploy Multiple Instances** 🔴 P0
   - **Module:** `.do/app.yaml`
   - **Estimate:** 4 hours
   - **Dependencies:** None
   - **Blockers:** None
   - **Prompt:** `docs/prompts/REL-001.md` (to be created)

2. **REL-002: Implement Automated Database Backups** 🔴 P0
   - **Module:** `scripts/backup-database.sh`
   - **Estimate:** 1 day (8 hours)
   - **Dependencies:** None
   - **Blockers:** None
   - **Prompt:** `docs/prompts/REL-002.md` (to be created)

3. **INFRA-011: Update Deployment Configuration** 🔴 P0
   - **Module:** `.do/app.yaml`, `server/_core/healthCheck.ts`
   - **Estimate:** 2-3 hours
   - **Dependencies:** REL-001 (health checks needed for multiple instances)
   - **Blockers:** None
   - **Prompt:** `docs/prompts/INFRA-011.md` (to be created)

**Agents:** 2 (REL-001 + INFRA-011 together after completion, REL-002 parallel)  
**Rationale:** REL-001 and INFRA-011 coordinate on DigitalOcean config  
**Deployment:** Must coordinate with `doctl apps update` commands  
**Deliverables:**

- [ ] Instance count increased to 2+
- [ ] Load balancer health checks configured
- [ ] Automated daily backups scheduled
- [ ] Backup verification and S3 storage configured
- [ ] Health endpoints optimized
- [ ] Deployment tested and verified

---

### Wave 5: Critical UI Safety Blockers (Day 5-6, Parallel)

**Objective:** Fix workflow-blocking UI issues

**Tasks:**

1. **BUG-007: Missing Permissions & Safety Checks** 🔴 P0
   - **Module:** Multiple components (window.confirm replacements)
   - **Estimate:** 2-4 hours
   - **Dependencies:** None
   - **Blockers:** None
   - **Prompt:** `docs/prompts/BUG-007.md`

2. **BUG-010: Global Search Bar Returns 404 Error** 🔴 HIGH
   - **Module:** Search functionality
   - **Estimate:** 2-4 hours
   - **Dependencies:** None
   - **Blockers:** None
   - **Prompt:** `docs/prompts/BUG-010.md` (to be created)

3. **BUG-012: Add Item Button Not Responding on Create Order Page** 🔴 CRITICAL
   - **Module:** `client/src/pages/OrderCreatorPage.tsx`
   - **Estimate:** 2-4 hours
   - **Dependencies:** BUG-003 (already complete)
   - **Blockers:** None
   - **Prompt:** `docs/prompts/BUG-012.md` (to be created)

**Agents:** 2-3 (Parallel execution where no file conflicts)  
**Deliverables:**

- [ ] Proper dialogs replace window.confirm
- [ ] Cart clearing requires confirmation
- [ ] Global search functional
- [ ] Add item button working
- [ ] All UI tests passing

---

### Wave 6: Smoke Validation (Day 6, Sequential)

**Objective:** Verify no regressions from security fixes

**Tasks:**

1. **Run ST-016 Smoke Test Script**
   - Execute comprehensive smoke tests
   - Verify all critical paths still functional
   - Check for TypeScript errors

2. **Targeted E2E Tests**
   - Authentication flow
   - Permission checks
   - Order creation basics
   - Inventory access

**Agents:** 1  
**Deliverables:**

- [ ] Smoke tests passing
- [ ] E2E tests passing
- [ ] No regressions detected
- [ ] Production deployment verified

---

## 🎯 Sprint B: Workflow Proof & Data Realism (Week 2)

**Goal:** Prove all core business workflows function end-to-end with realistic data

### Wave 7: Data Realism Foundation (Day 7-8, Sequential)

**Objective:** Create realistic seed data with proper relationships

**Tasks:**

1. **DATA-002-AUGMENT: Augment Seeded Data for Realistic Relationships** 🟡 HIGH
   - **Module:** `scripts/seed-realistic-main.ts`
   - **Estimate:** 6-8 hours
   - **Dependencies:** DATA-003, DATA-006 (data integrity foundation)
   - **Blockers:** DATA-003, DATA-006
   - **Prompt:** `docs/prompts/DATA-002-AUGMENT.md` (to be created)

**Agents:** 1  
**Rationale:** Foundation for all workflow testing  
**Deliverables:**

- [ ] All foreign key relationships validated
- [ ] Orders have realistic line items
- [ ] Inventory movements linked to records
- [ ] Financial transactions form complete chains
- [ ] Temporal coherence (dates make sense)
- [ ] Validation test suite created

---

### Wave 8: Order & Inventory Workflow Verification (Day 8-10, Strategic Parallel)

**Objective:** Verify order creation and inventory intake workflows

**Tasks:**

1. **WF-001: End-to-End Order Creation Workflow** 🔴 HIGH
   - **Module:** Order creation flow
   - **Estimate:** 4-6 hours
   - **Dependencies:** BUG-003 (complete), DATA-002-AUGMENT
   - **Blockers:** DATA-002-AUGMENT
   - **Prompt:** `docs/prompts/WF-001.md`

2. **WF-002: End-to-End Inventory Intake Workflow** 🔴 HIGH
   - **Module:** Inventory intake flow
   - **Estimate:** 6-8 hours
   - **Dependencies:** BUG-004 (complete), BUG-006 (complete), DATA-002-AUGMENT
   - **Blockers:** DATA-002-AUGMENT
   - **Prompt:** `docs/prompts/WF-002.md`

3. **BUG-013: Inventory Table Not Displaying Data** 🔴 CRITICAL
   - **Module:** Inventory table components
   - **Estimate:** 2-4 hours
   - **Dependencies:** None
   - **Blockers:** None
   - **Prompt:** `docs/prompts/BUG-013.md` (to be created)

**Agents:** 2-3 (Strategic coordination)  
**Rationale:**

- Day 8: WF-001 + BUG-013 (inventory) on same agent (shared files)
- Day 9: WF-002 after WF-001 merged (uses order data)
- Coordinate branch merges to avoid conflicts

**Deliverables:**

- [ ] Order creation verified end-to-end
- [ ] Customer selection works
- [ ] Credit limit checks prevent invalid orders
- [ ] Order totals calculate correctly
- [ ] Inventory intake verified end-to-end
- [ ] Media files saved and linked
- [ ] Batches appear in workflow queue
- [ ] Inventory table displays data correctly

---

### Wave 9: Returns & Data Integrity (Day 10-11, Parallel)

**Objective:** Verify returns workflow and overall data integrity

**Tasks:**

1. **WF-003: End-to-End Returns Workflow** 🔴 HIGH
   - **Module:** Returns flow
   - **Estimate:** 4-6 hours
   - **Dependencies:** BUG-005 (complete), WF-001 (order data available)
   - **Blockers:** WF-001
   - **Prompt:** `docs/prompts/WF-003.md`

2. **WF-004: Data Integrity Verification** 🟡 MEDIUM
   - **Module:** Data integrity tests
   - **Estimate:** 6-8 hours
   - **Dependencies:** ST-019 (complete), All workflow fixes
   - **Blockers:** WF-001, WF-002, WF-003
   - **Prompt:** `docs/prompts/WF-004.md`

**Agents:** 2 (Parallel execution)  
**Rationale:** Different domains, WF-004 can start once WF-001/2/3 provide test data  
**Deliverables:**

- [ ] Returns workflow verified end-to-end
- [ ] Order lookup and item selection works
- [ ] Inventory restocking logic verified
- [ ] Batch status transitions correct
- [ ] Data integrity test suite created
- [ ] Foreign key relationships verified
- [ ] Financial calculations accurate
- [ ] Audit trails complete
- [ ] Soft deletes working

---

### Wave 10: Optimistic Locking (Day 11-13, Sequential)

**Objective:** Implement optimistic locking for concurrent updates

**Tasks:**

1. **DATA-005: Implement Optimistic Locking** 🔴 P0
   - **Module:** Multiple files (orders, batches, clients, invoices)
   - **Estimate:** 4 days (32 hours)
   - **Dependencies:** Database migration, DATA-006 (transaction support)
   - **Blockers:** DATA-006
   - **Prompt:** `docs/prompts/DATA-005.md` (to be created)

**Agents:** 1  
**Rationale:** Large task, touches many files, sequential to avoid conflicts  
**Deliverables:**

- [ ] Migration to add version columns
- [ ] Version checking in all update operations
- [ ] Version returned with reads
- [ ] Frontend version tracking
- [ ] Conflict error handling
- [ ] All tests passing

---

### Wave 11: Monitoring & Refactoring Follow-ups (Day 13-14, Parallel)

**Objective:** Complete quality improvements and monitoring setup

**Tasks:**

1. **QUAL-001: Standardize Error Handling** 🟡 P1
   - **Module:** Multiple files
   - **Estimate:** 3 days (24 hours)
   - **Dependencies:** None
   - **Blockers:** None
   - **Prompt:** `docs/prompts/QUAL-001.md` (to be created)

2. **RF-003: Systematically Fix `any` Types** 🟡 P1 (IN PROGRESS)
   - **Module:** Top 10 files with most `any` types
   - **Estimate:** 1-2 days
   - **Dependencies:** None
   - **Blockers:** None
   - **Status:** Continue existing work

**Agents:** 2 (Parallel execution)  
**Rationale:** Different file sets, no conflicts  
**Deliverables:**

- [ ] All console.error replaced with structured logger
- [ ] TRPCError used for all API errors
- [ ] Top 10 files have proper types
- [ ] All tests passing

---

### Wave 12: Final Deployment Verification (Day 14, Sequential)

**Objective:** Comprehensive production verification

**Tasks:**

1. **Production Smoke Tests**
   - All critical paths tested in production
   - Screenshot evidence captured
   - API endpoints verified

2. **Documentation Updates**
   - Sprint completion report
   - Updated roadmap statuses
   - Deployment verification report

**Agents:** 1  
**Deliverables:**

- [ ] All workflows verified in production
- [ ] Screenshot evidence captured
- [ ] Deployment verification report created
- [ ] Roadmap updated with completion statuses
- [ ] Sprint completion report created

---

## 📊 Capacity & Parallelization Strategy

### Maximum Concurrent Agents: 4

**Safety Rules:**

- No more than 2 agents working on same module simultaneously
- Sequential execution for tasks with file conflicts
- Daily capacity check: `npm run roadmap:capacity` (when available)
- Branch coordination: Merge immediately after completion

### Daily Execution Pattern

**Morning (Hours 0-4):**

- Deploy agents for highest priority tasks
- Coordinate merges from previous day

**Afternoon (Hours 4-8):**

- Continue execution
- Run smoke tests on completed work
- Update roadmap statuses

**Evening (Hours 8-12):**

- Final merges for the day
- Status updates
- Next day planning

---

## 🔄 Dependency Graph

```
ROADMAP-001 → [All tasks] (governance foundation)

SEC-001, SEC-002 (parallel)
    ↓
SEC-003, SEC-004 (parallel)
    ↓
DATA-006 → DATA-003 → DATA-005
    ↓
REL-001 → INFRA-011
REL-002 (parallel)

BUG-007, BUG-010, BUG-012 (parallel)

DATA-002-AUGMENT (requires DATA-003, DATA-006)
    ↓
WF-001, WF-002 (coordinate merges)
    ↓
WF-003, WF-004 (parallel)

QUAL-001, RF-003 (parallel, throughout)
```

---

## ✅ Success Criteria

### Sprint A Completion

- [ ] All P0 security tasks complete (SEC-001, SEC-002, SEC-003, SEC-004)
- [ ] All P0 data integrity tasks complete (DATA-003, DATA-006)
- [ ] All P0 reliability tasks complete (REL-001, REL-002)
- [ ] All critical UI blockers resolved (BUG-007, BUG-010, BUG-012)
- [ ] Smoke tests passing
- [ ] Production deployment verified

### Sprint B Completion

- [ ] All workflow verification tasks complete (WF-001, WF-002, WF-003, WF-004)
- [ ] Realistic seed data created (DATA-002-AUGMENT)
- [ ] Optimistic locking implemented (DATA-005)
- [ ] Quality improvements complete (QUAL-001, RF-003)
- [ ] All workflows verified in production
- [ ] Documentation complete

---

## 🚨 Risk Mitigation

### Risk 1: Merge Conflicts

**Mitigation:**

- Sequential execution for shared modules
- Immediate merges after completion
- Auto-resolve scripts available (`scripts/auto-resolve-conflicts.sh`)

### Risk 2: Deployment Failures

**Mitigation:**

- Health check configuration (INFRA-011)
- Monitoring in place (Sentry, UptimeRobot)
- Rollback procedures documented

### Risk 3: Scope Creep

**Mitigation:**

- Strict adherence to task scope
- Defer non-critical tasks to backlog
- Daily status checkpoints

### Risk 4: Agent Coordination

**Mitigation:**

- Daily capacity checks
- Clear branch naming: `agent/TASK-ID`
- Immediate status updates in roadmap

---

## 📝 Daily Status Protocol

### Each Day:

1. Check `docs/sessions/active/` for active sessions
2. Review completed tasks and update roadmap
3. Run capacity analysis
4. Deploy next wave of agents
5. Monitor for conflicts or blockers
6. Update sprint plan document with progress

### Status Updates:

- Mark tasks complete in roadmap with:
  - Completion date
  - Key commits
  - Actual time spent
  - Documentation links

---

## 🔗 Related Documents

- `docs/roadmaps/MASTER_ROADMAP.md` - Single source of truth
- `docs/ROADMAP_AGENT_GUIDE.md` - Agent operating manual
- `CONSOLIDATED_ROADMAP_UPDATE_REPORT.md` - Source for new tasks
- `docs/DOUBLE_SPRINT_PLAN_2025-01-27.md` - This document

---

**Status:** ✅ APPROVED FOR EXECUTION  
**Next Action:** Begin Wave 0 - Governance & Preparation  
**Created By:** PM Agent  
**Date:** 2025-01-27
