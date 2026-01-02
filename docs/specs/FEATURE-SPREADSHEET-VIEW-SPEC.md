# Specification: Unified Spreadsheet View

**Task:** FEATURE-021: Spreadsheet View for Inventory, Intake, and Pick & Pack

**Status:** Draft
**Priority:** HIGH
**Estimate:** 40-56h
**Module:** Frontend, Inventory, Clients, Orders, Warehouse
**Dependencies:** None
**Spec Author:** Manus AI
**Spec Date:** 2026-01-02

---

## 1. Problem Statement

To improve user adoption and reduce friction for users accustomed to spreadsheet-based workflows, we will create a unified **Spreadsheet View** within the TERP ERP. This interface will provide a familiar, grid-based experience for managing **Inventory**, processing new **Intakes**, and handling the **Pick & Pack** fulfillment process.

---

## 2. Critical Design Principle: Pure Presentation Layer

> **The Spreadsheet View is NOT a separate system. It is an alternative UI skin over the existing TERP ERP.**

This principle is non-negotiable and must be enforced throughout the implementation:

| Principle | Requirement |
|-----------|-------------|
| **Same Backend** | All data operations MUST flow through the existing tRPC routers and services. No direct database access. No new business logic. |
| **Same Validation** | All input validation, business rules, and constraints enforced in the standard ERP views MUST apply identically in the spreadsheet view. |
| **Same Permissions** | All role-based access controls (RBAC) and permission checks MUST be enforced. Users cannot access or modify data they couldn't access in the standard view. |
| **Same Audit Trail** | All actions MUST be logged through the existing `auditLogs` system. Every create, update, and delete is traceable. |
| **Bidirectional Sync** | Changes made in the spreadsheet view MUST appear immediately in the standard ERP views, and vice versa. There is ONE source of truth: the database. |

**What This Means for Implementation:**

- The spreadsheet view will call the **exact same tRPC procedures** as the standard pages (e.g., `inventory.updateBatch`, `pickPack.packItems`, `inventoryIntakeService.processIntake`).
- The only new backend code is a thin `spreadsheetRouter` that **transforms data for display** (e.g., flattening joins, grouping by date). It contains **zero business logic**.
- If a user cannot perform an action in the standard view (e.g., editing a locked batch, accessing another user's data), they cannot perform it in the spreadsheet view either.

---

## 3. User Stories

1.  **As an Inventory Manager**, I want to view and manage my current stock in a spreadsheet format, so that I can quickly assess inventory levels and make adjustments.
2.  **As an Intake Specialist**, I want to enter new inventory shipments in a spreadsheet-like grid, so that I can quickly and accurately record new stock without navigating complex forms.
3.  **As a Warehouse Operator**, I want to see a real-time queue of orders to be picked and packed in a spreadsheet, so that I can efficiently process orders and update their status.
4.  **As a Client Manager**, I want to view a client's complete order history in a spreadsheet format, so that I can easily track their purchases and account status.
5.  **As a System Administrator**, I want the spreadsheet view to enforce all existing security and data integrity rules, so that users cannot bypass controls by using this interface.

---

## 4. Functional Requirements

### 4.1 Core Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | Implement a spreadsheet-like grid interface using AG-Grid. | Must Have |
| FR-02 | All data mutations MUST use existing tRPC procedures. | Must Have |
| FR-03 | All permission checks MUST be enforced via existing `protectedProcedure` and role checks. | Must Have |
| FR-04 | All data changes MUST be logged via the existing audit log system. | Must Have |
| FR-05 | Data MUST be consistent between spreadsheet view and standard ERP views (single source of truth). | Must Have |
| FR-06 | Support inline editing with double-click to enter edit mode. | Must Have |
| FR-07 | Support sorting, filtering, and date-based grouping. | Must Have |
| FR-08 | Support CSV export of the current view. | Should Have |
| FR-09 | Support keyboard navigation for power users. | Should Have |
| FR-10 | Be mobile-responsive (optimized for desktop). | Should Have |

### 4.2 Inventory View

| ID | Requirement | Priority |
|----|-------------|----------|
| INV-01 | Display inventory batches with columns: Vendor Code/Date, Source, Category, Item, Available, Intake (read-only), Ticket, Sub, Notes, Confirm. | Must Have |
| INV-02 | Group rows by date with visual date header rows. | Must Have |
| INV-03 | Calculate `Sub` column as `Intake × Ticket` (frontend calculation). | Must Have |
| INV-04 | Color-code `Confirm` column: orange for "C", cyan for "Ofc". | Must Have |
| INV-05 | Editable fields: Available, Ticket, Notes, Confirm status. | Must Have |
| INV-06 | `Intake` field MUST be read-only to preserve data integrity. | Must Have |
| INV-07 | Updates MUST call `inventory.updateBatch` (existing procedure). | Must Have |

### 4.3 Intake View

| ID | Requirement | Priority |
|----|-------------|----------|
| INT-01 | Provide a grid for entering new inventory batches. | Must Have |
| INT-02 | Columns: Vendor (autocomplete), Category (dropdown), Item (autocomplete), Qty, COGS, Payment Terms (dropdown), Location (dropdown), Notes. | Must Have |
| INT-03 | "Submit Intake" button processes all pending rows. | Must Have |
| INT-04 | Each row MUST be processed via `inventoryIntakeService.processIntake` (existing service). | Must Have |
| INT-05 | All validation from the standard intake form MUST apply (required fields, COGS validation, etc.). | Must Have |
| INT-06 | On partial failure, successfully processed rows are committed; failed rows are highlighted with error messages. | Should Have |
| INT-07 | Display summary bar: Total Items, Total Qty, Total Value. | Should Have |

### 4.4 Pick & Pack View

| ID | Requirement | Priority |
|----|-------------|----------|
| PP-01 | Display real-time queue of orders ready for fulfillment. | Must Have |
| PP-02 | Columns: Order #, Client, Date, Item, Qty, Location, Packed (checkbox), Bag #, Status. | Must Have |
| PP-03 | Support multi-select for packing multiple items at once. | Must Have |
| PP-04 | "Pack Selected" button MUST call `pickPack.packItems` (existing procedure). | Must Have |
| PP-05 | Status updates MUST call `pickPack.updateOrderStatus` (existing procedure). | Must Have |
| PP-06 | Display stats: Pending, Picking, Packed, Ready counts. | Should Have |
| PP-07 | Support optional auto-refresh (polling every 30 seconds). | Should Have |

### 4.5 Client View

| ID | Requirement | Priority |
|----|-------------|----------|
| CLI-01 | Master-detail layout: client list on left, order grid on right. | Must Have |
| CLI-02 | Columns: Date, Vendor Code, Item, Qty, Unit Price, Total, Payment, Note, Paid (X), Invoiced (X), Confirmed (X). | Must Have |
| CLI-03 | Summary metrics at top: Total, Balance, YTD Orders. | Must Have |
| CLI-04 | Highlight payment rows with green background. | Must Have |
| CLI-05 | Updates MUST call `orders.updateOrderLineItem` (existing procedure). | Must Have |

---

## 5. Technical Specification

### 5.1 Architecture: "Views, Not Modules"

```
┌─────────────────────────────────────────────────────────────────┐
│                    SPREADSHEET VIEW (Frontend)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │  Inventory   │  │    Intake    │  │  Pick & Pack │           │
│  │    Grid      │  │    Grid      │  │    Grid      │           │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘           │
└─────────┼─────────────────┼─────────────────┼───────────────────┘
          │                 │                 │
          │    SAME tRPC    │    SAME tRPC    │    SAME tRPC
          │    PROCEDURES   │    PROCEDURES   │    PROCEDURES
          ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────┐
│              EXISTING tRPC ROUTERS (NO CHANGES)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │   inventory  │  │ intakeService│  │   pickPack   │           │
│  │    Router    │  │  (existing)  │  │    Router    │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  EXISTING: Validation, Permissions, Audit Logging        │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      MySQL DATABASE                              │
│                   (Single Source of Truth)                       │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Data Flow & Integrity

| Operation | Spreadsheet View Action | Backend Procedure Called | Validation Applied |
|-----------|------------------------|--------------------------|-------------------|
| Edit batch quantity | Double-click cell, enter value, blur | `inventory.updateBatch` | Quantity >= 0, optimistic locking |
| Submit new intake | Click "Submit Intake" | `inventoryIntakeService.processIntake` | Required fields, COGS validation, vendor validation |
| Pack order items | Select items, click "Pack Selected" | `pickPack.packItems` | Order status check, item availability |
| Update order status | Change status dropdown | `pickPack.updateOrderStatus` | Status transition rules |
| Edit order line item | Double-click cell, enter value, blur | `orders.updateOrderLineItem` | Quantity > 0, price >= 0 |

### 5.3 Security & Permissions

The spreadsheet view inherits all security controls from the existing system:

| Control | Implementation |
|---------|----------------|
| **Authentication** | Uses existing session/JWT via `protectedProcedure` |
| **Authorization** | Role checks via existing `adminProcedure`, `userProcedure` |
| **Data Isolation** | Multi-tenant filtering via existing `ctx.user.tenantId` |
| **Audit Logging** | All mutations logged via existing `auditLogs` table |
| **Input Validation** | Zod schemas on all tRPC inputs (existing) |
| **SQL Injection** | Prevented by Drizzle ORM parameterized queries (existing) |
| **XSS Prevention** | React's built-in escaping + existing sanitization |

### 5.4 Concurrency & Data Consistency

| Concern | Solution |
|---------|----------|
| **Optimistic Locking** | All updates include `version` field; reject if version mismatch |
| **Stale Data** | React Query's `staleTime` and `refetchOnWindowFocus` |
| **Concurrent Edits** | Show "Record modified by another user" error, prompt refresh |
| **Real-time Updates** | Optional polling for Pick & Pack queue (30s interval) |

### 5.5 New Backend Code (Minimal)

The only new backend code is a `spreadsheetRouter` for data transformation:

```typescript
// server/routers/spreadsheet.ts
// PURPOSE: Data transformation ONLY. NO business logic.

export const spreadsheetRouter = router({
  // Transforms inventory data for grid display (grouping, flattening)
  getInventoryGridData: protectedProcedure
    .input(z.object({ /* filters */ }))
    .query(async ({ ctx }) => {
      // Calls existing inventory queries
      // Transforms into flat row format with date grouping
      // Returns: Array<InventoryGridRow>
    }),

  // Transforms client orders for grid display
  getClientGridData: protectedProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ ctx }) => {
      // Calls existing orders queries
      // Transforms into flat row format
      // Returns: { summary: ClientSummary, rows: Array<ClientGridRow> }
    }),

  // NO mutations here - all mutations use existing routers directly
});
```

---

## 6. Testing Requirements

| Test Type | Scope | Requirement |
|-----------|-------|-------------|
| **Unit Tests** | Cell renderers, data transformers | 100% coverage |
| **Integration Tests** | `spreadsheetRouter` procedures | All procedures tested |
| **E2E Tests** | Core workflows | Inventory edit, Intake submit, Pack items |
| **Security Tests** | Permission enforcement | Verify unauthorized actions are blocked |
| **Consistency Tests** | Bidirectional sync | Verify changes appear in both views |

---

## 7. Implementation Plan

| Phase | Scope | Estimate |
|-------|-------|----------|
| **Phase 1** | Inventory Grid + Client View | 16-20h |
| **Phase 2** | Intake Grid | 12-16h |
| **Phase 3** | Pick & Pack Grid | 12-20h |

All phases will be released behind the `spreadsheet-view` feature flag for controlled rollout.

---

## 8. Success Criteria

1. Users can perform all supported operations in the spreadsheet view.
2. All data changes are immediately visible in the standard ERP views.
3. All security controls are enforced (verified by security tests).
4. All actions are logged in the audit trail.
5. No new business logic is introduced on the backend.
6. User feedback indicates improved workflow efficiency.
