# Spreadsheet-Native Scripts

This directory contains execution helpers for the spreadsheet-native TERP fork.

Current scripts:

- `generate-orders-runtime-active-gate-status.mjs`
  - generates `docs/specs/spreadsheet-native-foundation/orders-runtime/ACTIVE_GATE_STATUS.md`
  - summarizes the active Orders runtime gate, current blocker, next unblock, present evidence paths, and current worktree pressure
  - is a local read-only snapshot, not source of truth; regenerate it when you need a fresh view
- `generate-orders-runtime-proof-budget.mjs`
  - generates `docs/specs/spreadsheet-native-foundation/orders-runtime/PROOF_BUDGET.md`
  - turns the current gate doc, issue manifest, and execution metrics into a lightweight proof-economics recommendation
  - stays advisory only: it never runs proof commands or mutates tracker state
- `detect-staging-sheet-surfaces.ts`
  - logs into the staging app with seeded QA personas
  - requests the Orders and Inventory workbook routes with `surface=sheet-native`
  - records whether staging currently serves the sheet-native pilot or falls back to the classic workbook surface
  - writes screenshots and a JSON report under `output/playwright/staging-oracle/`
- `prove-orders-runtime-g2.ts`
  - logs into staging as the sales-manager QA persona
  - validates the Orders queue route on the current build for route health and AG Grid license state
  - captures live Orders document proof for duplicate, quick-add, delete, Tab, Shift+Tab, Enter, Shift+Enter, and Escape behavior
  - writes screenshots and a JSON report under `output/playwright/orders-runtime-g2/`
- `probe-orders-runtime-fill-handle.ts`
  - logs into staging as the sales-manager QA persona
  - targets only the Orders document fill-handle tranche for `SALE-ORD-022`
  - selects the quantity range, drags the native fill handle, and records whether the series propagates to `["3","4","5","6"]`
  - accepts `PLAYWRIGHT_BASE_URL` and optional `PLAYWRIGHT_ORDERS_DRAFT_ID`
  - writes one screenshot and one JSON report under `output/playwright/orders-runtime-g2/`
- `probe-orders-runtime-selection.ts`
  - logs into staging as the sales-manager QA persona
  - targets only the Orders selection grammar tranche for `SALE-ORD-019`
  - records queue drag-range, discontiguous selection, column-scope, current-grid scope, and document Shift-range behavior in one closure-ready packet
  - accepts `PLAYWRIGHT_BASE_URL`, optional `PLAYWRIGHT_ORDERS_ORDER_ID`, and optional `PLAYWRIGHT_ORDERS_DRAFT_ID`
  - writes screenshots and a JSON report under `output/playwright/orders-runtime-g2/`
