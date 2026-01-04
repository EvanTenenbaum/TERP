# TERP Strategic Analysis - January 2026

**Prepared by:** VP of Product & Engineering
**Date:** January 4, 2026
**Purpose:** Comprehensive review and strategic roadmap to full task completion

---

## Executive Summary

After conducting a thorough audit of recent agent work, the current codebase state, and the existing roadmap, I've identified critical gaps that must be addressed before parallel agent execution can succeed. The primary blocker is **schema mismatch** - 25 files have `@ts-nocheck` directives because they reference database columns that don't exist.

### Current State Assessment

| Metric | Status | Risk Level |
|--------|--------|------------|
| TypeScript Compilation | ✅ 0 errors | LOW (but fragile) |
| @ts-nocheck Files | 25 files | 🔴 HIGH |
| Console.log Statements | 420 | 🟡 MEDIUM |
| TODO/FIXME Comments | 36 | 🟢 LOW |
| Test Coverage | ~21% | 🟡 MEDIUM |
| Open PRs | 0 | ✅ GOOD |
| Active Sessions | 0 | ✅ GOOD |

---

## Critical Findings

### 1. Schema Mismatch Crisis (P0)

**Problem:** 25 files reference database columns that don't exist in the schema.

**Root Cause:** Routers were written for a planned schema that was never implemented.

**Impact:**
- `@ts-nocheck` hides real bugs
- Any agent touching these files will introduce regressions
- Runtime errors possible in production

**Affected Areas:**
- 13 server routers (alerts, analytics, audit, customerPreferences, etc.)
- 12 client components (Inventory, Photography, VIPDashboard, etc.)

**Required Fix:** Either:
1. Update routers to use actual column names (RECOMMENDED)
2. Add missing columns via migration (RISKY)

### 2. Roadmap Fragmentation

**Problem:** The MASTER_ROADMAP.md is 10,483 lines with:
- Completed tasks mixed with open tasks
- Multiple priority systems (P0/P1/P2 AND CRITICAL/HIGH/MEDIUM)
- Outdated status markers
- No clear "what's next" section

**Impact:**
- Agents can't quickly identify what to work on
- Risk of duplicate work
- No clear dependencies

### 3. Missing Pre-Flight Validation

**Problem:** Previous agent sessions failed because:
- TypeScript errors blocked compilation
- No validation that environment is ready
- No schema verification step

**Impact:**
- Wasted agent cycles
- Incomplete PRs
- Merge conflicts

### 4. Test Infrastructure Gaps

**Problem:**
- 372 test files but only 21% coverage
- Many tests are stubs or skipped
- No integration tests for critical paths

---

## Strategic Recommendations

### Phase 1: Foundation Stabilization (Wave 1) - 2-3 Days

**Goal:** Make the codebase safe for parallel agent work

| Task ID | Description | Priority | Effort | Dependencies |
|---------|-------------|----------|--------|--------------|
| CH-001 | Remove all @ts-nocheck by fixing schema mismatches | P0 | 8h | None |
| CH-002 | Remove console.log statements (420 instances) | P1 | 2h | None |
| CH-003 | Audit and resolve TODO/FIXME comments | P2 | 2h | None |
| CH-004 | Create schema alignment migration if needed | P0 | 4h | CH-001 |

### Phase 2: Infrastructure Hardening (Wave 2) - 2-3 Days

**Goal:** Ensure reliable deployment and testing

| Task ID | Description | Priority | Effort | Dependencies |
|---------|-------------|----------|--------|--------------|
| INF-001 | Add pre-commit TypeScript validation | P1 | 1h | CH-001 |
| INF-002 | Add integration tests for critical paths | P1 | 4h | None |
| INF-003 | Implement Redis caching layer | P2 | 6h | None |
| INF-004 | Add API rate limiting | P2 | 3h | None |

### Phase 3: Feature Completion (Wave 3-4) - 5-7 Days

**Goal:** Complete remaining business features

| Task ID | Description | Priority | Effort | Dependencies |
|---------|-------------|----------|--------|--------------|
| FEAT-001 | Complete procurement workflows (FEATURE-020) | P1 | 8h | Phase 1 |
| FEAT-002 | Implement meaningful reporting (FEATURE-021) | P1 | 6h | Phase 1 |
| FEAT-003 | Create About/Contact/Policy pages (FEATURE-022) | P2 | 4h | None |
| FEAT-004 | Fix inventory fetch errors (BUG-050) | P1 | 3h | CH-001 |

### Phase 4: Polish & Documentation (Wave 5) - 2-3 Days

**Goal:** Production readiness

| Task ID | Description | Priority | Effort | Dependencies |
|---------|-------------|----------|--------|--------------|
| DOC-001 | Update MASTER_ROADMAP to reflect completion | P1 | 2h | All |
| DOC-002 | Create user documentation | P2 | 4h | FEAT-* |
| QA-001 | Final E2E testing pass | P0 | 4h | All |
| QA-002 | Performance audit and optimization | P2 | 4h | INF-003 |

---

## Risk Mitigation

### High Risk: Schema Mismatch
- **Mitigation:** Wave 1 focuses entirely on this
- **Validation:** `pnpm check` must pass with 0 errors AND no @ts-nocheck

### Medium Risk: Agent Conflicts
- **Mitigation:** Clear file ownership per task
- **Validation:** Pre-flight check for uncommitted changes

### Medium Risk: Regression
- **Mitigation:** Mandatory test runs before merge
- **Validation:** CI/CD pipeline enforcement

---

## Success Criteria

### Wave 1 Complete When:
- [ ] 0 @ts-nocheck files
- [ ] `pnpm check` passes
- [ ] `pnpm test` passes
- [ ] No merge conflicts with main

### Full Roadmap Complete When:
- [ ] All FEATURE-* tasks complete
- [ ] All BUG-* tasks resolved
- [ ] Test coverage > 40%
- [ ] E2E tests pass on production
- [ ] Documentation complete

---

## Recommended Wave 1 Agent Configuration

### Single Agent Approach (Recommended for CH-001)
Due to the interconnected nature of schema fixes, a single agent should handle CH-001 to avoid conflicts.

### Parallel Agent Approach (After CH-001)
Once schema is fixed, parallel agents can work on:
- Agent A: Console.log cleanup (CH-002)
- Agent B: TODO audit (CH-003)
- Agent C: Integration tests (INF-002)

---

## Appendix: Files Requiring Schema Fixes

### Server Routers (13 files)
1. `server/routers/alerts.ts` - 24 errors
2. `server/routers/analytics.ts` - 5 errors
3. `server/routers/audit.ts` - 10 errors
4. `server/routers/customerPreferences.ts` - 10 errors
5. `server/routers/featureFlags.ts` - 2 errors
6. `server/routers/flowerIntake.ts` - 1 error
7. `server/routers/inventoryShrinkage.ts` - 15 errors
8. `server/routers/photography.ts` - 5 errors
9. `server/routers/quickCustomer.ts` - 9 errors
10. `server/routers/referrals.ts` - 3 errors
11. `server/routers/unifiedSalesPortal.ts` - 12 errors
12. `server/services/featureFlagService.ts` - 1 error
13. `server/db/seed/productionSeed.ts` - 2 errors

### Client Components (12 files)
1. `client/src/pages/Inventory.tsx` - 32 errors
2. `client/src/pages/PhotographyPage.tsx` - 7 errors
3. `client/src/hooks/useInventorySort.ts` - 4 errors
4. `client/src/pages/vip-portal/VIPDashboard.tsx` - 2 errors
5. `client/src/pages/settings/FeatureFlagsPage.tsx` - 2 errors
6. `client/src/pages/accounting/Invoices.tsx` - 2 errors
7. `client/src/pages/UnifiedSalesPortalPage.tsx` - 2 errors
8. `client/src/pages/InterestListPage.tsx` - 2 errors
9. `client/src/components/settings/VIPImpersonationManager.tsx` - 2 errors
10. `client/src/pages/settings/NotificationPreferences.tsx` - 1 error
11. `client/src/pages/OrderCreatorPage.tsx` - 1 error
12. `client/src/pages/NotificationsPage.tsx` - 1 error

### Schema Mapping Required
| Code Reference | Actual Column | Fix Strategy |
|----------------|---------------|--------------|
| `products.name` | `products.nameCanonical` | Update router |
| `products.sku` | N/A (on batches) | Update router |
| `products.targetStockLevel` | N/A | Remove or add column |
| `products.minStockLevel` | N/A | Remove or add column |
| `batches.quantity` | `batches.onHandQty` | Update router |
| `clientNeeds.productType` | `clientNeeds.category` | Update router |
| `clientNeeds.quantity` | `clientNeeds.quantityMin/Max` | Update router |
| `clients.tier` | N/A | Remove or add column |
