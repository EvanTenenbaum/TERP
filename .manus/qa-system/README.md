# TERP QA System

**Location:** `/.manus/qa-system/`  
**Purpose:** Comprehensive E2E QA using Manus (browser) + Claude API (analysis)

## Quick Start

Tell Manus:
```
Read /.manus/qa-system/MASTER_ORCHESTRATOR.md and begin the QA audit
```

## Architecture

```
MANUS (Browser)                 CLAUDE API (Brain)
───────────────                 ──────────────────
✓ Navigate, click, type         ✓ Analyze observations
✓ Take screenshots              ✓ Calculate expected values
✓ Capture network/console       ✓ Determine pass/fail
✓ Report raw observations       ✓ Assign severity, root cause
                                ✓ Issue next instructions
```

**Rule:** Manus never analyzes. Claude never touches browser.

## Test Accounts

| Email | Password | Role |
|-------|----------|------|
| qa.superadmin@terp.test | TerpQA2026! | Super Admin |
| qa.salesmanager@terp.test | TerpQA2026! | Sales Manager |
| qa.salesrep@terp.test | TerpQA2026! | Sales Rep |
| qa.inventory@terp.test | TerpQA2026! | Inventory Manager |
| qa.fulfillment@terp.test | TerpQA2026! | Warehouse Staff |
| qa.accounting@terp.test | TerpQA2026! | Accounting Manager |
| qa.auditor@terp.test | TerpQA2026! | Read-Only Auditor |

## Execution Order

```
Phase 1: 01-REGRESSION (5 min) ─── GATE: must pass to continue
              │
              ▼
Phase 2: 02-AUTH ─┬─ 03-MONEY ─┬─ 06-CRM ─┬─ 07-PLATFORM  (parallel)
                  │            │          │
                  ▼            ▼          ▼
Phase 3:      04-INVENTORY ────┴──── 05-ORDERS            (parallel)
                        │
                        ▼
Phase 4:      08-QUALITY ─────────── 09-STRESS            (parallel)
```

## Files

| File | Tests | Purpose |
|------|-------|---------|
| `MASTER_ORCHESTRATOR.md` | — | Main Manus prompt |
| `DEPLOYMENT_GUIDE.md` | — | Claude API integration |
| `agents/01-REGRESSION.md` | 14 | Smoke tests (run first) |
| `agents/02-AUTH.md` | ~40 | RBAC, permissions, security |
| `agents/03-MONEY.md` | ~65 | Invoices, payments, AR, ledger |
| `agents/04-INVENTORY.md` | ~50 | Stock, FIFO costing, batches |
| `agents/05-ORDERS.md` | ~55 | Order lifecycle, credit limits |
| `agents/06-CRM.md` | ~45 | Party model, TERI codes, contacts |
| `agents/07-PLATFORM.md` | ~45 | Dashboard, navigation, search |
| `agents/08-QUALITY.md` | ~35 | A11y, performance, responsive |
| `agents/09-STRESS.md` | ~40 | Concurrency, edge cases |

**Total:** 400+ test scenarios

## Test Data Safety

All test data MUST use prefix: `qa-e2e-YYYYMMDD-[agent]-[seq]`

Example: `qa-e2e-20260125-money-001`

**NEVER** modify records without this prefix.

## Severity Levels

| Level | Name | Response |
|-------|------|----------|
| **P0** | Trust Killer | STOP, fix now |
| **P1** | Blocker | Fix within 24h |
| **P2** | Degraded | Fix within 1 week |
| **P3** | Paper Cut | Fix in sprint |

## Known Issues (Skip These)

- P0-002: Inventory flexible lot selection
- P0-003: Orders RETURNED status
- P1-001: Invoice void reason field
- REL-002: Inventory DECIMAL migration
- REL-003: Money DECIMAL migration
