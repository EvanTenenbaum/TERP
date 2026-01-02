# VIP-000: Root Cause Investigation Spike

## Metadata

| Field | Value |
|-------|-------|
| **Spec ID** | VIP-000 |
| **Title** | Root Cause Investigation Spike |
| **Priority** | CRITICAL |
| **Estimate** | 4 hours |
| **Status** | Not Started |
| **Dependencies** | None |
| **Blocks** | VIP-001 |

## Overview

Before fixing the 6 critical bugs identified in the VIP Portal, this spike investigates their root causes to determine if they are simple fixes or symptoms of deeper architectural issues. This prevents wasted effort on fixes that will be undone by necessary refactors.

## Background

The VIP Portal UX/UI analysis identified 6 critical bugs:

| Bug ID | Description | Hypothesis |
|--------|-------------|------------|
| VIP-001 | Broken Catalog (no products) | API endpoint misconfiguration or client pricing logic failure |
| VIP-002 | Missing Dashboard Data | `getKPIs` and `config` tRPC procedures failing |
| VIP-003 | Incorrect AR Data (all PAID, no amounts) | Data mapping issue or missing fields in response |
| VIP-004 | Broken Marketplace (empty My Needs, wrong My Supply) | Component rendering bug or missing data endpoints |
| VIP-005 | Fake Password Reset | Intentionally stubbed, needs real implementation |
| VIP-006 | Missing SSO | Not implemented, requires OAuth integration |

## Objectives

1. Determine the root cause of each bug (simple fix vs. architectural issue).
2. Categorize bugs into "Quick Fix" (< 2h) and "Requires Refactor" (> 2h).
3. Update the VIP-001 spec with accurate estimates based on findings.

## Investigation Tasks

### Task 1: Catalog API Investigation (1h)

**Steps:**
1. Call `vipPortal.liveCatalog` directly via tRPC playground or curl.
2. Check if the endpoint returns data for any client.
3. If no data, trace the query in `server/routers/vipPortal.ts` to identify the failure point.
4. Check if client-specific pricing logic is filtering out all products.

**Expected Output:** Root cause identified (API bug, data issue, or pricing logic).

### Task 2: Dashboard KPIs Investigation (1h)

**Steps:**
1. Call `vipPortal.getKPIs` and `vipPortal.config` directly.
2. Check server logs for errors during these calls.
3. Verify the `z` import issue noted in the gap analysis is resolved.
4. Trace the data flow from database to frontend.

**Expected Output:** Root cause identified (missing import, query failure, or frontend rendering).

### Task 3: Accounts Receivable Investigation (1h)

**Steps:**
1. Call `vipPortal.receivables` directly and inspect the response.
2. Verify the response includes `amount`, `dueDate`, and `status` fields.
3. If fields are missing, check the database schema and query.
4. If fields are present, check the frontend component for mapping issues.

**Expected Output:** Root cause identified (backend missing fields or frontend not rendering).

### Task 4: Marketplace Investigation (30m)

**Steps:**
1. Inspect `MarketplaceNeeds.tsx` and `MarketplaceSupply.tsx` components.
2. Verify the components are receiving data from their respective endpoints.
3. Check the tab visibility logic in `VIPDashboard.tsx` for the Buyer/Supplier bug.

**Expected Output:** Root cause identified (empty components, missing endpoints, or visibility logic bug).

### Task 5: Auth Investigation (30m)

**Steps:**
1. Confirm password reset is intentionally stubbed (check for `TODO` comments).
2. Identify the OAuth libraries available in the project (if any).
3. Estimate effort for real password reset and SSO implementation.

**Expected Output:** Confirmation of stub status and effort estimate for real implementation.

## Deliverables

1. **Root Cause Report:** A markdown document summarizing the root cause of each bug.
2. **Updated Estimates:** Revised time estimates for VIP-001 based on findings.
3. **Recommendation:** Whether to proceed with Phase 1 as planned or adjust the roadmap.

## Acceptance Criteria

- [ ] All 6 bugs have been investigated.
- [ ] Root cause is documented for each bug.
- [ ] Bugs are categorized as "Quick Fix" or "Requires Refactor."
- [ ] VIP-001 spec is updated with accurate estimates.
- [ ] Go/No-Go recommendation is provided for Phase 1.
