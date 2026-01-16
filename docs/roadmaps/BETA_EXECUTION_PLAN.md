# Beta Milestone Strategic Execution Plan

## Optimized for Claude Parallel Agents

**Version:** 1.0
**Created:** 2026-01-14
**Status:** Ready for Execution
**Total Tasks:** 17 (REL-001 through REL-017)
**Estimated Total Effort:** ~26 days (can be compressed to ~8-10 days with parallelization)

---

## Executive Summary

This plan organizes the 17 Beta Reliability Program tasks into **6 execution waves** based on dependency analysis. Each wave contains tasks that can be executed in parallel by multiple Claude agents, with clear handoff points between waves.

**Key Optimization:** By leveraging parallel agents, the sequential ~26 day effort can be compressed to **~8-10 days** of wall-clock time.

---

## Dependency Graph

```
                    ┌─────────────────────────────────────────────────────────────┐
                    │                     WAVE 1 (Foundation)                      │
                    │                        REL-001                               │
                    │           Define Truth Model + Invariants (8h)               │
                    └───────────────────────────┬─────────────────────────────────┘
                                                │
                    ┌───────────────────────────┴─────────────────────────────────┐
                    │                                                              │
        ┌───────────▼───────────┐                              ┌──────────────────▼──────────────────┐
        │    WAVE 2A (Schema)   │                              │     WAVE 2B (Core Infrastructure)   │
        │  ┌─────────────────┐  │                              │  ┌────────────────────────────────┐ │
        │  │ REL-002 (2d)    │  │                              │  │ REL-004 Critical Mutation (16h)│ │
        │  │ Inventory DECIMAL│  │                              │  └────────────────┬───────────────┘ │
        │  └─────────────────┘  │                              │                   │                 │
        │  ┌─────────────────┐  │                              │  ┌────────────────▼───────────────┐ │
        │  │ REL-003 (2d)    │  │                              │  │ REL-005 Idempotency Keys (2d)  │ │
        │  │ Money DECIMAL   │  │                              │  └────────────────────────────────┘ │
        │  └─────────────────┘  │                              │  ┌────────────────────────────────┐ │
        └───────────┬───────────┘                              │  │ REL-009 Reconciliation Fwk(2d) │ │
                    │                                          │  └────────────────────────────────┘ │
                    │                                          └──────────────────┬──────────────────┘
                    │                                                             │
        ┌───────────▼─────────────────────────────────────────────────────────────▼───────────────────┐
        │                               WAVE 3 (Domain Hardening)                                      │
        │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐  │
        │  │ REL-006 (2d)     │  │ REL-007 (16h)    │  │ REL-008 (2d)     │  │ REL-013 (16h)        │  │
        │  │ Inventory        │  │ Inventory        │  │ Ledger           │  │ RBAC Drift           │  │
        │  │ Concurrency      │  │ Immutability     │  │ Immutability     │  │ Detector             │  │
        │  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘  └──────────────────────┘  │
        └───────────┼─────────────────────┼─────────────────────┼─────────────────────────────────────┘
                    │                     │                     │
        ┌───────────▼─────────────────────▼─────────────────────▼─────────────────────────────────────┐
        │                           WAVE 4 (Reconciliation Packs)                                      │
        │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐  │
        │  │ REL-010 (16h)    │  │ REL-011 (2d)     │  │ REL-012 (16h)    │  │ REL-015 (16h)        │  │
        │  │ Inventory        │  │ AR/AP            │  │ Ledger           │  │ Observability        │  │
        │  │ Reconciliation   │  │ Reconciliation   │  │ Reconciliation   │  │ Critical Mutations   │  │
        │  └──────────────────┘  └──────────────────┘  └──────────────────┘  └──────────────────────┘  │
        └─────────────────────────────────────────────────────────┬───────────────────────────────────┘
                                                                  │
        ┌─────────────────────────────────────────────────────────▼───────────────────────────────────┐
        │                            WAVE 5 (Testing & Operations)                                     │
        │  ┌────────────────────────────────────┐  ┌────────────────────────────────────────────────┐ │
        │  │ REL-014 (2d)                       │  │ REL-016 (2d)                                   │ │
        │  │ Critical Correctness Test Harness  │  │ Backup/Restore Reliability Runbook            │ │
        │  └────────────────────┬───────────────┘  └────────────────────────────────────────────────┘ │
        └───────────────────────┼─────────────────────────────────────────────────────────────────────┘
                                │
        ┌───────────────────────▼─────────────────────────────────────────────────────────────────────┐
        │                              WAVE 6 (CI/CD Integration)                                      │
        │  ┌────────────────────────────────────────────────────────────────────────────────────────┐ │
        │  │ REL-017 (16h)                                                                          │ │
        │  │ CI/PR Gates for Critical Domains                                                       │ │
        │  └────────────────────────────────────────────────────────────────────────────────────────┘ │
        └─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Wave Definitions

### Wave 1: Foundation (Day 1)
**Duration:** 1 day | **Agents:** 1 | **Blocker for:** All subsequent waves

| Task | Description | Estimate | Blockers | Deliverables |
|------|-------------|----------|----------|--------------|
| REL-001 | Define Truth Model + Invariants | 8h | None | `docs/reliability/TRUTH_MODEL.md`, `docs/reliability/INVARIANTS.md` |

**Why First:** This task defines the canonical truth sources and invariant checks that ALL other tasks reference. The invariant queries defined here are used by:
- REL-010, REL-011, REL-012 (reconciliation packs)
- REL-014 (test harness runs invariant queries after each step)
- REL-017 (CI gates check invariants)

**Agent Instructions:**
```
Read: server/inventoryMovementsDb.ts, server/inventoryDb.ts, server/accountingDb.ts
Read: drizzle/schema*.ts, existing migrations
Output: 10+ invariant queries with purpose, SQL, and violation handling
```

---

### Wave 2: Parallel Foundation (Days 2-3)
**Duration:** 2 days | **Agents:** 4 (parallel) | **Blocker for:** Wave 3

Split into two parallel tracks that can execute simultaneously:

#### Wave 2A: Schema Migrations (2 Agents)

| Task | Description | Estimate | Blockers | Deliverables |
|------|-------------|----------|----------|--------------|
| REL-002 | Migrate Inventory Quantities to DECIMAL | 2d | REL-001 | Dual-write + backfill + feature flag |
| REL-003 | Migrate Money Amounts to DECIMAL | 2d | REL-001 | Dual-write + backfill + feature flag |

**These tasks are independent** and can be worked on by separate agents simultaneously. They share the same migration pattern but touch different domains.

**Agent 1 (REL-002) Instructions:**
```
Focus: server/inventoryDb.ts, server/inventoryMovementsDb.ts
Pattern: Add DECIMAL columns -> dual-write -> backfill -> feature flag for read cutover
Tests: Extend server/inventory.integration.test.ts
```

**Agent 2 (REL-003) Instructions:**
```
Focus: server/accountingDb.ts, server/services/orderAccountingService.ts
Pattern: Same as REL-002 but for money fields
Tests: Extend server/accounting.integration.test.ts
```

#### Wave 2B: Core Infrastructure (2 Agents)

| Task | Description | Estimate | Blockers | Deliverables |
|------|-------------|----------|----------|--------------|
| REL-004 | Critical Mutation Wrapper | 16h | REL-001 | `server/_core/criticalMutation.ts` |
| REL-009 | Reconciliation Framework | 2d | REL-001 | `server/_core/reconciliationService.ts`, `scripts/reconcile.ts` |

**These tasks are independent** - one creates the mutation wrapper, the other creates the reconciliation framework.

**Agent 3 (REL-004) Instructions:**
```
Build: server/_core/criticalMutation.ts on top of existing dbTransaction.ts
Apply to: All inventory + money mutations (adjustments, intake, fulfill, invoice, payment, credit)
Tests: At least 1 atomicity test per domain (force mid-flow failure -> no partial writes)
```

**Agent 4 (REL-009) Instructions:**
```
Build: server/_core/reconciliationService.ts with pluggable scopes
CLI: scripts/reconcile.ts --mode=report|fix --scope=inventory|ar|ap|ledger|rbac
Output: Deterministic JSON report schema
```

---

### Wave 3: Domain Hardening (Days 4-5)
**Duration:** 2 days | **Agents:** 4 (parallel) | **Blocker for:** Wave 4

All tasks in this wave depend on Wave 2 completion and can run in parallel with each other.

| Task | Description | Estimate | Blockers | Deliverables |
|------|-------------|----------|----------|--------------|
| REL-005 | Idempotency Keys | 2d | REL-004 | `idempotency_keys` table, middleware |
| REL-006 | Inventory Concurrency Hardening | 2d | REL-004, REL-002 | Row locks + optimistic locking |
| REL-007 | Inventory Movements Immutability | 16h | REL-004 | Append-only movements + reversals |
| REL-008 | Ledger Immutability + Reversal | 2d | REL-004, REL-003 | Immutable ledger + reversal entries |

**Agent 1 (REL-005) Instructions:**
```
Schema: Add idempotency_keys table (unique key, scope, requestHash, status, resultRef, timestamps)
Apply to: Record payment, apply credit, receive inventory, fulfill/ship, generate invoice, reversals
Tests: Re-run identical calls N times with same key -> single effect
```

**Agent 2 (REL-006) Instructions:**
```
Use: server/_core/dbLocking.ts for row locks, server/_core/optimisticLocking.ts for version checks
Tests: Concurrent fulfills on same batch, concurrent receive+fulfill
Invariants: No negative qty, sum(movements) == projection
```

**Agent 3 (REL-007) Instructions:**
```
Enforce: Append-only movements, no UPDATE/DELETE on posted movements
Add: Reversal movement type that references original + negates delta
Tests: Create -> reverse -> verify projection and reconstruction match original
```

**Agent 4 (REL-008) Instructions:**
```
Enforce: Posted journals cannot be edited, only reversed
Validate: debits == credits on write
Lock: Period locks block postings in ALL posting paths
Tests: Unbalanced journal rejected, locked period rejected, reversal restores balances
```

**Additional Parallel Task (REL-013):**

| Task | Description | Estimate | Blockers | Deliverables |
|------|-------------|----------|----------|--------------|
| REL-013 | RBAC Drift Detector | 16h | REL-009 | Permission extraction + drift report |

**Agent 5 (REL-013) Instructions:**
```
Extract: requirePermission(...) patterns from server/
Compare: vs rbacDefinitions.ts and DB permissions tables
Output: Reconciliation scope 'rbac' in scripts/reconcile.ts
```

---

### Wave 4: Reconciliation Packs (Days 6-7)
**Duration:** 2 days | **Agents:** 4 (parallel) | **Blocker for:** Wave 5

| Task | Description | Estimate | Blockers | Deliverables |
|------|-------------|----------|----------|--------------|
| REL-010 | Inventory Reconciliation Pack | 16h | REL-009, REL-007 | Drift detection + adjustment movements |
| REL-011 | AR/AP Reconciliation Pack | 2d | REL-009, REL-008 | Invoice/payment/credit integrity checks |
| REL-012 | Ledger Reconciliation Pack | 16h | REL-009, REL-008 | Balance + duplicate + orphan detection |
| REL-015 | Observability for Critical Mutations | 16h | REL-004 | correlationId, structured logs, Sentry tags |

**Agent 1 (REL-010) Instructions:**
```
Checks: sum(movements) vs projection, negative on-hand, orphan movements
Fix mode: ONLY creates adjustment movements (audited, requires --confirm)
Output: Report with causality pointers (batch/location/movement)
```

**Agent 2 (REL-011) Instructions:**
```
Checks: amountDue matches computed balance, payment sums, credit limits, unallocated payments
Tests: Partial payment, overpayment, credit memo scenarios
Output: Report lists specific broken references with remediation
```

**Agent 3 (REL-012) Instructions:**
```
Checks: Unbalanced journals, duplicate postings, orphan references, locked period violations
Fix mode: Limited to safe reversals with strict guardrails
Output: Remediation guidance (reversal vs re-post)
```

**Agent 4 (REL-015) Instructions:**
```
Add: correlationId/mutationId to request context
Emit: Structured logs from critical mutation wrapper (actor, permission, entity refs, before/after)
Sentry: Add breadcrumbs/tags for critical mutation events
Docs: Troubleshooting runbook under docs/reliability/
```

---

### Wave 5: Testing & Operations (Days 8-9)
**Duration:** 2 days | **Agents:** 2 (parallel) | **Blocker for:** Wave 6

| Task | Description | Estimate | Blockers | Deliverables |
|------|-------------|----------|----------|--------------|
| REL-014 | Critical Correctness Test Harness | 2d | REL-001, REL-004-008 | Deterministic fixtures + invariant suite |
| REL-016 | Backup/Restore Reliability Runbook | 2d | REL-009 | DR runbook + staging validation script |

**Agent 1 (REL-014) Instructions:**
```
Fixtures: receive -> fulfill -> reverse -> adjust (inventory), invoice -> partial pay -> credit -> reversal (money)
After each step: Run invariant queries from REL-001
Concurrency tests: Validate locking + idempotency
Output: One command runs entire critical correctness suite
```

**Agent 2 (REL-016) Instructions:**
```
Docs: DR_RUNBOOK.md (backup frequency/retention, restore steps, RPO/RTO targets)
Script: Staging restore validation that restores snapshot + runs reconciliation report
Output: Pass/fail report with timestamps
```

---

### Wave 6: CI/CD Integration (Day 10)
**Duration:** 1 day | **Agents:** 1 | **Final Wave**

| Task | Description | Estimate | Blockers | Deliverables |
|------|-------------|----------|----------|--------------|
| REL-017 | CI/PR Gates for Critical Domains | 16h | REL-014, REL-009 | CI rules + PR checklist |

**Agent Instructions:**
```
Detect: PR touches server/inventory*, server/accounting*, drizzle/schema*, migrations
If touched: Run critical correctness suite (REL-014) + reconciliation report (REL-009)
Fail CI: On any invariant violation
Docs: docs/reliability/CI_GATES.md
```

---

## Execution Timeline

```
Day 1:   [Wave 1] REL-001 (1 agent)
         ├── Agent 1: Truth Model + Invariants
         │
Day 2-3: [Wave 2] REL-002, REL-003, REL-004, REL-009 (4 agents parallel)
         ├── Agent 1: REL-002 Inventory DECIMAL
         ├── Agent 2: REL-003 Money DECIMAL
         ├── Agent 3: REL-004 Critical Mutation Wrapper
         └── Agent 4: REL-009 Reconciliation Framework
         │
Day 4-5: [Wave 3] REL-005, REL-006, REL-007, REL-008, REL-013 (5 agents parallel)
         ├── Agent 1: REL-005 Idempotency Keys
         ├── Agent 2: REL-006 Inventory Concurrency
         ├── Agent 3: REL-007 Inventory Immutability
         ├── Agent 4: REL-008 Ledger Immutability
         └── Agent 5: REL-013 RBAC Drift Detector
         │
Day 6-7: [Wave 4] REL-010, REL-011, REL-012, REL-015 (4 agents parallel)
         ├── Agent 1: REL-010 Inventory Reconciliation
         ├── Agent 2: REL-011 AR/AP Reconciliation
         ├── Agent 3: REL-012 Ledger Reconciliation
         └── Agent 4: REL-015 Observability
         │
Day 8-9: [Wave 5] REL-014, REL-016 (2 agents parallel)
         ├── Agent 1: REL-014 Test Harness
         └── Agent 2: REL-016 Backup/Restore Runbook
         │
Day 10:  [Wave 6] REL-017 (1 agent)
         └── Agent 1: CI/PR Gates
```

---

## Parallel Agent Orchestration Commands

For each wave, launch agents using this pattern:

### Wave 1 (Single Agent)
```bash
# Launch REL-001
claude --task "Execute REL-001 following docs/prompts/REL-001.md"
```

### Wave 2 (4 Parallel Agents)
```bash
# Launch all 4 in parallel
claude --task "Execute REL-002 following docs/prompts/REL-002.md" &
claude --task "Execute REL-003 following docs/prompts/REL-003.md" &
claude --task "Execute REL-004 following docs/prompts/REL-004.md" &
claude --task "Execute REL-009 following docs/prompts/REL-009.md" &
wait
```

### Wave 3 (5 Parallel Agents)
```bash
# Launch all 5 in parallel (after Wave 2 completion)
claude --task "Execute REL-005 following docs/prompts/REL-005.md" &
claude --task "Execute REL-006 following docs/prompts/REL-006.md" &
claude --task "Execute REL-007 following docs/prompts/REL-007.md" &
claude --task "Execute REL-008 following docs/prompts/REL-008.md" &
claude --task "Execute REL-013 following docs/prompts/REL-013.md" &
wait
```

### Wave 4 (4 Parallel Agents)
```bash
# Launch all 4 in parallel (after Wave 3 completion)
claude --task "Execute REL-010 following docs/prompts/REL-010.md" &
claude --task "Execute REL-011 following docs/prompts/REL-011.md" &
claude --task "Execute REL-012 following docs/prompts/REL-012.md" &
claude --task "Execute REL-015 following docs/prompts/REL-015.md" &
wait
```

### Wave 5 (2 Parallel Agents)
```bash
# Launch both in parallel (after Wave 4 completion)
claude --task "Execute REL-014 following docs/prompts/REL-014.md" &
claude --task "Execute REL-016 following docs/prompts/REL-016.md" &
wait
```

### Wave 6 (Single Agent)
```bash
# Launch REL-017 (after Wave 5 completion)
claude --task "Execute REL-017 following docs/prompts/REL-017.md"
```

---

## Critical Path Analysis

The **critical path** (longest sequential chain) is:

```
REL-001 (8h) → REL-004 (16h) → REL-008 (2d) → REL-012 (16h) → REL-014 (2d) → REL-017 (16h)
Total: ~8 days
```

All other tasks run in parallel with this critical path, making the overall timeline ~10 days with coordination overhead.

---

## Risk Mitigation

### Blocker Resolution Protocol

If an agent encounters a blocker:

1. **Schema Conflicts (REL-002/003):** Run migrations in a specific order - inventory first, then money
2. **Test Failures:** Create detailed issue with stack trace, tag with `reliability-blocker`
3. **Code Conflicts:** Use feature flags to isolate changes, merge incrementally

### Rollback Points

Each wave creates a stable checkpoint:
- **After Wave 1:** Documentation only, no code changes
- **After Wave 2:** Feature-flagged schema changes (can disable flags)
- **After Wave 3:** Core infrastructure (wrapper + idempotency can be disabled)
- **After Wave 4:** Reconciliation is read-only by default
- **After Wave 5:** Tests + docs only
- **After Wave 6:** CI gates can be disabled via workflow config

---

## Success Criteria

### Wave Completion Checklist

- [ ] **Wave 1:** `docs/reliability/TRUTH_MODEL.md` and `INVARIANTS.md` committed
- [ ] **Wave 2:** All 4 tasks pass tests, feature flags documented
- [ ] **Wave 3:** All 5 tasks pass tests, concurrency tests green
- [ ] **Wave 4:** All 4 reconciliation scopes produce valid JSON reports
- [ ] **Wave 5:** `pnpm test:critical` runs full suite, DR runbook validated
- [ ] **Wave 6:** CI gates active, `docs/reliability/CI_GATES.md` committed

### Program Definition of Done

From the roadmap (non-negotiable):
- [ ] Every critical mutation is **transactional**, **retry-safe**, and **idempotent**
- [ ] Inventory and money systems are **reconstructable from immutable journals**
- [ ] Continuous reconciliation exists with alerts
- [ ] CI gates prevent merges that break invariants

---

## File Deliverables Summary

| Wave | New Files Created |
|------|-------------------|
| 1 | `docs/reliability/TRUTH_MODEL.md`, `docs/reliability/INVARIANTS.md` |
| 2 | `server/_core/criticalMutation.ts`, `server/_core/reconciliationService.ts`, `scripts/reconcile.ts`, migrations |
| 3 | `server/_core/idempotency.ts`, schema additions |
| 4 | Reconciliation modules (inventory, ar, ap, ledger scopes) |
| 5 | Test fixtures, `docs/reliability/DR_RUNBOOK.md` |
| 6 | `docs/reliability/CI_GATES.md`, CI workflow updates |

---

## Quick Reference: All Tasks by Wave

| Wave | Tasks | Agent Count | Duration | Key Deliverables |
|------|-------|-------------|----------|------------------|
| 1 | REL-001 | 1 | 1 day | Truth Model + Invariants docs |
| 2 | REL-002, REL-003, REL-004, REL-009 | 4 | 2 days | DECIMAL migrations, Mutation wrapper, Reconciliation framework |
| 3 | REL-005, REL-006, REL-007, REL-008, REL-013 | 5 | 2 days | Idempotency, Concurrency, Immutability (inventory + ledger), RBAC drift |
| 4 | REL-010, REL-011, REL-012, REL-015 | 4 | 2 days | All reconciliation packs, Observability |
| 5 | REL-014, REL-016 | 2 | 2 days | Test harness, DR runbook |
| 6 | REL-017 | 1 | 1 day | CI/PR gates |
| **Total** | **17 tasks** | **17 agents** | **10 days** | **Full Reliability Program** |

---

## References

- **Master Roadmap:** `docs/roadmaps/MASTER_ROADMAP.md`
- **Task Prompts:** `docs/prompts/REL-001.md` through `docs/prompts/REL-017.md`
- **Code Anchors:**
  - Transactions: `server/_core/dbTransaction.ts`
  - Locking: `server/_core/dbLocking.ts`
  - Optimistic Locking: `server/_core/optimisticLocking.ts`
  - Inventory: `server/inventoryDb.ts`, `server/inventoryMovementsDb.ts`
  - Accounting: `server/accountingDb.ts`, `server/services/orderAccountingService.ts`
  - RBAC: `server/_core/permissionMiddleware.ts`, `server/services/rbacDefinitions.ts`
