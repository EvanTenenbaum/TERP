# Baseline excerpt for `SearchResultsPage`

**Route:** `/search?q=batch` — Depth: **lightweight**

## From FUNCTIONAL_BASELINE.md

### Page: `SearchResultsPage`

* **Route:** `/search?q=…`.
* **Purpose:** Unified global search results.
* **Sections (from `search.global`):** Quotes, Orders, Customers, Products & Batches. Empty-state operational guidance when none match.
* **Actions:** Typing updates the query param (bug-042 guards against stale UI during nav); clicking a row navigates to its surface.
* **tRPC:** `search.global`.

---

## Runtime supplement (if any)

(no runtime supplement match)
