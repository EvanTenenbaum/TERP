# Specification: STAB-002 - Fix Data Integrity Issues

**Status:** Draft | **Priority:** CRITICAL | **Estimate:** 6h | **Module:** Data Layer

---

## Problem Statement

Critical data integrity issues exist across the application:

1. **Orders Page Data Mismatch:** KPI cards show 400 total orders, but table shows 0 orders
2. **Profit Calculation Bug:** `totalProfit` returns 0 for all clients (never implemented)
3. **Floating Point Display Errors:** Numbers like "57119.26999999999" displayed instead of "57,119.27"

## Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | Orders table must display same orders counted in KPI cards | Must Have |
| FR-02 | Profit calculation must be implemented: Revenue - Cost | Must Have |
| FR-03 | All currency values formatted with 2 decimals and thousand separators | Must Have |
| FR-04 | All unit quantities formatted with max 2 decimals | Must Have |
| FR-05 | Centralized formatting utility used across all components | Must Have |

## Technical Specification

### Profit Calculation Implementation
```typescript
export async function calculateClientProfit(clientId: number): Promise<number> {
  const revenue = await db
    .select({ total: sum(orderItems.totalPrice) })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(eq(orders.clientId, clientId));

  const cost = await db
    .select({ total: sum(orderItems.costBasis) })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(eq(orders.clientId, clientId));

  return (revenue[0]?.total || 0) - (cost[0]?.total || 0);
}
```

### Centralized Formatting Utility
```typescript
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export const formatNumber = (value: number, decimals: number = 2): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(value);
};
```

## Business Rules

| ID | Rule | Example |
|----|------|---------|
| BR-01 | Profit = Total Revenue - Total COGS | $100k revenue - $60k COGS = $40k profit |
| BR-02 | Currency always shows 2 decimals | $1,234.50, not $1234.5 |
| BR-03 | Large numbers use thousand separators | 57,119.27, not 57119.27 |
| BR-04 | Negative profit displays in red | -$5,000.00 |

## Acceptance Criteria

- [ ] Orders page KPI cards and table show consistent data
- [ ] Client list shows accurate profit values (not $0.00 for all)
- [ ] All currency values display as $X,XXX.XX format
- [ ] No floating point artifacts visible anywhere in UI
