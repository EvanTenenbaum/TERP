# VIP-F-001: Fix Frontend Rendering Issues

**Priority:** CRITICAL
**Estimate:** 24 hours
**Status:** Not Started

---

## Overview

The VIP Portal backend is complete, but the frontend is not correctly rendering the data. This specification addresses the critical frontend bugs that make the portal appear non-functional.

---

## Problem Statement

| Issue | Expected Behavior | Actual Behavior |
|-------|-------------------|-----------------|
| Dashboard KPIs | Display 7+ KPI cards (Total Spent, Outstanding Balance, Available Credit, etc.) | Only 2 cards shown (Credit Utilization, VIP Status) |
| Live Catalog | Display browsable list of inventory with pricing | "No products found" message |
| AR/AP | Display all invoices/bills with amounts and due dates | Invoices shown but missing amount data |

---

## Tasks

### Task 1: Fix Dashboard KPI Rendering (8h)

**File:** `client/src/pages/vip-portal/VIPDashboard.tsx`

The `dashboard.getKPIs` tRPC endpoint returns a full set of KPIs, but the frontend only renders a subset. The fix requires:

1. Audit the `useQuery` call to ensure all fields from the API response are being consumed
2. Add missing KPI card components for: Total Spent YTD, Outstanding Balance, Available Credit, Recent Orders, Next Payment Due
3. Implement proper loading and error states for each card
4. Ensure the layout is responsive (grid on desktop, stack on mobile)

**Backend Endpoint:** `vipPortalRouter.dashboard.getKPIs`

### Task 2: Fix Live Catalog Rendering (12h)

**File:** `client/src/pages/vip-portal/VIPDashboard.tsx` (Catalog tab content)

The `liveCatalog.getCatalog` endpoint returns inventory data, but the frontend shows "No products found." The fix requires:

1. Debug the tRPC query to verify it's being called correctly with proper parameters
2. Check if the `clientId` is being passed correctly from the session context
3. Verify the catalog visibility settings in `vipPortalConfigurations` for the test client
4. Ensure the product card component correctly maps the API response fields
5. Add pagination controls if not present

**Backend Endpoint:** `vipPortalRouter.liveCatalog.getCatalog`

**Possible Root Causes:**
- The client's portal configuration may have catalog visibility disabled
- The query may be missing required filter parameters
- The frontend component may be expecting a different data shape than the API returns

### Task 3: Fix AR/AP Amount Display (4h)

**File:** `client/src/pages/vip-portal/VIPDashboard.tsx` (AR/AP tab content)

The Receivables and Payables tabs show invoices but may be missing amount data. The fix requires:

1. Verify the `ar.getInvoices` and `ap.getBills` endpoints return amount fields
2. Ensure the invoice/bill card component displays: Invoice Number, Amount, Due Date, Status
3. Add proper currency formatting using the existing `formatCurrency` utility

**Backend Endpoints:** `vipPortalRouter.ar.getInvoices`, `vipPortalRouter.ap.getBills`

---

## Acceptance Criteria

1. Dashboard displays all 7+ KPI cards with real data from the backend
2. Live Catalog displays at least 10 products (if inventory exists) with name, category, and price
3. Receivables tab displays all invoices with amounts formatted as currency
4. Payables tab displays all bills with amounts formatted as currency
5. All tabs load within 3 seconds on a standard connection
6. No console errors related to data fetching or rendering

---

## Testing

1. **Unit Tests:** Add tests for the KPI card components to ensure they render correctly with mock data
2. **Integration Tests:** Verify the tRPC queries return expected data shapes
3. **Manual Testing:** Use the admin impersonation feature to view the portal as multiple different clients

---

## Dependencies

None. This is the first task in the sprint and unblocks all subsequent work.
