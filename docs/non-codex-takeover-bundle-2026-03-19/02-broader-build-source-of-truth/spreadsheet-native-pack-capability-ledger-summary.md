# Spreadsheet-Native Pack Capability Ledger Summary

Date: `2026-03-19`  
Snapshot: `0e2bb8ba5edfb9c9b1e1b836acb50a8c9348cfae`

## Purpose

This summary explains what the pack-level capability ledger does and does not cover.

It exists to bridge the gap between:

- the directional spreadsheet-native Figma pack
- the already-detailed Orders, Inventory, Sales Sheets, Direct Intake, and Purchase Orders ledgers
- the remaining modules that still need deep implementation mapping before build work

## Coverage Rule

The CSV in this folder remains authoritative for pack-level mapping of:

- Fulfillment
- Invoices
- Payments
- Client Ledger
- Returns
- Samples
- shared cross-pack seams

It is not authoritative for replacing the detailed Orders, Inventory, Sales Sheets, Direct Intake, or Purchase Orders ledgers.

Every CSV row in this file set now includes `Build Readiness = pack-only / blocked`.
That field is intentional. It prevents the pack-level ledger from being misread as module-level implementation clearance.

## Reused Detailed Ledgers

These remain the stronger source:

- `docs/specs/spreadsheet-native-ledgers/sales-orders-sheet-capability-ledger.csv`
- `docs/specs/spreadsheet-native-ledgers/operations-inventory-sheet-capability-ledger.csv`
- `docs/specs/spreadsheet-native-ledgers/sales-sheets-capability-ledger.csv`
- `docs/specs/spreadsheet-native-ledgers/direct-intake-capability-ledger.csv`
- `docs/specs/spreadsheet-native-ledgers/purchase-orders-capability-ledger.csv`

## Temporary Preservation Stubs

- `STUB-PAY-001` protects Payments at pack level until a dedicated accounting preservation pass exists.
- `STUB-CROSS-001` protects shared spreadsheet-native primitives at pack level until dedicated foundation preservation rows exist.

## Row Coverage Snapshot

| Scope            | Row IDs                                                                  | What the rows are doing                                                                                                 |
| ---------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Fulfillment      | `FUL-PK-001` to `FUL-PK-004`                                             | queue browsing, bagging state, pack flows, readiness and outputs                                                        |
| Invoices         | `ACCT-INV-001` to `ACCT-INV-003`                                         | browse and actions, payment handoff, PDF and print outputs                                                              |
| Payments         | `ACCT-PAY-001` to `ACCT-PAY-004`                                         | registry, guided create, invoice allocation and receipts, legacy coexistence                                            |
| Client Ledger    | `ACCT-LED-001` to `ACCT-LED-003`                                         | browse and balance, detail context, adjustments and export                                                              |
| Returns          | `SALE-RET-001` to `SALE-RET-004`                                         | queue and creation, approvals, process and disposition, refunds and order-linked returns                                |
| Samples          | `OPS-SMP-001` to `OPS-SMP-004`                                           | request management, expiration and history, returns, allocation and analytics                                           |
| Shared contracts | `CROSS-001` to `CROSS-005`                                               | sheet primitives, terminology, Quotes adjacency, Live Shopping adjacency, output contracts                              |
| Pointer rows     | `ORD-PTR-001`, `INV-PTR-001`, `SHT-PTR-001`, `INT-PTR-001`, `PO-PTR-001` | direct readers to the existing detailed ledgers for Orders, Inventory, Sales Sheets, Direct Intake, and Purchase Orders |

## What Makes These Rows Useful

Each row is intended to answer five questions fast:

1. What real TERP behavior exists today?
2. Why would it hurt if we lost it?
3. Does it belong in the primary sheet, a sidecar, or an explicit exception?
4. What current code or docs back it up?
5. What proof will eventually be needed before parity can be claimed?
6. Is the row actually build-ready yet, or still blocked at pack level?

The CSV also now carries:

- `Preservation Entry Status` so temporary stubs are visibly weaker than verified preservation references
- `Prerequisite Ledger` so the next required detailed artifact is machine-readable

Detailed-ledger authors should treat the pack rows as a minimum preservation floor, not a cap. The first detailed tranche already expanded beyond pack row counts once current code was checked closely.

## Highest-Risk Preservation Themes

### 1. Design and implementation truth must stay separate

The recording made it clear that the deck is not literal control-level approval.
The ledger therefore preserves behavior first and treats visual direction as a secondary signal.

### 2. Outputs are part of the workflow

Invoice PDF, print, payment receipts, ledger export, sales-sheet preview and share, and intake or PO exports are all preserved deliberately in the rows.

### 3. Sibling surfaces are still real

Quotes, Live Shopping, receipts, discrepancy flows, and legacy accounting paths still exist even if the artboards do not fully represent them.

### 4. Fulfillment, Returns, Samples, and Payments are deeper than the current pack

The ledger explicitly keeps the deeper lifecycles visible so implementation does not flatten them.

## How To Use This Summary

- Start with `spreadsheet-native-build-source-of-truth.md` for the packet-level rules.
- Use the CSV for the actual pack-level capability map.
- When beginning a real module implementation, use the dedicated ledger if it already exists; otherwise explode that module's pack-level rows into a new detailed ledger before claiming build-readiness.
