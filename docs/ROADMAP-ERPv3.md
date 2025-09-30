# ERPv3 Roadmap & To-Do (Repo-Tracked)

Status: in-progress. This file tracks high-level tasks aligned to the 37 core flows and addendum.

## Completed
- Analytics: Bar/Line/Pie charts wired into ReportRenderer with SVG components.
- Dashboards: index, create, viewer/editor (add/reorder/resize/remove), widget title rename.
- Dashboard metadata editing (name/description/visibility), snapshot-based widgets.
- Widget visualization override (auto/table/bar/line/pie/kpi) with persistence.

## In Progress
- Per-widget advanced options (e.g., query params presets, export shortcuts).

## Next (Priority)
1. CSV Importer (products/customers/price books) with dry-run + apply.
2. Reservations expiry job + UI countdown.
3. DiscountRule model and combinability rules.
4. RBAC linter in CI and observability standardization.
5. Partial fulfillment & change-order deltas.
6. Ranking/Scoring job + suggestions and outreach reminders.
7. Cycle count plans (ABC) & discrepancy bulk apply.
8. Admin retention settings + purge job.

## Notes
- All new routes must declare roles and follow Zod validation.
- Monetary values in cents; avoid floating point in persistence.
- Exports must sanitize sensitive fields by role.
