# 🚀 QUAL-003: Parallel Execution Strategy

**Initiative:** Complete Critical TODOs  
**Total Scope:** 87 TODOs across 27 files  
**Estimated Effort:** 60-84 hours  
**Target Duration:** 5-7 days with parallel agents  
**Created:** December 22, 2025

---

## Executive Summary

This strategy organizes QUAL-003 into **4 waves** executed by **parallel agents** with zero file conflicts. Each wave has a **gate checkpoint** before the next wave begins, ensuring stability and integration quality.

### Key Principles

1. **File Isolation**: No two agents touch the same file simultaneously
2. **Wave Gates**: Each wave must pass QA before next wave starts
3. **Dependency Order**: Critical security fixes first, then features
4. **Integration Points**: Shared utilities created in Wave 0 (foundation)
5. **Rollback Ready**: Each wave is independently deployable

---

## Wave Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  WAVE 0: Foundation (Sequential - 1 Agent)                      │
│  Create shared utilities that other waves depend on             │
│  Duration: 2-3 hours | Gate: Utilities tested & merged          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  WAVE 1: Security & Auth (Parallel - 3 Agents)                  │
│  Fix hardcoded user IDs and permission checks                   │
│  Duration: 4-6 hours | Gate: All auth fixes verified            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  WAVE 2: Core Business Logic (Parallel - 4 Agents)              │
│  Accounting integration, COGS, matching engine                  │
│  Duration: 8-12 hours | Gate: Financial calculations verified   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  WAVE 3: Features & Polish (Parallel - 4 Agents)                │
│  VIP Portal, Dashboard, UI improvements                         │
│  Duration: 8-12 hours | Gate: E2E workflows pass                │
└─────────────────────────────────────────────────────────────────┘
```

---

## WAVE 0: Foundation (Sequential)

**Purpose:** Create shared utilities that multiple waves will use  
**Duration:** 2-3 hours  
**Agents:** 1 (sequential to avoid conflicts)  
**Priority:** 🔴 BLOCKER - Must complete before Wave 1

### Tasks

| ID | File | Task | Est |
|----|------|------|-----|
| W0-001 | `server/_core/authHelpers.ts` | Create `getCurrentUserId(ctx)` helper that throws if no user | 30m |
| W0-002 | `server/_core/fiscalPeriod.ts` | Create `getFiscalPeriodId(date)` utility | 30m |
| W0-003 | `server/_core/accountLookup.ts` | Create `getAccountIdByName(name)` utility | 30m |
| W0-004 | `server/services/notificationService.ts` | Create notification service stub | 30m |

### Deliverables

```typescript
// server/_core/authHelpers.ts
export function getCurrentUserId(ctx: Context): number {
  const userId = getAuthenticatedUserId(ctx);
  if (!userId || userId === -1) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not authenticated' });
  }
  return userId;
}

// server/_core/fiscalPeriod.ts  
export async function getFiscalPeriodId(date: Date): Promise<number> {
  // Query fiscal_periods table for matching period
  // Return period ID or throw if not found
}

// server/_core/accountLookup.ts
export async function getAccountIdByName(name: string): Promise<number> {
  // Query chart_of_accounts for account by name
  // Return account ID or throw if not found
}
```

### Gate Checkpoint W0

- [ ] All 4 utilities created with proper types
- [ ] Unit tests for each utility (100% coverage)
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes
- [ ] Merged to main

---

## WAVE 1: Security & Auth (Parallel - 3 Agents)

**Purpose:** Fix all hardcoded user IDs and permission bypasses  
**Duration:** 4-6 hours  
**Agents:** 3 (parallel, no file conflicts)  
**Priority:** 🔴 CRITICAL - Security vulnerabilities  
**Depends On:** Wave 0 complete

### Agent Assignment

#### Agent 1A: Frontend Auth Fixes
**Files:** Client-side components only

| ID | File | Line | TODO | Fix |
|----|------|------|------|-----|
| W1-A1 | `ClientNeedsTab.tsx` | 70, 91 | `createdBy: 1, userId: 1` | Use `useAuth()` hook |
| W1-A2 | `ClientInterestWidget.tsx` | 42 | `userId: 1` | Use `useAuth()` hook |
| W1-A3 | `PurchaseOrdersPage.tsx` | 193 | `createdBy: 1` | Use `useAuth()` hook |

**Estimated Time:** 2 hours

#### Agent 1B: Server Auth Fixes
**Files:** Server routers only

| ID | File | Line | TODO | Fix |
|----|------|------|------|-----|
| W1-B1 | `rbac-users.ts` | 582 | Re-enable auth check | Use `protectedProcedure` |
| W1-B2 | `calendarRecurrence.ts` | 216 | Check admin permission | Add `requirePermission('calendar:admin')` |

**Estimated Time:** 2 hours

#### Agent 1C: Auth Integration Tests
**Files:** Test files only

| ID | File | Task |
|----|------|------|
| W1-C1 | `auth-integration.test.ts` | Create integration tests for auth fixes |
| W1-C2 | `permission-checks.test.ts` | Test permission middleware |

**Estimated Time:** 2 hours

### Gate Checkpoint W1

- [ ] No hardcoded user IDs remain in codebase
- [ ] All protected routes require authentication
- [ ] Permission checks enforced on admin routes
- [ ] Integration tests pass
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes
- [ ] Security audit script passes: `grep -r "userId: 1\|createdBy: 1" --include="*.ts" --include="*.tsx" | wc -l` returns 0
- [ ] Merged to main

---

## WAVE 2: Core Business Logic (Parallel - 4 Agents)

**Purpose:** Complete accounting integration and business logic  
**Duration:** 8-12 hours  
**Agents:** 4 (parallel, isolated by module)  
**Priority:** 🟡 HIGH - Financial data integrity  
**Depends On:** Wave 1 complete

### Agent Assignment

#### Agent 2A: Orders → Accounting Integration
**Files:** `server/ordersDb.ts` (exclusive)

| ID | Line | TODO | Implementation |
|----|------|------|----------------|
| W2-A1 | 314-316 | Create invoice, record payment, update credit | Call accounting service |
| W2-A2 | 555 | Handle items updates | Implement COGS recalculation |
| W2-A3 | 593-594 | Restore inventory, reverse accounting | Implement cancellation logic |
| W2-A4 | 744 | Create invoice, record payment, update credit | Duplicate of 314-316 |
| W2-A5 | 761, 772 | Implement export logic | Create CSV/PDF export |

**Estimated Time:** 4 hours

#### Agent 2B: Bad Debt & Fiscal Periods
**Files:** `server/badDebtDb.ts`, `server/accountingHooks.ts` (exclusive)

| ID | File | Line | TODO | Implementation |
|----|------|------|------|----------------|
| W2-B1 | `badDebtDb.ts` | 167, 181, 317, 331 | Reference actual account IDs | Use `getAccountIdByName()` |
| W2-B2 | `badDebtDb.ts` | 174, 188, 324, 338 | Calculate fiscal period | Use `getFiscalPeriodId()` |
| W2-B3 | `accountingHooks.ts` | 71 | Implement fiscal period lookup | Use `getFiscalPeriodId()` |

**Estimated Time:** 3 hours

#### Agent 2C: COGS Module
**Files:** `server/routers/cogs.ts` (exclusive)

| ID | Line | TODO | Implementation |
|----|------|------|----------------|
| W2-C1 | 14 | Implement COGS management | Create `getCOGS()` procedure |
| W2-C2 | 27 | Implement COGS management | Create `calculateCOGS()` procedure |
| W2-C3 | 35 | Implement COGS management | Create `updateCOGS()` procedure |

**Estimated Time:** 3 hours

#### Agent 2D: Calendar Financials
**Files:** `server/routers/calendarFinancials.ts` (exclusive)

| ID | Line | TODO | Implementation |
|----|------|------|----------------|
| W2-D1 | 25, 62, 87 | Integrate with accounting module | Call accounting router |
| W2-D2 | 134 | Use user's timezone | Get from user preferences |

**Estimated Time:** 2 hours

### Gate Checkpoint W2

- [ ] Order creation generates invoices automatically
- [ ] Order cancellation reverses accounting entries
- [ ] Bad debt entries reference correct accounts
- [ ] Fiscal periods calculated correctly
- [ ] COGS module functional
- [ ] Financial calculations verified (no floating-point errors)
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes
- [ ] Accounting integration tests pass
- [ ] Merged to main

---

## WAVE 3: Features & Polish (Parallel - 4 Agents)

**Purpose:** Complete VIP Portal, Dashboard, and UI features  
**Duration:** 8-12 hours  
**Agents:** 4 (parallel, isolated by module)  
**Priority:** 🟡 MEDIUM - Feature completion  
**Depends On:** Wave 2 complete

### Agent Assignment

#### Agent 3A: VIP Portal Features
**Files:** `server/routers/vipPortal.ts`, `server/routers/vipPortalAdmin.ts` (exclusive)

| ID | File | Line | TODO | Implementation |
|----|------|------|------|----------------|
| W3-A1 | `vipPortal.ts` | 176 | Send password reset email | Integrate email service |
| W3-A2 | `vipPortal.ts` | 315, 317 | Calculate credit/supply counts | Query actual data |
| W3-A3 | `vipPortal.ts` | 656, 677, 691 | Implement supply CRUD | Create supply operations |
| W3-A4 | `vipPortal.ts` | 804, 814 | Add creditLimit, dueDate | Schema already has these |
| W3-A5 | `vipPortalAdmin.ts` | 236, 247 | Order integration | Call orders service |

**Estimated Time:** 4 hours

#### Agent 3B: Dashboard & Metrics
**Files:** `server/routers/dashboard.ts`, `server/dataCardMetricsDb.ts` (exclusive)

| ID | File | Line | TODO | Implementation |
|----|------|------|------|----------------|
| W3-B1 | `dashboard.ts` | 187 | Low stock threshold | Query batches with qty < threshold |
| W3-B2 | `dashboard.ts` | 191, 193, 195 | Period changes | Calculate vs previous period |
| W3-B3 | `dashboard.ts` | 374 | Oldest debt calculation | Query oldest unpaid invoice |
| W3-B4 | `dataCardMetricsDb.ts` | 258, 379 | Schema fields | Remove metrics or add fields |

**Estimated Time:** 3 hours

#### Agent 3C: Matching Engine & Services
**Files:** `server/routers/matchingEnhanced.ts`, `server/matchingEngine*.ts`, `server/services/liveCatalogService.ts` (exclusive)

| ID | File | Line | TODO | Implementation |
|----|------|------|------|----------------|
| W3-C1 | `matchingEnhanced.ts` | 143 | Full matching logic | Implement algorithm |
| W3-C2 | `matchingEnhanced.ts` | 173 | Predictive analytics | Implement ML model |
| W3-C3 | `matchingEnhanced.ts` | 199, 219 | Buyer matching | Implement buyer logic |
| W3-C4 | `matchingEngine.ts` | 25 | Improve typing | Replace `any` with proper type |
| W3-C5 | `matchingEngineEnhanced.ts` | 31, 577 | Improve typing, strain lookup | Fix types |
| W3-C6 | `liveCatalogService.ts` | 236, 238, 250, 297, 307 | Complete catalog data | Implement queries |

**Estimated Time:** 4 hours

#### Agent 3D: UI & Miscellaneous
**Files:** Client components, misc server files (exclusive)

| ID | File | Line | TODO | Implementation |
|----|------|------|------|----------------|
| W3-D1 | `InboxItem.tsx` | 97 | Navigate to entity | Add router navigation |
| W3-D2 | `BatchDetailDrawer.tsx` | 324, 334, 611 | Product relation, avg price | Enable when API ready |
| W3-D3 | `ClientsListPage.tsx` | 877 | Implement archive | Add soft delete |
| W3-D4 | `calendarJobs.ts` | 45, 124-127, 158, 174 | Notifications, cron | Implement job system |
| W3-D5 | `webhooks/github.ts` | 131 | Background job | Implement DO polling |
| W3-D6 | `calendarMeetings.ts` | 111 | Meeting type | Determine from context |
| W3-D7 | `calendarParticipants.ts` | 92 | Notification integration | Call notification service |
| W3-D8 | `paymentMethodsDb.ts` | 196 | Usage check | Query transactions |

**Estimated Time:** 3 hours

### Gate Checkpoint W3

- [ ] VIP Portal supply CRUD works
- [ ] Dashboard shows real metrics
- [ ] Matching engine returns results
- [ ] All UI navigation works
- [ ] Notification stubs in place
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes
- [ ] E2E workflow tests pass
- [ ] Merged to main

---

## File Ownership Matrix

This matrix ensures NO file conflicts between parallel agents.

| File | Wave | Agent | Status |
|------|------|-------|--------|
| **Wave 0 (Foundation)** |
| `server/_core/authHelpers.ts` | W0 | Foundation | 🆕 Create |
| `server/_core/fiscalPeriod.ts` | W0 | Foundation | 🆕 Create |
| `server/_core/accountLookup.ts` | W0 | Foundation | 🆕 Create |
| `server/services/notificationService.ts` | W0 | Foundation | 🆕 Create |
| **Wave 1 (Security)** |
| `client/src/components/needs/ClientNeedsTab.tsx` | W1 | Agent 1A | ✏️ Edit |
| `client/src/components/inventory/ClientInterestWidget.tsx` | W1 | Agent 1A | ✏️ Edit |
| `client/src/pages/PurchaseOrdersPage.tsx` | W1 | Agent 1A | ✏️ Edit |
| `server/routers/rbac-users.ts` | W1 | Agent 1B | ✏️ Edit |
| `server/routers/calendarRecurrence.ts` | W1 | Agent 1B | ✏️ Edit |
| **Wave 2 (Business Logic)** |
| `server/ordersDb.ts` | W2 | Agent 2A | ✏️ Edit |
| `server/badDebtDb.ts` | W2 | Agent 2B | ✏️ Edit |
| `server/accountingHooks.ts` | W2 | Agent 2B | ✏️ Edit |
| `server/routers/cogs.ts` | W2 | Agent 2C | ✏️ Edit |
| `server/routers/calendarFinancials.ts` | W2 | Agent 2D | ✏️ Edit |
| **Wave 3 (Features)** |
| `server/routers/vipPortal.ts` | W3 | Agent 3A | ✏️ Edit |
| `server/routers/vipPortalAdmin.ts` | W3 | Agent 3A | ✏️ Edit |
| `server/routers/dashboard.ts` | W3 | Agent 3B | ✏️ Edit |
| `server/dataCardMetricsDb.ts` | W3 | Agent 3B | ✏️ Edit |
| `server/routers/matchingEnhanced.ts` | W3 | Agent 3C | ✏️ Edit |
| `server/matchingEngine.ts` | W3 | Agent 3C | ✏️ Edit |
| `server/matchingEngineEnhanced.ts` | W3 | Agent 3C | ✏️ Edit |
| `server/services/liveCatalogService.ts` | W3 | Agent 3C | ✏️ Edit |
| `client/src/components/inbox/InboxItem.tsx` | W3 | Agent 3D | ✏️ Edit |
| `client/src/components/inventory/BatchDetailDrawer.tsx` | W3 | Agent 3D | ✏️ Edit |
| `client/src/pages/ClientsListPage.tsx` | W3 | Agent 3D | ✏️ Edit |
| `server/_core/calendarJobs.ts` | W3 | Agent 3D | ✏️ Edit |
| `server/webhooks/github.ts` | W3 | Agent 3D | ✏️ Edit |
| `server/routers/calendarMeetings.ts` | W3 | Agent 3D | ✏️ Edit |
| `server/routers/calendarParticipants.ts` | W3 | Agent 3D | ✏️ Edit |
| `server/paymentMethodsDb.ts` | W3 | Agent 3D | ✏️ Edit |

---

## Quality Assurance Protocol

### Per-Agent QA (Before Merge)

Each agent MUST complete before requesting merge:

```bash
# 1. TypeScript check
pnpm typecheck

# 2. Lint check
pnpm lint

# 3. Run tests
pnpm test

# 4. Verify no new TODOs introduced
grep -rn "TODO" --include="*.ts" --include="*.tsx" [files-edited] | wc -l
# Should be LESS than before

# 5. Verify no hardcoded IDs (Wave 1+)
grep -rn "userId: 1\|createdBy: 1" --include="*.ts" --include="*.tsx" [files-edited]
# Should return nothing
```

### Wave Gate QA (Before Next Wave)

Each wave gate requires:

1. **All agents merged** - No pending PRs
2. **Full test suite passes** - `pnpm test`
3. **TypeScript clean** - `pnpm typecheck` returns 0 errors
4. **Deployment succeeds** - DigitalOcean build passes
5. **Smoke test passes** - Core workflows functional
6. **TODO count reduced** - `grep -c "TODO"` shows reduction

### Integration Testing

After each wave, run integration tests:

```bash
# Wave 1: Auth integration
pnpm test:integration --grep "auth"

# Wave 2: Accounting integration
pnpm test:integration --grep "accounting\|invoice\|payment"

# Wave 3: Feature integration
pnpm test:integration --grep "vip\|dashboard\|matching"
```

---

## Risk Mitigation

### Conflict Prevention

| Risk | Mitigation |
|------|------------|
| File conflicts | Strict file ownership matrix |
| Merge conflicts | Wave gates ensure clean main |
| Breaking changes | Integration tests at each gate |
| Regression | Full test suite at each gate |

### Rollback Strategy

Each wave is independently deployable:

```bash
# If Wave N fails, rollback to Wave N-1
git revert --no-commit HEAD~[commits-in-wave]
git commit -m "Rollback Wave N due to [reason]"
git push origin main
```

### Dependency Failures

If a wave cannot complete:

1. **Document blockers** in session file
2. **Skip dependent tasks** in later waves
3. **Create follow-up tasks** for blocked items
4. **Continue with non-blocked tasks**

---

## Timeline & Resource Allocation

### Optimistic Timeline (5 Days)

```
Day 1 (4h):
├── Wave 0: Foundation (1 agent, 2-3h)
└── Wave 1: Security (3 agents parallel, 4-6h)
    └── Gate W1 checkpoint

Day 2-3 (12h):
├── Wave 2: Business Logic (4 agents parallel, 8-12h)
└── Gate W2 checkpoint

Day 4-5 (12h):
├── Wave 3: Features (4 agents parallel, 8-12h)
└── Gate W3 checkpoint
└── Final integration testing
```

### Conservative Timeline (7 Days)

```
Day 1: Wave 0 + Wave 1 start
Day 2: Wave 1 complete + Gate W1
Day 3-4: Wave 2 (with buffer for issues)
Day 5: Gate W2 + Wave 3 start
Day 6: Wave 3 complete
Day 7: Gate W3 + Final QA + Documentation
```

### Agent Utilization

| Wave | Agents | Parallel Factor | Effective Hours |
|------|--------|-----------------|-----------------|
| W0 | 1 | 1x | 2-3h |
| W1 | 3 | 3x | 2h each = 6h work in 2h |
| W2 | 4 | 4x | 3h each = 12h work in 3h |
| W3 | 4 | 4x | 3h each = 12h work in 3h |
| **Total** | - | - | **32h work in ~10h elapsed** |

---

## Success Metrics

### Quantitative

| Metric | Before | Target | Measurement |
|--------|--------|--------|-------------|
| TODO count | 87 | < 20 | `grep -c "TODO"` |
| Hardcoded IDs | 5 | 0 | `grep "userId: 1"` |
| TypeScript errors | 0 | 0 | `pnpm typecheck` |
| Test coverage | Current | +5% | `pnpm test:coverage` |

### Qualitative

- [ ] All security TODOs resolved
- [ ] Accounting integration complete
- [ ] VIP Portal features functional
- [ ] Dashboard shows real data
- [ ] No new technical debt introduced

---

## Execution Checklist

### Pre-Execution

- [ ] All agents have access to repository
- [ ] `docs/ACTIVE_SESSIONS.md` cleared of conflicts
- [ ] Main branch is stable (all tests pass)
- [ ] Wave 0 agent assigned and ready

### Wave 0 Execution

- [ ] Foundation utilities created
- [ ] Unit tests written
- [ ] Merged to main
- [ ] Gate W0 passed

### Wave 1 Execution

- [ ] Agent 1A: Frontend auth fixes complete
- [ ] Agent 1B: Server auth fixes complete
- [ ] Agent 1C: Integration tests complete
- [ ] All merged to main
- [ ] Gate W1 passed

### Wave 2 Execution

- [ ] Agent 2A: Orders integration complete
- [ ] Agent 2B: Bad debt fixes complete
- [ ] Agent 2C: COGS module complete
- [ ] Agent 2D: Calendar financials complete
- [ ] All merged to main
- [ ] Gate W2 passed

### Wave 3 Execution

- [ ] Agent 3A: VIP Portal complete
- [ ] Agent 3B: Dashboard complete
- [ ] Agent 3C: Matching engine complete
- [ ] Agent 3D: UI & misc complete
- [ ] All merged to main
- [ ] Gate W3 passed

### Post-Execution

- [ ] Final TODO count verified
- [ ] All tests pass
- [ ] Deployment successful
- [ ] Documentation updated
- [ ] QUAL-003 marked complete in roadmap

---

## Appendix: Agent Prompts

Each agent should receive a focused prompt. See `docs/prompts/QUAL-003-W[N]-[AGENT].md` for individual prompts.

### Prompt Template

```markdown
# QUAL-003 Wave [N] - Agent [X]: [Focus Area]

## Your Assignment
[Specific files and TODOs]

## Dependencies
- Wave [N-1] must be complete
- Use utilities from `server/_core/`

## Files You Own (EXCLUSIVE)
[List of files - no other agent will touch these]

## Deliverables
[Specific checklist]

## QA Requirements
[Pre-merge checklist]

## Do NOT
- Touch files not in your ownership list
- Introduce new TODOs
- Skip tests
```

---

*This strategy ensures maximum parallelization while maintaining code quality and preventing conflicts.*
