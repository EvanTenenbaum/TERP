# Specification: Performance Improvements

## Task: PERF-004: Implement Full-Text Search

**Status:** Draft  
**Priority:** MEDIUM  
**Estimate:** 12h  
**Module:** Backend / Search  
**Dependencies:** None  
**Spec Author:** Manus AI  
**Spec Date:** 2026-01-06  

---

## 1. Problem Statement

Global search uses `LIKE '%query%'` on multiple columns, which are non-sargable and result in full-table scans. This will become unacceptably slow as the data volume grows.

## 2. User Stories

1. **As any user**, I want search results to be fast and relevant, even on a large database.

## 3. Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | Replace `LIKE` queries with a full-text search index in `server/routers/search.ts`. | Must Have |
| FR-02 | Remove leading wildcards from search queries where possible. | Should Have |

## 4. Technical Specification

### 4.1 Data Model Changes

Add `FULLTEXT` indexes to `drizzle/schema.ts`:

```sql
-- In 'clients' table
ALTER TABLE clients ADD FULLTEXT(name, email, notes);

-- In 'orders' table
ALTER TABLE orders ADD FULLTEXT(orderNumber, notes);

-- In 'batches' table
ALTER TABLE batches ADD FULLTEXT(code, sku);
```

### 4.2 API Contracts

Refactor `server/routers/search.ts` to use `MATCH() AGAINST()` syntax instead of `LIKE`.

## 9. Success Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Global Search API Latency (p95) | < 500ms | API monitoring tool |
