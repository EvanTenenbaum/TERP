# TERP Complete Execution Roadmap v3

**Created**: January 7, 2026  
**Status**: Active  
**Waves 1-2**: Already Launched  
**Starting Point**: Wave 3

---

## Executive Summary

This roadmap incorporates ALL remaining tasks from the MASTER_ROADMAP, QA_TASKS_BACKLOG, and LIFECYCLE_ROADMAP into a strategic, parallelized execution plan. Waves 1-2 are already in progress; this document covers Wave 3 onwards.

### Coverage

| Source | Tasks Covered |
|--------|---------------|
| Critical Bugs (P0-P1) | 8/8 (Waves 1-2) |
| Medium Bugs (P2) | 9/9 |
| Low Bugs (P3) | 9/9 |
| QA Backlog | 15/15 |
| Lifecycle Workflows | 18/18 |
| Features | 4/4 |
| Tech Debt | 5/5 |
| **Total** | **68 tasks** |

---

## Wave Overview

```
THURSDAY (Waves 1-2 Complete)
├── Wave 1A: Backend Critical ✅ MERGED
├── Wave 1B: Frontend Data Display (IN PROGRESS)
├── Wave 1C: Test Infrastructure (IN PROGRESS)
├── Wave 2A: Search & Forms (IN PROGRESS)
└── Wave 2B: Navigation Audit (IN PROGRESS)

THURSDAY PM - FRIDAY
└── Wave 3: Integration, Deploy, Verify (4-5 hours)

WEEK 2 (Post-Thursday Stability)
├── Wave 4A: SQL Safety Audit (6-8 hours)
├── Wave 4B: Error Handling & Empty States (8-10 hours)
└── Wave 4C: Silent Error Fixes (4-5 hours) ← NEW

WEEK 2-3 (Core Workflows)
├── Wave 5A: Sales Workflow (8-10 hours)
├── Wave 5B: Inventory Workflow (8-10 hours)
└── Wave 5C: Accounting Workflow (6-8 hours)

WEEK 3 (VIP Portal & Integrations)
├── Wave 6A: VIP Portal Completion (10-12 hours)
├── Wave 6B: Email/SMS Integration (8-10 hours)
└── Wave 6C: Accounting Integration (6-8 hours)

WEEK 4 (Features & Polish)
├── Wave 7A: Advanced Features (12-16 hours)
├── Wave 7B: CRM & Notifications (8-10 hours)
└── Wave 7C: Tech Debt Cleanup (6-8 hours)

ONGOING
└── Wave 8: Monitoring & Optimization
```

---

## Parallel Execution Matrix

```
WEEK 1 (Thursday)
┌─────────────────────────────────────────────────────────────┐
│ WAVE 3: Integration & Deploy (Lead Dev)                     │
│ - Merge all Wave 1-2 branches                               │
│ - Run full test suite                                       │
│ - Deploy to staging → production                            │
│ - Verify all fixes on live site                             │
└─────────────────────────────────────────────────────────────┘

WEEK 2 (3 parallel tracks)
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ WAVE 4A         │  │ WAVE 4B         │  │ WAVE 4C         │
│ Backend Dev     │  │ Frontend Dev    │  │ Full Stack      │
│ SQL Safety      │  │ Empty States    │  │ Silent Errors   │
│ 6-8 hours       │  │ 8-10 hours      │  │ 4-5 hours       │
└─────────────────┘  └─────────────────┘  └─────────────────┘

WEEK 2-3 (3 parallel tracks)
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ WAVE 5A         │  │ WAVE 5B         │  │ WAVE 5C         │
│ Sales Workflow  │  │ Inventory Flow  │  │ Accounting      │
│ 8-10 hours      │  │ 8-10 hours      │  │ 6-8 hours       │
└─────────────────┘  └─────────────────┘  └─────────────────┘

WEEK 3 (3 parallel tracks)
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ WAVE 6A         │  │ WAVE 6B         │  │ WAVE 6C         │
│ VIP Portal      │  │ Email/SMS       │  │ QuickBooks      │
│ 10-12 hours     │  │ 8-10 hours      │  │ 6-8 hours       │
└─────────────────┘  └─────────────────┘  └─────────────────┘

WEEK 4 (3 parallel tracks)
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ WAVE 7A         │  │ WAVE 7B         │  │ WAVE 7C         │
│ Features        │  │ CRM/Notifs      │  │ Tech Debt       │
│ 12-16 hours     │  │ 8-10 hours      │  │ 6-8 hours       │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

---

## Wave 3: Integration & Deploy

**Timeline**: Thursday PM - Friday AM  
**Agent**: Lead Developer  
**Duration**: 4-5 hours  
**Dependencies**: Waves 1-2 complete

### Tasks

| Step | Action | Time |
|------|--------|------|
| 1 | Merge all Wave 1-2 PRs to main | 30min |
| 2 | Run full test suite locally | 30min |
| 3 | Deploy to staging environment | 30min |
| 4 | Execute smoke tests on staging | 45min |
| 5 | Deploy to production | 30min |
| 6 | Verify all fixes on production | 1hr |
| 7 | Update MASTER_ROADMAP statuses | 30min |

### Success Criteria

- [ ] All Wave 1-2 PRs merged
- [ ] All tests passing
- [ ] Production deployed
- [ ] BUG-040, 041, 042, 043, 045, 046, 048 verified fixed
- [ ] QA-049, QA-050 verified fixed
- [ ] No new errors in logs

---

## Wave 4: Post-Thursday Stability

### Wave 4A: SQL Safety Audit

**Timeline**: Week 2, Day 1-2  
**Agent**: Backend Developer  
**Duration**: 6-8 hours  
**Can Parallel With**: Wave 4B, 4C

#### Tasks

| ID | Task | File | Hours |
|----|------|------|-------|
| BUG-044 | VIP Portal empty batch IDs | `vipPortal.ts` | 1 |
| AUDIT-1 | Create safeInArray utility | `server/utils/safeQuery.ts` | 1 |
| AUDIT-2 | Audit all inArray usages | All server files | 2 |
| AUDIT-3 | Audit sql.raw usages | All server files | 1 |
| AUDIT-4 | Add query logging | `server/db/index.ts` | 1 |
| AUDIT-5 | SQL safety tests | `server/__tests__/sqlSafety.test.ts` | 1.5 |

### Wave 4B: Error Handling & Empty States

**Timeline**: Week 2, Day 1-3  
**Agent**: Frontend Developer  
**Duration**: 8-10 hours  
**Can Parallel With**: Wave 4A, 4C

#### Tasks

| ID | Task | File | Hours |
|----|------|------|-------|
| BUG-061 | AnalyticsPage empty state | `AnalyticsPage.tsx` | 1 |
| BUG-062 | CalendarPage empty state | `CalendarPage.tsx` | 1 |
| BUG-063 | NotificationsPage empty state | `NotificationsPage.tsx` | 1 |
| BUG-064 | PhotographyPage empty state | `PhotographyPage.tsx` | 1 |
| BUG-065 | PickPackPage empty state | `PickPackPage.tsx` | 1 |
| BUG-066 | ProductsPage empty state | `ProductsPage.tsx` | 0.5 |
| BUG-067 | SampleManagement empty state | `SampleManagement.tsx` | 0.5 |
| UI-1 | Create EmptyState component | `components/ui/EmptyState.tsx` | 1 |
| UI-2 | Create loading skeletons | `components/ui/Skeleton.tsx` | 1 |
| UI-3 | Improve error boundaries | `components/ErrorBoundary.tsx` | 1 |

### Wave 4C: Silent Error Fixes (NEW)

**Timeline**: Week 2, Day 1-2  
**Agent**: Full Stack Developer  
**Duration**: 4-5 hours  
**Can Parallel With**: Wave 4A, 4B

#### Tasks

| ID | Task | File | Hours |
|----|------|------|-------|
| BUG-054 | AppointmentRequestsList safe .map() | `AppointmentRequestsList.tsx` | 0.5 |
| BUG-055 | TimeOffRequestsList safe .map() | `TimeOffRequestsList.tsx` | 0.5 |
| BUG-056 | Dashboard widgets safe .map() | `ActivityLogPanel.tsx` | 0.5 |
| BUG-057 | Search consistency fix | `search.ts` | 1 |
| BUG-058 | Auth helpers error logging | `authHelpers.ts` | 0.5 |
| BUG-059 | Inventory utils error logging | `inventoryUtils.ts` | 0.5 |
| BUG-060 | Audit router error handling | `audit.ts` | 0.5 |
| BUG-068 | Accounting specific errors | `accounting.ts` | 0.5 |
| BUG-069 | Calendar specific errors | `calendar.ts` | 0.5 |

---

## Wave 5: Core Workflows

### Wave 5A: Sales Workflow

**Timeline**: Week 2-3  
**Agent**: Full Stack Developer  
**Duration**: 8-10 hours  
**Can Parallel With**: Wave 5B, 5C

#### Lifecycle Tasks

| Task | Description | Hours |
|------|-------------|-------|
| SALES-1 | Quote creation flow | 2 |
| SALES-2 | Quote to order conversion | 2 |
| SALES-3 | Order fulfillment (pick & pack) | 2 |
| SALES-4 | Invoice generation from order | 2 |
| SALES-5 | Payment recording | 2 |

#### QA Tasks

| ID | Task | Hours |
|----|------|-------|
| QA-058 | Fix Quote Creation and Sales Features | Included above |

#### Success Criteria

- [ ] Can create client
- [ ] Can create quote for client
- [ ] Can convert quote to order
- [ ] Can fulfill order (pick & pack)
- [ ] Can generate invoice from order
- [ ] Can record payment against invoice

### Wave 5B: Inventory Workflow

**Timeline**: Week 2-3  
**Agent**: Full Stack Developer  
**Duration**: 8-10 hours  
**Can Parallel With**: Wave 5A, 5C

#### Lifecycle Tasks

| Task | Description | Hours |
|------|-------------|-------|
| INV-1 | Vendor creation | 1.5 |
| INV-2 | Purchase order creation | 2 |
| INV-3 | Goods receiving & batch creation | 2 |
| INV-4 | Batch photography | 1.5 |
| INV-5 | Batch publishing to catalog | 1.5 |

#### QA Tasks

| ID | Task | Hours |
|----|------|-------|
| QA-054 | Vendor Supply Management Backend | Included above |
| BUG-028 | Batch Form Input Fields | 1 |

#### Success Criteria

- [ ] Can create vendor
- [ ] Can create purchase order
- [ ] Can receive goods and create batch
- [ ] Can photograph batch
- [ ] Can publish batch to catalog

### Wave 5C: Accounting Workflow

**Timeline**: Week 2-3  
**Agent**: Backend Developer  
**Duration**: 6-8 hours  
**Can Parallel With**: Wave 5A, 5B

#### Tasks

| ID | Task | Hours |
|----|------|-------|
| QA-051 | Analytics & Reporting Backend | 2 |
| QA-052 | System Settings Backend | 2 |
| QA-059 | Missing Accounting Pages | 2 |
| BUG-029 | New Invoice Button | 1 |
| BUG-030 | Payment Record Navigation | 1 |

---

## Wave 6: VIP Portal & Integrations

### Wave 6A: VIP Portal Completion

**Timeline**: Week 3, Day 1-3  
**Agent**: Full Stack Developer  
**Duration**: 10-12 hours  
**Can Parallel With**: Wave 6B, 6C

#### Lifecycle Tasks

| Task | Description | Hours |
|------|-------------|-------|
| VIP-1 | Client login flow | 2 |
| VIP-2 | Live catalog browsing | 2 |
| VIP-3 | AR/AP balance viewing | 2 |
| VIP-4 | Order placement | 3 |
| VIP-5 | Order history viewing | 2 |
| VIP-6 | Document downloads | 1 |

#### Success Criteria

- [ ] Client can log into VIP portal
- [ ] Client can browse live catalog
- [ ] Client can view AR/AP balances
- [ ] Client can place order
- [ ] Client can view order history
- [ ] Client can download documents

### Wave 6B: Email/SMS Integration

**Timeline**: Week 3, Day 1-3  
**Agent**: Backend Developer  
**Duration**: 8-10 hours  
**Can Parallel With**: Wave 6A, 6C

#### Tasks

| Task | Description | Hours |
|------|-------------|-------|
| EMAIL-1 | Email service setup (Resend) | 2 |
| EMAIL-2 | Email templates | 2 |
| EMAIL-3 | Invoice/payment notifications | 1.5 |
| SMS-1 | SMS service setup (Twilio) | 2 |
| SMS-2 | Order/delivery notifications | 1.5 |
| NOTIF-1 | Notification preferences | 1 |

### Wave 6C: Accounting Integration

**Timeline**: Week 3, Day 1-2  
**Agent**: Backend Developer  
**Duration**: 6-8 hours  
**Can Parallel With**: Wave 6A, 6B

#### Tasks

| Task | Description | Hours |
|------|-------------|-------|
| QB-1 | QuickBooks connection | 2 |
| QB-2 | Invoice sync | 2 |
| QB-3 | Payment sync | 2 |
| QB-4 | Sync queue & retry logic | 2 |

---

## Wave 7: Features & Polish

### Wave 7A: Advanced Features

**Timeline**: Week 4, Day 1-4  
**Agent**: Full Stack Developer  
**Duration**: 12-16 hours  
**Can Parallel With**: Wave 7B, 7C

#### Tasks

| ID | Task | Hours |
|----|------|-------|
| FEATURE-008 | Advanced Filtering & Sorting | 8 |
| FEATURE-012 | Batch Operations | 4 |
| QA-053 | Retrofit Architectural Fixes | 4 |

### Wave 7B: CRM & Notifications

**Timeline**: Week 4, Day 1-3  
**Agent**: Full Stack Developer  
**Duration**: 8-10 hours  
**Can Parallel With**: Wave 7A, 7C

#### Tasks

| ID | Task | Hours |
|----|------|-------|
| QA-057 | CRM Sub-Features | 4 |
| NOTIF-2 | Calendar event notifications | 2 |
| NOTIF-3 | Task assignment notifications | 2 |
| BUG-038 | Generate Credit Limit Button | 1 |
| BUG-039 | Client Profile COGS Duplication | 1 |

#### Lifecycle Tasks

- [ ] Calendar events trigger notifications
- [ ] Task assignments trigger notifications
- [ ] Notification preferences respected
- [ ] Reminders delivered on time

### Wave 7C: Tech Debt Cleanup

**Timeline**: Week 4, Day 1-2  
**Agent**: Backend Developer  
**Duration**: 6-8 hours  
**Can Parallel With**: Wave 7A, 7B

#### Tasks

| ID | Task | Hours |
|----|------|-------|
| CLEANUP-012 | Remove old impersonation code | 2 |
| FIX-012-003 | Audit log retention policy | 2 |
| CLEANUP-DO | Remove seed-fill-gaps job | 1 |
| TODO-AUDIT | Address critical TODOs | 2 |
| QA-061 | Returns Processing Modal | 1 |

---

## Wave 8: Monitoring & Optimization (Ongoing)

**Timeline**: Continuous  
**Agent**: DevOps/Backend  
**Duration**: Ongoing

### Tasks

| Task | Description | Frequency |
|------|-------------|-----------|
| MON-1 | Error rate monitoring | Daily |
| MON-2 | Performance metrics | Weekly |
| MON-3 | Database query optimization | Weekly |
| MON-4 | Security audit | Monthly |
| MON-5 | Dependency updates | Monthly |

---

## Timeline Summary

| Week | Waves | Focus | Hours |
|------|-------|-------|-------|
| **Thu** | 3 | Deploy & Verify | 4-5 |
| **Week 2** | 4A, 4B, 4C | Stability | 18-23 |
| **Week 2-3** | 5A, 5B, 5C | Core Workflows | 22-28 |
| **Week 3** | 6A, 6B, 6C | VIP & Integrations | 24-30 |
| **Week 4** | 7A, 7B, 7C | Features & Polish | 26-34 |
| **Ongoing** | 8 | Monitoring | - |

**Total**: ~94-120 hours (with parallelization: ~4 weeks calendar time)

---

## Agent Assignment Recommendations

| Wave | Ideal Agent Profile |
|------|---------------------|
| 3 | Lead Dev with deploy access |
| 4A | Backend specialist (SQL/Drizzle) |
| 4B | Frontend specialist (React/UI) |
| 4C | Full stack (error handling) |
| 5A | Full stack (business logic) |
| 5B | Full stack (inventory domain) |
| 5C | Backend (accounting domain) |
| 6A | Full stack (auth/portal) |
| 6B | Backend (integrations) |
| 6C | Backend (QuickBooks API) |
| 7A | Senior full stack |
| 7B | Full stack (CRM) |
| 7C | Backend (cleanup) |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Wave 3 deploy fails | Rollback procedure documented |
| Integration conflicts | Ordered merge process |
| External API failures | Retry queues, graceful degradation |
| Scope creep | Strict task boundaries |
| Resource constraints | Prioritized parallel tracks |

---

## Success Metrics

| Metric | Current | Week 2 | Week 4 |
|--------|---------|--------|--------|
| P0 Bugs | 0 | 0 | 0 |
| P1 Bugs | 0 | 0 | 0 |
| P2 Bugs | 9 | 0 | 0 |
| P3 Bugs | 9 | 4 | 0 |
| Workflow Completion | 40% | 70% | 100% |
| Test Coverage | ~60% | 75% | 85% |
| Error Rate | Unknown | <1% | <0.1% |

---

## Files

All agent prompts located in: `docs/agent_prompts/execution_v3/`

| Wave | Prompt File |
|------|-------------|
| 3 | `WAVE_3_PROMPT.md` |
| 4A | `WAVE_4A_PROMPT.md` |
| 4B | `WAVE_4B_PROMPT.md` |
| 4C | `WAVE_4C_PROMPT.md` |
| 5A | `WAVE_5A_PROMPT.md` |
| 5B | `WAVE_5B_PROMPT.md` |
| 5C | `WAVE_5C_PROMPT.md` |
| 6A | `WAVE_6A_PROMPT.md` |
| 6B | `WAVE_6B_PROMPT.md` |
| 6C | `WAVE_6C_PROMPT.md` |
| 7A | `WAVE_7A_PROMPT.md` |
| 7B | `WAVE_7B_PROMPT.md` |
| 7C | `WAVE_7C_PROMPT.md` |
