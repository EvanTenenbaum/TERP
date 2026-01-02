# VIP-001: Stabilize & Secure

## Metadata

| Field | Value |
|-------|-------|
| **Spec ID** | VIP-001 |
| **Title** | Stabilize & Secure |
| **Priority** | CRITICAL |
| **Estimate** | 28 hours (subject to revision after VIP-000) |
| **Status** | Not Started |
| **Dependencies** | VIP-000 (Root Cause Spike) |
| **Blocks** | VIP-002 |

## Overview

This phase fixes all critical bugs in the VIP Portal to make it functional for basic use. It also implements proper authentication (SSO, password reset) to meet security standards.

## Background

The VIP Portal is currently unusable due to 6 critical bugs. This phase addresses each bug based on the root cause findings from VIP-000.

## Objectives

1. Fix all 6 critical bugs identified in the UX/UI analysis.
2. Implement real password reset functionality.
3. Implement Google and Microsoft SSO.
4. Ensure the portal is functional on mobile viewports (no overflow/rendering issues).

## Tasks

### Task 1: Fix Broken Catalog (VIP-BUG-001) - 6h

**Problem:** The Catalog tab shows "No products found" even though inventory exists.

**Root Cause:** (To be determined by VIP-000)

**Implementation:**
1. Fix the `vipPortal.liveCatalog` tRPC procedure to return products.
2. Ensure client-specific pricing is correctly applied.
3. Verify products display in the frontend with images and prices.

**Acceptance Criteria:**
- [ ] Catalog displays products from inventory.
- [ ] Products show client-specific pricing.
- [ ] Product images are displayed.
- [ ] Search and filter functionality works.

### Task 2: Fix Missing Dashboard Data (VIP-BUG-002) - 4h

**Problem:** Dashboard shows only 2 KPI cards instead of 4, and no welcome message or quick actions.

**Root Cause:** (To be determined by VIP-000)

**Implementation:**
1. Fix the `vipPortal.getKPIs` procedure to return all 4 KPIs (Balance, YTD Spend, Credit, VIP Status).
2. Fix the `vipPortal.config` procedure to return portal configuration.
3. Implement the welcome message component.
4. Implement the quick actions component.

**Acceptance Criteria:**
- [ ] Dashboard displays 4 KPI cards.
- [ ] Welcome message shows personalized greeting.
- [ ] Quick Actions section is present with functional buttons.

### Task 3: Fix Incorrect AR Data (VIP-BUG-003) - 4h

**Problem:** Receivables tab shows all invoices as "PAID" and omits amounts and due dates.

**Root Cause:** (To be determined by VIP-000)

**Implementation:**
1. Update `vipPortal.receivables` to return `amount`, `dueDate`, and correct `status`.
2. Update `AccountsReceivable.tsx` to display these fields.
3. Add summary totals (Total Outstanding, Total Paid) at the top.

**Acceptance Criteria:**
- [ ] Invoice cards display amount prominently.
- [ ] Invoice cards display due date.
- [ ] Invoice status is accurate (not all PAID).
- [ ] Summary totals are displayed.

### Task 4: Fix Broken Marketplace (VIP-BUG-004) - 4h

**Problem:** "My Needs" tab is empty, "My Supply" tab shows for Buyers and displays wrong content.

**Root Cause:** (To be determined by VIP-000)

**Implementation:**
1. Implement the "My Needs" component with proper empty state.
2. Fix the tab visibility logic to hide "My Supply" for Buyers.
3. Ensure "My Supply" displays correct content for Suppliers.

**Acceptance Criteria:**
- [ ] "My Needs" tab shows proper empty state with "Add Need" CTA.
- [ ] "My Supply" tab is hidden for Buyer clients.
- [ ] "My Supply" tab shows correct content for Supplier clients.

### Task 5: Implement Real Password Reset (VIP-BUG-005) - 4h

**Problem:** "Forgot password?" link just shows a toast message.

**Implementation:**
1. Create password reset request endpoint.
2. Implement email sending with reset link.
3. Create password reset confirmation page.
4. Implement password update endpoint.

**Acceptance Criteria:**
- [ ] User can request password reset via email.
- [ ] User receives email with reset link.
- [ ] User can set new password via reset link.
- [ ] Password is securely updated in database.

### Task 6: Implement SSO (VIP-BUG-006) - 6h

**Problem:** Google and Microsoft SSO are specified but not implemented.

**Implementation:**
1. Configure Google OAuth provider.
2. Configure Microsoft OAuth provider.
3. Add SSO buttons to login page.
4. Implement OAuth callback handling.
5. Link SSO accounts to existing client records.

**Acceptance Criteria:**
- [ ] Google SSO button is present on login page.
- [ ] Microsoft SSO button is present on login page.
- [ ] User can log in via Google.
- [ ] User can log in via Microsoft.
- [ ] SSO login links to correct client account.

## Testing Requirements

- [ ] All 6 bugs are verified fixed in staging environment.
- [ ] Password reset flow tested end-to-end.
- [ ] SSO tested with real Google and Microsoft accounts.
- [ ] Mobile viewport tested for rendering issues.

## Rollback Plan

If any fix causes regressions:
1. Revert the specific commit.
2. Document the regression in a bug report.
3. Reassess the root cause before re-attempting the fix.
