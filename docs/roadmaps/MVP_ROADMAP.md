# 🎯 TERP MVP Roadmap

**Version:** 1.0  
**Created:** December 18, 2025  
**Status:** 🔴 ACTIVE - PRIMARY INITIATIVE  
**Target Completion:** January 3, 2026

---

## ⚠️ MANDATORY FOR ALL AGENTS

**This is THE primary initiative for TERP.**

When asked to:

- Define a sprint
- Prioritize work
- Update the roadmap
- Assign tasks

**You MUST work in service of this MVP Roadmap until ALL phases are complete (including Nice-to-Haves).**

If a task is not on this roadmap, it should NOT be prioritized unless:

1. It's a critical production bug
2. It directly unblocks an MVP task
3. The user explicitly approves the deviation

---

## Executive Summary

**Overall MVP Readiness:** ~75-80%

The core ERP functionality is largely complete. Remaining work focuses on:

- UX polish (loading states, pagination)
- Data integrity (optimistic locking, backups)
- Workflow validation (end-to-end testing)
- Final polish (navigation, search)

**Timeline:** 14 days of focused work  
**Effort:** ~115 hours  
**Parallelization:** Up to 3 agents

---

## 🏁 MVP Success Criteria

### ✅ Must Have (Launch Blockers)

- [ ] All list views paginated (PERF-003)
- [ ] Empty states on all widgets/lists (UX-010)
- [ ] Loading indicators everywhere (UX-011)
- [ ] Orders show correct item counts (BUG-M005)
- [ ] Optimistic locking on critical tables (DATA-005)
- [ ] Automated daily backups (REL-002)
- [ ] All 4 workflows validated (WF-001 to WF-004)

### ✅ Should Have (Launch Quality)

- [ ] Unified navigation (BUG-017)
- [ ] Breadcrumb navigation (UX-009)
- [ ] Searchable client dropdown (UX-013)
- [ ] Debug routes removed (BUG-011)

### ✅ Nice to Have (Post-Launch Sprint 1)

- [ ] Mobile responsive sidebar (BUG-M001)
- [ ] Mobile-friendly tables (BUG-M003)
- [ ] Comprehensive input validation (QUAL-002)
- [ ] N+1 query optimization (DATA-004)

---

## 📊 Current Status

### Phase Progress Tracker

| Phase                        | Status         | Progress | Blocking Issues      |
| ---------------------------- | -------------- | -------- | -------------------- |
| Phase 0: Quick Wins          | ✅ COMPLETE    | 100%     | None                 |
| Phase 1: Core UX             | 🔄 IN PROGRESS | 30%      | PERF-003 in progress |
| Phase 2: Data Integrity      | ⏳ NOT STARTED | 0%       | Waiting on Phase 1   |
| Phase 3: Workflow Validation | ⏳ NOT STARTED | 0%       | Waiting on Phase 2   |
| Phase 4: MVP Polish          | ⏳ NOT STARTED | 0%       | Waiting on Phase 3   |
| Phase 5: Nice-to-Haves       | ⏳ NOT STARTED | 0%       | Waiting on Phase 4   |

### Last Status Update

**Date:** December 18, 2025  
**Updated By:** Initial Creation  
**Notes:** MVP Roadmap created. Phase 0 complete. Phase 1 in progress with PERF-003.

---

## 🔄 Status Check Protocol

### When to Update This Document

1. **After completing any MVP task** - Update progress tracker
2. **At the start of each sprint** - Review and adjust timeline
3. **When blocking issues arise** - Document and escalate
4. **Weekly** - Full status review (even if no changes)

### Status Check Template

```markdown
### Status Update: [DATE]

**Updated By:** [Agent/Session ID]
**Phase:** [Current Phase]
**Progress:** [X/Y tasks complete]
**Blockers:** [Any blocking issues]
**Adjustments:** [Any timeline/scope changes]
**Next Actions:** [Immediate next steps]
```

---

## Phase 0: Quick Wins ✅ COMPLETE

**Goal:** Fix the most visible issues that make the app look broken  
**Duration:** 1 day  
**Status:** ✅ COMPLETE (December 18, 2025)

| Task   | Description                       | Status  | Commit              |
| ------ | --------------------------------- | ------- | ------------------- |
| UX-002 | Replace browser confirm() dialogs | ✅ Done | Various             |
| UX-003 | Rename "Lifetime" to "All Time"   | ✅ Done | `b81587d7`          |
| UX-004 | Rename "Customize Metrics" button | ✅ Done | `b81587d7`          |
| UX-005 | Remove version from header        | ✅ Done | `b81587d7`          |
| UX-006 | Clarify dual status badges        | ✅ Done | `6274f4f4`          |
| UX-007 | Add TERI Code tooltip             | ✅ Done | `6274f4f4`          |
| UX-008 | Fix "Oldest Debt" format          | ✅ Done | `b81587d7`          |
| UX-012 | Add "Clear Filters" button        | ✅ Done | Already implemented |

---

## Phase 1: Core UX 🔄 IN PROGRESS

**Goal:** Make the app feel professional and usable  
**Duration:** 3 days  
**Status:** 🔄 IN PROGRESS  
**Estimated Effort:** 31 hours

### Task Breakdown

| Task         | Description                          | Est   | Status         | Assigned                  | Notes                       |
| ------------ | ------------------------------------ | ----- | -------------- | ------------------------- | --------------------------- |
| **PERF-003** | Add pagination to all list endpoints | 24h   | 🔄 In Progress | Session-20251130-PERF-003 | Critical for large datasets |
| **UX-010**   | Add empty states to widgets/lists    | 4h    | ⏳ Ready       | -                         | Needs EmptyState component  |
| **UX-011**   | Add skeleton loaders                 | 3h    | ⏳ Ready       | -                         | Needs Skeleton components   |
| **BUG-M005** | Fix orders showing "0 items"         | 6-12h | ⏳ Ready       | -                         | May reveal data issues      |

### Parallelization Strategy

```
AGENT A: PERF-003 (Pagination) - IN PROGRESS
         └── Continue existing work

AGENT B: UX-010 + UX-011 (Loading States)
         ├── Create EmptyState component
         ├── Create Skeleton components
         └── Apply to all widgets/lists

AGENT C: BUG-M005 (Orders "0 items")
         ├── Investigate line items relationship
         ├── Fix count display logic
         └── Verify data integrity
```

### Phase 1 Completion Criteria

- [ ] All list endpoints return paginated results
- [ ] Frontend pagination controls work on all list pages
- [ ] Empty states show on all widgets when no data
- [ ] Skeleton loaders show during all data fetches
- [ ] Orders display correct item counts

### Phase 1 Checkpoint

**When:** After all Phase 1 tasks complete  
**Action:** Update status, review timeline, adjust Phase 2 if needed

---

## Phase 2: Data Integrity ⏳ NOT STARTED

**Goal:** Prevent data loss and corruption  
**Duration:** 4 days  
**Status:** ⏳ Waiting on Phase 1  
**Estimated Effort:** 40 hours

### Task Breakdown

| Task         | Description                  | Est | Status   | Priority | Notes                      |
| ------------ | ---------------------------- | --- | -------- | -------- | -------------------------- |
| **DATA-005** | Implement optimistic locking | 32h | ⏳ Ready | HIGH     | Prevents silent overwrites |
| **REL-002**  | Automated database backups   | 8h  | ⏳ Ready | HIGH     | Prevents data loss         |

### Parallelization Strategy

```
AGENT A: DATA-005 (Optimistic Locking) - 32h
         ├── Add version column to: orders, batches, clients, invoices
         ├── Create migration
         ├── Implement version checking in update operations
         ├── Add conflict error handling in frontend
         └── Test concurrent edit scenarios

AGENT B: REL-002 (Automated Backups) - 8h
         ├── Create backup script with .my.cnf
         ├── Schedule daily cron job (2 AM)
         ├── Configure S3 upload
         ├── Add backup monitoring/alerts
         └── Test restore procedure
```

### Phase 2 Completion Criteria

- [ ] Version column exists on orders, batches, clients, invoices
- [ ] All update operations check version before saving
- [ ] Frontend shows conflict error when version mismatch
- [ ] Daily backups running automatically
- [ ] Backup monitoring alerts configured
- [ ] Restore procedure tested and documented

### Phase 2 Checkpoint

**When:** After all Phase 2 tasks complete  
**Action:** Update status, verify data integrity, adjust Phase 3 if needed

---

## Phase 3: Workflow Validation ⏳ NOT STARTED

**Goal:** Verify all core flows work end-to-end  
**Duration:** 3 days  
**Status:** ⏳ Waiting on Phase 2  
**Estimated Effort:** 24 hours

### Task Breakdown

| Task       | Description                          | Est  | Status   | Dependencies            |
| ---------- | ------------------------------------ | ---- | -------- | ----------------------- |
| **WF-001** | Order creation workflow validation   | 4-6h | ⏳ Ready | BUG-003 (done)          |
| **WF-002** | Inventory intake workflow validation | 6-8h | ⏳ Ready | BUG-004, BUG-006 (done) |
| **WF-003** | Returns workflow validation          | 4-6h | ⏳ Ready | BUG-005 (done)          |
| **WF-004** | Data integrity verification          | 6-8h | ⏳ Ready | ST-019 (done)           |

### Parallelization Strategy

```
AGENT A: WF-001 + WF-003 (Order & Returns) - 10h
         ├── WF-001: Order Creation
         │   ├── Customer selection → inventory browse
         │   ├── Add items → credit limit check
         │   ├── Submit order → invoice generation
         │   └── Payment recording
         └── WF-003: Returns
             ├── Order lookup → item selection
             ├── Return creation → inventory restock
             └── Audit trail verification

AGENT B: WF-002 + WF-004 (Inventory & Data) - 14h
         ├── WF-002: Inventory Intake
         │   ├── Purchase creation → batch creation
         │   ├── Queue entry → status transitions
         │   └── Live inventory verification
         └── WF-004: Data Integrity
             ├── FK relationship validation
             ├── Financial calculation accuracy
             └── Audit trail completeness
```

### Phase 3 Completion Criteria

- [ ] Order flow creates all downstream records (invoice, ledger entries)
- [ ] Inventory intake flow creates batches and queue entries
- [ ] Returns properly restock inventory
- [ ] All FK relationships valid
- [ ] Financial calculations accurate (no floating-point errors)
- [ ] Audit trails complete for all operations

### Phase 3 Checkpoint

**When:** After all Phase 3 tasks complete  
**Action:** Full system test, update status, prepare for Phase 4

---

## Phase 4: MVP Polish ⏳ NOT STARTED

**Goal:** Final touches before launch  
**Duration:** 2 days  
**Status:** ⏳ Waiting on Phase 3  
**Estimated Effort:** 16 hours

### Task Breakdown

| Task        | Description                   | Est   | Status   | Priority |
| ----------- | ----------------------------- | ----- | -------- | -------- |
| **BUG-017** | Unify sidebar navigation      | 4-8h  | ⏳ Ready | HIGH     |
| **UX-009**  | Breadcrumb navigation         | 4h    | ⏳ Ready | MEDIUM   |
| **UX-013**  | Searchable client dropdown    | 2h    | ⏳ Ready | MEDIUM   |
| **UX-014**  | Chart of Accounts edit button | 1h    | ⏳ Ready | LOW      |
| **BUG-011** | Remove debug route            | 30min | ⏳ Ready | HIGH     |

### Parallelization Strategy

```
AGENT A: Navigation & Layout (8h)
         ├── BUG-017: Unify sidebar navigation
         │   ├── Sync DashboardLayout and AppSidebar
         │   └── Ensure consistent nav across all pages
         └── UX-009: Breadcrumb navigation
             ├── Integrate existing breadcrumb component
             └── Configure paths for all routes

AGENT B: Search & Cleanup (4h)
         ├── UX-013: Searchable client dropdown
         │   └── Replace basic dropdown with combobox
         ├── UX-014: Chart of Accounts edit button
         └── BUG-011: Remove /orders-debug route
```

### Phase 4 Completion Criteria

- [ ] Sidebar navigation identical on all pages
- [ ] Breadcrumbs show on all pages
- [ ] Client dropdown is searchable
- [ ] Chart of Accounts edit works
- [ ] No debug routes accessible in production

### Phase 4 Checkpoint

**When:** After all Phase 4 tasks complete  
**Action:** Full QA pass, prepare launch checklist, update documentation

---

## Phase 5: Nice-to-Haves ⏳ NOT STARTED

**Goal:** Post-launch improvements  
**Duration:** 1-2 weeks  
**Status:** ⏳ Waiting on Phase 4 (MVP Launch)  
**Estimated Effort:** 80-120 hours

### Task Breakdown

| Task         | Description                    | Est    | Status   | Priority |
| ------------ | ------------------------------ | ------ | -------- | -------- |
| **BUG-M001** | Mobile responsive sidebar      | 8-16h  | ⏳ Ready | HIGH     |
| **BUG-M003** | Mobile-friendly tables         | 16-24h | ⏳ Ready | HIGH     |
| **QUAL-002** | Comprehensive input validation | 32h    | ⏳ Ready | MEDIUM   |
| **DATA-004** | N+1 query optimization         | 40h    | ⏳ Ready | MEDIUM   |

### Phase 5 Completion Criteria

- [ ] App usable on mobile devices
- [ ] Tables display properly on mobile
- [ ] All inputs validated with clear error messages
- [ ] Order creation < 500ms (down from 1-5s)

---

## 📋 Deferred Items (NOT in MVP)

These items are explicitly deferred and should NOT be worked on until Phase 5 is complete:

| Task              | Reason                      | When              |
| ----------------- | --------------------------- | ----------------- |
| QUAL-003 (80h)    | Critical TODOs - too large  | Post-MVP Sprint 2 |
| QUAL-004 (16h)    | CASCADE delete review       | Post-MVP Sprint 2 |
| FEATURE-003 (80h) | Live Shopping - new feature | Post-MVP          |
| ST-010 (2-3d)     | Redis caching               | Post-MVP          |
| QA-041 (24-40h)   | Merge Inbox/To-Do           | Post-MVP          |

---

## 🚨 Risk Register

| Risk                         | Likelihood | Impact | Mitigation                           |
| ---------------------------- | ---------- | ------ | ------------------------------------ |
| DATA-005 complexity          | Medium     | High   | Start early, allocate buffer         |
| BUG-M005 reveals data issues | Medium     | Medium | Investigate first, may need data fix |
| PERF-003 scope creep         | Low        | Medium | Already in progress, monitor closely |
| Agent availability           | Low        | High   | Tasks are parallelizable             |

---

## 📅 Timeline

```
Week 1 (Dec 18-24)
├── Day 1 (Dec 18): Phase 0 ✅ COMPLETE
├── Days 2-4 (Dec 19-21): Phase 1 (Core UX)
│   └── PERF-003, UX-010, UX-011, BUG-M005
└── Days 5-7 (Dec 22-24): Phase 2 (Data Integrity)
    └── DATA-005, REL-002

Week 2 (Dec 25-31)
├── Days 8-10 (Dec 25-27): Phase 3 (Workflow Validation)
│   └── WF-001, WF-002, WF-003, WF-004
├── Days 11-12 (Dec 28-29): Phase 4 (Polish)
│   └── BUG-017, UX-009, UX-013, UX-014, BUG-011
├── Day 13 (Dec 30): QA & Testing
└── Day 14 (Dec 31): Launch Prep

Week 3+ (Jan 1+)
└── Phase 5: Nice-to-Haves (ongoing)
```

---

## 🔧 Agent Instructions

### Starting a Sprint

1. **Read this document first**
2. Check current phase status
3. Identify available tasks in current phase
4. Check `docs/ACTIVE_SESSIONS.md` for conflicts
5. Assign yourself to available task
6. Update this document with assignment

### Completing a Task

1. Mark task complete in this document
2. Update phase progress percentage
3. Add status update entry
4. If phase complete, trigger checkpoint review
5. Move to next available task

### Checkpoint Reviews

At each phase checkpoint:

1. Verify all tasks in phase are complete
2. Run full test suite
3. Update progress tracker
4. Identify any scope changes needed
5. Adjust timeline if necessary
6. Document learnings

### Escalation

If you encounter:

- A blocking issue not on this roadmap
- A task taking 2x+ estimated time
- A dependency not documented

**STOP and escalate to user before proceeding.**

---

## 📝 Status Update Log

### December 18, 2025 - Initial Creation

**Updated By:** Kiro (MVP Roadmap Creation)  
**Phase:** Phase 0 Complete, Phase 1 Starting  
**Progress:** Phase 0: 8/8 tasks complete  
**Blockers:** None  
**Adjustments:** None  
**Next Actions:**

- Continue PERF-003 (pagination)
- Assign UX-010, UX-011, BUG-M005

---

_This document is the single source of truth for MVP progress. Keep it updated._
