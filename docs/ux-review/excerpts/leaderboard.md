# Baseline excerpt for `LeaderboardPage`

**Route:** `/leaderboard` — Depth: **lightweight**

## From FUNCTIONAL_BASELINE.md

### Page: `LeaderboardPage`

* **Route:** `/leaderboard`.
* **Purpose:** Internal sales performance leaderboard.
* **Filters:** Client type (ALL/CUSTOMER/SUPPLIER/DUAL), metric category (MASTER/FINANCIAL/ENGAGEMENT/RELIABILITY/GROWTH), text search, sort by `master_score` or `ytd_revenue` (asc/desc), pagination.
* **Actions:** `ExportButton`, `WeightCustomizer` (change master-score weights), refresh, click row → `/clients/:id`.
* **tRPC:** `leaderboard.*`, `gamification.*`.

---

## Runtime supplement (if any)

(no runtime supplement match)
