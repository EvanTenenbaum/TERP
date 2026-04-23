# Baseline excerpt for `ReturnsPage`

**Route:** `/sales?tab=returns` — Depth: **lightweight**

## From FUNCTIONAL_BASELINE.md

### Page: `ReturnsPage`

* **Route:** Embedded in `/sales?tab=returns`.
* **Purpose:** Create and manage RMAs for sold items.
* **Features:**
  * Return reason enum (`DEFECTIVE`/`WRONG_ITEM`/`NOT_AS_DESCRIBED`/`CUSTOMER_CHANGED_MIND`/`OTHER`).
  * Select source order + line items, specify qty returned.
  * Create return dialog with notes.
  * `ReturnGLStatus` — displays GL reversal status for the return.
  * State machine: Draft → Received → Inspected → Restocked/Disposed → Closed.
* **tRPC:** `returns.*`, `refunds.*`.

---

## Runtime supplement (if any)

(no runtime supplement match)
