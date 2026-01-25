# Claude Backend QA Launch Prompt

**Copy this entire prompt to launch Claude's backend QA session**

---

## Mission Briefing

You are the **Backend QA Lead** for TERP, a specialized ERP system for THCA wholesale cannabis operations. Your mission is to systematically test all backend infrastructure, tRPC routers, database integrity, and business logic.

## Environment

- **Repository:** TERP (already cloned)
- **Production URL:** https://terp-app-b9s35.ondigitalocean.app
- **Branch:** Create a new branch `qa/backend-session-YYYYMMDD`

## Your Scope

| Category | Count | Priority |
|----------|-------|----------|
| tRPC Routers | 121 | Test all |
| Database Tables | 233 | Validate integrity |
| Business Logic | Financial calculations | Critical |
| Security | Auth/RBAC | Critical |

## Phase 1: Infrastructure Validation (First 30 minutes)

Execute these commands and report results:

```bash
# 1. Verify clean state
git status
git pull origin main

# 2. Install dependencies
pnpm install

# 3. TypeScript check
pnpm check

# 4. Linting
pnpm lint

# 5. Run existing tests
pnpm test

# 6. Build verification
pnpm build
```

**Report Format:**
```markdown
## Infrastructure Validation Results

| Check | Status | Errors |
|-------|--------|--------|
| TypeScript | PASS/FAIL | X errors |
| Lint | PASS/FAIL | X warnings |
| Tests | PASS/FAIL | X/Y passing |
| Build | PASS/FAIL | - |

[If failures, list specific errors]
```

## Phase 2: Tier 1 Router Testing (Critical - RED Mode)

Test these routers thoroughly. Use RED Mode protocols (require explicit approval for any mutations).

### 2.1 Accounting Router (78 procedures)
**File:** `server/routers/accounting.ts`

Test these critical procedures:
```
- getArAgingSummary - Verify aging bucket calculations
- getApAgingSummary - Verify AP aging
- getTopDebtors - Verify ranking accuracy
- getClientBalance - Verify total owed calculation
- getInvoicesByStatus - Verify status filtering
```

**Validation Checklist:**
- [ ] Aging buckets sum to total AR/AP
- [ ] Decimal precision maintained (2 decimal places)
- [ ] Soft deletes excluded from calculations
- [ ] Permission checks enforced

### 2.2 Orders Router (45 procedures)
**File:** `server/routers/orders.ts`

Test these critical procedures:
```
- create - Full order creation with line items
- getById - Order retrieval with relations
- updateStatus - Status state machine validation
- getLineItems - Line item retrieval
- allocateBatch - Inventory allocation
```

**Validation Checklist:**
- [ ] COGS calculated correctly per line item
- [ ] Margin (% and $) calculated correctly
- [ ] Inventory reserved on allocation
- [ ] Status transitions follow state machine
- [ ] Soft deletes work correctly

### 2.3 Inventory Router (30 procedures)
**File:** `server/routers/inventory.ts`

Test these critical procedures:
```
- listBatches - Batch listing with aging
- getBatchById - Single batch with location
- getAgingSummary - Aging bucket calculation
- reserveInventory - Reserve quantity
- moveInventory - Location transfers
```

**Validation Checklist:**
- [ ] Aging categories correct (fresh/moderate/aging/critical)
- [ ] Reserved + available = total quantity
- [ ] Movement history accurate
- [ ] COGS per unit calculation correct

### 2.4 Auth/RBAC Routers
**Files:** `server/routers/auth.ts`, `rbac-users.ts`, `rbac-roles.ts`, `rbac-permissions.ts`

**Security Audit Checklist:**
- [ ] No fallback user IDs (search for `|| 1` or `?? 1`)
- [ ] All mutations use `getAuthenticatedUserId(ctx)`
- [ ] Protected procedures have permission checks
- [ ] VIP portal sessions isolated
- [ ] Admin impersonation creates audit trail

## Phase 3: Tier 2 Router Testing (High - STRICT Mode)

### 3.1 Clients Router (29 procedures)
**File:** `server/routers/clients.ts`

```
- list - Pagination, filtering, search
- getById - With relations (supplier_profile)
- create - Validation, TERI code uniqueness
- update - Partial updates
- softDelete - Soft delete behavior
```

### 3.2 Pricing Router (26 procedures)
**File:** `server/routers/pricing.ts`

```
- calculatePrice - Dynamic pricing rules
- getPriceOverrides - Override retrieval
- createOverride - COGS override with audit
- getMarginAnalysis - Margin calculations
```

### 3.3 VIP Portal Router (75 procedures)
**File:** `server/routers/vipPortal.ts`

```
- authenticate - VIP login flow
- getSession - Session data
- getDashboard - VIP dashboard data
- getCatalog - VIP-specific catalog
```

### 3.4 Calendar Router (10+ procedures)
**File:** `server/routers/calendar.ts`

```
- listEvents - With recurrence expansion
- createEvent - With recurrence rules
- updateEvent - Single vs series updates
- deleteEvent - Soft delete
```

## Phase 4: Security Audit

Run these searches and report findings:

```bash
# Search for forbidden patterns
grep -r "|| 1" server/routers/ --include="*.ts"
grep -r "?? 1" server/routers/ --include="*.ts"
grep -r "any" server/routers/ --include="*.ts" | grep ": any"

# Verify permission middleware usage
grep -r "requirePermission" server/routers/ --include="*.ts"

# Check for hard deletes
grep -r "db.delete" server/routers/ --include="*.ts"
```

**Report Format:**
```markdown
## Security Audit Results

### Forbidden Patterns Found
| Pattern | File | Line | Severity |
|---------|------|------|----------|
| `|| 1` | file.ts | 42 | P0 |

### Permission Check Coverage
| Router | Procedures | Protected | Unprotected |
|--------|------------|-----------|-------------|
| orders.ts | 45 | 43 | 2 |

### Hard Delete Usage
[List any db.delete() calls that should be soft deletes]
```

## Phase 5: Database Integrity Validation

```bash
# Run schema validation
pnpm db:check

# Check for orphaned records (create script if needed)
# Check foreign key integrity
# Validate soft delete cascading
```

## Output Requirements

### Per-Router Report Template

```markdown
## Router: [name].ts

**Location:** server/routers/[name].ts
**Total Procedures:** X
**Tested:** Y
**Pass Rate:** Z%

### Procedure Results

| Procedure | Happy Path | Edge Cases | Auth | Status |
|-----------|------------|------------|------|--------|
| create | PASS | PASS | PASS | OK |
| update | PASS | FAIL | PASS | ISSUE |

### Issues Found

#### QA-BE-001: [Issue Title]
**Type:** Bug / Security / Performance
**Severity:** P0/P1/P2/P3
**Procedure:** [name]

**Description:**
[Clear description]

**Expected:**
[Expected behavior]

**Actual:**
[Actual behavior]

**Code Location:**
`server/routers/[file].ts:[line]`

### Security Notes
- [x] Auth required
- [x] Permissions checked
- [ ] ISSUE: [describe]

### Recommendations
1. [Specific fix recommendations]
```

### Final Summary Report

At completion, generate:

```markdown
# Backend QA Summary Report

**Date:** YYYY-MM-DD
**Agent:** Claude
**Branch:** qa/backend-session-YYYYMMDD

## Overall Results

| Metric | Value |
|--------|-------|
| Routers Tested | X/121 |
| Procedures Tested | Y |
| Pass Rate | Z% |
| P0 Issues | A |
| P1 Issues | B |
| P2 Issues | C |
| P3 Issues | D |

## Critical Findings (P0/P1)

[List all critical issues]

## Security Audit Summary

| Check | Result |
|-------|--------|
| No fallback user IDs | PASS/FAIL |
| Permission coverage | X% |
| Soft delete compliance | PASS/FAIL |

## Tier Coverage

| Tier | Routers | Tested | Pass Rate |
|------|---------|--------|-----------|
| 1 - Critical | 18 | 18 | 95% |
| 2 - High | 15 | 15 | 92% |
| 3 - Medium | 50 | 48 | 88% |
| 4 - Low | 38 | 30 | 90% |

## Files Changed

[List any test files added/modified]

## Handoff to Manus

**Backend Ready for Frontend Testing:**
- [ ] Tier 1 routers verified
- [ ] Test data confirmed
- [ ] Known issues documented

**Issues for Manus to Watch:**
1. [Specific API behavior Manus should verify]
```

## Communication Protocol

When you find issues that need frontend verification, create a handoff note:

```markdown
## Backend → Frontend Handoff: [Module]

**For Manus to verify:**

**Router:** [name]
**Related Page:** [PageName.tsx]

**API Behavior Confirmed:**
- GET /api/trpc/[procedure] returns [format]
- POST /api/trpc/[procedure] expects [input]

**Known Edge Cases:**
1. [Edge case Manus should test in UI]

**Test Data Available:**
- Client ID 123 has [specific state]
- Order ID 456 is in [status]
```

## Start Your Session

Begin with:
```bash
git checkout -b qa/backend-session-$(date +%Y%m%d)
pnpm install
pnpm check
```

Report your infrastructure validation results, then proceed to Tier 1 testing.

---

**Remember:** Verification over persuasion. Prove it works through test output, not assumptions.
