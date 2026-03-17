# Schema Inventory Summary

Generated from [`generated/schema-inventory.csv`](./generated/schema-inventory.csv) on March 14, 2026.

## Counts

- total tables: `235`
- lifecycle `canonical`: `202`
- lifecycle `exception`: `31`
- lifecycle `deprecated`: `2`
- fork relevance `pilot-core`: `9`
- fork relevance `adjacent`: `175`
- fork relevance `exception-surface`: `31`
- fork relevance `ignore-v1`: `20`

## Domain Distribution

| Domain Owner    | Tables |
| --------------- | ------ |
| `accounting`    | `30`   |
| `relationships` | `33`   |
| `operations`    | `20`   |
| `sales`         | `16`   |
| `calendar`      | `22`   |
| `platform`      | `20`   |
| `live-shopping` | `3`    |
| `cross-product` | `91`   |

## Foundation Read

The schema surface is broad, but the pilot surface is not.

The spreadsheet-native fork should treat the following as pilot-core table families:

- `orders`
- `orderLineItems`
- `orderLineItemAllocations`
- `orderStatusHistory`
- `batches`
- `inventoryMovements`
- `inventoryViews`
- `clients`
- `supplierProfiles`

The most important warning from the inventory is not raw table count. It is the number of `adjacent` and `cross-product` tables that could accidentally leak into pilot scope if ownership is not explicit.

## Explicit Risks Called Out by the Inventory

- `vendors` remains a deprecated-but-live table family.
- calendar, VIP portal, live shopping, and photography/media tables are already exception-owned and should not be reabsorbed into pilot sheets.
- many cross-product support tables exist that are real but should not be used as justification for broader first-pilot scope.
