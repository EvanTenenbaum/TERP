# Exhaustive Interaction Protocols (TS-001 to TS-15)

This document contains the definitive list of testing protocols for the TERP system, ensuring exhaustive path coverage across all critical interactions, edge cases, and user flows.

---

## 0. SYSTEM-WIDE CONTROLS

*   **TS-001: Global Shortcuts:** Verify `Cmd+K` (Command Palette) navigation and `Ctrl+Shift+T` (Quick Add Task) overlay.
*   **TS-002: Theme Toggling:** Verify light/dark mode switch persists state.

## 1. AUTHENTICATION

*   **TS-1.1: Admin Login:** Verify success/failure paths at `/login`.
*   **TS-1.2: VIP Portal Access:** Verify distinct layout and access at `/vip-portal/login`.

## 2. DASHBOARD & ANALYTICS

*   **TS-2.1: KPI & Widgets:** Verify 4 KPI cards (Revenue, Orders, etc.) and widget click-throughs (e.g., "Recent Quotes" -> Order Details).
*   **TS-2.2: Analytics Reporting:** Verify date range filters update charts on `/analytics`.

## 3. INVENTORY MANAGEMENT

*   **TS-3.1: Search & Filter:** Verify global search ("Gelato") and status filters ("In Stock" vs "Sold").
*   **TS-3.2: Batch Lifecycle:** Test Purchase/Intake flow (Create Batch) -> Edit Details -> Adjust Quantity.
*   **TS-3.3: Location Management:** Verify creating, renaming, and deleting warehouse locations at `/locations`.

## 4. ACCOUNTING ENGINE

*   **TS-4.1: Chart of Accounts & GL:** Verify Account creation and manual Journal Entry posting (Debits must equal Credits).
*   **TS-4.2: Accounts Receivable:** Test Invoice creation -> "Sent" status -> Record Payment -> "Paid" status.
*   **TS-4.3: Accounts Payable:** Test Bill entry -> "Pending" status -> Pay Bill (reduce Cash).

## 5. SALES & ORDERS

*   **TS-5.1: Pricing Engine:** Verify Rule creation (-10%) -> Profile creation -> Client assignment.
*   **TS-5.2: Sales Sheets:** Verify dynamic PDF generation respects client pricing rules.
*   **TS-5.3: Unified Order Flow:**
    *   Create Quote (Inventory reserved: NO).
    *   Convert to Sale (Credit Limit Check: Pass/Fail).
    *   Verify Inventory reserved: YES.

## 6. CRM & RELATIONSHIPS

*   **TS-6.1: Client Profiles:** Verify tabs (Overview, Accounting, Pricing, Needs).
*   **TS-6.2: Matchmaking:** Create Need ("Indica > 20%") -> Run Match -> Create Quote from Match.

## 7. SUPPLY CHAIN

*   **TS-7.1: Vendor Management:** Verify Vendor creation and Product Catalog association.
*   **TS-7.2: Purchase Orders:** Test PO Creation -> Send -> Receive (trigger Inventory Intake).

## 8. COLLABORATION & TASKS

*   **TS-8.1: Calendar:** Verify Event creation, drag-and-drop rescheduling, and recurrence.
*   **TS-8.2: Task Management:** Verify Todo List creation, Task addition, and completion toggle.

## 9. SETTINGS & CONFIGURATION

*   **TS-9.1: COGS Settings:** Toggle "Auto-calculate" and verify impact on Inventory forms.
*   **TS-9.2: RBAC:** Remove "Delete" permission from role -> Login as user -> Verify button hidden.

## 10. VIP PORTAL (BASIC)

*   **TS-10.1: Catalog View:** Verify client sees only allowed items at specific price tier.
*   **TS-10.2: Self-Service Order:** Cart addition -> Checkout -> Admin Order creation.

## 11. EDGE CASES & RESILIENCE

*   **TS-11.1: 404 Handling:** Navigate to invalid URL -> Verify "Not Found" component.
*   **TS-11.2: Data Persistence:** Reload page during Order Creation -> Verify Draft saved.
*   **TS-11.3: Network Failure:** Simulate offline -> Submit form -> Verify error toast (no crash).

## 12. WORKFLOW BOARD (ADVANCED)

*   **TS-12.1: DND Physics:** Verify drag activation (>8px), lift opacity, and drag cancellation (snap back).
*   **TS-12.2: Status Migration:** Drag Batch from "Intake" to "Testing" -> Verify Optimistic Update & Server Mutation.

## 13. COLLABORATION (ADVANCED)

*   **TS-13.1: Mention Logic:** Type "@" -> Filter User List -> Insert `@[Name](ID)` -> Cursor positioning.
*   **TS-13.2: Keyboard Nav:** Arrow keys to select user, Enter to insert, Escape to close list.

## 14. RETURNS MANAGEMENT (ADVANCED)

*   **TS-14.1: Dynamic Forms:** Add/Remove multiple return line items.
*   **TS-14.2: Restock Logic:** Toggle "Restock Inventory" boolean -> Verify inventory count update on submission.

## 15. VIP PORTAL (ADVANCED)

*   **TS-15.1: Saved Views:** Create Filter Set -> Save View -> Load View (restore filters).
*   **TS-15.2: Interest List Blocking:** Attempt Submit -> Detect Price Change (Backend) -> Verify "Confirm Changes" modal blocks submission.
*   **TS-15.3: Price Alerts:** Set Target Price -> Verify Alert creation -> Verify Alert deletion.
