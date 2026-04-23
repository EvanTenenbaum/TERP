# Baseline excerpt for `AnalyticsPage`

**Route:** `/analytics` — Depth: **full**

## From FUNCTIONAL_BASELINE.md

### Page: `AnalyticsPage`

* **Route:** `/analytics`.
* **Controls:** Period selector (`day`/`week`/`month`/`quarter`/`year`/`all`); export dropdown (`summary`/`revenue`/`clients`/`inventory` as CSV or JSON).
* **Content:** `MetricCard` KPI tiles, `TopClientsTable`, `RevenueTrendsTable`. Fetches granularity-aware trends (day for short periods, month otherwise).
* **tRPC:** `analytics.getExtendedSummary`, `analytics.getRevenueTrends`, `analytics.getTopClients`, `analytics.exportData`, `organizationSettings.getDisplaySettings`.

---

## Runtime supplement (if any)

(no runtime supplement match)
