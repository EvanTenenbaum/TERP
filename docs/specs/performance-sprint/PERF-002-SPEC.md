# Specification: Performance Improvements

## Task: PERF-002: Optimize Dashboard KPI Computations

**Status:** Draft  
**Priority:** HIGH  
**Estimate:** 12h  
**Module:** Backend / Dashboard  
**Dependencies:** None  
**Spec Author:** Manus AI  
**Spec Date:** 2026-01-06  

---

## 1. Problem Statement

Dashboard KPIs are computed on every request by fetching large datasets (all invoices, all payments) and performing aggregations in the Node.js process. This leads to high database load, high API latency, and scales poorly as the data volume grows.

## 2. User Stories

1. **As a Manager**, I want the dashboard to load instantly so I can get a quick overview of the business.
2. **As a System Administrator**, I want to minimize unnecessary database load to reduce costs and ensure system stability.

## 3. Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | Move KPI aggregations from the application layer to the database layer using SQL. | Must Have |
| FR-02 | Implement caching for the main dashboard KPI payload with a 60-second TTL. | Must Have |
| FR-03 | Add covering indexes to the `invoices` and `payments` tables to speed up aggregations. | Must Have |

## 4. Technical Specification

### 4.1 Data Model Changes

Add composite indexes to `drizzle/schema.ts`:

```sql
-- In 'invoices' table
CREATE INDEX idx_invoices_status_date ON invoices(status, invoiceDate);

-- In 'payments' table
CREATE INDEX idx_payments_type_date ON payments(paymentType, paymentDate);
```

### 4.2 API Contracts

Refactor `server/routers/dashboard.ts` to use optimized SQL queries instead of in-memory filtering.

```typescript
// Example: server/routers/dashboard.ts
// OLD:
const allInvoicesResult = await arApDb.getInvoices({});
const activeInvoices = allInvoicesResult.filter(i => i.status === 'SENT');

// NEW:
const activeInvoicesCount = await db.select({ count: sql`count(*)` }).from(invoices).where(eq(invoices.status, 'SENT'));
```

### 4.3 Integration Points

- **Backend:** `dashboard.ts`, `arApDb.ts`, `cache.ts`

## 5. UI/UX Specification

No UI changes required. This is a backend performance optimization.

## 9. Success Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Dashboard API Latency (p95) | < 500ms | API monitoring tool |
| Database CPU Usage | < 20% during peak hours | Database monitoring tool |
