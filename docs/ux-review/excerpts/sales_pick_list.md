# Baseline excerpt for `ShippingPickListPage`

**Route:** `/sales?tab=pick-list` — Depth: **lightweight**

## From FUNCTIONAL_BASELINE.md

### Page: `ShippingPickListPage`

* **Route:** Embedded in `/sales?tab=pick-list`.
* **Purpose:** Operator's warehouse pick list for confirmed orders.
* **Controls:** Status filter (`all`, `pending`, `partial`, `fulfilled`), date-from, date-to. CSV export of rows.
* **Rows:** Order number, client, date, line items with batch + qty, location, picker, status badge.
* **tRPC:** `orders.getPickList`.

---

## Runtime supplement (if any)

(no runtime supplement match)
