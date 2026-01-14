# MVP Milestone Strategic Execution Plan

## Optimized for Claude Parallel Agents

**Version:** 1.0
**Created:** 2026-01-14
**Status:** Ready for Execution
**Last Verified:** 2026-01-14 (codebase audit completed)

---

## Executive Summary

This plan organizes all **verified open** MVP tasks into **8 execution phases** based on priority, dependencies, and parallelization opportunities. Tasks have been verified against the actual codebase - many items marked "OPEN" in the roadmap are already fixed.

### Verification Summary

| Category | Roadmap Shows Open | Actually Open | Fixed (Roadmap Outdated) |
|----------|-------------------|---------------|-------------------------|
| Critical Bugs | 21 | 9 | 12 |
| API Registration | 10 | 1 | 9 |
| Security (QA Audit) | 5 | 5 | 0 |
| Data Integrity | 8 | 7 | 1 |
| Other Categories | ~55 | ~55 | 0 |
| **TOTAL** | **~99** | **~77** | **~22** |

---

## Roadmap Status Corrections Required

The following tasks are marked OPEN in MASTER_ROADMAP.md but are **actually FIXED**:

### Bugs (Fixed Jan 12-13, 2026)
| Task | Description | Fixed Date | Evidence |
|------|-------------|------------|----------|
| BUG-040 | Order Creator: Inventory loading fails | Jan 13 | Sprint 1 session log |
| BUG-045 | Order Creator: Retry resets entire form | Jan 13 | Sprint 1 session log |
| BUG-046 | Settings Users tab misleading auth error | Jan 13 | RBAC permissions added |
| BUG-075 | Settings Users Tab Auth Error (duplicate) | Jan 13 | Same as BUG-046 |
| BUG-078 | Orders List API Database Query Failure | Jan 12 | Explicit column selection fix |
| BUG-079 | Quotes List API Database Query Failure | Jan 12 | Explicit column selection fix |
| BUG-080 | Invoice Summary API Database Query Failure | Jan 12 | Column name mapping fix |
| BUG-081 | Calendar Events API Internal Server Error | Jan 12 | Comprehensive error handling |
| BUG-084 | Pricing Defaults Table Missing | Jan 12 | Table created + seeded |

### API Registration (Fixed Jan 12, 2026)
| Task | Description | Evidence |
|------|-------------|----------|
| API-001 | todoLists.list procedure | BUG-034 marker in code |
| API-002 | featureFlags.list procedure | BUG-034 marker in code |
| API-004 | salesSheets.list procedure | BUG-034 marker in code |
| API-005 | samples.list procedure | BUG-034 marker in code |
| API-006 | purchaseOrders.list procedure | BUG-034 marker in code |
| API-007 | alerts.list procedure | BUG-034 marker in code |
| API-008 | inbox.list procedure | BUG-034 marker in code |
| API-009 | locations.list procedure | BUG-034 marker in code |
| API-010 | accounting.* procedures | All 4 procedures implemented |

### Data Integrity (Fixed)
| Task | Description | Evidence |
|------|-------------|----------|
| DI-008 | Fix SSE Event Listener Memory Leaks | All SSE components have cleanup |

---

## Verified Open Tasks (77 Total)

### Phase 1: P0 Security (5 tasks) - CRITICAL
### Phase 2: P0/P1 Data Integrity (7 tasks) - CRITICAL
### Phase 3: P0/P1 Bug Fixes (9 tasks) - HIGH
### Phase 4: P1 API & Stability (2 tasks) - HIGH
### Phase 5: P2 Quality - Frontend (3 tasks) - MEDIUM
### Phase 6: P2 Quality - Backend (5 tasks) - MEDIUM
### Phase 7: P2 UX (10 tasks) - MEDIUM
### Phase 8: P2/P3 Features & Infrastructure (36 tasks) - LOWER

---

## Phase Definitions

### Phase 1: P0 Security (Day 1-2)
**Duration:** 2 days | **Agents:** 5 (parallel) | **Priority:** CRITICAL

All security vulnerabilities must be fixed before any other work.

| Task | Description | Estimate | Blockers | Prompt |
|------|-------------|----------|----------|--------|
| SEC-018 | Remove Hardcoded Admin Setup Key Fallback | 2h | None | `docs/prompts/SEC-018.md` |
| SEC-019 | Protect 12 matchingEnhanced Public Endpoints | 4h | None | `docs/prompts/SEC-019.md` |
| SEC-020 | Protect 5 calendarRecurrence Public Mutations | 2h | None | `docs/prompts/SEC-020.md` |
| SEC-021 | Fix Token Exposure in URL Query Parameter | 4h | None | `docs/prompts/SEC-021.md` |
| SEC-022 | Remove Hardcoded Production URLs | 2h | None | `docs/prompts/SEC-022.md` |

**Parallel Execution:** All 5 can run simultaneously - no dependencies.

**Agent Commands:**
```bash
# Launch all 5 security fixes in parallel
claude --task "Execute SEC-018 following docs/prompts/SEC-018.md" &
claude --task "Execute SEC-019 following docs/prompts/SEC-019.md" &
claude --task "Execute SEC-020 following docs/prompts/SEC-020.md" &
claude --task "Execute SEC-021 following docs/prompts/SEC-021.md" &
claude --task "Execute SEC-022 following docs/prompts/SEC-022.md" &
wait
```

---

### Phase 2: P0/P1 Data Integrity (Days 3-5)
**Duration:** 3 days | **Agents:** 4-5 (parallel) | **Priority:** CRITICAL

Data integrity issues affect correctness of business data.

| Task | Description | Estimate | Blockers | Prompt |
|------|-------------|----------|----------|--------|
| DI-001 | Implement Real withTransaction Database Wrapper | 8h | None | `docs/prompts/DI-001.md` |
| DI-002 | Fix Credit Application Race Condition | 8h | DI-001 | `docs/prompts/DI-002.md` |
| DI-003 | Add Transaction to Cascading Delete Operations | 4h | DI-001 | `docs/prompts/DI-003.md` |
| DI-004 | Implement Soft-Delete Support for Clients | 8h | None | `docs/prompts/DI-004.md` |
| DI-005 | Fix Startup Seeding Schema Drift | 4h | None | `docs/prompts/DI-005.md` |
| DI-006 | Add Missing Foreign Key Constraints | 8h | None | `docs/prompts/DI-006.md` |
| DI-007 | Migrate VARCHAR to DECIMAL for Numeric Columns | 2d | None | `docs/prompts/DI-007.md` |

**Dependency Graph:**
```
DI-001 ─┬─> DI-002 (race condition needs transaction wrapper)
        └─> DI-003 (cascading delete needs transaction wrapper)

DI-004, DI-005, DI-006, DI-007 can run in parallel with DI-001
```

**Execution Strategy:**
- Day 3: Launch DI-001, DI-004, DI-005, DI-006, DI-007 (5 parallel)
- Day 4-5: Launch DI-002, DI-003 after DI-001 completes (2 parallel)

---

### Phase 3: P0/P1 Bug Fixes (Days 6-8)
**Duration:** 3 days | **Agents:** 5 (parallel) | **Priority:** HIGH

Critical bugs affecting core functionality.

| Task | Description | Estimate | Blockers | Domain |
|------|-------------|----------|----------|--------|
| BUG-082 | Order Detail API Internal Server Error | 4h | None | Orders |
| BUG-083 | COGS Calculation API Internal Server Error | 4h | None | COGS |
| BUG-085 | Notifications List API Internal Server Error | 4h | None | Notifications |
| BUG-071 | Fix Create Client Form Submission Failure | 8h | None | Clients |
| BUG-072 | Fix Inventory Data Not Loading in Dashboard | 4h | None | Inventory |
| BUG-073 | Fix Live Shopping Feature Not Accessible | 8h | None | Live Shopping |
| BUG-076 | Fix Search and Filter Functionality | 8h | None | Search |
| BUG-077 | Fix Notification System Not Working | 8h | BUG-085 | Notifications |
| BUG-097 | Error handling inconsistency across modules | 4h | None | UX (P3) |

**Parallel Groups:**
- Group A (Day 6): BUG-082, BUG-083, BUG-085, BUG-072 (4 parallel, API fixes)
- Group B (Day 7): BUG-071, BUG-073, BUG-076 (3 parallel, UI fixes)
- Group C (Day 8): BUG-077 (after BUG-085), BUG-097 (2 parallel)

---

### Phase 4: P1 API & Stability (Day 9)
**Duration:** 1 day | **Agents:** 2 (parallel) | **Priority:** HIGH

| Task | Description | Estimate | Blockers | Prompt |
|------|-------------|----------|----------|--------|
| API-003 | Register vipPortal.listAppointmentTypes | 4h | None | - |
| ST-026 | Implement Concurrent Edit Detection | 8h | None | `docs/prompts/ST-026.md` |

**Parallel Execution:** Both can run simultaneously.

---

### Phase 5: P2 Frontend Quality (Day 10)
**Duration:** 1 day | **Agents:** 3 (parallel) | **Priority:** MEDIUM

| Task | Description | Estimate | Blockers | Prompt |
|------|-------------|----------|----------|--------|
| FE-QA-001 | Replace key={index} Anti-Pattern (27 Files) | 8h | None | `docs/prompts/FE-QA-001.md` |
| FE-QA-002 | Align Frontend/Backend Pagination Parameters | 4h | None | `docs/prompts/FE-QA-002.md` |
| FE-QA-003 | Fix VIP Token Header vs Input Inconsistency | 2h | SEC-021 | `docs/prompts/FE-QA-003.md` |

**Note:** FE-QA-003 should wait until SEC-021 is complete (token handling changes).

---

### Phase 6: P2 Backend Quality (Days 11-12)
**Duration:** 2 days | **Agents:** 5 (parallel) | **Priority:** MEDIUM

| Task | Description | Estimate | Blockers | Prompt |
|------|-------------|----------|----------|--------|
| BE-QA-001 | Complete or Remove Email/SMS Integration Stubs | 16h | None | `docs/prompts/BE-QA-001.md` |
| BE-QA-002 | Implement VIP Tier Config Database Storage | 8h | None | `docs/prompts/BE-QA-002.md` |
| BE-QA-003 | Fix Vendor Supply Matching Empty Results | 8h | None | `docs/prompts/BE-QA-003.md` |
| BE-QA-004 | Complete Dashboard Metrics Schema Implementation | 8h | None | `docs/prompts/BE-QA-004.md` |
| BE-QA-005 | Fix Supplier Metrics Null Return Values | 4h | None | `docs/prompts/BE-QA-005.md` |

**Parallel Execution:** All 5 can run simultaneously.

---

### Phase 7: P2 UX (Days 13-14)
**Duration:** 2 days | **Agents:** 5 (parallel) | **Priority:** MEDIUM

| Task | Description | Estimate | Blockers | Prompt |
|------|-------------|----------|----------|--------|
| UX-010 | Clarify My Account vs User Settings Navigation | 4h | None | - |
| UX-011 | Fix Two Export Buttons Issue | 2h | None | - |
| UX-012 | Fix Period Display Formatting | 2h | None | - |
| UX-013 | Fix Mirrored Elements Issue | 2h | None | - |
| UX-015 | Add Confirmation Dialogs for 14 Delete Actions | 8h | None | `docs/prompts/UX-015.md` |
| UX-016 | Replace window.alert() with Toast Notifications | 2h | None | `docs/prompts/UX-016.md` |
| UX-017 | Fix Broken Delete Subcategory Button Handler | 1h | None | `docs/prompts/UX-017.md` |

**Day 13:** UX-015, UX-017, UX-010 (3 parallel)
**Day 14:** UX-011, UX-012, UX-013, UX-016 (4 parallel)

---

### Phase 8: P2/P3 Features & Infrastructure (Days 15-25)
**Duration:** ~11 days | **Agents:** 5-6 (parallel) | **Priority:** LOWER

This phase contains 36 tasks that can be parallelized based on domain.

#### 8A: High-Priority Features (Days 15-17)
| Task | Description | Estimate | Domain |
|------|-------------|----------|--------|
| FEAT-007 | Add Payment Recording Against Invoices | 8h | Finance |
| FEAT-011 | COGS Logic and Sales Flow Integration | 8h | COGS |
| FEATURE-003 | Live Shopping & Price Negotiation System | 16h | Live Shopping |
| FEAT-019 | VIP Status and Tiers Implementation | 8h | VIP Portal |
| FEAT-020 | Product Subcategory and Strain Matching | 8h | Products |

#### 8B: Medium-Priority Features (Days 18-21)
| Task | Description | Estimate | Domain |
|------|-------------|----------|--------|
| FEAT-001 | Client Form Field Updates | 4h | Clients |
| FEAT-002 | Tag System Revamp for Clients and Products | 8h | Tags |
| FEAT-003 | Order Creator Quick Add Quantity Field | 4h | Orders |
| FEAT-004 | Add Dollar Amount Discount Option | 4h | Orders |
| FEAT-005 | Merge Draft and Quote Workflows | 8h | Quotes |
| FEAT-006 | Show Product Name Instead of SKU | 4h | Orders |
| FEAT-008 | Invoice Editing from Order View | 8h | Invoices |
| FEAT-009 | Add Product Subcategories | 8h | Products |
| FEAT-010 | Default Warehouse Selection | 4h | Inventory |
| FEAT-021 | Settings Changes Apply to Entire Team | 8h | Settings |
| FEAT-023 | Notification Preferences - System vs User | 8h | Notifications |
| FEAT-024 | Inline Notifications Without Page Navigation | 8h | Notifications |

#### 8C: Lower-Priority Features (Days 22-24)
| Task | Description | Estimate | Priority |
|------|-------------|----------|----------|
| FEAT-012 | Make Grade Field Optional/Customizable | 4h | LOW |
| FEAT-013 | Add Packaged Unit Type for Products | 4h | LOW |
| FEAT-014 | Remove Expected Delivery from Purchases | 2h | LOW |
| FEAT-015 | Finance Status Customization | 4h | LOW |
| FEAT-017 | Feature Flags Direct Access | 2h | LOW |
| FEAT-018 | Remove Dev-Only Features from UI | 4h | LOW |
| FEAT-022 | Show Role Names Instead of Count | 2h | LOW |

#### 8D: Infrastructure & Quality (Day 25)
| Task | Description | Estimate | Priority |
|------|-------------|----------|----------|
| INFRA-004 | Implement Deployment Monitoring Enforcement | 8h | MEDIUM |
| INFRA-007 | Update Swarm Manager | 4h | LOW |
| INFRA-012 | Deploy TERP Commander Slack Bot | 8h | LOW |
| CLEANUP-001 | Remove LLM/AI from Codebase | 4h | LOW |
| QUAL-003 | Complete Critical TODOs | 8h | MEDIUM |
| ROADMAP-001 | Process Consolidated Roadmap Update Report | 4h | LOW |

---

## Execution Timeline Overview

```
Days 1-2:   [Phase 1] Security Fixes (5 agents parallel)
            └── SEC-018, SEC-019, SEC-020, SEC-021, SEC-022

Days 3-5:   [Phase 2] Data Integrity (5 agents parallel → 2 sequential)
            ├── DI-001, DI-004, DI-005, DI-006, DI-007 (Day 3-4)
            └── DI-002, DI-003 (Day 5, after DI-001)

Days 6-8:   [Phase 3] Bug Fixes (5 agents per day)
            ├── BUG-082, 083, 085, 072 (Day 6)
            ├── BUG-071, 073, 076 (Day 7)
            └── BUG-077, 097 (Day 8)

Day 9:      [Phase 4] API & Stability (2 agents parallel)
            └── API-003, ST-026

Day 10:     [Phase 5] Frontend Quality (3 agents parallel)
            └── FE-QA-001, FE-QA-002, FE-QA-003

Days 11-12: [Phase 6] Backend Quality (5 agents parallel)
            └── BE-QA-001 through BE-QA-005

Days 13-14: [Phase 7] UX (5 agents parallel)
            └── UX-010 through UX-017

Days 15-25: [Phase 8] Features & Infrastructure (5-6 agents parallel)
            └── 36 feature and infrastructure tasks
```

---

## Quick Reference: Task Counts by Phase

| Phase | Focus | Tasks | Agents | Duration | Cumulative |
|-------|-------|-------|--------|----------|------------|
| 1 | Security | 5 | 5 | 2 days | Day 2 |
| 2 | Data Integrity | 7 | 5 | 3 days | Day 5 |
| 3 | Bug Fixes | 9 | 5 | 3 days | Day 8 |
| 4 | API & Stability | 2 | 2 | 1 day | Day 9 |
| 5 | Frontend Quality | 3 | 3 | 1 day | Day 10 |
| 6 | Backend Quality | 5 | 5 | 2 days | Day 12 |
| 7 | UX | 7 | 5 | 2 days | Day 14 |
| 8 | Features & Infra | 36 | 6 | 11 days | Day 25 |
| **TOTAL** | | **74** | | **25 days** | |

---

## Critical Path

The critical path through MVP is:

```
Security (P0) → Data Integrity (P0/P1) → Bug Fixes (P1) → Features (P2)
     2d              3d                     3d              ~17d
                                                        = 25 days total
```

**Compression Opportunities:**
- Phases 1-4 (critical work) can be completed in **9 days** with full parallelization
- Phase 8 features can be deprioritized if MVP deadline is tight
- Phase 8 can also be compressed to ~7 days with 8-10 parallel agents

---

## Success Criteria

### Phase Completion Checklist

- [ ] **Phase 1:** All 5 security vulnerabilities patched, no public endpoints without auth
- [ ] **Phase 2:** Transaction wrappers implemented, race conditions fixed, schema migrations applied
- [ ] **Phase 3:** All critical API endpoints return proper errors, UI bugs resolved
- [ ] **Phase 4:** Missing API registered, concurrent edit detection working
- [ ] **Phase 5:** No key={index} anti-patterns, pagination aligned
- [ ] **Phase 6:** Email/SMS stubs resolved, metrics schema complete
- [ ] **Phase 7:** Delete confirmations added, alerts replaced with toasts
- [ ] **Phase 8:** All priority features implemented, infrastructure updated

### MVP Definition of Done

- [ ] Zero P0 security vulnerabilities
- [ ] Zero P0/P1 data integrity issues
- [ ] All critical API endpoints functional
- [ ] Core business flows (orders, inventory, payments) working end-to-end
- [ ] No blocking UX issues

---

## References

- **Master Roadmap:** `docs/roadmaps/MASTER_ROADMAP.md`
- **Beta Execution Plan:** `docs/roadmaps/BETA_EXECUTION_PLAN.md`
- **Task Prompts:** `docs/prompts/*.md`
- **Session Logs:** `docs/sessions/completed/`
