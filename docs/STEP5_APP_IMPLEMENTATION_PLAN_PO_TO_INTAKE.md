# Step 5 Implementation Plan: PO -> Product Intake -> Received -> Corrections

Date: 2026-02-19
Branch: codex/step5-uiux-intake-slice-20260219

## Scope Locked For This Slice
- Purchase Order -> Product Intake (QA-gated) -> Received -> Corrections
- No schema migration required for this slice
- Business logic remains in backend service/router layer
- UI follows Calm Power doctrine: grid-first, light chrome, drawer-first secondary information

## 1) Architecture Mapping (Backend Endpoint Map)

### Existing endpoints used directly
- Create PO: `purchaseOrders.create`
- Place Order: `purchaseOrders.submit`
- Get PO details + lines: `purchaseOrders.getByIdWithDetails`
- Receive Intake (atomic lot + batches + PO fulfillment): `poReceiving.receiveGoodsWithBatch`
- Adjust Quantity correction: `inventory.adjustQty`
- Change Location correction: `warehouseTransfers.transfer`
- Void Intake reversal: `inventoryMovements.getByReference` + `inventoryMovements.reverse`
- Fetch SKU/Batch images: `photography.getBatchImages`
- Save intake photos (draft/provisional): `inventory.uploadMedia`

### New slice glue (no schema change)
- Product Intake Draft persistence: local persisted draft model (per-user key)
  - Reason: no intake draft table exists that can hold pre-receive PO subset/qty edits without creating batches/SKUs early
  - Drafts include: header metadata, PO linkage, selected lines, quantities, version, idempotency key
- Review Intake: computed server-safe checks in UI + inline row errors
- Idempotency handling for Receive: client idempotency key + single-flight receive guard

### Domain invariants preserved
- SKU generated only during receive via `poReceiving.receiveGoodsWithBatch`
- Lot + batch creation remains backend-owned and atomic
- Corrections recorded as new movements (adjustment/transfer/reversal), not silent mutation of source intent

## 2) Pages and Components (Calm Power Surface Plan)

### A. Purchase Orders (List + Workspace)
Primary responsibilities:
- Create/edit/place PO
- Launch Create Product Intake from PO flow

Components:
- Grid/list of POs
- PO metadata summary strip
- Command strip actions: Place Order, Create Product Intake
- Create Product Intake drawer/modal:
  - PO line subset selection
  - editable intake quantity per selected line
  - create draft

### B. Product Intake (List + Workspace)
Primary responsibilities:
- Draft editing and QA gating
- Review -> Receive
- Post-receive corrections

Components:
- Product Intake list (drafts + received state from local persisted model)
- Workspace top bar:
  - Product Intake ID, Vendor, Warehouse, summary (units + lines)
  - Review, Receive
- Line grid:
  - draft-only editable core fields
  - columns configurable (show/hide/reorder)
  - mode toggle (Dense/Comfortable/Visual)
- Right drawers:
  - Activity Log
  - Attachments / SKU gallery
- Received-only actions:
  - Adjust Quantity
  - Change Location
  - Void Intake

### C. Inventory Browse
Primary responsibilities:
- Browse received batches/SKUs
- maintain column + mode preferences

Components:
- Grid/table with column popover
- View toggle (Dense/Comfortable/Visual)
- Right drawer for SKU gallery/images

## 3) State Management and Error Model

### Draft persistence
- Local persisted model keyed by user + draft ID
- Fields:
  - header: PO link, vendor, warehouse, status, version, idempotency key
  - lines: poItemId/product data/intake qty/cost/grade/location/photos/errors
  - received payload: batch IDs/SKUs and timestamps

### Version locking
- Drafts use local `version` increment on every edit to avoid stale overwrite within client session
- Backend optimistic locking remains on batch corrections via existing `version` fields

### Idempotency
- `receive` action guarded by local single-flight and saved idempotency key
- duplicate receive attempts for same draft are blocked client-side once received

### Error handling
- Inline row errors for missing/invalid fields
- review summary shows blocking error count
- Receive disabled when blocking errors exist
- toast + drawer-safe error display; no full-screen interrupt banners

## 4) Acceptance Checklist Mapping

- Partial PO fulfillment: supported by picker subset + editable intake qty and existing PO receiving backend
- SKU only on Receive: preserved via backend receive endpoint
- Errors block Receive: enforced by review gating
- Column settings persist: local per-user/per-grid preferences
- Visual mode persists: local per-user/per-grid preferences
- Optimistic lock conflicts: inherited from batch correction APIs
- Void Intake reverses inventory: done via movement reversal chain
- Adjust Quantity / Change Location create movements: done via existing inventory + transfer routers
- Activity Log records all: sourced from inventory movement history + PO reference history
