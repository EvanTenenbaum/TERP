# Capability Ledger Summary: Accounting -> Client Ledger

Snapshot:

- Commit: `9544782f`
- Extracted: `2026-03-20`
- Checked Against Code: `full read of ClientLedgerWorkSurface.tsx and clientLedger.ts router`
- Scope Owner: `Accounting pilot team`

## Scope

This ledger targets the spreadsheet-native build contract for:

- workbook: `Accounting`
- sheet candidate: `Client Ledger`

Included current surfaces:

- [ClientLedgerWorkSurface.tsx](../../../client/src/components/work-surface/ClientLedgerWorkSurface.tsx)
- [clientLedger.ts](../../../server/routers/clientLedger.ts)
- [clients.ts](../../../server/routers/clients.ts) for client list lookup only

Adjacent but not absorbed into this sheet:

- Payment execution (`/accounting/payments`)
- Invoice generation and status (`/accounting/invoices`)
- Client profile and relationship management (`/clients/:id`)
- General ledger and chart of accounts (`/accounting/general-ledger`)
- Bad debt write-off workflow (`/accounting/ar`)
- `relationshipProfile.getMoney` sidecar used in the Sales Orders composer — shares balance signal but different ownership context

## Coverage Snapshot

- Capability rows in this ledger: `12`
- Pack-level Client Ledger rows decomposed here: `3` (ACCT-LED-001 through ACCT-LED-003 from the pack become 12 detailed rows)
- USER_FLOW_MATRIX procedures explicitly represented: `5` (rows 457-461)
- Net-new capabilities discovered in code not in the extraction CSV: `4` (balance summary cards, pagination controls, clear filters, getBalanceAsOf router capability)
- Open discrepancies recorded: `3`
- Blueprint-blocking discrepancies: `none`

## Extraction Audit

The automated extraction (CSV at `docs/specs/spreadsheet-native-ledgers/extracted/client-ledger-capabilities.csv`) identified 11 items. The code audit found 4 additional capabilities not in the CSV, corrected 1 garbled row name, and consolidated 2 export rows into 1. The USER_FLOW_MATRIX query naming in the brief (`accounting.ledger.*`) was stale; the actual router namespace is `clientLedger.*`. The extraction CSV had the correct names. Permission values in the USER_FLOW_MATRIX show `(none)` for all five ledger procedures — the actual router enforces `clients:read` on all queries and `accounting:create` on the mutation; this is a matrix documentation gap, not a real open-permission surface.

## Key Scope Decisions

1. The Client Ledger remains a standalone sheet, not a tab inside a generic Accounting workbook. The launch matrix explicitly rejects remounting it as an Accounting workbook tab before shell ownership changes.
2. The running balance column MUST remain visible in the transaction table even when the transaction inspector is open on the right rail. This is the #1 preservation constraint from the launch matrix and cannot be sacrificed for layout convenience.
3. The balance is calculated from five independent data sources in real time (orders, payments received, payments sent, purchase orders, manual adjustments). Any redesign that fetches only one or two of those sources will silently corrupt the balance. This hidden dependency is P0.
4. The adjustment permission gate (`accounting:create`) is an explicit preserve item from the launch matrix. It must not be downgraded to a generic write permission or collapsed into the `clients:read` read surface.
5. The two-step confirm dialog (fill form then see summary then confirm) on the adjustment is a trust behavior, not incidental UI complexity. Collapsing it into a single submit would be a regression.
6. `clientLedger.getBalanceAsOf` exists in the router and USER_FLOW_MATRIX but is not called by the current UI component. It is captured as intentionally-deferred pending a UI surface decision (dispute resolution panel or client profile sidecar).
7. Reference navigation (clicking a transaction to jump to the originating Order, Payment, or Purchase Order) is an explicit user-facing capability that must be preserved. The three reference types (ORDER, PAYMENT, PURCHASE_ORDER) each have their own route resolution logic.
8. Client selection is required before any ledger data loads. The empty-state UX ("Select a Client") must remain a real gate, not disappear in a redesign that pre-selects or auto-loads an arbitrary client.

## Classification Summary

- `sheet-native`: `8`
- `sheet-plus-sidecar`: `2`
- `exception-surface`: `0`
- `intentionally-deferred`: `1`
- `rejected-with-evidence`: `1`

## Capabilities Table

| ID           | Capability                                  | Type             | Source                               | Criticality | Current API                                                                                                                         | Permission          | Migration Decision     | Notes                                                                                                                                                                                                       |
| ------------ | ------------------------------------------- | ---------------- | ------------------------------------ | ----------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ACCT-LED-001 | Client selection and ledger load            | Query + UI gate  | CSV QUE-009; Matrix row 457          | P0          | `clients.list` (limit 1000 for combobox options)                                                                                    | `clients:read`      | Adopt                  | Client gate must remain explicit. Do not pre-select or auto-load.                                                                                                                                           |
| ACCT-LED-002 | Transaction table with keyboard navigation  | Query + Keyboard | CSV KEY-002, QUE-011; Matrix row 457 | P0          | `clientLedger.getLedger` (clientId, startDate, endDate, transactionTypes, limit=50, offset)                                         | `clients:read`      | Adopt                  | Running balance column must remain visible even when inspector is open. Arrow keys, Enter, Cmd+K, C, A, E, [, ], Escape shortcuts.                                                                          |
| ACCT-LED-003 | Balance summary KPI cards                   | Query            | Not in extraction CSV                | P0          | `clientLedger.getLedger` response fields: totalCount, summary.totalDebits, summary.totalCredits, currentBalance, balanceDescription | `clients:read`      | Adopt                  | 4-card grid: Total Transactions, Total Debits (red), Total Credits (green), Current Balance (color-coded). Reflects filtered view. balanceDescription plain-language field must be preserved.               |
| ACCT-LED-004 | Date range filter                           | UI + Query param | CSV ACT-005                          | P1          | `clientLedger.getLedger` startDate / endDate params                                                                                 | `clients:read`      | Adopt                  | Resets page to 0 on change.                                                                                                                                                                                 |
| ACCT-LED-005 | Transaction type filter                     | Query + UI       | CSV ACT-005; Matrix rows 457, 461    | P1          | `clientLedger.getTransactionTypes` to populate; `transactionTypes` array on getLedger                                               | `clients:read`      | Adapt                  | Current UI is single-select despite API supporting array. Sheet-native should decide on multi-select. Types: SALE, PURCHASE, PAYMENT_RECEIVED, PAYMENT_SENT, CREDIT, DEBIT.                                 |
| ACCT-LED-006 | Clear filters                               | UI action        | Not in extraction CSV                | P2          | No API call; resets local state                                                                                                     | `clients:read`      | Adopt                  | "Clear Filters (C)" ghost button; disabled when no filters active.                                                                                                                                          |
| ACCT-LED-007 | Transaction inspector (right-rail detail)   | UI               | CSV DIA-007                          | P0          | No additional API call; renders data from getLedger response                                                                        | `clients:read`      | Adapt                  | Running balance must stay visible in table while inspector is open. Inspector does not fetch new data.                                                                                                      |
| ACCT-LED-008 | Reference navigation from inspector         | UI + Routing     | CSV ACT-003                          | P1          | buildSalesWorkspacePath for ORDER; direct href for PAYMENT, PURCHASE_ORDER                                                          | `clients:read`      | Preserve               | Three reference types handled: ORDER, PAYMENT, PURCHASE_ORDER.                                                                                                                                              |
| ACCT-LED-009 | Paginated transaction browsing              | UI + Query       | Not in extraction CSV                | P1          | `clientLedger.getLedger` with limit=50, offset=page\*50; totalCount from response                                                   | `clients:read`      | Adopt                  | Previous/Next buttons with [/] shortcuts; 50 rows/page; Tab auto-advances page at last row. Running balance computed server-side across all transactions before pagination.                                 |
| ACCT-LED-010 | Add ledger adjustment (credit or debit)     | Mutation         | CSV MUT-004; Matrix row 459          | P0          | `clientLedger.addLedgerAdjustment`: clientId, transactionType, amount, description, optional effectiveDate                          | `accounting:create` | Preserve               | Two-step confirmation (form then confirm dialog). Notes required (1-1000 chars). Amount must be positive. Actor attribution via getAuthenticatedUserId(ctx).                                                |
| ACCT-LED-011 | CSV export                                  | Query            | CSV EXP-001, EXP-008                 | P1          | `clientLedger.exportLedger`: clientId, optional filters                                                                             | `clients:read`      | Adopt                  | Downloads all matching transactions (not just visible page). File: `ledger_[teriCode]_[date].csv`. Includes SUMMARY section. Note: exportLedger uses stricter order status filter than getLedger (DIS-001). |
| ACCT-LED-012 | Balance as-of date query (server-side only) | Query (deferred) | Matrix row 458                       | P2          | `clientLedger.getBalanceAsOf`: clientId, asOfDate                                                                                   | `clients:read`      | intentionally-deferred | No current UI. Exists for dispute resolution. Do not build a UI during Client Ledger sheet-native without separate design decision.                                                                         |

## Discrepancy Log

### DIS-001: export filter stricter than getLedger filter for orders

- Source: getLedger excludes only CANCELLED; exportLedger includes only CONFIRMED, INVOICED, PAID, PARTIAL, SHIPPED, DELIVERED
- Effect: Draft or null-status orders appear in UI but not in CSV export
- Classification: pre-existing bug
- Resolution: Sheet-native implementation should decide whether to align filters or document the difference

### DIS-002: USER_FLOW_MATRIX shows (none) for permissions

- Source: Matrix rows 457-461 vs actual router enforcing clients:read and accounting:create
- Classification: documentation gap in matrix, not a real security issue

### DIS-003: Flow Guide has no Client Ledger section

- Classification: documentation gap, not a blocker

## Hidden Dependency: 5-Source Balance Calculation

The balance combines: orders (as buyer), payments received, payments sent (as supplier being paid), purchase orders (as supplier), and manual adjustments. A client with `isSeller=true` will have purchase-order credits. Any implementation querying only orders and payments will produce a wrong balance for supplier-clients without any visible error.
