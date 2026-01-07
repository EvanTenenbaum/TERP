# TERP Complete Execution Roadmap

**Created**: January 7, 2026  
**Thursday Deadline**: January 9, 2026  
**Total Waves**: 6 (3 pre-Thursday, 3 post-Thursday)

---

## Roadmap Overview

### Pre-Thursday (User Testing Ready)

| Wave | Focus | Duration | Agents | Parallel? |
|------|-------|----------|--------|-----------|
| **Wave 1A** | Order & Batch Crashes | Day 1 AM | 1 | Yes |
| **Wave 1B** | Data Display Fixes | Day 1 AM | 1 | Yes (with 1A) |
| **Wave 2A** | Search & Forms | Day 1 PM - Day 2 AM | 1 | Yes |
| **Wave 2B** | Navigation & Verification | Day 2 | 1 | Yes (with 2A) |
| **Wave 3** | Final Integration & Deploy | Day 2 PM - Day 3 AM | 1 | No |

### Post-Thursday (Stability & Features)

| Wave | Focus | Duration | Agents | Parallel? |
|------|-------|----------|--------|-----------|
| **Wave 4A** | SQL Safety Fixes | Week 2 | 1 | Yes |
| **Wave 4B** | Error Handling & UX | Week 2 | 1 | Yes (with 4A) |
| **Wave 5** | Integrations | Week 2-3 | 2 | Partial |
| **Wave 6** | Features & Tech Debt | Week 3-4 | 2 | Yes |

---

## Pre-Thursday Waves (Detailed)

### Wave 1A: Order & Batch Crashes (Day 1 Morning)

**Agent**: Backend Developer  
**Duration**: 4-5 hours  
**Dependencies**: None  
**Can Run Parallel With**: Wave 1B

| Task ID | Description | File | Hours |
|---------|-------------|------|-------|
| BUG-040 | Order Creator inventory loading fails | `server/pricingEngine.ts` | 2-3 |
| BUG-041 | Batch Detail View crashes app | `client/src/components/inventory/BatchDetailDrawer.tsx` | 1-2 |
| BUG-043 | Permission Service empty array SQL | `server/services/permissionService.ts` | 1 |

---

### Wave 1B: Data Display Fixes (Day 1 Morning)

**Agent**: Frontend Developer  
**Duration**: 3-4 hours  
**Dependencies**: None  
**Can Run Parallel With**: Wave 1A

| Task ID | Description | File | Hours |
|---------|-------------|------|-------|
| QA-049 | Products page shows empty | `client/src/pages/ProductsPage.tsx` | 1-2 |
| QA-050 | Samples page shows empty | `client/src/pages/SamplesPage.tsx` | 1-2 |
| DEBUG | Add console logging to diagnose | Various | 0.5 |

---

### Wave 2A: Search & Forms (Day 1 PM - Day 2 AM)

**Agent**: Full Stack Developer  
**Duration**: 4-5 hours  
**Dependencies**: Wave 1A complete  
**Can Run Parallel With**: Wave 2B

| Task ID | Description | File | Hours |
|---------|-------------|------|-------|
| BUG-042 | Global Search returns no results | `server/routers/search.ts` | 2-3 |
| BUG-045 | Retry button resets form | `client/src/pages/OrderCreatorPage.tsx` | 0.5 |
| BUG-048 | ClientsListPage Retry resets | `client/src/pages/ClientsListPage.tsx` | 0.5 |
| BUG-046 | Settings Users auth error message | `server/_core/trpc.ts` | 1 |

---

### Wave 2B: Navigation & Verification (Day 2)

**Agent**: QA/Frontend Developer  
**Duration**: 4-5 hours  
**Dependencies**: Wave 1B complete  
**Can Run Parallel With**: Wave 2A

| Task ID | Description | File | Hours |
|---------|-------------|------|-------|
| BUG-070 | Spreadsheet View 404 | Route config | 1-2 |
| NAV-001 | Verify all nav links work | Manual test | 1 |
| MODAL-001 | Verify all modals open/close | Manual test | 1 |
| E2E-001 | Test order creation flow | Manual test | 1 |

---

### Wave 3: Final Integration & Deploy (Day 2 PM - Day 3 AM)

**Agent**: Lead Developer  
**Duration**: 3-4 hours  
**Dependencies**: Waves 2A and 2B complete  
**Can Run Parallel With**: None

| Task ID | Description | Hours |
|---------|-------------|-------|
| MERGE-001 | Merge all Wave 1-2 branches | 0.5 |
| TEST-001 | Full regression test | 1-2 |
| FIX-001 | Fix any issues found | 1-2 |
| DEPLOY-001 | Deploy to production | 0.5 |

---

## Post-Thursday Waves (Detailed)

### Wave 4A: SQL Safety Fixes (Week 2)

**Agent**: Backend Developer  
**Duration**: 6-8 hours  
**Dependencies**: Thursday deployment stable  
**Can Run Parallel With**: Wave 4B

| Task ID | Description | File | Hours |
|---------|-------------|------|-------|
| BUG-044 | VIP Portal empty batch IDs | `server/routers/vipPortal.ts` | 1 |
| BUG-049 | Live Catalog SQL injection | `server/services/liveCatalogService.ts` | 1 |
| BUG-052 | Tag Management empty array | `server/routers/tags.ts` | 1 |
| BUG-053 | Credit Engine empty session | `server/services/creditEngine.ts` | 1 |
| SQL-001 | Audit all inArray() calls | Various | 2-3 |

---

### Wave 4B: Error Handling & UX (Week 2)

**Agent**: Frontend Developer  
**Duration**: 8-10 hours  
**Dependencies**: Thursday deployment stable  
**Can Run Parallel With**: Wave 4A

| Task ID | Description | File | Hours |
|---------|-------------|------|-------|
| UX-001 | Empty state for Analytics | `client/src/pages/AnalyticsPage.tsx` | 1 |
| UX-002 | Empty state for Calendar | `client/src/pages/CalendarPage.tsx` | 1 |
| UX-003 | Empty state for Photography | `client/src/pages/PhotographyPage.tsx` | 1 |
| UX-004 | Loading skeletons for tables | Various | 2-3 |
| UX-005 | Improve error messages | Various | 2-3 |
| UX-006 | Toast notifications | Various | 1-2 |

---

### Wave 5: Integrations (Week 2-3)

**Agent 1**: Backend Developer (Email/SMS)  
**Agent 2**: Backend Developer (Accounting)  
**Duration**: 12-16 hours total  
**Dependencies**: Wave 4 complete  
**Can Run Parallel With**: Partial (Agent 1 and 2 parallel)

#### Agent 1: Communication Integrations

| Task ID | Description | File | Hours |
|---------|-------------|------|-------|
| INT-001 | Email service (SendGrid) | `server/routers/receipts.ts` | 4-6 |
| INT-002 | SMS service (Twilio) | `server/routers/receipts.ts` | 4-6 |
| INT-006 | Calendar email notifications | `server/_core/calendarJobs.ts` | 2-3 |

#### Agent 2: Accounting Integrations

| Task ID | Description | File | Hours |
|---------|-------------|------|-------|
| INT-003 | Invoice → Accounting sync | `server/ordersDb.ts` | 3-4 |
| INT-004 | Payment → Credit update | `server/ordersDb.ts` | 2-3 |
| INT-005 | Order → Cash payment | `server/ordersDb.ts` | 2-3 |

---

### Wave 6: Features & Tech Debt (Week 3-4)

**Agent 1**: Feature Developer  
**Agent 2**: Tech Debt Developer  
**Duration**: 20-30 hours total  
**Dependencies**: Wave 5 complete  
**Can Run Parallel With**: Yes (Agent 1 and 2 parallel)

#### Agent 1: Feature Completion

| Task ID | Description | Hours |
|---------|-------------|-------|
| FEATURE-008 | Advanced Filtering all pages | 6-8 |
| FEATURE-010 | Batch Operations all tables | 6-8 |
| FEATURE-012 | Dashboard customization | 8-12 |

#### Agent 2: Technical Debt

| Task ID | Description | Hours |
|---------|-------------|-------|
| TECH-001 | Fix schema drift | 4-6 |
| TECH-002 | Remove DO seed job | 0.5 |
| TECH-003 | Fix test mock chains | 4-6 |
| TECH-007 | Integration tests | 8-12 |
| TODO-001 | Address 35 TODO items | 6-8 |

---

## Parallel Execution Matrix

```
DAY 1 (Tuesday):
┌─────────────────────────────────────────────────────────┐
│ Morning                                                  │
│ ┌─────────────────┐  ┌─────────────────┐                │
│ │ WAVE 1A         │  │ WAVE 1B         │                │
│ │ Backend Dev     │  │ Frontend Dev    │                │
│ │ BUG-040,041,043 │  │ QA-049,050      │                │
│ │ 4-5 hours       │  │ 3-4 hours       │                │
│ └─────────────────┘  └─────────────────┘                │
│                                                          │
│ Afternoon                                                │
│ ┌─────────────────┐                                     │
│ │ WAVE 2A START   │                                     │
│ │ Full Stack Dev  │                                     │
│ │ BUG-042         │                                     │
│ └─────────────────┘                                     │
└─────────────────────────────────────────────────────────┘

DAY 2 (Wednesday):
┌─────────────────────────────────────────────────────────┐
│ Morning                                                  │
│ ┌─────────────────┐  ┌─────────────────┐                │
│ │ WAVE 2A CONT    │  │ WAVE 2B         │                │
│ │ Full Stack Dev  │  │ QA/Frontend Dev │                │
│ │ BUG-045,046,048 │  │ BUG-070, NAV    │                │
│ └─────────────────┘  └─────────────────┘                │
│                                                          │
│ Afternoon                                                │
│ ┌─────────────────────────────────────┐                 │
│ │ WAVE 3                               │                 │
│ │ Lead Dev                             │                 │
│ │ Merge, Test, Fix                     │                 │
│ └─────────────────────────────────────┘                 │
└─────────────────────────────────────────────────────────┘

DAY 3 (Thursday Morning):
┌─────────────────────────────────────────────────────────┐
│ ┌─────────────────────────────────────┐                 │
│ │ WAVE 3 CONT                          │                 │
│ │ Final fixes + Deploy                 │                 │
│ └─────────────────────────────────────┘                 │
│                                                          │
│ ✅ READY FOR USER TESTING                               │
└─────────────────────────────────────────────────────────┘

WEEK 2:
┌─────────────────────────────────────────────────────────┐
│ ┌─────────────────┐  ┌─────────────────┐                │
│ │ WAVE 4A         │  │ WAVE 4B         │                │
│ │ Backend Dev     │  │ Frontend Dev    │                │
│ │ SQL Safety      │  │ UX Polish       │                │
│ │ 6-8 hours       │  │ 8-10 hours      │                │
│ └─────────────────┘  └─────────────────┘                │
│                                                          │
│ ┌─────────────────┐  ┌─────────────────┐                │
│ │ WAVE 5 Agent 1  │  │ WAVE 5 Agent 2  │                │
│ │ Email/SMS       │  │ Accounting      │                │
│ │ 10-15 hours     │  │ 7-10 hours      │                │
│ └─────────────────┘  └─────────────────┘                │
└─────────────────────────────────────────────────────────┘

WEEK 3-4:
┌─────────────────────────────────────────────────────────┐
│ ┌─────────────────┐  ┌─────────────────┐                │
│ │ WAVE 6 Agent 1  │  │ WAVE 6 Agent 2  │                │
│ │ Features        │  │ Tech Debt       │                │
│ │ 20-28 hours     │  │ 23-32 hours     │                │
│ └─────────────────┘  └─────────────────┘                │
└─────────────────────────────────────────────────────────┘
```

---

## Resource Summary

### Pre-Thursday (2.5 days)

| Resource | Waves | Total Hours |
|----------|-------|-------------|
| Backend Dev | 1A, 2A (partial) | 6-8 |
| Frontend Dev | 1B, 2B | 7-9 |
| Full Stack Dev | 2A | 4-5 |
| Lead Dev | 3 | 3-4 |
| **Total** | | **20-26 hours** |

### Post-Thursday (3 weeks)

| Resource | Waves | Total Hours |
|----------|-------|-------------|
| Backend Dev 1 | 4A, 5 (Email/SMS) | 16-23 |
| Backend Dev 2 | 5 (Accounting) | 7-10 |
| Frontend Dev | 4B | 8-10 |
| Feature Dev | 6 (Features) | 20-28 |
| Tech Debt Dev | 6 (Tech Debt) | 23-32 |
| **Total** | | **74-103 hours** |

---

## Success Criteria

### Thursday Checkpoint

- [ ] Order Creator works end-to-end
- [ ] Batch Detail View opens without crash
- [ ] Products page shows 121 products
- [ ] Samples page shows 6 samples
- [ ] Global Search finds products
- [ ] All navigation works
- [ ] No app crashes

### Week 2 Checkpoint

- [ ] All SQL safety issues fixed
- [ ] Empty states on all pages
- [ ] Loading skeletons visible
- [ ] Error messages clear

### Week 3-4 Checkpoint

- [ ] Email notifications working
- [ ] SMS notifications working
- [ ] Accounting integrations complete
- [ ] Advanced filtering on all pages
- [ ] TODO count < 10
