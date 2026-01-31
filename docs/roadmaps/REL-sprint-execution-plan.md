# REL Sprint Execution Plan

**Created:** 2026-01-31
**Source:** Deep Systemic Analysis
**Total Estimate:** 96h (~2.5 weeks with 3 agents)
**Methodology:** Parallel subagent execution where dependencies allow

---

## Execution Overview

```
WEEK 1 (P0 + P1 Start)
├── Stream A (Backend/Financial) ─────────────────────────────────────────────►
│   └── Agent 1: REL-001 → REL-003 → REL-004 → REL-006
│
├── Stream B (Frontend Safety) ───────────────────────────────────────────────►
│   └── Agent 2: REL-002 → REL-014 → REL-015 → REL-016
│
└── Stream C (Schema/Database) ───────────────────────────────────────────────►
    └── Agent 3: REL-005 → REL-007 → REL-011

WEEK 2 (P1 Complete + P2 Start)
├── Stream A: REL-009 → REL-010
├── Stream B: REL-008
└── Stream C: REL-012 → REL-013
```

---

## Phase 1: P0 Critical (Days 1-3)

### Stream A: Backend Financial Safety
**Agent Assignment:** Claude Code Primary
**Mode:** RED (requires explicit approval before execution)

| Order | Task | Est | Depends On | Files |
|-------|------|-----|------------|-------|
| 1.1 | REL-001: Null Money Handling | 4h | None | server/utils/money.ts, server/routers/inventory.ts, server/routers/orders.ts |
| 1.2 | REL-003: Transaction Rollback | 4h | None | server/routers/payments.ts |
| 1.3 | REL-004: Decimal.js Precision | 8h | None | server/utils/decimal.ts, server/routers/orders.ts, payments.ts, invoices.ts |

**Stream A Checkpoint:** All financial calculations use Decimal.js, null handling standardized

### Stream B: Frontend Display Safety
**Agent Assignment:** Claude Code Secondary (can run parallel)
**Mode:** STRICT

| Order | Task | Est | Depends On | Files |
|-------|------|-----|------------|-------|
| 2.1 | REL-002: Safe toFixed | 4h | None | client/src/utils/formatters.ts, Inventory.tsx, Orders.tsx |
| 2.2 | REL-014: localStorage Safety | 4h | None | client/src/utils/storage.ts |
| 2.3 | REL-015: Query Enabled | 4h | None | Inventory.tsx, Orders.tsx |
| 2.4 | REL-016: Safe Map | 4h | None | Inventory.tsx, Orders.tsx |

**Stream B Checkpoint:** No more frontend crashes from null/undefined

---

## Phase 2: P1 High Priority (Days 4-7)

### Stream A Continues: Backend Data Integrity
**Mode:** RED

| Order | Task | Est | Depends On | Files |
|-------|------|-----|------------|-------|
| 1.4 | REL-006: Order Confirm Transaction | 4h | REL-003 | server/routers/orders.ts |
| 1.5 | REL-009: Relation Loading | 4h | None | server/routers/orders.ts |
| 1.6 | REL-010: Raw SQL Standardization | 8h | REL-004 | orders.ts, payments.ts |

### Stream C: Schema Changes (NEW - Can start Day 4)
**Agent Assignment:** Claude Code Tertiary
**Mode:** RED

| Order | Task | Est | Depends On | Files |
|-------|------|-----|------------|-------|
| 3.1 | REL-005: Optimistic Locking | 8h | REL-001 | drizzle/schema.ts, all routers |
| 3.2 | REL-007: NotNull Money Fields | 8h | REL-001 | drizzle/schema.ts |
| 3.3 | REL-008: Zod Range Validation | 4h | None | server/routers/*.ts |

**Phase 2 Checkpoint:** Core reliability issues resolved, schema hardened

---

## Phase 3: P2 Technical Debt (Days 8-12)

### Stream A: Final Backend Cleanup
| Order | Task | Est | Depends On | Files |
|-------|------|-----|------------|-------|
| 1.7 | REL-011: Soft Delete | 8h | None | drizzle/schema.ts |

### Stream C: Schema Standardization
| Order | Task | Est | Depends On | Files |
|-------|------|-----|------------|-------|
| 3.4 | REL-012: Decimal Precision | 16h | REL-007 | drizzle/schema.ts |
| 3.5 | REL-013: Vendor Deprecation | 40h | None | 79 files |

---

## Parallel Execution Matrix

```
Day 1-2:
  Agent 1: REL-001 (4h) → REL-003 (4h)
  Agent 2: REL-002 (4h) → REL-014 (4h)

Day 3:
  Agent 1: REL-004 (8h) - start
  Agent 2: REL-015 (4h) → REL-016 (4h)

Day 4:
  Agent 1: REL-004 (8h) - complete
  Agent 3: REL-005 (8h) - start (schema changes)

Day 5:
  Agent 1: REL-006 (4h)
  Agent 2: REL-008 (4h)
  Agent 3: REL-005 (complete) → REL-007 (start)

Day 6-7:
  Agent 1: REL-009 (4h) → REL-010 (8h start)
  Agent 3: REL-007 (complete)

Day 8-12:
  Agent 1: REL-010 (complete) → REL-011 (8h)
  Agent 3: REL-012 (16h) → REL-013 (40h, can be deprioritized)
```

---

## Verification Gates

### Gate 1: P0 Complete (End of Day 3)
```bash
# All must pass:
pnpm check
pnpm lint  
pnpm test
pnpm build

# Manual verification:
# - Inventory page shows "—" for null costs, not $0.00
# - No "NaN" anywhere in UI
# - Payment failure doesn't leave partial state
```

### Gate 2: P1 Complete (End of Day 7)
```bash
# Plus these verifications:
pnpm test:schema  # Schema changes verified

# Manual verification:
# - Edit same order in 2 tabs → conflict detected
# - Order confirm fails → clean rollback, no orphaned records
```

### Gate 3: Sprint Complete (End of Day 12)
```bash
# Full regression:
pnpm test:e2e

# Audit verification:
grep -r "vendorId" server/ | wc -l  # Should be 0 or minimal
grep -r "parseFloat(batch" server/ | wc -l  # Should be 0
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Schema migration breaks production | Run REL-005, REL-007, REL-011 in staging first, use reversible migrations |
| Decimal.js changes calculation results | Run parallel float vs Decimal comparison tests before deploying |
| Optimistic locking blocks legitimate saves | Implement clear UI messaging, add "force save" admin option |
| 79-file vendor migration too large | Deprioritize REL-013, do incrementally per module |

---

## Agent Assignment Summary

| Agent | Stream | Tasks | Total Hours |
|-------|--------|-------|-------------|
| Agent 1 | A - Backend | REL-001,003,004,006,009,010,011 | 44h |
| Agent 2 | B - Frontend | REL-002,008,014,015,016 | 20h |
| Agent 3 | C - Schema | REL-005,007,012,013 | 72h |

**Note:** Agent 3 has the heaviest load. Consider splitting REL-013 (vendor deprecation) across multiple agents by module.

---

## Session Management

Each agent should:

1. **Before starting:** Check `docs/ACTIVE_SESSIONS.md` for conflicts
2. **Create session:** `docs/sessions/active/Session-YYYYMMDD-REL-XXX-{hash}.md`
3. **Register:** Add to `docs/ACTIVE_SESSIONS.md`
4. **Work:** Follow verification protocol per CLAUDE.md
5. **Complete:** Move to `docs/sessions/completed/`, update roadmap