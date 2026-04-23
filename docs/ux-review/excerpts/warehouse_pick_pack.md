# Baseline excerpt for `WarehousePickPackPage`

**Route:** `/warehouse/pick-pack` — Depth: **full**

## From FUNCTIONAL_BASELINE.md

### Page: `WarehousePickPackPage`

* **Route:** `/warehouse/pick-pack`.
* **Purpose:** Mobile/tablet-optimized warehouse UI for fulfilling confirmed orders (touch-first, ≥44 px tap targets).
* **Features:**
  * List of orders with statuses `PENDING`/`PARTIAL`/`READY`/`SHIPPED`.
  * Select an order → see line items with batch & location.
  * **Scan** (barcode input) or **Tap** to pick an item.
  * **Pack complete** workflow → marks line items packed, attaches bag identifier.
  * Search/filter orders; refresh.
* **tRPC:** `pickPack.getPickList`, `pickPack.pick`, `pickPack.pack`, `pickPack.packComplete`.

---

## Runtime supplement (if any)

(no runtime supplement match)
