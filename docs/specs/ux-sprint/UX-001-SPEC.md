# Specification: UX-001 - Foundational Stability: Critical Functionality Fixes

**Status:** Approved
**Priority:** CRITICAL
**Estimate:** 24h
**Module:** Core, VIP Portal, Finance
**Dependencies:** None
**Spec Author:** Manus AI
**Spec Date:** 2025-12-31

---

## 1. Problem Statement

The application suffers from several critical functional failures that render key features unusable and erode user trust. These are not minor bugs but fundamental breakdowns in core workflows that must be addressed immediately to ensure the platform is viable for production use.

## 2. User Stories

1.  **As a System Administrator**, I want the application's navigation to be consistent and reliable, so that I can perform my duties without confusion or missing functionality.
2.  **As a Client**, I want to be able to log in and access my dedicated VIP Portal, so that I can view my account information and manage my orders.
3.  **As a Business Analyst**, I want to trust the financial data presented in the system, so that I can make accurate business decisions.

## 3. Functional Requirements

| ID | Requirement | Priority |
| :--- | :--- | :--- |
| **FR-01** | **Fix VIP Portal Loading:** The VIP Portal must be fully accessible and functional, resolving the infinite loading bug. | Must Have |
| **FR-02** | **Unify Navigation:** The application must use a single, consistent sidebar navigation layout across all pages, eliminating the duplicate rendering bug. | Must Have |
| **FR-03** | **Correct Profit Calculation:** The "Total Profit" calculation must be implemented correctly, reflecting the actual profit based on revenue and COGS. | Must Have |

## 4. Technical Specification

### 4.1. VIP Portal Fix (Root Cause: Authentication Race Condition)

-   **Action:** Modify `VIPDashboard.tsx` and `useVIPPortalAuth.ts`.
-   **Details:**
    -   In `useVIPPortalAuth.ts`, ensure `clientId` is never `0`. If the client ID is not found in local storage, the hook should return an explicit error state or `null`.
    -   In `VIPDashboard.tsx`, enable the tRPC queries (`config.get` and `dashboard.getKPIs`) **only if** a valid `clientId` is present.
    -   Implement proper `isError` and `isLoading` checks. If a query fails or times out, display an informative error message with a retry option, not an infinite loader.

### 4.2. Navigation Unification (Root Cause: Dual Sidebar Architecture)

-   **Action:** Refactor `App.tsx`, `AppShell.tsx`, and `DashboardLayout.tsx`.
-   **Details:**
    -   Deprecate and remove the `AppSidebar` component.
    -   The `DashboardLayout` component should be elevated to be the single, primary layout component for all authenticated routes.
    -   Modify the routing structure in `App.tsx` to wrap all protected routes with the unified `DashboardLayout`.

### 4.3. Profit Calculation Fix (Root Cause: Incomplete Business Logic)

-   **Action:** Modify the `clientsDb.ts` file and potentially related data retrieval queries.
-   **Details:**
    -   The profit calculation logic must be implemented. This requires accessing the Cost of Goods Sold (COGS) for each item in a transaction.
    -   The query that fetches transactions for a client must be updated to join with order line items and product cost information.
    -   The calculation should be `profit = SUM(lineItem.price * lineItem.quantity) - SUM(lineItem.cogs * lineItem.quantity)`.
    -   If COGS data is not available, the "Total Profit" metric should gracefully degrade, displaying "N/A" rather than "$0.00".

## 5. Acceptance Criteria

-   [ ] The VIP Portal loads successfully for any client with the feature enabled.
-   [ ] The main application sidebar is identical on all pages and never shows duplicate items.
-   [ ] The "Total Profit" on the Client Management page displays a calculated, non-zero value for clients with sales history.
