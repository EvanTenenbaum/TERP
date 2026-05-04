# Baseline excerpt for `ProcurementWorkspacePage`

**Route:** `/purchase-orders` — Depth: **full**

## From FUNCTIONAL_BASELINE.md

### Page: `ProcurementWorkspacePage`

* **Route:** `/purchase-orders` (canonical Buying workspace).
* **Access:** All authenticated users.
* **Tab:** `purchase-orders` (single visible tab; legacy `receiving`/`product-intake`/`inventory-browse` redirect into Operations).
* **Surface:** `PurchaseOrderSurface` (sheet-native). Displays PO queue.
* **Command strip:** "Expected Today" quick filter — toggles `expectedToday=1` query param and pre-activates `initialShowExpectedToday` filter on the surface.
* **User actions (via PurchaseOrderSurface):** create PO, edit PO, confirm PO, split PO, receive PO (launches receiving), cancel/archive PO, add notes, attach docs, switch status.
* **Business rules:** Receiving auto-routes to `/inventory?tab=receiving&draftId=…`; `expectedToday` filter counts POs with an expected delivery date ≤ end-of-day today.

---

## Runtime supplement (if any)

(no runtime supplement match)
