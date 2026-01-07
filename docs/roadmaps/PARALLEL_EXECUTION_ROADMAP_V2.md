# TERP Parallel Execution Roadmap v2 (Stability-Focused)

**Created**: January 7, 2026  
**Goal**: User testing ready by Thursday with long-term stable fixes  
**Total Effort**: ~40-50 hours across 6 agents  
**Calendar Time**: ~2.5 days with parallel execution

---

## Executive Summary

This roadmap maximizes parallel execution while ensuring every fix is:
- ✅ Root-cause based (not just symptom treatment)
- ✅ Tested with unit/integration tests
- ✅ Logged for debugging
- ✅ Documented for future reference
- ✅ Rollback-ready

---

## Parallel Execution Diagram

```
                    DAY 1 MORNING (8 hours parallel capacity)
    ┌─────────────────────────────────────────────────────────────────┐
    │                                                                 │
    │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
    │  │ WAVE 1A         │  │ WAVE 1B         │  │ WAVE 1C         │ │
    │  │ Backend Dev     │  │ Frontend Dev    │  │ QA Engineer     │ │
    │  │                 │  │                 │  │                 │ │
    │  │ BUG-040: Order  │  │ QA-049: Prods   │  │ Smoke Tests     │ │
    │  │ BUG-041: Batch  │  │ QA-050: Samples │  │ Verification    │ │
    │  │ BUG-043: Perms  │  │                 │  │ Runbook         │ │
    │  │                 │  │                 │  │                 │ │
    │  │ 5-6 hours       │  │ 4-5 hours       │  │ 3-4 hours       │ │
    │  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
    │         │                    │                    │            │
    └─────────┼────────────────────┼────────────────────┼────────────┘
              │                    │                    │
              ▼                    ▼                    ▼
                    DAY 1 PM - DAY 2 AM (8 hours parallel capacity)
    ┌─────────────────────────────────────────────────────────────────┐
    │                                                                 │
    │  ┌─────────────────────────────┐  ┌─────────────────────────┐  │
    │  │ WAVE 2A                     │  │ WAVE 2B                 │  │
    │  │ Full Stack Dev              │  │ QA/Frontend Dev         │  │
    │  │                             │  │                         │  │
    │  │ BUG-042: Search (+ indexes) │  │ BUG-070: Spreadsheet    │  │
    │  │ BUG-045: Retry (Order)      │  │ Navigation Audit        │  │
    │  │ BUG-046: Auth Errors        │  │ Modal Audit             │  │
    │  │ BUG-048: Retry (Clients)    │  │ Regression Tests        │  │
    │  │                             │  │                         │  │
    │  │ 5-6 hours                   │  │ 4-5 hours               │  │
    │  └─────────────────────────────┘  └─────────────────────────┘  │
    │                    │                         │                  │
    └────────────────────┼─────────────────────────┼──────────────────┘
                         │                         │
                         ▼                         ▼
                         ┌─────────────────────────┐
                         │ WAVE 3                  │
                         │ Lead Developer          │
                         │                         │
                         │ Merge All Branches      │
                         │ Run Full Test Suite     │
                         │ Database Migration      │
                         │ Deploy & Verify         │
                         │ Monitor                 │
                         │                         │
                         │ 4-5 hours               │
                         └─────────────────────────┘
                                    │
                                    ▼
                         ┌─────────────────────────┐
                         │  THURSDAY: USER TESTING │
                         └─────────────────────────┘
```

---

## Wave Details

### Wave 1A: Backend Critical Fixes

| Task | Description | Hours | Files |
|------|-------------|-------|-------|
| BUG-040 | Order Creator inventory loading | 2-3 | `pricingEngine.ts` |
| BUG-041 | Batch Detail View crash | 2 | `BatchDetailDrawer.tsx`, `inventory.ts` |
| BUG-043 | Permission Service SQL | 1.5 | `permissionService.ts` |
| **Total** | | **5-6** | |

**Stability Focus**:
- Default pricing fallback (not empty array)
- Server-side array normalization
- Security-aware permission handling
- Unit tests for each fix

**Prompt**: `docs/agent_prompts/execution_v2/WAVE_1A_PROMPT.md`

---

### Wave 1B: Frontend Data Display Fixes

| Task | Description | Hours | Files |
|------|-------------|-------|-------|
| QA-049 | Products page empty | 2-2.5 | `ProductsPage.tsx`, `productCatalogue.ts` |
| QA-050 | Samples page empty | 2-2.5 | `SamplesPage.tsx`, `samples.ts` |
| **Total** | | **4-5** | |

**Stability Focus**:
- Root cause investigation FIRST
- Debug logging added
- Integration tests
- Postmortem documentation

**Prompt**: `docs/agent_prompts/execution_v2/WAVE_1B_PROMPT.md`

---

### Wave 1C: Test Infrastructure (NEW)

| Task | Description | Hours | Files |
|------|-------------|-------|-------|
| Smoke Tests | Automated critical path tests | 1.5 | `tests/smoke/` |
| Verification | Manual checklist | 1 | `tests/manual/` |
| Runbook | Deployment procedure | 1 | `docs/deployment/` |
| **Total** | | **3-4** | |

**Stability Focus**:
- Verification before AND after deployment
- Rollback procedures documented
- Team communication plan

**Prompt**: `docs/agent_prompts/execution_v2/WAVE_1C_PROMPT.md`

---

### Wave 2A: Search & Form Fixes

| Task | Description | Hours | Files |
|------|-------------|-------|-------|
| BUG-042 | Global search | 3-4 | `search.ts`, migrations |
| BUG-045 | Order retry button | 0.5 | `OrderCreatorPage.tsx` |
| BUG-046 | Auth error messages | 1.5 | `trpc.ts`, error handlers |
| BUG-048 | Clients retry button | 0.5 | `ClientsListPage.tsx` |
| **Total** | | **5-6** | |

**Stability Focus**:
- Database indexes for search performance
- Reusable retry hook
- Differentiated error types
- Security audit logging

**Prompt**: `docs/agent_prompts/execution_v2/WAVE_2A_PROMPT.md`

---

### Wave 2B: Navigation & Verification

| Task | Description | Hours | Files |
|------|-------------|-------|-------|
| BUG-070 | Spreadsheet View 404 | 1-2 | `App.tsx` |
| Nav Audit | All routes work | 2 | Various |
| Modal Audit | All modals work | 1.5 | Various |
| Regression | E2E tests | 1 | `tests/e2e/` |
| **Total** | | **4-5** | |

**Stability Focus**:
- Investigation before fixing
- Comprehensive audits
- Regression test suite
- Documentation of findings

**Prompt**: `docs/agent_prompts/execution_v2/WAVE_2B_PROMPT.md`

---

### Wave 3: Integration & Deployment

| Task | Description | Hours | Files |
|------|-------------|-------|-------|
| Merge | All branches | 1 | Git |
| Test | Full suite | 0.5 | - |
| Migration | Database | 0.5 | Drizzle |
| Deploy | Production | 0.5 | DigitalOcean |
| Verify | All fixes | 1 | Manual |
| Monitor | Post-deploy | 0.5+ | Logs |
| **Total** | | **4-5** | |

**Stability Focus**:
- Ordered merge process
- Staging deployment (if available)
- Rollback plan ready
- Post-deployment monitoring

**Prompt**: `docs/agent_prompts/execution_v2/WAVE_3_PROMPT.md`

---

## Time Comparison

| Approach | Calendar Time | Agent Hours |
|----------|---------------|-------------|
| Sequential | ~28 hours | 28 hours |
| **Parallel (v2)** | **~16 hours** | 28 hours |
| **Savings** | **43%** | Same effort |

---

## Agent Assignment

| Agent | Wave | Role | Start | End |
|-------|------|------|-------|-----|
| Agent 1 | 1A | Backend Dev | Day 1 8am | Day 1 2pm |
| Agent 2 | 1B | Frontend Dev | Day 1 8am | Day 1 1pm |
| Agent 3 | 1C | QA Engineer | Day 1 8am | Day 1 12pm |
| Agent 4 | 2A | Full Stack | Day 1 2pm | Day 1 8pm |
| Agent 5 | 2B | QA/Frontend | Day 1 2pm | Day 1 7pm |
| Agent 6 | 3 | Lead Dev | Day 2 8am | Day 2 1pm |

---

## Dependency Graph

```
Wave 1A ─────┐
             │
Wave 1B ─────┼──────► Wave 3 ──────► THURSDAY
             │
Wave 1C ─────┤
             │
Wave 2A ─────┤
             │
Wave 2B ─────┘
```

**Key Dependencies**:
- Wave 3 cannot start until 1A, 1B, 2A, 2B complete
- Wave 1C provides verification tools for Wave 3
- Wave 2A and 2B have no dependencies on each other
- Wave 1A and 1B have no dependencies on each other

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Merge conflicts | Ordered merge process, conflict resolution guide |
| Test failures | Fix before proceeding, document if non-critical |
| Deployment failure | Rollback procedure documented and tested |
| Performance regression | Search indexes, monitoring |
| Security issues | Permission handling documented, audit logging |

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| P0 Bugs Fixed | 4/4 | Manual verification |
| P1 Bugs Fixed | 4/4 | Manual verification |
| Test Pass Rate | 100% | `pnpm test` |
| New Errors Post-Deploy | 0 | Error monitoring |
| User Flows Working | 7/7 | Verification checklist |

---

## Post-Thursday Waves (Deferred)

After Thursday, continue with stability and features:

| Wave | Focus | Duration | Priority |
|------|-------|----------|----------|
| 4A | SQL Safety Audit | 6-8h | P2 |
| 4B | Error Handling & UX | 8-10h | P2 |
| 5 | Integrations (Email/SMS) | 12-16h | P2 |
| 6 | Features & Tech Debt | 20-30h | P3 |

Full prompts for post-Thursday waves are available in:
- `docs/agent_prompts/execution_v2/WAVE_4A_PROMPT.md`
- `docs/agent_prompts/execution_v2/WAVE_4B_PROMPT.md`
- `docs/agent_prompts/execution_v2/WAVE_5_PROMPT.md`
- `docs/agent_prompts/execution_v2/WAVE_6_PROMPT.md`

---

## Quick Start

### To Start Immediately:

**Agent 1 (Backend)**:
```bash
cat docs/agent_prompts/execution_v2/WAVE_1A_PROMPT.md
```

**Agent 2 (Frontend)**:
```bash
cat docs/agent_prompts/execution_v2/WAVE_1B_PROMPT.md
```

**Agent 3 (QA)**:
```bash
cat docs/agent_prompts/execution_v2/WAVE_1C_PROMPT.md
```

All three can start simultaneously.
