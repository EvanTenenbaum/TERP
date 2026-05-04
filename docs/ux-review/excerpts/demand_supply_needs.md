# Baseline excerpt for `NeedsManagementPage`

**Route:** `/demand-supply?tab=needs` — Depth: **lightweight**

## From FUNCTIONAL_BASELINE.md

### Page: `NeedsManagementPage`

* **Route:** Embedded in `/demand-supply?tab=needs`.
* **Purpose:** Central list of all active client needs with enhanced matching metadata.
* **Fields per need:** status (`ACTIVE`/`FULFILLED`/`EXPIRED`/`CANCELLED`), priority (`URGENT`/`HIGH`/`MEDIUM`/`LOW`), strain, category/subcategory, grade, qty min/max, client, notes.
* **Actions:** Filter/search, create/edit need, cancel/fulfill, attach to match.
* **tRPC:** `clientNeeds.*`, `matching.*`.

---

## Runtime supplement (if any)

(no runtime supplement match)
