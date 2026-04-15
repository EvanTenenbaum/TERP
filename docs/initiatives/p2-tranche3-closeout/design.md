# P2 Tranche 3 + Closeout — Design

## Seam 6: Operations

### PO Reference on Intake

**Current state:** `intakeSessionBatches` links to `batches` via `batchId`. Batches link to `lots`. POs link to lots via `intakeSessionId` on `purchaseOrders`.
**Design:** Add PO number to intake table by joining through: intakeSessionBatch → intakeSession → purchaseOrder (via intakeSessionId FK).
**Files:** Direct intake surface, intake table component

### Expected Deliveries Today

**Current state:** `purchaseOrders.expectedDeliveryDate` exists as a nullable date field.
**Design:** Add a "Today Deliveries" filter/tab on the PO/intake surface. Filter: `expectedDeliveryDate = today AND status IN (CONFIRMED, RECEIVING)`. Group by supplierClientId.
**Files:** PurchaseOrderSurface or new filtered view

### Unified Contact

**Current state:** ClientProfilePage has 5 tabs including Money (AR+AP), Supply & Inventory, and dual-role badges.
**Design:** Verify completeness for dual-role contacts. May require no code changes if the existing implementation handles both roles correctly. Audit first.

## Performance

### InventoryBrowser Virtualization

**Design:** Replace `<table>` with react-window or ag-grid for the inventory browser table. Keep the same visual appearance but only render visible rows.
**Files:** `client/src/components/sales/InventoryBrowser.tsx`
