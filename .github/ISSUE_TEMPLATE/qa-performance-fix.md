---
name: ⚡️ Performance Fix
about: Fix a performance issue from QA report
title: '[PERF] '
labels: performance, qa-report
assignees: ''
---

## Performance Issue

**QA Report Reference:**
- See: `CODE_QA_DETAILED_TECHNICAL_REPORT.md` → Phase 10, Section X

## Current Performance

**File:** `path/to/file.ts:line`

**Metrics:**
- Response time: ___ ms
- Query count: ___ queries
- Memory usage: ___ MB
- Bundle size: ___ KB

## Root Cause

- [ ] N+1 query pattern
- [ ] Post-query filtering (should be in SQL)
- [ ] Missing pagination
- [ ] Missing indexes
- [ ] Large component (no code splitting)
- [ ] No React.memo
- [ ] Other: ___

## Current Code

```typescript
// Show problematic code
```

## Proposed Fix

```typescript
// Show optimized code
```

## Expected Improvement

- Response time: ___ ms → ___ ms (___% faster)
- Query count: ___ → ___ (___% reduction)
- Memory usage: ___ MB → ___ MB
- Bundle size: ___ KB → ___ KB

## Implementation Checklist

### Backend Performance
- [ ] Replace N+1 queries with batch loading
- [ ] Move filtering to SQL WHERE clauses
- [ ] Add pagination (limit/offset)
- [ ] Add database indexes
- [ ] Cache frequently accessed data

### Frontend Performance
- [ ] Split large components (<500 lines)
- [ ] Add React.memo to expensive components
- [ ] Implement code splitting / lazy loading
- [ ] Optimize re-renders
- [ ] Virtualize large lists

## Testing

**Before:**
```bash
# Measure current performance
curl -w "@curl-format.txt" http://localhost:5000/api/endpoint
```

**After:**
```bash
# Verify improvement
```

## Phase
- Phase 2: Performance & Quality (Weeks 2-4)
