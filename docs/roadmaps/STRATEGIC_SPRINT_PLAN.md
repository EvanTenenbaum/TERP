# TERP Strategic Sprint Plan

**Version:** 1.1
**Created:** December 30, 2025
**Last Updated:** December 30, 2025 (Redhat QA Revision)
**Goal:** Complete all remaining tasks in the most efficient sequence

---

## Executive Summary

This plan organizes **47 remaining tasks** (totaling **506 hours**) into **8 strategic sprints** over approximately **11 weeks**. The strategy prioritizes:

1. **Critical business functionality first** (Cooper Rd CRITICAL tasks)
2. **Bug fixes early** to stabilize the platform
3. **Dependency chains respected** (tasks sequenced properly)
4. **Maximum parallelization** (independent tasks grouped together)
5. **Quick wins interspersed** to maintain momentum

---

## Task Inventory

| Category | Tasks | Hours |
|----------|-------|-------|
| Cooper Rd Working Session (WS-001 to WS-015) | 15 | 250h |
| Bug Fixes (BUG-035 to BUG-037) | 3 | 16h |
| Quality (QUAL-004 to QUAL-007) | 4 | 40h |
| UX Improvements (UX-009 to UX-023) | 13 | 80h |
| Infrastructure & Data | 9 | 60h |
| Features & Other | 3 | 60h |
| **TOTAL** | **47** | **506h** |

---

## Sprint Overview

| Sprint | Duration | Focus | Tasks | Hours |
|--------|----------|-------|-------|-------|
| Sprint 1 | Week 1 | Critical Bugs + Foundation | 8 | 52h |
| Sprint 2 | Week 2-3 | Core Accounting & Sales | 5 | 84h |
| Sprint 3 | Week 4-5 | Pick & Pack + Inventory | 5 | 88h |
| Sprint 4 | Week 6 | Audit Trail + Quality | 4 | 74h |
| Sprint 5 | Week 7 | UX Improvements Wave 1 | 8 | 40h |
| Sprint 6 | Week 8 | UX Improvements Wave 2 | 7 | 56h |
| Sprint 7 | Week 9-10 | Infrastructure & Features | 5 | 80h |
| Sprint 8 | Week 11 | Polish & Completion | 5 | 32h |
| **TOTAL** | **11 weeks** | | **47** | **506h** |

---

## Sprint 1: Critical Bugs + Foundation (Week 1)

**Goal:** Stabilize platform and clear blockers for subsequent work
**Capacity:** 52 hours

| Task | Description | Priority | Hours | Parallel Group |
|------|-------------|----------|-------|----------------|
| BUG-035 | Admin Security Test Failures | HIGH | 4h | A |
| BUG-036 | priceAlertsService Test Failures | MEDIUM | 4h | A |
| BUG-037 | VIP Portal createdBy FK Constraint | HIGH | 8h | A |
| WS-001 | Quick Action: Receive Client Payment | CRITICAL | 12h | B |
| WS-002 | Quick Action: Pay Vendor | CRITICAL | 12h | B |
| DATA-009 | Seed Inventory Movements | MEDIUM | 4h | A |
| IMPROVE-003 | Composite Database Indexes | MEDIUM | 4h | A |
| IMPROVE-004 | Rate Limiting Thresholds | MEDIUM | 4h | A |

**Parallel Strategy:**
- **Group A** (28h): All bug fixes + quick data/infra tasks - can run simultaneously
- **Group B** (24h): Accounting quick actions - can run in parallel with Group A

**Sprint 1 Deliverables:**
- [ ] All test suites passing
- [ ] Payment receipt and vendor payment quick actions functional
- [ ] Database indexes and rate limiting optimized

**Unlocks:** WS-006 (depends on WS-001, WS-002)

---

## Sprint 2: Core Accounting & Sales (Week 2-3)

**Goal:** Complete critical accounting and sales features
**Capacity:** 84 hours

| Task | Description | Priority | Hours | Parallel Group |
|------|-------------|----------|-------|----------------|
| WS-004 | Multi-Order & Referral Credit System | CRITICAL | 40h | A |
| WS-006 | Immediate Tab Screenshot/Receipt | HIGH | 16h | B |
| WS-010 | Line-Item Price Override with Note | HIGH | 12h | B |
| WS-014 | Quick Customer Creation | MEDIUM | 8h | B |
| QUAL-005 | COGS & Calendar Financials | MEDIUM | 8h | C |

**Note:** WS-004 is the largest single task (40h). Recommend dedicated focus.

**Parallel Strategy:**
- **Group A** (40h): WS-004 - complex, needs focused attention
- **Group B** (36h): WS-006, WS-010, WS-014 - can run after WS-001/002 complete
- **Group C** (8h): QUAL-005 - independent, can run anytime

**Sprint 2 Deliverables:**
- [ ] Multi-order checkout with referral credits working
- [ ] Tab screenshots and receipts functional
- [ ] Price override with audit notes
- [ ] Quick customer creation in sales flow
- [ ] COGS module integration complete

---

## Sprint 3: Pick & Pack + Inventory (Week 4-5)

**Goal:** Complete warehouse and inventory management features
**Capacity:** 88 hours

| Task | Description | Priority | Hours | Parallel Group |
|------|-------------|----------|-------|----------------|
| WS-003 | Pick & Pack: Group Bagging | CRITICAL | 20h | A |
| WS-007 | Complex Flower Intake Flow | HIGH | 24h | B |
| WS-008 | Low Stock & Needs-Based Alerts | HIGH | 20h | B |
| WS-011 | Photography Module | MEDIUM | 16h | C |
| WS-012 | Vendor Harvesting Reminder | MEDIUM | 8h | C |

**Parallel Strategy:**
- **Group A** (20h): WS-003 - must complete first to unlock WS-009
- **Group B** (44h): WS-007, WS-008 - inventory features, can run in parallel
- **Group C** (24h): WS-011, WS-012 - lower priority, fill gaps

**Sprint 3 Deliverables:**
- [ ] Group bagging/packing workflow operational
- [ ] Complex flower intake with accounting integration
- [ ] Low stock alerts integrated with VIP Portal
- [ ] Basic photography/image management
- [ ] Vendor harvest reminders in calendar

**Unlocks:** WS-009 (depends on WS-003)

---

## Sprint 4: Audit Trail + Quality (Week 6)

**Goal:** Complete audit trail system and quality tasks
**Capacity:** 74 hours

| Task | Description | Priority | Hours | Parallel Group |
|------|-------------|----------|-------|----------------|
| WS-005 | No Black Box Audit Trail | CRITICAL | 30h | A |
| WS-009 | Pick & Pack: Inventory Movement SOP | HIGH | 16h | B |
| QUAL-004 | Review Referential Integrity | HIGH | 16h | C |
| QUAL-006 | VIP Portal CRUD & Dashboard Metrics | MEDIUM | 12h | C |

**Parallel Strategy:**
- **Group A** (30h): WS-005 - system-wide audit trail, largest remaining critical task
- **Group B** (16h): WS-009 - can start after WS-003 complete (Sprint 3)
- **Group C** (28h): QUAL-004, QUAL-006 - quality tasks, independent

**Sprint 4 Deliverables:**
- [ ] Complete audit trail for all system operations
- [ ] Pick & Pack inventory movement SOP flow
- [ ] CASCADE delete review complete
- [ ] VIP Portal supply CRUD and real dashboard metrics

**Unlocks:** QUAL-007 (depends on QUAL-005 from Sprint 2, QUAL-006 from this sprint)

---

## Sprint 5: UX Improvements Wave 1 (Week 7)

**Goal:** High-impact UX improvements
**Capacity:** 40 hours

| Task | Description | Priority | Hours | Parallel Group |
|------|-------------|----------|-------|----------------|
| UX-009 | Breadcrumb Navigation | MEDIUM | 4h | A |
| UX-010 | Empty States | MEDIUM | 8h | A |
| UX-011 | Skeleton Loaders | MEDIUM | 8h | A |
| UX-013 | Search in Client Dropdown | MEDIUM | 4h | A |
| UX-015 | Group Sidebar Menu Items | MEDIUM | 4h | A |
| UX-019 | Filter Persistence | MEDIUM | 4h | A |
| UX-020 | Configurable Low Stock Threshold | MEDIUM | 4h | A |
| WS-015 | Customer Wishlist Field | MEDIUM | 4h | A |

**All tasks independent - maximum parallelization possible**

**Sprint 5 Deliverables:**
- [ ] Breadcrumb navigation throughout app
- [ ] Empty states for all widgets/lists
- [ ] Skeleton loaders for better perceived performance
- [ ] Searchable client dropdown
- [ ] Grouped sidebar menu
- [ ] Persistent filters
- [ ] Configurable low stock thresholds
- [ ] Customer wishlist field in sales

---

## Sprint 6: UX Improvements Wave 2 (Week 8)

**Goal:** Complete remaining UX and small features
**Capacity:** 56 hours

| Task | Description | Priority | Hours | Parallel Group |
|------|-------------|----------|-------|----------------|
| UX-016 | Settings Vertical Navigation | MEDIUM | 8h | A |
| UX-017 | Password Reset Flow (VIP) | MEDIUM | 8h | A |
| UX-018 | Drag-and-Drop Todo Lists | MEDIUM | 8h | A |
| UX-021 | Customizable Quick Actions | MEDIUM | 8h | A |
| UX-022 | Table Navigation Audit | MEDIUM | 8h | A |
| UX-023 | In-Context Module Settings | MEDIUM | 4h | A |
| WS-013 | Simple Task Management | MEDIUM | 12h | B |

**Parallel Strategy:**
- **Group A** (44h): All UX tasks - fully parallelizable
- **Group B** (12h): WS-013 - general utility feature

**Sprint 6 Deliverables:**
- [ ] Vertical settings navigation
- [ ] VIP Portal password reset flow
- [ ] Drag-and-drop todo list reordering
- [ ] Customizable quick actions dropdown
- [ ] Table navigation improvements
- [ ] In-context module settings
- [ ] Simple task management system

---

## Sprint 7: Infrastructure & Features (Week 9-10)

**Goal:** Infrastructure hardening and major feature work
**Capacity:** 80 hours

| Task | Description | Priority | Hours | Parallel Group |
|------|-------------|----------|-------|----------------|
| FEATURE-003 | Live Shopping & Price Negotiation | MEDIUM | 40h | A |
| ST-010 | Redis Caching Layer | MEDIUM | 16h | B |
| REL-002 | Automated Database Backups | MEDIUM | 8h | B |
| DATA-005 | Optimistic Locking | MEDIUM | 8h | B |
| INFRA-004 | Deployment Monitoring | MEDIUM | 8h | B |

**Parallel Strategy:**
- **Group A** (40h): FEATURE-003 - major feature, needs focus
- **Group B** (40h): Infrastructure tasks - can run in parallel

**Sprint 7 Deliverables:**
- [ ] Live shopping price negotiation enhancement
- [ ] Redis caching operational
- [ ] Automated database backups running
- [ ] Optimistic locking preventing conflicts
- [ ] Deployment monitoring in place

---

## Sprint 8: Polish & Completion (Week 11)

**Goal:** Final cleanup and completion of all remaining work
**Capacity:** 32 hours

| Task | Description | Priority | Hours | Parallel Group |
|------|-------------|----------|-------|----------------|
| AUDIT-001 | Comprehensive Code Review | MEDIUM | 16h | A |
| ST-024 | Remove Comments Feature | MEDIUM | 4h | B |
| INFRA-007 | Update Swarm Manager | MEDIUM | 4h | B |
| QUAL-007 | Final TODO Audit | LOW | 4h | C |
| ROADMAP-001 | Process Roadmap Update Report | LOW | 4h | C |

**Note:** QUAL-007 can only start after QUAL-005 (Sprint 2) and QUAL-006 (Sprint 4) are complete.

**Sprint 8 Deliverables:**
- [ ] Code review complete with findings documented
- [ ] Comments feature removed (per ST-024)
- [ ] Swarm manager updated
- [ ] Final TODO audit complete
- [ ] Roadmap fully updated and accurate

---

## Dependency Chains

There are two independent dependency chains that must be respected:

**Chain 1: Payment → Receipts**
```
WS-001 + WS-002 (Sprint 1)
       ↓
    WS-006 (Sprint 2)
```

**Chain 2: Pick & Pack**
```
WS-003 (Sprint 3)
    ↓
WS-009 (Sprint 4)
```

**Chain 3: Quality Audit**
```
QUAL-005 (Sprint 2) + QUAL-006 (Sprint 4)
                   ↓
              QUAL-007 (Sprint 8)
```

All other tasks are independent and can be parallelized freely.

---

## Critical Path Analysis

The longest sequential dependency is:

```
Week 1: WS-001 + WS-002 (24h)
Week 2: WS-006 (16h) 
Week 4: WS-003 (20h) [parallel track]
Week 6: WS-009 (16h)
        WS-005 (30h) [parallel]
```

**Critical path duration:** ~106 hours over 6 weeks

By running parallel tracks, we compress the overall timeline while respecting dependencies.

---

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| WS-004 (40h) takes longer | Medium | High | Start early in Sprint 2, 2-week buffer |
| WS-005 (30h) audit trail complexity | Medium | Medium | Well-defined scope, can be phased |
| FEATURE-003 (40h) scope creep | Low | Medium | FEATURE-016 complete, this is enhancement only |
| Resource constraints | Medium | High | UX sprints can be deferred if needed |
| Dependencies not met | Low | High | Clear chain documentation, sprint gates |

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Tasks Completed | 47/47 (100%) | Sprint completion tracking |
| Critical Tasks | 5/5 in first 4 sprints | WS-001 to WS-005 |
| Bug Fixes | 3/3 in Sprint 1 | BUG-035, BUG-036, BUG-037 |
| Timeline | 11 weeks | Sprint end dates |
| Test Coverage | Maintained or improved | CI/CD metrics |
| Zero Regressions | 0 P0 bugs introduced | QA validation |

---

## Recommendations

1. **Start Sprint 1 immediately** - Bug fixes and payment actions are foundational
2. **Dedicate focused time to WS-004** - Largest task (40h), most complex
3. **Don't skip UX sprints** - User experience improvements compound
4. **Run infrastructure tasks in background** - They don't block features
5. **Keep QUAL-007 for last** - Cleanup task that benefits from all other work being done
6. **Weekly sprint reviews** - Validate progress and adjust as needed

---

## Out of Scope (Deferred)

The following items from QA_TASKS_BACKLOG.md and NEW_TASKS_BACKLOG.md are not included in this sprint plan and should be addressed in a future planning cycle:

- QA-001 through QA-027 (original QA backlog)
- QA-028 through QA-050 (video walkthrough findings)

These represent approximately 50+ additional tasks that can be prioritized after the core 47 tasks are complete.

---

**Redhat QA:** ✅ Performed (v1.1)
- Verified task counts match tables (47 tasks)
- Verified hour calculations per sprint
- Confirmed dependency chains are correct
- Validated parallelization groups
- Clarified sprint timing (no overlaps)
- Documented out-of-scope items
