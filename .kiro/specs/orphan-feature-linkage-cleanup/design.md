# Design Document: Orphan Feature and Linkage Cleanup

## Overview

This design addresses the cleanup of orphan features and broken linkages discovered during a comprehensive audit of the TERP codebase. The work is divided into two phases:

1. **Stabilization Phase**: Fix broken linkages that cause user-facing issues (search results pointing to non-existent routes, cron jobs not running)
2. **Cleanup Phase**: Remove or properly integrate orphan code (unused pages, legacy entrypoints)

The approach prioritizes user-facing fixes first, then addresses technical debt through safe, staged cleanup.

## Architecture

### Current State

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client (React/Vite)                       │
├─────────────────────────────────────────────────────────────────┤
│  App.tsx Routes:                                                 │
│  ├── /orders (Orders.tsx)                                       │
│  ├── /orders-debug (OrdersDebug.tsx)                            │
│  ├── /orders/create (OrderCreatorPage.tsx)                      │
│  └── ❌ /orders/:id (MISSING - search points here)              │
│                                                                  │
│  Orphan Pages (no routes):                                       │
│  ├── Quotes.tsx (fully implemented, unreachable)                │
│  ├── ComponentShowcase.tsx (dev utility)                        │
│  └── DebugOrders.tsx (duplicate of OrdersDebug?)                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Server (Express/tRPC)                        │
├─────────────────────────────────────────────────────────────────┤
│  Real Entrypoint: server/_core/index.ts                         │
│  ├── Express app setup                                          │
│  ├── tRPC middleware                                            │
│  └── ❌ Price alerts cron (NOT initialized)                     │
│                                                                  │
│  Legacy Entrypoint: server/index.ts                             │
│  ├── ✅ Price alerts cron (initialized here)                    │
│  └── ⚠️ NOT used by pnpm dev or production                      │
│                                                                  │
│  Search Router: server/routers/search.ts                        │
│  └── Returns /orders/${id} for quotes (broken link)             │
└─────────────────────────────────────────────────────────────────┘
```

### Target State

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client (React/Vite)                       │
├─────────────────────────────────────────────────────────────────┤
│  App.tsx Routes:                                                 │
│  ├── /orders (Orders.tsx)                                       │
│  ├── /orders-debug (OrdersDebug.tsx)                            │
│  ├── /orders/create (OrderCreatorPage.tsx)                      │
│  ├── ✅ /quotes (Quotes.tsx) - NEW                              │
│  └── ✅ /dev/showcase (ComponentShowcase.tsx) - DEV ONLY        │
│                                                                  │
│  Removed:                                                        │
│  └── DebugOrders.tsx (OrdersDebug.tsx is more complete)         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Server (Express/tRPC)                        │
├─────────────────────────────────────────────────────────────────┤
│  Real Entrypoint: server/_core/index.ts                         │
│  ├── Express app setup                                          │
│  ├── tRPC middleware                                            │
│  └── ✅ Price alerts cron (migrated here)                       │
│                                                                  │
│  Legacy Entrypoint: server/index.ts                             │
│  └── ✅ DEPRECATED with clear comments                          │
│                                                                  │
│  Search Router: server/routers/search.ts                        │
│  └── ✅ Returns /quotes?id=${id} for quotes (valid link)        │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Search Router URL Fix

**File**: `server/routers/search.ts`

**Change**: Update quote search results to return valid URLs

```typescript
// Before
url: `/orders/${q.id}`,

// After - Option A: Point to quotes page with selection
url: `/quotes?selected=${q.id}`,

// After - Option B: Point to quotes page (simpler)
url: `/quotes`,
```

### 2. Quotes Page Route Addition

**File**: `client/src/App.tsx`

**Change**: Add route for Quotes page

```typescript
import Quotes from "@/pages/Quotes";

// In Router component
<Route path="/quotes" component={Quotes} />
```

### 3. Navigation Entry for Quotes

**File**: `client/src/components/layout/AppSidebar.tsx`

**Change**: Add navigation entry near Orders in the `navigation` array

```typescript
// Add FileText to imports from lucide-react
import { ..., FileText, ... } from "lucide-react";

// Add to navigation array after Orders entry
{ name: "Quotes", href: "/quotes", icon: FileText },
```

### 4. Price Alerts Cron Migration

**File**: `server/_core/index.ts`

**Change**: Import and start price alerts cron

```typescript
import { startPriceAlertsCron } from "../cron/priceAlertsCron.js";

// In startServer(), after server.listen()
startPriceAlertsCron();
logger.info("✅ Price alerts cron job started");
```

### 5. Legacy Entrypoint Deprecation

**File**: `server/index.ts`

**Change**: Add deprecation notice at top of file

```typescript
/**
 * @deprecated This file is no longer used as the server entrypoint.
 * The production entrypoint is server/_core/index.ts
 * 
 * This file is retained for reference only. All functionality has been
 * migrated to the real entrypoint.
 * 
 * DO NOT USE THIS FILE FOR:
 * - Development (use pnpm dev)
 * - Production (uses server/_core/index.ts)
 * - Testing (uses server/_core/index.ts)
 * 
 * @see server/_core/index.ts for the active entrypoint
 */
```

### 6. Orphan Page Handling

**ComponentShowcase.tsx**: Route for development only
```typescript
// Only in development
{process.env.NODE_ENV === 'development' && (
  <Route path="/dev/showcase" component={ComponentShowcase} />
)}
```

**DebugOrders.tsx**: Remove (OrdersDebug.tsx is the more complete version)
- OrdersDebug.tsx has MORE features: database connection info, isDraftType checks, diagnosis section
- DebugOrders.tsx is a simpler/older version with fewer features
- Delete DebugOrders.tsx (the less complete version)
- OrdersDebug.tsx is already routed at `/orders-debug`

## Data Models

No new data models required. This cleanup uses existing models:

- `orders` table (for quotes with `orderType = 'QUOTE'`)
- Existing search result interfaces

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Search Result URLs Match Declared Routes

*For any* search query that returns results, all URLs in the response should match a route declared in the client router configuration.

**Validates: Requirements 1.1, 1.2, 1.3**

### Property 2: Quote Details Contain Required Fields

*For any* quote displayed in the Quotes page, the rendered output should contain: order number, total amount, client information, and status.

**Validates: Requirements 1.4**

### Property 3: Cron Schedule Consistency (Unit Test)

*Note: This is implemented as a unit test rather than property test due to the time-based nature of cron jobs.*

The cron job in the production entrypoint should use the exact same schedule expression (`'0 * * * *'`) as the original implementation.

**Validates: Requirements 3.4**

### Property 4: No Dangling Imports After Cleanup

*For any* file removed during cleanup, there should be zero import statements referencing that file in the remaining codebase.

**Validates: Requirements 5.3**

### Property 5: Documentation Route References Are Valid

*For any* route reference in documentation files (e.g., `/orders/:id`, `/quotes`), the referenced route should exist in the client router configuration.

**Validates: Requirements 7.1, 7.2, 7.3, 7.4**

## Error Handling

### Search Router

- If quote data is malformed, return empty quotes array (don't crash search)
- Log warning for malformed quote data

### Cron Job Initialization

- Wrap cron startup in try-catch
- Log error with full diagnostic info if cron fails to start
- Server should continue running even if cron fails

```typescript
try {
  startPriceAlertsCron();
  logger.info("✅ Price alerts cron job started");
} catch (error) {
  logger.error({ 
    msg: "Failed to start price alerts cron", 
    error,
    stack: error instanceof Error ? error.stack : undefined 
  });
  // Server continues - cron is non-critical
}
```

### Route Not Found

- Existing NotFound component handles missing routes
- No changes needed

## Risk Assessment

### High Risk Items

1. **Quotes Feature Enablement**
   - Risk: Quotes page may have bugs or incomplete functionality
   - Mitigation: Verify tRPC endpoints work before routing; test manually after deployment
   - Rollback: Remove route from App.tsx and nav entry from AppSidebar.tsx

2. **Price Alerts Cron Migration**
   - Risk: Cron may fail silently or cause server startup issues
   - Mitigation: Wrap in try-catch; log errors; server continues even if cron fails
   - Rollback: Remove cron import and call from `server/_core/index.ts`

### Medium Risk Items

1. **Search URL Change**
   - Risk: Existing bookmarks/links to `/orders/:id` will break
   - Mitigation: These links already 404, so no regression
   - Note: Consider adding redirect from `/orders/:id` to `/quotes?selected=:id` in future

2. **DebugOrders.tsx Removal**
   - Risk: Someone may be using this page
   - Mitigation: OrdersDebug.tsx at `/orders-debug` has MORE features; no functionality lost
   - Rollback: Restore file from git history

### Low Risk Items

1. **ComponentShowcase Dev Route**
   - Risk: None - only visible in development mode
   - Mitigation: Uses `import.meta.env.DEV` check

2. **Documentation Updates**
   - Risk: None - documentation only
   - Mitigation: Validation script catches future drift

## Testing Strategy

### Dual Testing Approach

This feature uses both unit tests and property-based tests:

- **Unit tests**: Verify specific examples and edge cases
- **Property-based tests**: Verify universal properties across all inputs

### Property-Based Testing Library

**Library**: `fast-check` (already available in the project)

**Configuration**: Minimum 100 iterations per property test

### Unit Tests

1. **Search Router Tests** (`server/routers/search.test.ts`)
   - Test quote search returns valid URLs
   - Test empty search returns empty results
   - Test search with special characters

2. **Route Configuration Tests** (`client/src/App.test.tsx`)
   - Test /quotes route renders Quotes component
   - Test /dev/showcase only renders in development

3. **Cron Migration Tests** (`server/_core/index.test.ts`)
   - Test cron job is started on server startup
   - Test cron failure doesn't crash server

### Property-Based Tests

1. **Search URL Validity Property** (`server/routers/search.property.test.ts`)
   ```typescript
   // **Feature: orphan-feature-linkage-cleanup, Property 1: Search Result URLs Match Declared Routes**
   test.prop([fc.string()])('all search URLs match declared routes', (query) => {
     const results = searchRouter.global({ query, limit: 10 });
     const declaredRoutes = getDeclaredRoutes();
     
     for (const quote of results.quotes) {
       expect(matchesAnyRoute(quote.url, declaredRoutes)).toBe(true);
     }
   });
   ```

2. **Documentation Route Validity Property** (`scripts/validate-doc-routes.property.test.ts`)
   ```typescript
   // **Feature: orphan-feature-linkage-cleanup, Property 5: Documentation Route References Are Valid**
   test.prop([fc.constantFrom(...docFiles)])('doc routes are valid', (docFile) => {
     const routes = extractRoutesFromDoc(docFile);
     const declaredRoutes = getDeclaredRoutes();
     
     for (const route of routes) {
       expect(matchesAnyRoute(route, declaredRoutes)).toBe(true);
     }
   });
   ```

3. **No Dangling Imports Property** (`scripts/validate-imports.property.test.ts`)
   ```typescript
   // **Feature: orphan-feature-linkage-cleanup, Property 4: No Dangling Imports After Cleanup**
   test.prop([fc.constantFrom(...removedFiles)])('no dangling imports', (removedFile) => {
     const importers = findImporters(removedFile);
     expect(importers).toHaveLength(0);
   });
   ```

### Integration Tests

1. **E2E Search Navigation Test**
   - Search for a quote
   - Click result
   - Verify navigation to valid page

2. **Cron Job Execution Test**
   - Start server
   - Verify cron job is scheduled
   - Fast-forward time and verify execution

### Validation Scripts

Create validation scripts for CI/CD:

```bash
# Validate all search URLs match routes
pnpm validate:search-urls

# Validate no dangling imports
pnpm validate:imports

# Validate documentation routes
pnpm validate:doc-routes
```
