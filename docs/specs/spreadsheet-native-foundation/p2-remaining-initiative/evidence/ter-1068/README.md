# TER-1068 Evidence Index

## Scope

- Tranche: `TER-1068`
- Child seams: `TER-1072` LIVE-first defaults and plain-language status harmonization; `TER-1073` portable cuts and saved-view continuity
- Canonical repo home: `docs/specs/spreadsheet-native-foundation/p2-remaining-initiative/`

## Product Outcome

- Sales surfaces now treat `includeUnavailable` as a shared filter instead of an ad hoc surface-local toggle.
- The sheet-native order surface defaults to sellable-only inventory and only broadens scope when the operator explicitly asks for unavailable inventory.
- Portable cuts from the catalogue carry the broadened filter into the order surface.
- Saved views persist the broadened filter and can restore it later without leaving the order surface.
- The catalogue now exposes a real `Filters` entry point instead of leaving advanced filters as dead state.
- Unavailable inventory now shows plain-language batch status copy in both the catalogue and order-side product cells instead of icon-only ambiguity.
- Imported-cut summary badges now stay anchored to the original cut even after the operator temporarily narrows the live filter state on the order surface.

## Verification Bundle

- `pnpm check`
  - Pass
- `pnpm build`
  - Pass
- `pnpm lint`
  - Pass
- Targeted Vitest:
  - `pnpm vitest run client/src/components/spreadsheet-native/SalesCatalogueSurface.test.tsx client/src/components/spreadsheet-native/SalesOrderSurface.test.tsx client/src/components/sales/InventoryBrowser.test.tsx`
  - Pass, `42` tests
- Claude adversarial review:
  - [2026-04-08-ter-1068-adversarial-review.md](/Users/evan/spec-erp-docker/TERP/TERP-TER-1068-20260408/docs/specs/spreadsheet-native-foundation/p2-remaining-initiative/reviews/2026-04-08-ter-1068-adversarial-review.md)
- Full repo test:
  - `pnpm test`
  - Failed in untouched test harness reset/seed flow; see [2026-04-08-full-test-limitation.md](/Users/evan/spec-erp-docker/TERP/TERP-TER-1068-20260408/docs/specs/spreadsheet-native-foundation/p2-remaining-initiative/evidence/ter-1068/2026-04-08-full-test-limitation.md)
- Browser/runtime proof:
  - [summary.md](/Users/evan/spec-erp-docker/TERP/TERP-TER-1068-20260408/output/playwright/ter-1068-tranche1-2026-04-08/summary.md)
  - [summary.json](/Users/evan/spec-erp-docker/TERP/TERP-TER-1068-20260408/output/playwright/ter-1068-tranche1-2026-04-08/summary.json)
  - [catalogue-filters-open.png](/Users/evan/spec-erp-docker/TERP/TERP-TER-1068-20260408/output/playwright/ter-1068-tranche1-2026-04-08/catalogue-filters-open.png)
  - [order-default-available-now.png](/Users/evan/spec-erp-docker/TERP/TERP-TER-1068-20260408/output/playwright/ter-1068-tranche1-2026-04-08/order-default-available-now.png)
  - [catalogue-include-unavailable.png](/Users/evan/spec-erp-docker/TERP/TERP-TER-1068-20260408/output/playwright/ter-1068-tranche1-2026-04-08/catalogue-include-unavailable.png)
  - [order-imported-cut.png](/Users/evan/spec-erp-docker/TERP/TERP-TER-1068-20260408/output/playwright/ter-1068-tranche1-2026-04-08/order-imported-cut.png)
  - [order-cut-summary-stable.png](/Users/evan/spec-erp-docker/TERP/TERP-TER-1068-20260408/output/playwright/ter-1068-tranche1-2026-04-08/order-cut-summary-stable.png)
  - [order-saved-view-loaded.png](/Users/evan/spec-erp-docker/TERP/TERP-TER-1068-20260408/output/playwright/ter-1068-tranche1-2026-04-08/order-saved-view-loaded.png)

## Harness Notes

- Browser proof used `qa.superadmin@terp.test` through `POST /api/qa-auth/login` on the local proof server at `http://127.0.0.1:3210`.
- After the unrelated `pnpm test` reset/seed failure left `terp-test` without the `users` table, the proof environment was rebuilt with `pnpm test:db:fresh` before the post-review screenshots were captured.
- The refreshed proof server was started directly with `DATABASE_URL` and `TEST_DATABASE_URL` pointed at the rebuilt local test DB on port `3210`.
- The saved-view reload artifact still references the temporary client-specific saved view named `TER-1068 Incoming Proof 2026-04-07-23-23`, which was created and deleted during the initial same-day tranche proof pass before the follow-up UI fixes.

## User-Verifiable Deliverables

- Opening `/sales?tab=create-order&clientId=2` now starts in `Available now` mode with zero visible rows until unavailable inventory is explicitly included.
- Opening the catalogue `Filters` control now exposes the advanced filtering panel instead of leaving it stranded behind unreachable component state.
- Turning on `Include unavailable` from the sales catalogue reveals the seeded Incoming inventory and labels it with plain-language copy such as `Incoming` and `Still incoming and not ready to sell`.
- Converting that catalogue into a sales order now carries the imported cut forward, labels the batch state with plain-language copy, and keeps the imported-cut badges stable even if the operator temporarily toggles back to `Available now`.
- Saving a view with unavailable inventory included and reloading it later restores the same broadened state without manually rebuilding the filter.
