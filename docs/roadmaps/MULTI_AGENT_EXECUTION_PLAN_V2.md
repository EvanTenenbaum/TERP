# Multi-Agent Execution Plan V2

**Version:** 2.0
**Created:** 2026-01-26
**Status:** ACTIVE
**Total Open Tasks:** ~80 tasks
**Estimated Duration:** 2-3 weeks with 6 parallel teams

---

## Executive Summary

This plan orchestrates 6 parallel Claude agent teams to remediate all outstanding TERP tasks. Each team follows the **Adaptive Verification Protocol** and **TERP Agent Instructions** exactly as documented.

### Team Overview

| Team  | Focus Area               | Tasks | Estimate | Mode   | Dependencies      |
| ----- | ------------------------ | ----- | -------- | ------ | ----------------- |
| **A** | Security Critical (P0)   | 12    | 32-40h   | RED    | None              |
| **B** | Accounting & GL          | 8     | 32-40h   | RED    | Team A (ARCH-001) |
| **C** | Inventory & Orders       | 14    | 24-32h   | STRICT | None              |
| **D** | Code Quality (Lint/Test) | 18    | 28-36h   | SAFE   | None              |
| **E** | Infrastructure & Schema  | 10    | 20-28h   | STRICT | None              |
| **F** | UI/UX & Features         | 18    | 40-56h   | STRICT | None              |

### Dependency Graph

```
Phase 1 (Parallel - Days 1-5):
├── Team A: Security Critical ─────────────┐
├── Team C: Inventory (no deps)            │
├── Team D: Code Quality (no deps)         │
├── Team E: Infrastructure (no deps)       │
└── Team F: UI/UX (no deps)                │
                                           │
Phase 2 (Sequential - Days 6-10):          │
└── Team B: Accounting ◄───────────────────┘
    (blocked until Team A completes ARCH-001)

Phase 3 (Integration - Days 11-14):
└── Coordinator: Merge all PRs, final verification
```

---

## Protocol Compliance Checklist

Every agent MUST follow these protocols. Non-compliance = work rejected.

### Mandatory Pre-Work (All Teams)

```bash
# 1. Clone and setup
gh repo clone EvanTenenbaum/TERP && cd TERP && pnpm install

# 2. Read protocols (DO NOT SKIP)
cat CLAUDE.md
cat docs/TERP_AGENT_INSTRUCTIONS.md
cat .kiro/steering/08-adaptive-qa-protocol.md

# 3. Check for conflicts
cat docs/ACTIVE_SESSIONS.md

# 4. Create session file
SESSION_ID="Session-$(date +%Y%m%d)-TEAM-X-$(openssl rand -hex 4)"
cat > "docs/sessions/active/${SESSION_ID}.md" << EOF
# Team X: [Focus Area]
**Session ID:** ${SESSION_ID}
**Started:** $(date +%Y-%m-%d)
**Status:** In Progress
**Mode:** [SAFE/STRICT/RED]

## Assigned Tasks
- [ ] TASK-001
- [ ] TASK-002

## Progress Notes
Starting work...
EOF

# 5. Register session
echo "- Team-X: ${SESSION_ID}" >> docs/ACTIVE_SESSIONS.md

# 6. Create feature branch
git checkout -b "claude/team-x-focus-area-${SESSION_ID}"

# 7. Commit and push registration
git add docs/sessions/active/ docs/ACTIVE_SESSIONS.md
git commit -m "chore: register Team X session"
git push -u origin "claude/team-x-focus-area-${SESSION_ID}"
```

### Definition of Done (Non-Negotiable)

A task is DONE only when ALL pass:

1. ✅ Tests added/updated (or written justification why not)
2. ✅ `pnpm lint` passes
3. ✅ `pnpm check` passes (0 TypeScript errors)
4. ✅ `pnpm test` passes
5. ✅ `pnpm build` passes
6. ✅ `pnpm test:e2e` passes (if UI/business workflow changed)
7. ✅ No TODOs, stubs, or placeholders
8. ✅ Commit message includes what changed + what was verified

### Required Output Format (Every Agent Response)

```markdown
## Verification Results

✅ **Verified:**

- pnpm check: PASS (0 errors)
- pnpm lint: PASS
- pnpm test: PASS (X/Y tests)
- pnpm build: PASS

🧪 **Tests Added:**

- server/routers/taskName.test.ts: 5 new tests

⚠️ **Risk Notes:**

- [What could still break]

🔁 **Rollback Plan:**

- `git revert <commit-hash>`

🟥 **RedHat QA (STRICT/RED only):**

- Edge cases covered: [list]
- Silent failures checked: [list]
- Rollback path verified: [yes/no]
```

---

## Team A: Security Critical (P0)

**Mode:** RED (highest scrutiny)
**Branch:** `claude/team-a-security-critical`
**Estimate:** 32-40h
**Dependencies:** None (START IMMEDIATELY)

### Assigned Tasks

| Task      | Description                             | Priority | Estimate | Module                                 |
| --------- | --------------------------------------- | -------- | -------- | -------------------------------------- |
| SEC-027   | Protect Admin Setup Endpoints           | HIGH     | 1h       | `server/routers/adminSetup.ts`         |
| SEC-028   | Remove/Restrict Debug Endpoints         | HIGH     | 1h       | `server/routers/debug.ts`              |
| SEC-029   | Fix Default Permission Grants           | HIGH     | 2h       | `server/services/permissionService.ts` |
| SEC-030   | Fix VIP Portal Token Validation         | HIGH     | 2h       | `server/routers/vipPortal.ts`          |
| ST-050    | Fix Silent Error Handling               | HIGH     | 4h       | `server/ordersDb.ts`                   |
| ST-051    | Add Transaction Boundaries              | HIGH     | 8h       | `server/ordersDb.ts`, `orders.ts`      |
| ST-053    | Eliminate `any` Types (critical paths)  | MEDIUM   | 8h       | Multiple                               |
| ARCH-001  | Create OrderOrchestrator Service        | HIGH     | 8h       | `server/services/` (new)               |
| FIN-001   | Fix Invoice Number Race Condition       | HIGH     | 2h       | `server/arApDb.ts`                     |
| INV-003   | Add FOR UPDATE Lock in Batch Allocation | HIGH     | 2h       | `server/routers/orders.ts`             |
| ORD-001   | Fix Invoice Creation Timing             | HIGH     | 4h       | `server/ordersDb.ts`                   |
| TERP-0014 | Token invalidation and rate limiting    | HIGH     | 6-12h    | `server/_core/simpleAuth.ts`           |

### Execution Order (Critical)

```
1. SEC-027 + SEC-028 (parallel, 2h) - Remove immediate attack surface
2. SEC-029 + SEC-030 (parallel, 2h) - Fix auth vulnerabilities
3. ST-050 (4h) - Fix silent errors BEFORE adding transactions
4. ST-051 (8h) - Add transaction boundaries
5. ARCH-001 (8h) - Create orchestrator using transaction patterns
6. FIN-001 + INV-003 + ORD-001 (parallel, 4h) - Race condition fixes
7. ST-053 (8h) - Type safety in critical paths
8. TERP-0014 (6-12h) - Token invalidation
```

### RED Mode Requirements

- [ ] Regression tests for each security fix
- [ ] Adversarial tests (attack vectors documented)
- [ ] Risk register with rollback plan
- [ ] E2E verification for auth flows
- [ ] RedHat QA self-review before completion

### Unlock Signal for Team B

When ARCH-001 is complete, signal Team B:

```bash
echo "ARCH-001 COMPLETE - Team B unlocked at $(date)" >> docs/sessions/active/coordinator.md
```

---

## Team B: Accounting & GL

**Mode:** RED (financial operations)
**Branch:** `claude/team-b-accounting-gl`
**Estimate:** 32-40h
**Dependencies:** Team A must complete ARCH-001 first

### Assigned Tasks

| Task      | Description                                 | Priority | Estimate | Module                                      |
| --------- | ------------------------------------------- | -------- | -------- | ------------------------------------------- |
| ACC-002   | Add GL Reversals for Invoice Void           | HIGH     | 4h       | `server/routers/invoices.ts`                |
| ACC-003   | Add GL Reversals for Returns/Credit Memos   | HIGH     | 4h       | `server/routers/returns.ts`                 |
| ACC-004   | Create COGS GL Entries on Sale              | HIGH     | 4h       | `server/services/orderAccountingService.ts` |
| ACC-005   | Fix Fiscal Period Validation                | HIGH     | 2h       | `server/accountingDb.ts`                    |
| ARCH-002  | Eliminate Shadow Accounting                 | HIGH     | 8h       | `server/services/`, `clients.ts`            |
| ARCH-003  | Use State Machine for All Order Transitions | HIGH     | 4h       | `server/routers/orders.ts`                  |
| ARCH-004  | Fix Bill Status Transitions                 | HIGH     | 4h       | `server/arApDb.ts`                          |
| TERP-0012 | Implement UI for accounting flows           | MEDIUM   | 24-40h   | `client/src/pages/accounting/*`             |

### Execution Order

```
BLOCKED until Team A completes ARCH-001
1. ACC-002 (4h) - Invoice void reversals
2. ACC-003 (4h) - Returns/credit memo reversals (depends on ACC-002 pattern)
3. ACC-004 (4h) - COGS GL entries
4. ACC-005 (2h) - Fiscal period validation
5. ARCH-002 (8h) - Eliminate shadow accounting
6. ARCH-003 (4h) - State machine enforcement
7. ARCH-004 (4h) - Bill status transitions
8. TERP-0012 (24-40h) - Accounting UI (can start after ACC-* complete)
```

### RED Mode Requirements

- [ ] GL balance verification after each operation
- [ ] Double-entry accounting tests (debits = credits)
- [ ] Fiscal period boundary tests
- [ ] Rollback plan for each migration
- [ ] Test with realistic financial data

---

## Team C: Inventory & Orders

**Mode:** STRICT
**Branch:** `claude/team-c-inventory-orders`
**Estimate:** 24-32h
**Dependencies:** None (START IMMEDIATELY)

### Assigned Tasks

| Task      | Description                                    | Priority | Estimate | Module                                   |
| --------- | ---------------------------------------------- | -------- | -------- | ---------------------------------------- |
| INV-001   | Add Inventory Deduction on Ship/Fulfill        | HIGH     | 4h       | `server/routers/orders.ts`               |
| INV-002   | Fix Race Condition in Draft Order Confirmation | HIGH     | 2h       | `server/ordersDb.ts`                     |
| INV-004   | Add Reservation Release on Order Cancellation  | MEDIUM   | 2h       | `server/routers/orders.ts`               |
| INV-005   | Create Batches on PO Goods Receipt             | MEDIUM   | 4h       | `server/routers/purchaseOrders.ts`       |
| TERP-0007 | Surface non-sellable batch status in UI        | MEDIUM   | 4-8h     | `client/src/components/sales-sheet/*`    |
| TERP-0008 | Standardize batch status constants             | MEDIUM   | 8-16h    | `server/constants/batchStatuses.ts`      |
| SM-001    | Implement Quote Status Transitions             | MEDIUM   | 4h       | `server/routers/quotes.ts`               |
| SM-002    | Implement Sale Status Transitions              | MEDIUM   | 4h       | `server/routers/orders.ts`               |
| SM-003    | Implement VendorReturn Status Transitions      | MEDIUM   | 4h       | `server/routers/returns.ts`              |
| ORD-002   | Validate Positive Prices in Orders             | MEDIUM   | 2h       | `server/ordersDb.ts`                     |
| ORD-003   | Fix Invalid Order State Transitions            | MEDIUM   | 2h       | `server/services/orderStateMachine.ts`   |
| ORD-004   | Add Credit Override Authorization              | MEDIUM   | 2h       | `server/services/orderPricingService.ts` |
| PARTY-001 | Add Nullable supplierClientId to POs           | MEDIUM   | 4h       | `drizzle/schema.ts`                      |
| PARTY-004 | Convert Vendor Hard Deletes to Soft            | MEDIUM   | 2h       | `server/routers/vendors.ts`              |

### Execution Order

```
1. INV-001 + INV-002 (parallel, 4h) - Critical inventory fixes
2. TERP-0008 (8-16h) - Batch status constants (enables other work)
3. INV-004 + INV-005 (parallel, 4h) - Reservation and PO receipt
4. TERP-0007 (4-8h) - UI for batch status (uses TERP-0008 constants)
5. SM-001 + SM-002 + SM-003 (parallel, 4h) - State machine implementations
6. ORD-002 + ORD-003 + ORD-004 (parallel, 2h) - Order validations
7. PARTY-001 + PARTY-004 (parallel, 4h) - Party model fixes
```

---

## Team D: Code Quality (Lint/Test)

**Mode:** SAFE (low-risk, high-volume)
**Branch:** `claude/team-d-code-quality`
**Estimate:** 28-36h
**Dependencies:** None (START IMMEDIATELY)

### Assigned Tasks

| Task     | Description                           | Priority | Estimate | Module                                                    |
| -------- | ------------------------------------- | -------- | -------- | --------------------------------------------------------- |
| LINT-001 | Fix React Hooks Violations            | HIGH     | 4h       | `client/src/components/accounting/*.tsx`                  |
| LINT-002 | Fix 'React' is not defined Errors     | HIGH     | 2h       | Multiple client components                                |
| LINT-003 | Fix unused variable errors            | MEDIUM   | 4h       | Client + Server                                           |
| LINT-004 | Fix array index key violations        | MEDIUM   | 4h       | Client components                                         |
| LINT-005 | Replace `any` types (non-critical)    | MEDIUM   | 8h       | Client + Server                                           |
| LINT-006 | Remove console.log statements         | LOW      | 2h       | Server files                                              |
| LINT-007 | Fix non-null assertions               | LOW      | 2h       | Client components                                         |
| LINT-008 | Fix NodeJS/HTMLTextAreaElement types  | MEDIUM   | 1h       | `server/_core/*.ts`                                       |
| TEST-020 | Fix permissionMiddleware.test.ts mock | HIGH     | 2h       | `server/_core/permissionMiddleware.test.ts`               |
| TEST-021 | Add ResizeObserver polyfill           | HIGH     | 1h       | `vitest.setup.ts`                                         |
| TEST-022 | Fix EventFormDialog test environment  | MEDIUM   | 2h       | `client/src/components/calendar/EventFormDialog.test.tsx` |
| TEST-023 | Fix ResizeObserver mock constructor   | HIGH     | 0.5h     | `tests/setup.ts`                                          |
| TEST-024 | Add tRPC mock `isPending` property    | HIGH     | 1h       | `tests/setup.ts`                                          |
| TEST-025 | Fix tRPC proxy memory leak            | MEDIUM   | 1h       | `tests/setup.ts`                                          |
| TEST-026 | Add vi.clearAllMocks() to setup       | MEDIUM   | 0.5h     | `tests/setup.ts`                                          |
| PERF-003 | Add mounted ref guard                 | MEDIUM   | 0.5h     | `usePerformanceMonitor.ts`                                |
| PERF-004 | Fix PerformanceObserver memory leak   | MEDIUM   | 0.5h     | `usePerformanceMonitor.ts`                                |
| PERF-005 | Fix useWebVitals mutable ref          | MEDIUM   | 1h       | `usePerformanceMonitor.ts`                                |

### Execution Order

```
# Batch 1: Test infrastructure (enables other tests)
1. TEST-020 + TEST-021 + TEST-023 + TEST-024 (parallel, 2h)
2. TEST-022 + TEST-025 + TEST-026 (parallel, 2h)

# Batch 2: High-priority lint fixes
3. LINT-001 + LINT-002 (parallel, 4h)

# Batch 3: Medium-priority lint fixes
4. LINT-003 + LINT-004 + LINT-008 (parallel, 4h)
5. LINT-005 (8h) - Large batch, can split

# Batch 4: Low-priority and performance
6. LINT-006 + LINT-007 (parallel, 2h)
7. PERF-003 + PERF-004 + PERF-005 (parallel, 2h)
```

### SAFE Mode Guidelines

- Small, frequent commits (every 30-60 minutes)
- Targeted tests + typecheck before each commit
- Batch similar fixes (all unused vars in one commit)
- Run `pnpm check && pnpm test` after each batch

---

## Team E: Infrastructure & Schema

**Mode:** STRICT
**Branch:** `claude/team-e-infrastructure`
**Estimate:** 20-28h
**Dependencies:** None (START IMMEDIATELY)

### Assigned Tasks

| Task      | Description                            | Priority | Estimate | Module                                   |
| --------- | -------------------------------------- | -------- | -------- | ---------------------------------------- |
| TERP-0004 | Add notifications table to autoMigrate | HIGH     | 2-4h     | `server/autoMigrate.ts`                  |
| TERP-0006 | Add cleanup migrations (0053/0054)     | MEDIUM   | 4-8h     | `drizzle/0053*.sql`, `drizzle/0054*.sql` |
| TERP-0019 | Verify MySQL identifier length limits  | MEDIUM   | 2-4h     | `drizzle/schema.ts`                      |
| PARTY-002 | Add FK Constraints to Bills Table      | MEDIUM   | 2h       | `drizzle/schema.ts`                      |
| PARTY-003 | Migrate Lots to Use supplierClientId   | MEDIUM   | 8h       | `drizzle/schema.ts`, `inventory.ts`      |
| BUILD-001 | Add VITE_APP_TITLE env variable        | LOW      | 0.5h     | `.env.example`                           |
| BUILD-002 | Fix chunk size warnings                | LOW      | 4h       | `vite.config.ts`                         |
| BUILD-003 | Add pnpm lint script                   | LOW      | 0.5h     | `package.json`                           |
| OBS-001   | Add GL Balance Verification Cron       | LOW      | 4h       | `server/cron/`                           |
| OBS-002   | Add AR Reconciliation Check            | LOW      | 4h       | `server/cron/`                           |

### Execution Order

```
# Batch 1: Critical schema work
1. TERP-0004 (2-4h) - Notifications table
2. TERP-0006 (4-8h) - Cleanup migrations
3. TERP-0019 (2-4h) - Identifier verification

# Batch 2: Party model schema
4. PARTY-002 + PARTY-003 (parallel, 8h)

# Batch 3: Build config (quick wins)
5. BUILD-001 + BUILD-002 + BUILD-003 (parallel, 4h)

# Batch 4: Observability
6. OBS-001 + OBS-002 (parallel, 4h)
```

### STRICT Mode Requirements

- [ ] Migration tested on fresh database
- [ ] Migration tested on database with existing data
- [ ] Rollback migration exists
- [ ] Schema changes documented

---

## Team F: UI/UX & Features

**Mode:** STRICT
**Branch:** `claude/team-f-ui-features`
**Estimate:** 40-56h
**Dependencies:** None (START IMMEDIATELY)

### Assigned Tasks

| Task        | Description                             | Priority | Estimate | Module                                                      |
| ----------- | --------------------------------------- | -------- | -------- | ----------------------------------------------------------- |
| TERP-0002   | Dashboard widget UX improvements        | MEDIUM   | 4-8h     | `client/src/components/dashboard/widgets-v2/*`              |
| TERP-0003   | Add Client Wizard to ClientsWorkSurface | HIGH     | 1-2h     | `client/src/components/work-surface/ClientsWorkSurface.tsx` |
| TERP-0005   | Reorganize navigation groups            | MEDIUM   | 2-4h     | `client/src/config/navigation.ts`                           |
| TERP-0009   | Add inventory consistency tests         | MEDIUM   | 4-8h     | `tests/integration/`                                        |
| TERP-0010   | Refactor getDashboardStats test mocks   | LOW      | 2-4h     | `server/inventoryDb.test.ts`                                |
| TERP-0011   | Create QA test data seeding script      | HIGH     | 4-8h     | `scripts/seed-qa-data.ts`                                   |
| TERP-0016   | Frontend data validation improvements   | MEDIUM   | 4-8h     | Various client components                                   |
| TERP-0017   | Backend input hardening                 | HIGH     | 4-8h     | Various server routers                                      |
| TERP-0018   | Error handling visibility improvements  | MEDIUM   | 4-8h     | Various components                                          |
| NAV-017     | Add Missing /alerts Route               | MEDIUM   | 1h       | `client/src/App.tsx`                                        |
| NAV-018     | Add Missing /reports/shrinkage Route    | MEDIUM   | 1h       | `client/src/App.tsx`                                        |
| API-019     | Fix PaymentMethod Type Mismatch         | MEDIUM   | 2h       | `MultiInvoicePaymentForm.tsx`                               |
| API-020     | Fix Pagination Response Inconsistency   | MEDIUM   | 4h       | Multiple routers                                            |
| OBS-003     | Add Inventory Audit Trail               | LOW      | 4h       | `server/routers/inventory.ts`                               |
| TEST-010    | Add Order→Invoice→GL Integration Tests  | LOW      | 8h       | `tests/integration/`                                        |
| TEST-011    | Add Concurrent Operation Tests          | LOW      | 4h       | `tests/integration/`                                        |
| TEST-012    | Update Batch Status Transition Test Map | LOW      | 2h       | `inventory.property.test.ts`                                |
| FEATURE-021 | Spreadsheet-like interfaces             | MEDIUM   | 40-56h   | Multiple (see sub-agent plan)                               |

### Execution Order

```
# Batch 1: Quick wins
1. TERP-0003 + NAV-017 + NAV-018 (parallel, 2h)

# Batch 2: Data and validation
2. TERP-0011 (4-8h) - QA seeding script
3. TERP-0016 + TERP-0017 (parallel, 8h) - Validation

# Batch 3: UI improvements
4. TERP-0002 + TERP-0005 (parallel, 6h)
5. TERP-0018 + API-019 + API-020 (parallel, 8h)

# Batch 4: Testing
6. TERP-0009 + TERP-0010 (parallel, 8h)
7. TEST-010 + TEST-011 + TEST-012 (parallel, 8h)

# Batch 5: Large feature (can run with sub-agents)
8. FEATURE-021 (40-56h) - Spawn sub-agents F1, F2, F3
```

### FEATURE-021 Sub-Agent Strategy

For the large spreadsheet feature, spawn 3 sub-agents:

- **F1:** AG-Grid integration and base component (16h)
- **F2:** Inline editing and validation (16h)
- **F3:** Keyboard navigation and accessibility (16h)

---

## Coordinator Agent

**Role:** Integration Coordinator
**Branch:** `main` (merge target)
**Responsibility:** PR management, conflict resolution, deployment verification

### Daily Standup Protocol

```bash
# Morning check (run daily)
echo "=== Team Status Check $(date) ===" >> docs/sessions/active/coordinator.md

# Check each team's branch
for team in a b c d e f; do
  echo "Team ${team^^}:" >> docs/sessions/active/coordinator.md
  git log --oneline -3 origin/claude/team-${team}-* 2>/dev/null || echo "  No activity"
done

# Check for PRs
gh pr list --state open >> docs/sessions/active/coordinator.md
```

### Merge Order Protocol

```
Phase 1 (Days 1-5):
├── Merge Team D first (code quality - enables CI to pass)
├── Merge Team E second (infrastructure - no code deps)
├── Merge Team C third (inventory - isolated business logic)
└── Merge Team F fourth (UI - may depend on C/E changes)

Phase 2 (Days 6-10):
├── Merge Team A (security - may touch shared code)
└── Merge Team B last (accounting - depends on Team A)

Integration Checkpoint:
└── Full verification after each merge:
    pnpm check && pnpm lint && pnpm test && pnpm build
```

### Conflict Resolution Protocol

1. **Identify conflict scope** - Which files, which teams
2. **Consult task context** - Read both teams' task descriptions
3. **Prefer newer patterns** - If Team A introduced ARCH-001, use those patterns
4. **Test after resolution** - Always run full verification
5. **Document resolution** - Add comment to PR explaining decision

### Final Verification Checklist

```bash
# Before declaring sprint complete
pnpm check        # 0 TypeScript errors
pnpm lint         # 0 lint errors
pnpm test         # 95%+ pass rate
pnpm build        # Success
pnpm roadmap:validate  # Valid

# Deployment verification
./scripts/watch-deploy.sh
curl https://terp-app-b9s35.ondigitalocean.app/health
./scripts/terp-logs.sh run 100 | grep -i "error"
```

---

## Success Criteria

### Sprint Complete When:

1. ✅ All 6 team branches merged to main
2. ✅ All ~80 tasks marked complete in MASTER_ROADMAP.md
3. ✅ `pnpm check && pnpm lint && pnpm test && pnpm build` all pass
4. ✅ Deployment verified healthy
5. ✅ No P0 security issues remaining
6. ✅ GL balanced after accounting changes
7. ✅ Summary report in `docs/sessions/completed/MULTI_AGENT_SPRINT_V2.md`

### Risk Mitigation

| Risk                          | Mitigation                                  |
| ----------------------------- | ------------------------------------------- |
| Team A blocks Team B too long | Team A prioritizes ARCH-001 first           |
| Merge conflicts               | Coordinator reviews daily, teams push often |
| Test failures cascade         | Team D fixes test infra first               |
| Schema migrations break       | Team E tests on fresh + existing DBs        |
| Security regressions          | Team A adds adversarial tests               |

---

## Appendix: Task ID Quick Reference

### By Priority

**P0 (Must Fix):** SEC-027, SEC-028, SEC-029, SEC-030, ACC-002, ACC-003, ACC-004, ACC-005, INV-001, INV-002, INV-003, ST-050, ST-051, ARCH-001, FIN-001, ORD-001

**P1 (Should Fix):** ARCH-002, ARCH-003, ARCH-004, PARTY-001, PARTY-002, PARTY-003, PARTY-004, LINT-001, LINT-002, TEST-020, TEST-021, TERP-0003, TERP-0004, TERP-0011, TERP-0014, TERP-0017

**P2 (Fix Next):** All remaining TERP-_, SM-_, ORD-_, INV-004, INV-005, LINT-003-008, TEST-022-026, NAV-_, API-\*

**P3 (As Capacity):** OBS-_, TEST-010-012, BUILD-_, PERF-\*, FEATURE-021

### By Team

- **Team A:** SEC-027/028/029/030, ST-050/051/053, ARCH-001, FIN-001, INV-003, ORD-001, TERP-0014
- **Team B:** ACC-002/003/004/005, ARCH-002/003/004, TERP-0012
- **Team C:** INV-001/002/004/005, TERP-0007/0008, SM-001/002/003, ORD-002/003/004, PARTY-001/004
- **Team D:** LINT-001-008, TEST-020-026, PERF-003/004/005
- **Team E:** TERP-0004/0006/0019, PARTY-002/003, BUILD-001/002/003, OBS-001/002
- **Team F:** TERP-0002/0003/0005/0009/0010/0011/0016/0017/0018, NAV-017/018, API-019/020, OBS-003, TEST-010/011/012, FEATURE-021
