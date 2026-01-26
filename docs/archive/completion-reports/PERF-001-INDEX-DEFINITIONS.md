# PERF-001: Generated Index Definitions

**Generated:** 2025-11-30
**Tool:** Gemini API (gemini-2.0-flash-exp)

---

## Top 10 Priority Indexes

Okay, here are the Drizzle ORM index definitions based on your requirements, separated by table and following the specified naming convention:

**batchLocations Indexes**

```typescript
table => ({
  batchLocations_batchId_idx: index("batchLocations_batchId_idx").on(
    table.batchId
  ),
});
```

**productTags Indexes**

```typescript
table => ({
  productTags_productId_idx: index("productTags_productId_idx").on(
    table.productId
  ),
});
```

**sales Indexes**

```typescript
table => ({
  sales_batchId_idx: index("sales_batchId_idx").on(table.batchId),
});
```

**ledgerEntries Indexes**

```typescript
table => ({
  ledgerEntries_accountId_idx: index("ledgerEntries_accountId_idx").on(
    table.accountId
  ),
});
```

**orderLineItems Indexes**

```typescript
table => ({
  orderLineItems_orderId_idx: index("orderLineItems_orderId_idx").on(
    table.orderId
  ),
});
```

**invoices Indexes**

```typescript
table => ({
  invoices_customerId_idx: index("invoices_customerId_idx").on(
    table.customerId
  ),
});
```

**batches Indexes**

```typescript
table => ({
  batches_productId_idx: index("batches_productId_idx").on(table.productId),
});
```

**recurringOrders Indexes**

```typescript
table => ({
  recurringOrders_status_nextGenerationDate_idx: index(
    "recurringOrders_status_nextGenerationDate_idx"
  ).on(table.status, table.nextGenerationDate),
});
```

**sampleRequests Indexes**

```typescript
table => ({
  sampleRequests_clientId_idx: index("sampleRequests_clientId_idx").on(
    table.clientId
  ),
});
```

**transactions Indexes**

```typescript
table => ({
  transactions_clientId_transactionDate_idx: index(
    "transactions_clientId_transactionDate_idx"
  ).on(table.clientId, table.transactionDate),
});
```
