# TERP Parallel Execution Plan

**Created:** 2026-01-30
**Assumption:** Inventory visibility (SCHEMA-016 migration) remains blocked
**Focus:** Maximum parallel throughput on non-blocked work

---

## Execution Summary

| Wave | Focus | Parallel Tracks | Est. Time | Cumulative |
|------|-------|-----------------|-----------|------------|
| Wave 1 | Security + Quick Wins | 4 tracks | 2-4h | 4h |
| Wave 2 | Frontend + Backend | 3 tracks | 4-6h | 10h |
| Wave 3 | Test Infrastructure | 2 tracks | 6-8h | 18h |
| Wave 4 | Polish + Cleanup | 2 tracks | 4-6h | 24h |

**Total Estimated Time:** 24h of parallel work (can complete in ~6h wall-clock with 4 agents)

---

## 🔴 WAVE 1: Security & Quick Wins (P0)

> **Goal:** Eliminate all P0 security issues and quick fixes
> **Parallel Tracks:** 4
> **Dependencies:** None - can start immediately

### Track 1A: Security - Actor Attribution
**Agent:** Backend Security
**Mode:** 🔴 RED

| Task | Description | File | Est |
|------|-------------|------|-----|
| SEC-033 | Fix createdBy from input | `server/routers/advancedTagFeatures.ts` | 30m |
| BUG-107 | Fix fallback user ID `\|\| 1` | `server/salesSheetsDb.ts:255` | 30m |

**Verification:**
```bash
grep -r "createdBy.*input\." server/ --include="*.ts" | wc -l  # Must be 0
grep -r "|| 1" server/ --include="*.ts" | grep -v test | wc -l  # Must be 0
```

### Track 1B: Security - Credential Exposure
**Agent:** Security Ops
**Mode:** 🔴 RED

| Task | Description | File | Est |
|------|-------------|------|-----|
| BUG-103 | Hide QA password hint in production | `client/src/pages/LoginPage.tsx` | 1h |
| SEC-023 | Rotate exposed DB credentials | Infrastructure | 2h |

**Verification:**
- QA switcher hidden when `NODE_ENV=production`
- New credentials deployed and tested

### Track 1C: Quick Code Fixes
**Agent:** General Backend
**Mode:** 🟢 SAFE

| Task | Description | File | Est |
|------|-------------|------|-----|
| PERF-001 | Fix empty catch blocks | `client/src/hooks/usePerformanceMonitor.ts` | 15m |
| CLEANUP-002 | Remove unused cancel dialog | `client/src/pages/orders/OrderCreatorPage.tsx` | 30m |

**Verification:**
```bash
pnpm check && pnpm lint
```

### Track 1D: SSE Event Naming
**Agent:** Backend API
**Mode:** 🟡 STRICT

| Task | Description | File | Est |
|------|-------------|------|-----|
| SSE-001 | Fix Live Shopping event naming | `server/routers/liveShopping.ts` | 2h |

**Verification:**
- SSE events use consistent naming
- Live shopping page receives events correctly

---

## 🟡 WAVE 2: Frontend + Backend Features (P1)

> **Goal:** Fix navigation issues and implement missing features
> **Parallel Tracks:** 3
> **Dependencies:** Wave 1 complete

### Track 2A: Frontend Navigation & Routes
**Agent:** Frontend
**Mode:** 🟡 STRICT

| Task | Description | File | Est |
|------|-------------|------|-----|
| NAV-017 | Route CreditsPage in App.tsx | `client/src/App.tsx` | 30m |
| BUG-104 | Fix client detail "not found" | `client/src/pages/clients/` | 2h |
| BUG-105 | Fix Reports 404 | `client/src/pages/accounting/` | 2h |
| BUG-106 | Fix AR/AP 404 | `client/src/pages/accounting/` | 2h |

**Verification:**
- Navigate to `/credits`, `/clients/:id`, `/accounting/reports`, `/accounting/arap`
- All pages render without errors

### Track 2B: Backend API Completion
**Agent:** Backend API
**Mode:** 🟡 STRICT

| Task | Description | File | Est |
|------|-------------|------|-----|
| API-016 | Implement Quote email sending | `server/routers/quotes.ts` | 4h |
| QA-INFRA-003 | Document/remove getLowStock dead code | `server/inventoryDb.ts` | 2h |

**Verification:**
```bash
pnpm check && pnpm test
```

### Track 2C: Photography Module Integration
**Agent:** Full Stack
**Mode:** 🟡 STRICT

| Task | Description | File | Est |
|------|-------------|------|-----|
| WS-010A | Integrate Photography into page | `client/src/pages/PhotographyPage.tsx` | 4h |

**Verification:**
- Photography page loads
- Can upload/view batch photos

---

## 🟢 WAVE 3: Test Infrastructure (P1/P2)

> **Goal:** Improve test pass rate from 89% to 95%+
> **Parallel Tracks:** 2
> **Dependencies:** Wave 2 complete

### Track 3A: React Test Infrastructure
**Agent:** Test Infrastructure
**Mode:** 🟢 SAFE

| Task | Description | File | Est |
|------|-------------|------|-----|
| TEST-QA-001 | Fix React Hook test infra | `vitest.setup.ts`, test utils | 2h |
| TEST-INFRA-05 | Fix async findBy vs getBy | Multiple test files | 4h |
| BUG-108 | Fix MatchmakingServicePage tests | `client/src/pages/MatchmakingServicePage.test.tsx` | 2h |

**Verification:**
```bash
pnpm test --run 2>&1 | grep -E "passed|failed"
```

### Track 3B: tRPC Test Infrastructure
**Agent:** Backend Testing
**Mode:** 🟢 SAFE

| Task | Description | File | Est |
|------|-------------|------|-----|
| TEST-INFRA-03 | Fix tRPC router init in tests | `tests/setup.ts` | 4h |
| TEST-INFRA-07 | Mock useUtils properly | Test utilities | 2h |
| BUG-109 | Fix EventFormDialog tests | `client/src/components/calendar/EventFormDialog.test.tsx` | 2h |

**Verification:**
```bash
pnpm test --run 2>&1 | grep -E "passed|failed"
# Target: <10 failures (from current 137)
```

---

## 🟢 WAVE 4: Polish & Technical Debt (P2)

> **Goal:** Clean up remaining issues, improve type safety
> **Parallel Tracks:** 2
> **Dependencies:** Wave 3 complete

### Track 4A: TypeScript Cleanup
**Agent:** Backend
**Mode:** 🟢 SAFE

| Task | Description | File | Est |
|------|-------------|------|-----|
| ST-054 | Fix `any` types in core infra | `server/_core/*.ts` | 4h |
| TS-CLEANUP | Address remaining any types | Various | 2h |

**Verification:**
```bash
pnpm check
grep -r ": any" server/_core/ --include="*.ts" | wc -l  # Target: 0
```

### Track 4B: SQL Safety Adoption
**Agent:** Backend Data
**Mode:** 🟡 STRICT

| Task | Description | Files | Est |
|------|-------------|-------|-----|
| ST-055 | Replace raw inArray with safeInArray | Priority: ordersDb, inventoryDb, arApDb | 4h |
| BUG-116 | Systematic inArray safety (partial) | 20 highest-risk files | 4h |

**Verification:**
```bash
pnpm test
# All tests pass with safe versions
```

---

## 📊 Resource Allocation

### Optimal 4-Agent Configuration

| Agent | Wave 1 | Wave 2 | Wave 3 | Wave 4 |
|-------|--------|--------|--------|--------|
| Agent A (Security) | Track 1A + 1B | Track 2B | Track 3B | Track 4B |
| Agent B (Frontend) | Track 1C | Track 2A | Track 3A | Track 4A |
| Agent C (Backend) | Track 1D | Track 2C | Support | Support |
| Agent D (QA) | Verification | Verification | Verification | Final QA |

### Minimal 2-Agent Configuration

| Agent | Wave 1 | Wave 2 | Wave 3 | Wave 4 |
|-------|--------|--------|--------|--------|
| Agent A | 1A → 1B | 2A → 2B | 3A | 4A |
| Agent B | 1C → 1D | 2C | 3B | 4B |

---

## 🚫 BLOCKED (Requires SCHEMA-016 Migration)

These tasks CANNOT proceed until DB admin runs the strainId migration:

| Task | Description | Blocked By |
|------|-------------|-----------|
| GF-001 | Direct Intake flow | strainId queries |
| GF-002 | Procure-to-Pay flow | PO product dropdown |
| GF-003 | Order-to-Cash flow | Inventory query |
| GF-007 | Inventory Management | Edit modal binding |
| INFRA-020-024 | Pick & Pack Consolidation | Inventory system |

**To Unblock:**
```sql
ALTER TABLE products ADD COLUMN strainId INT NULL;
-- Or use admin endpoint: /api/trpc/adminQuickFix.addStrainIdToProducts
```

---

## ✅ Wave Completion Checklist

### Wave 1 Gate
- [ ] No `|| 1` fallbacks in server code
- [ ] No `createdBy` from input
- [ ] QA password hidden in production
- [ ] All P0 security issues resolved
- [ ] `pnpm check && pnpm lint` passes

### Wave 2 Gate
- [ ] All navigation routes working
- [ ] No 404 errors on core pages
- [ ] Quote email sending functional
- [ ] Photography module integrated
- [ ] `pnpm check && pnpm lint && pnpm test` passes

### Wave 3 Gate
- [ ] Test pass rate ≥95%
- [ ] React Hook tests working
- [ ] tRPC tests properly initialized
- [ ] <15 test failures (from 137)

### Wave 4 Gate
- [ ] No `any` types in `server/_core/`
- [ ] safeInArray adopted in critical paths
- [ ] Full verification passes:
  ```bash
  pnpm check && pnpm lint && pnpm test && pnpm build
  ```

---

## Execution Command

To start execution, assign agents to tracks:

```bash
# Wave 1 - All 4 tracks can start simultaneously
# Track 1A: Agent A - SEC-033, BUG-107
# Track 1B: Agent B - BUG-103, SEC-023
# Track 1C: Agent C - PERF-001, CLEANUP-002
# Track 1D: Agent D - SSE-001
```

**Estimated Wall-Clock Time:**
- With 4 agents: ~6 hours
- With 2 agents: ~12 hours
- With 1 agent: ~24 hours
