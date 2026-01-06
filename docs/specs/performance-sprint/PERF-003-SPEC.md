# Specification: Performance Improvements

## Task: PERF-003: Optimize Calendar Financial Views

**Status:** Draft  
**Priority:** MEDIUM  
**Estimate:** 8h  
**Module:** Backend / Calendar  
**Dependencies:** None  
**Spec Author:** Manus AI  
**Spec Date:** 2026-01-06  

---

## 1. Problem Statement

The Calendar financial preparation views fetch broad datasets (e.g., all overdue invoices for a client) without pagination or proper filtering, using `findMany` without limits. This can cause high latency and memory usage when preparing for client meetings.

## 2. User Stories

1. **As a Sales Rep**, I want the financial overview for a client meeting to load quickly so I can prepare efficiently.

## 3. Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | Add date and status filters to all financial queries in `calendarFinancials.ts`. | Must Have |
| FR-02 | Cap all `findMany` result sets with a reasonable `limit` (e.g., 100). | Must Have |
| FR-03 | Add covering indexes to `invoices` and `bills` on `(customer_id, status, dueDate)`. | Must Have |

## 4. Technical Specification

### 4.1 Data Model Changes

Add composite indexes to `drizzle/schema.ts`:

```sql
-- In 'invoices' table
CREATE INDEX idx_invoices_customer_status_due ON invoices(customerId, status, dueDate);

-- In 'bills' table
CREATE INDEX idx_bills_customer_status_due ON bills(customerId, status, dueDate);
```

### 4.2 API Contracts

Refactor `server/routers/calendarFinancials.ts` to use indexed, limited queries.

## 9. Success Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Calendar Financials API Latency (p95) | < 1s | API monitoring tool |
