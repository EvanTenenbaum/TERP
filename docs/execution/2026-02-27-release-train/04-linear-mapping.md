# Phase 4 - Linear Mapping

Date: 2026-02-27
Team: Terpcorp (`d88bb32f-ea0a-4809-aac1-fde6ec81bad3`)
Project: TERP - Golden Flows Beta (`79882db1-0cac-448b-b73c-5dd9307c85c8`)

Roadmap tasks were created as Linear issues and execution-state sync was updated based on verified evidence.

## Issue Map (Post-Execution Sync)

| Roadmap Task | Linear ID | Title                                                                                | State       | Priority | Dependencies (blockedBy)                                                                 |
| ------------ | --------- | ------------------------------------------------------------------------------------ | ----------- | -------- | ---------------------------------------------------------------------------------------- |
| RT-00        | TER-452   | RT-00 Supervisor control + evidence scaffold                                         | Done        | High     | None                                                                                     |
| RT-01        | TER-453   | RT-01 Exclude soft-deleted POs from list/getAll/getById + add restore API            | Done        | Urgent   | TER-452                                                                                  |
| RT-02        | TER-454   | RT-02 Inventory enhanced API full-dataset filter contract (stock/cogs/date/location) | Done        | Urgent   | TER-452                                                                                  |
| RT-03        | TER-455   | RT-03 Inventory UI filter wiring to server contract + accurate totals/pagination     | Done        | High     | TER-454                                                                                  |
| RT-04        | TER-456   | RT-04 Inventory sort contract correction (grade + unit COGS) end-to-end              | Done        | Medium   | TER-454                                                                                  |
| RT-05        | TER-457   | RT-05 Workspace-shell route unification for sales/procurement/receiving              | Done        | High     | TER-452                                                                                  |
| RT-06        | TER-458   | RT-06 Legacy route deprecation/redirect cleanup (classic + spreadsheet)              | Done        | Medium   | TER-457                                                                                  |
| RT-07        | TER-459   | RT-07 Recoverable delete UX for inventory + purchase orders (undo/restore)           | Done        | High     | TER-453, TER-455                                                                         |
| RT-08        | TER-460   | RT-08 Export UX hardening (truncation consent + progress model + large-job strategy) | Done        | Medium   | TER-455                                                                                  |
| RT-09        | TER-461   | RT-09 QA debt reduction (skip/todo removal + DB integrity gate hardening)            | Done        | High     | TER-452                                                                                  |
| RT-10        | TER-462   | RT-10 Integration regression + adversarial sweep + release gate package              | In Progress | Urgent   | TER-452, TER-453, TER-454, TER-455, TER-456, TER-457, TER-458, TER-459, TER-460, TER-461 |

## Evidence Notes

- RT-00..RT-09 were moved to `Done` only after code/test evidence checks and per-issue evidence comments were added.
- RT-10 remains `In Progress` because production-smoke/staging readiness is blocked by `pnpm test:e2e:prod-smoke` timing out on Playwright `config.webServer` startup.

## URLs

- TER-452: https://linear.app/terpcorp/issue/TER-452/rt-00-supervisor-control-evidence-scaffold
- TER-453: https://linear.app/terpcorp/issue/TER-453/rt-01-exclude-soft-deleted-pos-from-listgetallgetbyid-add-restore-api
- TER-454: https://linear.app/terpcorp/issue/TER-454/rt-02-inventory-enhanced-api-full-dataset-filter-contract
- TER-455: https://linear.app/terpcorp/issue/TER-455/rt-03-inventory-ui-filter-wiring-to-server-contract-accurate
- TER-456: https://linear.app/terpcorp/issue/TER-456/rt-04-inventory-sort-contract-correction-grade-unit-cogs-end-to-end
- TER-457: https://linear.app/terpcorp/issue/TER-457/rt-05-workspace-shell-route-unification-for-salesprocurementreceiving
- TER-458: https://linear.app/terpcorp/issue/TER-458/rt-06-legacy-route-deprecationredirect-cleanup-classic-spreadsheet
- TER-459: https://linear.app/terpcorp/issue/TER-459/rt-07-recoverable-delete-ux-for-inventory-purchase-orders-undorestore
- TER-460: https://linear.app/terpcorp/issue/TER-460/rt-08-export-ux-hardening-truncation-consent-progress-model-large-job
- TER-461: https://linear.app/terpcorp/issue/TER-461/rt-09-qa-debt-reduction-skiptodo-removal-db-integrity-gate-hardening
- TER-462: https://linear.app/terpcorp/issue/TER-462/rt-10-integration-regression-adversarial-sweep-release-gate-package
