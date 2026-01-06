# Specification: Performance Improvements

## Task: PERF-006: Cache Hot-Path Reference Data

**Status:** Draft  
**Priority:** HIGH  
**Estimate:** 4h  
**Module:** Backend / Core  
**Dependencies:** None  
**Spec Author:** Manus AI  
**Spec Date:** 2026-01-06  

---

## 1. Problem Statement

Frequently accessed, rarely changing data (e.g., client name maps, feature flags, RBAC permissions) is re-fetched from the database on every request, causing unnecessary database load and adding latency to hot paths like the dashboard.

## 2. User Stories

1. **As a user**, I want the application to feel fast and responsive, without delays caused by redundant data fetching.

## 3. Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | Use the existing in-memory cache (`server/_core/cache.ts`) for `fetchClientNamesMap`. | Must Have |
| FR-02 | Memoize RBAC permission checks per request to avoid redundant DB lookups. | Must Have |
| FR-03 | Cache feature flag evaluations with a short TTL (e.g., 30 seconds). | Must Have |

## 4. Technical Specification

### 4.2 API Contracts

Refactor `server/dashboardHelpers.ts` and `server/routers/dashboard.ts` to use the caching utility.

```typescript
// Example: server/dashboardHelpers.ts
import cache, { CacheKeys } from "../_core/cache";

export async function fetchClientNamesMap(clientIds: string[]) {
  const cacheKey = `${CacheKeys.CLIENT_NAMES_MAP}:${clientIds.join(",")}`;
  const cached = await cache.get<Map<string, string>>(cacheKey);
  if (cached) return cached;

  // ... fetch from DB ...

  await cache.set(cacheKey, clientMap, 60000); // 1 minute TTL
  return clientMap;
}
```

## 9. Success Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| DB queries per dashboard load | < 10 | SQL logging |
| Dashboard API Latency (p95) | < 500ms | API monitoring |
