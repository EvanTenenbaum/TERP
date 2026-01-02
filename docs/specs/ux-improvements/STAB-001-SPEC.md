# Specification: STAB-001 - Fix Broken Modules

**Status:** Draft | **Priority:** CRITICAL | **Estimate:** 8h | **Module:** Core Infrastructure

---

## Problem Statement

Five core navigation items (18.5% of the main navigation) lead to non-functional pages:

| Module | Route | Issue | Root Cause |
|--------|-------|-------|------------|
| Tasks | `/tasks` | 404 Error | Route missing from App.tsx; component exists at `/todos` |
| Fulfillment | `/fulfillment` | 404 Error | Route not defined |
| Procurement | `/procurement` | 404 Error | Route not defined |
| Accounting | `/accounting` | Infinite Loading | Query timeout or missing data |
| Sales Portal | `/sales-portal` | Infinite Loading | Query timeout or missing data |

## Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | Tasks navigation must route to existing TodoListsPage | Must Have |
| FR-02 | Fulfillment navigation must route to functional WorkflowQueue | Must Have |
| FR-03 | Procurement navigation must route to functional PurchaseOrders | Must Have |
| FR-04 | Accounting page must load within 5 seconds with proper loading states | Must Have |
| FR-05 | Sales Portal must load within 5 seconds with proper loading states | Must Have |
| FR-06 | All pages must display meaningful error messages if data fails to load | Must Have |

## Technical Specification

### Route Fixes (App.tsx)
```typescript
<Route path="/tasks" element={<TodoListsPage />} />
<Route path="/fulfillment" element={<WorkflowQueuePage />} />
<Route path="/procurement" element={<PurchaseOrdersPage />} />
```

### Query Timeout Implementation
```typescript
const useQueryWithTimeout = (queryFn, options = {}) => {
  const timeoutMs = options.timeout || 10000;
  return useQuery({
    ...options,
    queryFn: async () => {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout')), timeoutMs)
      );
      return Promise.race([queryFn(), timeoutPromise]);
    },
  });
};
```

## Acceptance Criteria

- [ ] Tasks page loads and displays task list
- [ ] Fulfillment page loads and displays workflow queue
- [ ] Procurement page loads and displays purchase orders
- [ ] Accounting page loads within 5 seconds or shows error
- [ ] Sales Portal loads within 5 seconds or shows error
- [ ] All error states include retry functionality

## Success Metrics

| Metric | Target |
|--------|--------|
| 404 errors from navigation | 0 |
| Page load success rate | >99% |
| Average page load time | <3s |
