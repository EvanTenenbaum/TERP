# TERP Parallel Sprint Teams Execution Plan

**Version:** 1.0
**Created:** 2026-01-25
**Status:** READY FOR EXECUTION
**Total Open Tasks:** 113 (MVP: 83, Beta: 30)

---

## Executive Summary

This document defines a parallel sprint execution strategy that enables **5 independent sprint teams** to work simultaneously on TERP without stepping on each other's toes. Each team owns a distinct domain with clearly defined file boundaries and integration points.

### Key Metrics

| Metric | Value |
|--------|-------|
| Total Open Tasks | 113 |
| Sprint Teams | 5 |
| Estimated Duration | 2-3 weeks (parallel) |
| Integration Strategy | Feature branches → Staging → Main |

---

## Sprint Team Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           TERP PARALLEL EXECUTION                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│   │   TEAM A    │  │   TEAM B    │  │   TEAM C    │  │   TEAM D    │       │
│   │   CORE      │  │  FRONTEND   │  │  BACKEND    │  │    DATA     │       │
│   │  STABILITY  │  │     UX      │  │   & API     │  │  & SCHEMA   │       │
│   └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘       │
│          │                │                │                │               │
│          ▼                ▼                ▼                ▼               │
│   ┌─────────────────────────────────────────────────────────────────┐      │
│   │                      TEAM E: INTEGRATION                         │      │
│   │              Reliability + Work Surfaces Deployment              │      │
│   └─────────────────────────────────────────────────────────────────┘      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Team Definitions

### Team A: Core Stability (P0 Priority)

**Focus:** TypeScript errors, test failures, security critical
**Branch:** `claude/sprint-team-a-stability`
**Owned Files:**
- `server/*.ts` (core modules, excluding routers)
- `client/src/hooks/**/*.ts` (test infrastructure)
- `vitest.config.ts`, `vitest.setup.ts`
- Security-critical files

**Tasks (18 total):**

| ID | Task | Priority | Est. |
|----|------|----------|------|
| TS-001 | Fix 117 TypeScript errors | P0 | 16-24h |
| BUG-100 | Fix 122 failing tests | P0 | 24-40h |
| PERF-001 | Fix empty catch blocks in usePerformanceMonitor | P0 | 15min |
| ACC-001 | Fix silent GL posting failures | P0 | 8h |
| TEST-INFRA-01 | Fix DOM/jsdom test container setup | P0 | 4h |
| TEST-INFRA-02 | Configure DATABASE_URL for test environment | P0 | 2h |
| TEST-INFRA-03 | Fix TRPC router initialization in tests | P0 | 4h |
| TEST-INFRA-04 | Create comprehensive test fixtures/factories | P1 | 8h |
| TEST-INFRA-05 | Fix async element detection | P1 | 4h |
| TEST-INFRA-06 | Fix admin endpoint security test | P2 | 2h |
| TEST-QA-001 | Fix React Hook test infrastructure | P1 | 2h |
| SEC-024 | Validate Quote Email XSS prevention | P1 | 1h |
| SEC-025 | Implement Session Extension Limit | P2 | 1h |
| SEC-026 | Validate Cron Leader Election Race Condition | P2 | 2h |
| DI-009 | Add Vendor ID Validation in Return Processing | P1 | 30min |
| RBAC-002 | Verify Time Clock Route Permission Gate | P2 | 30min |
| QUAL-008 | Add Feature Flag Checks to Routes | P1 | 4h |
| BUG-102 | Fix Property Test Bugs | P2 | 4h |

**Blocked Files (DO NOT TOUCH):**
- `server/routers/*.ts` (Team C owns)
- `client/src/pages/*.tsx` (Team B owns)
- `scripts/seed/**` (Team D owns)
- `drizzle/**` (Team D owns)

---

### Team B: Frontend UX & Navigation

**Focus:** Navigation accessibility, UI fixes, Work Surface UX
**Branch:** `claude/sprint-team-b-frontend`
**Owned Files:**
- `client/src/config/navigation.ts`
- `client/src/components/CommandPalette.tsx`
- `client/src/pages/*.tsx` (pages only, not work surfaces)
- `client/src/components/dashboard/widgets-v2/**`
- `client/src/App.tsx` (routing only)

**Tasks (25 total):**

| ID | Task | Priority | Est. |
|----|------|----------|------|
| NAV-006 | Add Leaderboard to Sales nav | P2 | 5min |
| NAV-007 | Add Client Needs to Sales nav | P2 | 5min |
| NAV-008 | Add Matchmaking to Sales nav | P2 | 5min |
| NAV-009 | Add Quotes to Sales nav | P2 | 5min |
| NAV-010 | Add Returns to Sales nav | P2 | 5min |
| NAV-011 | Add Vendor Supply to Inventory nav | P2 | 5min |
| NAV-012 | Add Pricing Rules to Finance nav | P2 | 5min |
| NAV-013 | Add Workflow Queue to Admin nav | P2 | 5min |
| NAV-014 | Add all 8 routes to Command Palette | P2 | 15min |
| NAV-015 | Verify TypeScript compilation | P2 | 5min |
| NAV-016 | Manual QA verification | P2 | 15min |
| NAV-017 | Route CreditsPage in App.tsx | P1 | 1h |
| MEET-048 | Create Hour Tracking Frontend | P1 | 16h |
| FE-QA-009 | Enable VendorSupplyPage Creation | P2 | 8h |
| FE-QA-010 | Wire MatchmakingServicePage Action Buttons | P2 | 4h |
| FE-QA-011 | Integrate Unused Dashboard Widgets | P2 | 8h |
| MOB-001 | Address Mobile Responsiveness Issues | P2 | 24h |
| UX-010 | Clarify My Account vs User Settings | P2 | 4h |
| LIVE-001 | Implement/Remove Live Shopping Session Console | P1 | 4h |
| TERP-0002 | Dashboard widget error states + navigation | P2 | 4-8h |
| TERP-0003 | Add Client Wizard to ClientsWorkSurface | P1 | 1-2h |
| TERP-0005 | Reorganize navigation groups | P2 | 2-4h |
| TERP-0007 | Surface non-sellable batch status in UI | P2 | 4-8h |
| WS-010A | Integrate Photography Module into Page | P1 | 4h |
| TYPE-001 | Fix `as any` casts in Golden Flows | P2 | 4h |

**Blocked Files (DO NOT TOUCH):**
- `server/**` (Teams A, C own)
- `client/src/components/work-surface/**` (Team E owns)
- `scripts/seed/**` (Team D owns)

---

### Team C: Backend & API

**Focus:** API implementations, router fixes, service layer
**Branch:** `claude/sprint-team-c-backend`
**Owned Files:**
- `server/routers/*.ts`
- `server/services/*.ts` (excluding accounting hooks - Team A)
- `server/*Db.ts`

**Tasks (18 total):**

| ID | Task | Priority | Est. |
|----|------|----------|------|
| SSE-001 | Fix Live Shopping SSE Event Naming | P1 | 2h |
| API-016 | Implement Quote Email Sending | P1 | 4h |
| API-017 | Implement Stock Threshold Configuration | P2 | 4h |
| API-011 | Implement inventory.batch Endpoint | P2 | 4h |
| API-012 | Implement inventory.batches Endpoint | P2 | 4h |
| API-013 | Implement orders.confirm Endpoint | P2 | 4h |
| API-014 | Implement liveShopping.setSessionTimeout | P2 | 2h |
| API-015 | Implement liveShopping.disableTimeout | P2 | 2h |
| BE-QA-006 | Implement AR/AP Summary Endpoints | P1 | 8h |
| BE-QA-007 | Implement Cash Expenses Endpoints | P1 | 8h |
| BE-QA-008 | Implement Financial Reports | P1 | 16h |
| STUB-001 | Implement Live Catalog Brand Extraction | P2 | 2h |
| STUB-002 | Implement Live Catalog Price Range | P2 | 2h |
| DEPR-001 | Migrate Deprecated Vendor Router Usages | P2 | 8h |
| DEPR-002 | Remove Deprecated PO Procedures | P3 | 2h |
| TERP-0001 | Dashboard backend data accuracy fixes | P1 | 8-16h |
| TERP-0004 | Add notifications table to autoMigrate | P1 | 2-4h |
| QUAL-009 | Replace console.error with Logger | P3 | 8h |

**Blocked Files (DO NOT TOUCH):**
- `client/src/**` (Team B owns)
- `server/accountingHooks.ts` (Team A owns for ACC-001)
- `drizzle/**` (Team D owns)
- `scripts/seed/**` (Team D owns)

---

### Team D: Data, Schema & Seeding

**Focus:** Database schema, migrations, seed data
**Branch:** `claude/sprint-team-d-data`
**Owned Files:**
- `drizzle/**`
- `server/db/schema.ts`
- `scripts/seed/**`
- Migration files

**Tasks (16 total):**

| ID | Task | Priority | Est. |
|----|------|----------|------|
| SEC-023 | Rotate Exposed Database Credentials | P0 | 2-4h |
| DATA-012 | Seed Work Surface Feature Flags | P1 | 4h |
| DATA-013 | Seed Gamification Module Defaults | P1 | 4-8h |
| DATA-014 | Seed Scheduling Module Defaults | P1 | 4h |
| DATA-015 | Seed Storage Sites and Zones | P1 | 2-4h |
| DATA-021 | Seed Mock Product Images | P1 | 6h |
| DATA-022 | Add Calendar Recurring Events Schema | P2 | 4h |
| DATA-016 | Seed Organization Settings | P2 | 2h |
| DATA-017 | Seed VIP Portal Configurations | P2 | 2h |
| DATA-018 | Seed VIP Tier Configurations | P2 | 2h |
| DATA-019 | Seed Integration Settings | P2 | 2h |
| DATA-020 | Seed Rate Limit Configurations | P2 | 2h |
| SCHEMA-001 | Fix products.name vs nameCanonical | P2 | 4h |
| SCHEMA-002 | Document batches quantity fields | P2 | 2h |
| SCHEMA-003 | Add clients.tier and isActive columns | P2 | 4h |
| TERP-0006 | Cleanup migrations for constraints | P2 | 4-8h |

**Blocked Files (DO NOT TOUCH):**
- `server/routers/**` (Team C owns)
- `client/src/**` (Team B owns)
- `server/accountingHooks.ts` (Team A owns)

---

### Team E: Integration & Work Surfaces (Depends on Teams A-D)

**Focus:** Reliability program, Work Surfaces deployment
**Branch:** `claude/sprint-team-e-integration`
**Owned Files:**
- `client/src/components/work-surface/**`
- `client/src/components/work-surface/golden-flows/**`
- `server/_core/**` (transaction, locking, etc.)
- Deployment configuration

**Tasks (36 total - starts after Teams A-D complete P0 tasks):**

#### Work Surface QA Blockers (P0)
| ID | Task | Priority | Est. |
|----|------|----------|------|
| WSQA-001 | Wire Payment Recording Mutation | P0 | 4h |
| WSQA-002 | Implement Flexible Lot Selection | P0 | 2d |
| WSQA-003 | Add RETURNED Order Status | P0 | 2d |

#### Reliability Program (P1 - Beta)
| ID | Task | Priority | Est. |
|----|------|----------|------|
| REL-001 | Define Truth Model + Invariants | HIGH | 8h |
| REL-002 | Migrate Inventory Quantities to DECIMAL | HIGH | 2d |
| REL-003 | Migrate Money Amounts to DECIMAL | HIGH | 2d |
| REL-004 | Critical Mutation Wrapper | HIGH | 16h |
| REL-005 | Idempotency Keys for Critical Mutations | HIGH | 2d |
| REL-006 | Inventory Concurrency Hardening | HIGH | 2d |
| REL-007 | Inventory Movements Immutability | HIGH | 16h |
| REL-008 | Ledger Immutability + Fiscal Lock | HIGH | 2d |
| REL-009 | Reconciliation Framework | HIGH | 2d |
| REL-010 | Inventory Reconciliation Pack | HIGH | 16h |
| REL-011 | AR/AP Reconciliation Pack | HIGH | 2d |
| REL-012 | Ledger Reconciliation Pack | HIGH | 16h |
| REL-013 | RBAC Drift Detector | HIGH | 16h |
| REL-014 | Critical Correctness Test Harness | HIGH | 2d |
| REL-015 | Observability for Critical Mutations | HIGH | 16h |
| REL-016 | Backup/Restore Reliability Runbook | MEDIUM | 2d |
| REL-017 | CI/PR Gates for Critical Domains | HIGH | 16h |

#### Work Surfaces Deployment
| ID | Task | Priority | Est. |
|----|------|----------|------|
| DEPLOY-001 | Wire WorkSurfaceGate into App.tsx | HIGH | 4h |
| DEPLOY-002 | Add gate scripts to package.json | HIGH | 1h |
| DEPLOY-003 | Seed missing RBAC permissions | HIGH | 4h |
| DEPLOY-004 | Capture baseline metrics | MEDIUM | 2h |
| DEPLOY-005 | Execute Stage 0 (Internal QA) | HIGH | 8h |
| DEPLOY-006 | Execute Stage 1 (10% Rollout) | HIGH | 4h |
| DEPLOY-007 | Execute Stage 2 (50% Rollout) | HIGH | 4h |
| DEPLOY-008 | Execute Stage 3 (100% Rollout) | HIGH | 4h |

**Blocked Files (DO NOT TOUCH):**
- All files owned by Teams A-D

---

## Conflict Prevention Strategy

### 1. Branch Strategy

```
main
  │
  ├── staging/integration-sprint-2026-01-25
  │     │
  │     ├── claude/sprint-team-a-stability
  │     ├── claude/sprint-team-b-frontend
  │     ├── claude/sprint-team-c-backend
  │     ├── claude/sprint-team-d-data
  │     └── claude/sprint-team-e-integration
  │
  └── (PRs from staging → main after integration tests pass)
```

### 2. File Ownership Matrix

| Directory/File | Team A | Team B | Team C | Team D | Team E |
|----------------|--------|--------|--------|--------|--------|
| `client/src/config/navigation.ts` | - | **OWN** | - | - | - |
| `client/src/pages/*.tsx` | - | **OWN** | - | - | - |
| `client/src/components/work-surface/**` | - | - | - | - | **OWN** |
| `client/src/hooks/**` | **OWN** | - | - | - | - |
| `client/src/App.tsx` | - | **OWN** | - | - | - |
| `server/routers/*.ts` | - | - | **OWN** | - | - |
| `server/services/*.ts` | - | - | **OWN** | - | - |
| `server/*Db.ts` | - | - | **OWN** | - | - |
| `server/_core/**` | READ | - | - | - | **OWN** |
| `server/accountingHooks.ts` | **OWN** | - | - | - | - |
| `server/db/schema.ts` | READ | - | READ | **OWN** | READ |
| `drizzle/**` | - | - | - | **OWN** | - |
| `scripts/seed/**` | - | - | - | **OWN** | - |
| `vitest.config.ts` | **OWN** | - | - | - | - |
| `vitest.setup.ts` | **OWN** | - | - | - | - |

Legend:
- **OWN** = Can create/edit/delete
- **READ** = Can read but not modify
- `-` = No access needed

### 3. Cross-Team Communication Protocol

When a team needs to modify a file owned by another team:

1. **Create a coordination ticket** in `docs/sprint-coordination/`
2. **Notify the owning team** via the ticket
3. **Wait for explicit approval** before proceeding
4. **Document the change** with cross-references

Example coordination ticket:
```markdown
# COORD-001: Team C needs schema change for API-011

**Requesting Team:** Team C (Backend)
**Owning Team:** Team D (Data)
**File:** `server/db/schema.ts`
**Change Needed:** Add `batchDetails` view for inventory.batch endpoint
**Status:** PENDING APPROVAL
**Created:** 2026-01-25

## Details
API-011 requires a new database view. Team D please add:
- View: `batch_details_v`
- Columns: id, quantity, unitCogs, status, expiryDate
```

### 4. Shared File Freeze Policy

The following files are **FROZEN** during parallel execution:

| File | Reason | Unlock Condition |
|------|--------|------------------|
| `package.json` | Dependency conflicts | Team E integration phase only |
| `.env.example` | Environment consistency | Team E integration phase only |
| `CLAUDE.md` | Protocol stability | After sprint completion |

---

## PR Integration Strategy

### Phase 1: Team PRs (Parallel)

Each team creates PRs to the staging branch:

```bash
# Team A
git checkout -b claude/sprint-team-a-stability
# ... work ...
gh pr create --base staging/integration-sprint-2026-01-25 \
  --title "Team A: Core Stability Fixes" \
  --body "$(cat <<'EOF'
## Summary
- Fixed 117 TypeScript errors
- Fixed 122 failing tests
- Resolved P0 security issues

## Verification
- [x] pnpm check passes
- [x] pnpm test passes (>95%)
- [x] pnpm build passes
EOF
)"
```

### Phase 2: Integration Testing

After all team PRs are merged to staging:

1. **Run full test suite:**
   ```bash
   pnpm check && pnpm lint && pnpm test && pnpm build
   ```

2. **Run E2E tests:**
   ```bash
   pnpm test:e2e
   ```

3. **Run Golden Flow tests:**
   ```bash
   pnpm test:golden-flows
   ```

### Phase 3: Main Branch Merge

Create a single "Release PR" from staging to main:

```bash
gh pr create --base main --head staging/integration-sprint-2026-01-25 \
  --title "Sprint Release: 2026-01-25" \
  --body "$(cat <<'EOF'
## Sprint Summary
Parallel execution of 5 sprint teams resolving 113 tasks.

## Team Contributions
- Team A: Core Stability (18 tasks)
- Team B: Frontend UX (25 tasks)
- Team C: Backend API (18 tasks)
- Team D: Data & Schema (16 tasks)
- Team E: Integration (36 tasks)

## Verification
- [x] All team PRs merged to staging
- [x] Integration tests pass
- [x] E2E tests pass
- [x] Manual QA complete

## Rollback Plan
If issues detected post-merge:
git revert <merge-commit>
git push origin main
EOF
)"
```

---

## Execution Timeline

```
Week 1 (Days 1-5)
├── Day 1-2: Teams A, B, C, D start in parallel
│   ├── Team A: P0 TypeScript + Test fixes
│   ├── Team B: Navigation + quick UX wins
│   ├── Team C: API implementations
│   └── Team D: Security credential rotation + seeding
│
├── Day 3-4: Continue parallel work
│   ├── Team A: P1 test infrastructure
│   ├── Team B: Page implementations
│   ├── Team C: Financial endpoints
│   └── Team D: Schema migrations
│
└── Day 5: First integration checkpoint
    └── All teams create PRs to staging

Week 2 (Days 6-10)
├── Day 6: Integration testing + conflict resolution
├── Day 7-8: Team E begins (Work Surfaces QA)
├── Day 9-10: Team E continues (Reliability tasks)
└── End of Week 2: Second integration checkpoint

Week 3 (Days 11-15)
├── Day 11-12: Team E completes Reliability + Deploy
├── Day 13: Final integration testing
├── Day 14: Manual QA + stakeholder review
└── Day 15: Production deployment
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Schema conflicts | Team D owns all schema; others request changes via tickets |
| Import cycle breaks | Each team runs `pnpm check` before PR |
| Test flakiness | Team A focuses on test infrastructure first |
| Merge conflicts | Staging branch allows early conflict detection |
| Production issues | Feature flags enable instant rollback |

---

## Monitoring & Reporting

### Daily Sync Format

Each team posts a daily update in `docs/sprint-updates/`:

```markdown
# Team [X] Update - YYYY-MM-DD

## Completed
- [TASK-ID] Description

## In Progress
- [TASK-ID] Description (X% complete)

## Blocked
- [TASK-ID] Reason, waiting for [Team Y]

## Tomorrow
- [TASK-ID] Plan
```

### Sprint Metrics Dashboard

Track in `docs/sprint-metrics/`:

| Metric | Team A | Team B | Team C | Team D | Team E |
|--------|--------|--------|--------|--------|--------|
| Tasks Assigned | 18 | 25 | 18 | 16 | 36 |
| Tasks Complete | 0 | 0 | 0 | 0 | 0 |
| PRs Open | 0 | 0 | 0 | 0 | 0 |
| PRs Merged | 0 | 0 | 0 | 0 | 0 |
| Blockers | 0 | 0 | 0 | 0 | 0 |

---

## Next Steps

1. **Read this document** and confirm understanding
2. **Claim your team assignment** in `docs/ACTIVE_SESSIONS.md`
3. **Create your feature branch** from main
4. **Start working on P0 tasks first**
5. **Post daily updates** in `docs/sprint-updates/`

---

## Questions?

Open a coordination ticket in `docs/sprint-coordination/` or contact Evan.
