# ADR-0001: Numeric Fields as VARCHAR (Legacy)

**Status:** Deprecated
**Date:** 2025-12-01
**Author:** Codebase Review Session
**Deciders:** To be reviewed

## Context

The original codebase implementation stored several numeric fields (quantities, prices, COGS values) as VARCHAR strings in the database schema.

Fields affected include:
- `batches.onHandQty` (VARCHAR)
- `batches.reservedQty` (VARCHAR)
- `batches.unitCogs` (VARCHAR)
- `orderLineItems.quantity` (VARCHAR)
- `orderLineItems.salePrice` (VARCHAR)
- `orderLineItems.cogsAtSale` (VARCHAR)

This required `parseFloat()` calls throughout the application code to perform calculations.

## Decision

This was the original implementation choice. **This ADR documents existing behavior that should be changed.**

## Consequences

### Negative

- Requires runtime type conversion (`parseFloat()`) in 15+ locations
- Risk of NaN errors if data becomes corrupted
- Cannot use database-level numeric operations (SUM, AVG)
- No database-level validation of numeric format
- Precision issues with floating-point conversion
- Inconsistent with other numeric fields that use `decimal()`

### Why This Should Change

The schema already uses `decimal(precision, scale)` for other financial fields:
- `clients.totalSpent` - decimal(15, 2)
- `orders.subtotal` - decimal(15, 2)
- `fiscalPeriods.revenue` - decimal(15, 2)

These quantity fields should be migrated to match.

## Recommended Migration

1. Add new decimal columns alongside existing varchar columns
2. Migrate data: `UPDATE batches SET new_col = CAST(old_col AS DECIMAL(15,4))`
3. Update application code to use new columns
4. Drop old varchar columns
5. Rename new columns

## References

- Schema file: `drizzle/schema.ts` lines 500-607
- Usage: `server/cogsCalculation.ts` lines 71, 112, 116-117
- Usage: `server/orderEnhancements.ts` lines 62-63
