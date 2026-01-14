# FE-QA-002: Align Frontend/Backend Pagination Parameters

<!-- METADATA (for validation) -->
<!-- TASK_ID: FE-QA-002 -->
<!-- TASK_TITLE: Align Frontend/Backend Pagination Parameters -->
<!-- PROMPT_VERSION: 1.0 -->
<!-- LAST_VALIDATED: 2026-01-14 -->

**Repository:** https://github.com/EvanTenenbaum/TERP
**Task ID:** FE-QA-002
**Estimated Time:** 4h
**Module:** Multiple files

## Context

**Background:**
Frontend and backend use inconsistent pagination parameters:
- Some use `page` and `pageSize`
- Some use `limit` and `offset`

This causes:
- Pagination bugs
- Off-by-one errors
- Confusion for developers

**Goal:**
Standardize on a single pagination convention across the codebase.

**Success Criteria:**
- Consistent pagination parameters everywhere
- Clear conversion utilities if needed
- No pagination bugs

## Implementation Guide

### Step 1: Choose Standard Convention

**Recommended: Use `page` and `pageSize`**
- More intuitive for frontend developers
- Matches common UI library patterns
- Easier to explain to users ("Page 3 of 10")

### Step 2: Create Pagination Utility

```typescript
// shared/pagination.ts
export interface PaginationParams {
  page: number;  // 1-indexed
  pageSize: number;
}

export interface OffsetParams {
  offset: number;
  limit: number;
}

export function toOffset(params: PaginationParams): OffsetParams {
  return {
    offset: (params.page - 1) * params.pageSize,
    limit: params.pageSize
  };
}

export function toPage(params: OffsetParams): PaginationParams {
  return {
    page: Math.floor(params.offset / params.limit) + 1,
    pageSize: params.limit
  };
}
```

### Step 3: Update Backend to Accept Both

Add middleware to normalize pagination:
```typescript
const paginationMiddleware = t.middleware(async ({ input, next }) => {
  const normalized = normalizePagination(input);
  return next({ input: normalized });
});
```

### Step 4: Update Frontend Components

Standardize all table/list components:
```typescript
// hooks/usePagination.ts
export function usePagination(defaultPageSize = 20) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  return {
    page,
    pageSize,
    setPage,
    setPageSize,
    offset: (page - 1) * pageSize,
    limit: pageSize
  };
}
```

### Step 5: Update All API Calls

Find and update all paginated API calls:
```bash
grep -rn "limit\|offset\|page\|pageSize" client/src/ --include="*.ts*"
```

## Deliverables

- [ ] Create shared pagination utility
- [ ] Update backend to normalize pagination
- [ ] Create frontend usePagination hook
- [ ] Update all API calls to use standard params
- [ ] Document pagination convention

## Quick Reference

**Find pagination usages:**
```bash
grep -rn "limit.*offset\|page.*pageSize" --include="*.ts*"
```

**Standard params:**
```typescript
{ page: number, pageSize: number }  // Frontend convention
{ offset: number, limit: number }    // Backend/DB convention
```
