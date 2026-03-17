# Ownership Seams Memo

This memo closes the four blocking pilot ownership seams.

## Decisions

| ID         | Decision                                                                                                                                                                              | Primary Owner                                                                                                             | Allowed Supporting Surface                                         | Fork Rule                                                                                                     |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `ORD-D005` | Sales owns order readiness and order workflow through `READY_FOR_SHIPPING`; Accounting owns payment execution and invoice truth; Operations -> Shipping owns pick/pack/ship execution | `Sales -> Orders` for order workflow, `Accounting` for payment execution, `Operations -> Shipping` for shipping execution | linked handoff buttons and read-only context are allowed           | Orders sheet may launch payment/shipping handoffs but may not absorb those execution flows                    |
| `ORD-D007` | Sales owns quote/order conversion, order-level exports, and order activity/audit context; Accounting owns invoice document output and payment receipts                                | `Sales -> Orders` for conversion/export/audit, `Accounting` for invoice/output docs                                       | linked accounting output actions are allowed                       | visible but inert invoice actions must not be counted as preserved until Accounting output execution is wired |
| `INV-D004` | Inventory owns stock state, quantity state, saved views, and movement history; Locations / Storage owns location setup and transfer execution                                         | `Operations -> Inventory` for stock truth, `Locations / Storage` for setup/transfers                                      | handoff launch plus read-only summary are allowed                  | first inventory sheet shows current location and transfer state but does not own transfer workflow            |
| `INV-D007` | Accounting owns official COGS and valuation truth; Inventory owns read-only valuation context and movement-derived display                                                            | `Accounting`                                                                                                              | `Operations -> Inventory` may display read-only values or warnings | first inventory sheet must not mutate accounting-owned valuation truth                                        |

## Remaining Open but Non-Blocking

- `ORD-D010`: invoice download ownership remains unresolved as executable functionality
- `INV-D006`: supporting master-data ownership for add-inventory lookups remains outside pilot-core scope

## Ledger Effect

This memo resolves the blueprint-blocking ownership seams.

The ledgers should now treat:

- `ORD-D005` as resolved by ownership memo
- `ORD-D007` as resolved by ownership memo
- `INV-D004` as resolved by ownership memo
- `INV-D007` as resolved by ownership memo
