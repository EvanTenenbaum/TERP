# TERP Execution Plan v2 (QA-Corrected)

**Created**: 2026-02-17
**Status**: APPROVED
**Linear Project**: https://linear.app/terpcorp/project/terp-golden-flows-beta-1fd329c5978d

---

## Changes from v1

| What Changed | Before | After |
|---|---|---|
| TER-248 scope | "cash locations + vendor payables" | strains (4 cols) + referral_settings (5 cols) |
| TER-248 estimate | 16h | 8h (column adds, not full tables) |
| TER-245 risk mode | STRICT | RED (needs deletedAt migration first) |
| TER-250 scope | "all 340 suppressions" (8h) | top 10 production files (~200 suppressions, 16h) |
| TER-241, TER-242 | Closed as Done | Reopened — tests skip/pass falsely |
| TER-190 | Wave 4 | Deferred — blocked on transaction test infrastructure |
| Wave ordering | Mixed deps & independents | Dependency-ordered, parallelizable work first |

---

## Dependency Graph

```
No dependencies (can start immediately):
├── TER-246  (any types in ClientsWorkSurface)
├── TER-238  (GF-001 brittle row count)
├── TER-240  (GF-005 invalid locator)
├── TER-241  (GF-006 test skip no-op)
├── TER-242  (GF-007 duplicate h1)
├── TER-243  (Cmd+K search focus)
└── TER-249  (oracle DB assertion stubs)

Schema migrations (RED mode, need approval):
├── TER-245  (add deletedAt to product_images → then soft delete)
└── TER-248  (add 9 pending columns to strains + referral_settings)

Ordered dependencies:
TER-247 server-side migration ──→ TER-235 client-side migration
   (rewrite 9 server queries)      (swap tRPC calls in 2 components)

TER-250 Wave 1 (top 5 files) ──→ TER-250 Wave 2 (next 5 files)

Blocked / Deferred:
TER-190  (remove test.skip) ── blocked by: transaction test infrastructure
TER-184  (dashboard fallback) ── NOT STARTED, needs investigation
```

---

## Wave 1: Zero-Dependency Quick Wins (2 days, SAFE/STRICT)

All independent. Can run in parallel.

| Task | Title | Est | Mode | Why First |
|---|---|---|---|---|
| TER-246 | Type ClientsWorkSurface (10 any + file-level disable) | 4h | SAFE | Quick win, contained scope |
| TER-238 | Fix GF-001 brittle toHaveCount(2) | 2h | SAFE | One-line fix |
| TER-240 | Fix GF-005 invalid locator syntax | 2h | SAFE | One-line fix |
| TER-241 | Fix GF-006 test skip no-op (make it actually validate ledger) | 4h | STRICT | Currently passes falsely |
| TER-242 | Fix GF-007 duplicate h1 (remove one of the two `<h1>Inventory</h1>`) | 2h | STRICT | Selector ambiguity |
| TER-243 | Fix Cmd+K search focus on pick-pack | 4h | STRICT | Loose assertion |

**Wave 1 total**: ~18h
**Verification**: `pnpm check && pnpm lint && pnpm test && pnpm build`
**Risk**: Low — all UI/test fixes, no data changes

---

## Wave 2: Schema Migrations (1-2 days, RED mode, needs approval)

Both require staging verification and rollback plans.

| Task | Title | Est | Columns |
|---|---|---|---|
| TER-245 | Add deletedAt to product_images + soft delete photography | 4h | 1 column + 2 code changes |
| TER-248 | Add strain + referral_settings columns | 8h | 9 columns, remove graceful-degradation stubs |

**Wave 2 total**: ~12h
**Prerequisites**: Staging DB access, explicit approval
**Rollback**: ALTER TABLE DROP COLUMN for each added column

---

## Wave 3: Vendors Table Migration (3-4 days, STRICT)

Must be executed in order. Server-side first, then client-side.

| Order | Task | Title | Est | Scope |
|---|---|---|---|---|
| 3.1 | TER-247 | Phase 1 Rewrite 9 server-side vendor queries | 6h | purchaseOrders.ts, audit.ts, debug.ts, dataCardMetricsDb.ts, inventoryDb.ts |
| 3.2 | TER-247 | Phase 2 Remove vendors.getAll endpoint | 1h | routers/vendors.ts |
| 3.3 | TER-235 | Migrate DirectIntakeWorkSurface + IntakeGrid | 3h | 2 client components swap trpc.vendors.getAll → trpc.clients.list |

**Wave 3 total**: ~10h
**Critical ordering**: 3.1 before 3.2 before 3.3, or DirectIntakeWorkSurface crashes
**Note**: IntakeGrid.tsx also uses vendors.getAll — not in TER-235's original scope but must be included

---

## Wave 4: E2E Assertion Rigor (2-3 days, STRICT)

| Task | Title | Est | Approach |
|---|---|---|---|
| TER-249 | Implement real DB assertions in oracle executor | 8h | Add debug endpoints, wire trpcQuery into assertDBState(), replace auto-pass stubs |
| TER-239 | Fix GF-002 Procure-to-Pay create action | 4h | Fix product selector + verify PO creation |

**Wave 4 total**: ~12h

---

## Wave 5: Type Cleanup (3-4 days, SAFE)

| Order | Task | Title | Est | Files |
|---|---|---|---|---|
| 5.1 | TER-250 Wave 1 | Top 5 files (LiveCatalog, IntakeReceipts, Settings, Matchmaking, PurchasePatterns) | 8h | 159 suppressions |
| 5.2 | TER-250 Wave 2 | Next 5 files (skeletons, needsMatching, ClientProfile, ClientsWorkSurface, +1) | 8h | ~41 suppressions |

**Wave 5 total**: ~16h
**Strategy**: Export tRPC router return types (fixes 60%), create interfaces (25%), type guards (15%)
**Not in scope**: Test file suppressions (46 total, follow-up task)

---

## Deferred (blocked or needs investigation)

| Task | Title | Why Deferred | Blocker |
|---|---|---|---|
| TER-190 | Remove test.skip() from critical tests | Skips exist because tests need transaction layer mocking | Architecture: need integration test infrastructure |
| TER-184 | Dashboard fallback deploy + QA | Not started in code, needs investigation first | Unknown scope |
| TER-183 | Photography E2E hardening | Unit tests done, but E2E needs photography flow stable | Depends on TER-245 |
| TER-166 | Media edge-case gaps | Unit edge cases covered, integration validation missing | Depends on TER-245 |

---

## Summary

| Wave | Theme | Tasks | Est | Mode | Deps |
|---|---|---|---|---|---|
| 1 | Quick wins (E2E + types) | 6 | 18h | SAFE/STRICT | None |
| 2 | Schema migrations | 2 | 12h | RED | Approval needed |
| 3 | Vendors table removal | 2+1 | 10h | STRICT | Sequential ordering |
| 4 | E2E assertion rigor | 2 | 12h | STRICT | None |
| 5 | Type cleanup | 1 (2 waves) | 16h | SAFE | None |
| **Total** | | **14 tasks** | **~68h** | | |
| Deferred | | 4 tasks | | | Blocked |

**Parallelization**: Waves 1 and 4 can run in parallel. Waves 2 and 3 are sequential. Wave 5 is independent filler work.
