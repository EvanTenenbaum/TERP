# Specification: Performance Improvements

## Task: PERF-001: Fix Client-Side Overfetching

**Status:** Draft  
**Priority:** HIGH  
**Estimate:** 16h  
**Module:** Frontend / API  
**Dependencies:** None  
**Spec Author:** Manus AI  
**Spec Date:** 2026-01-06  

---

## 1. Problem Statement

Multiple frontend components, including the main Inventory page and various client selector dropdowns, fetch up to 1,000 rows of data at a time (`limit: 1000`) and perform filtering and sorting on the client. This approach defeats the existing server-side cursor pagination, leading to excessive memory consumption, slow paint times, and a poor user experience on large datasets.

## 2. User Stories

1. **As an Inventory Manager**, I want the Inventory page to load quickly, even with 10,000+ batches, so that I can efficiently manage stock.
2. **As a Sales Rep**, I want to quickly search for and select a client from a dropdown without waiting for the entire client list to load.

## 3. Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | Replace client-side filtering with server-side querying for the Inventory page. | Must Have |
| FR-02 | Implement virtualization for the Inventory table to render only visible rows. | Must Have |
| FR-03 | Replace static client selector dropdowns with virtualized, searchable comboboxes. | Must Have |
| FR-04 | Default API query limits should be reduced from 1000 to 100. | Must Have |

## 4. Technical Specification

### 4.1 Data Model Changes

No schema changes required.

### 4.2 API Contracts

Modify existing `list` endpoints to accept optional search/filter parameters:

```typescript
// Example: server/routers/inventory.ts
list: protectedProcedure
  .input(z.object({
    limit: z.number().min(1).max(100).nullish(),
    cursor: z.string().nullish(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
    // ADD: search query for server-side filtering
    search: z.string().optional(),
  }))
  // ...
```

### 4.3 Integration Points

- **Frontend:** `Inventory.tsx`, `EventFormDialog.tsx`, `CogsClientSettings.tsx`, `OrderCreatorPage.tsx`, `Orders.tsx`, `Quotes.tsx`, `SalesSheetCreatorPage.tsx`
- **Backend:** `inventory.ts`, `clients.ts`

## 5. UI/UX Specification

- **Inventory Page:** The main table should be virtualized using a library like `react-virtualized` or `@tanstack/react-virtual`.
- **Client Selectors:** Replace standard `<select>` dropdowns with a searchable combobox component (e.g., from ShadCN/Radix UI) that fetches data asynchronously.

## 9. Success Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Inventory Page Load Time | < 2s for 10k rows | Browser DevTools Performance |
| Client Selector Interaction | < 200ms | User timing |
| Memory Usage (Inventory Page) | < 100MB | Browser DevTools Memory |
