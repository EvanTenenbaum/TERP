# Implementation Plan

## Phase 1: Stabilization (High Priority - User-Facing Fixes)

- [x] 1. Fix broken quote search linkage
  - [x] 1.1 Verify orders router supports QUOTE orderType filtering
    - Check `server/routers/orders.ts` getAll endpoint supports `orderType: 'QUOTE'`
    - Verify existing Quotes.tsx tRPC calls will work
    - _Requirements: 1.4_
  - [x] 1.2 Update search router to return valid quote URLs
    - Modify `server/routers/search.ts` to return `/quotes?selected=${q.id}` instead of `/orders/${q.id}`
    - Ensure URL format is consistent with client routing
    - _Requirements: 1.1, 1.2, 1.3_
  - [ ]* 1.3 Write property test for search URL validity
    - **Property 1: Search Result URLs Match Declared Routes**
    - **Validates: Requirements 1.1, 1.2, 1.3**
    - Create `server/routers/search.property.test.ts`
    - Use fast-check to verify all returned URLs match declared routes
  - [x] 1.4 Add `/quotes` route to client router
    - Import Quotes component in `client/src/App.tsx`
    - Add `<Route path="/quotes" component={Quotes} />` after Orders route
    - _Requirements: 2.1_
  - [x] 1.5 Update Quotes page to handle URL selection parameter
    - Read `selected` query param from URL in `client/src/pages/Quotes.tsx`
    - Auto-open quote detail sheet when `selected` param is present
    - Use `useEffect` to fetch and select quote by ID from URL param
    - _Requirements: 1.4_
  - [ ]* 1.6 Write unit tests for Quotes route and selection
    - Test route renders Quotes component
    - Test URL param triggers quote selection
    - _Requirements: 1.4, 2.1_

- [x] 2. Add navigation entry for Quotes
  - [x] 2.1 Add Quotes navigation entry to AppSidebar
    - Edit `client/src/components/layout/AppSidebar.tsx`
    - Add `FileText` to lucide-react imports
    - Add `{ name: "Quotes", href: "/quotes", icon: FileText }` after Orders entry in navigation array
    - _Requirements: 2.2_
  - [ ]* 2.2 Write unit test for navigation entry
    - Verify Quotes appears in navigation
    - _Requirements: 2.2_

- [x] 3. Checkpoint - Verify quote search and navigation work
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Migrate price alerts cron to production entrypoint
  - [x] 4.1 Add cron import and initialization to real entrypoint
    - Import `startPriceAlertsCron` from `../cron/priceAlertsCron.js` in `server/_core/index.ts`
    - Call `startPriceAlertsCron()` inside `server.listen()` callback after server starts
    - Wrap in try-catch with proper error logging using `logger.error()`
    - _Requirements: 3.1, 3.2, 3.3_
  - [ ]* 4.2 Write unit test for cron initialization
    - Test cron is started on server startup (mock node-cron)
    - Test cron failure doesn't crash server (verify try-catch works)
    - Verify cron schedule string is `'0 * * * *'` (hourly at minute 0)
    - _Requirements: 3.1, 3.3, 3.4_

- [x] 5. Checkpoint - Verify cron job runs in production entrypoint
  - Ensure all tests pass, ask the user if questions arise.

## Phase 2: Cleanup (Technical Debt)

- [x] 6. Deprecate legacy server entrypoint
  - [x] 6.1 Add deprecation notice to server/index.ts
    - Add JSDoc deprecation comment at top of file
    - Document that server/_core/index.ts is the real entrypoint
    - List what NOT to use this file for
    - _Requirements: 4.1_
  - [x] 6.2 Verify no deployment scripts reference legacy entrypoint
    - Search package.json scripts for server/index.ts references
    - Search .do/ deployment configs for references
    - Search any shell scripts for references
    - _Requirements: 4.2_
  - [x] 6.3 Document decision to retain legacy entrypoint
    - Add note explaining why file is kept (historical reference)
    - _Requirements: 4.4_

- [x] 7. Handle orphan pages
  - [x] 7.1 Route ComponentShowcase for development use
    - Import ComponentShowcase in `client/src/App.tsx`
    - Add conditional route: `{import.meta.env.DEV && <Route path="/dev/showcase" component={ComponentShowcase} />}`
    - Only renders in development mode (Vite's import.meta.env.DEV)
    - _Requirements: 5.1_
  - [x] 7.2 Remove DebugOrders.tsx (OrdersDebug.tsx is more complete)
    - OrdersDebug.tsx already routed at `/orders-debug` with MORE features (db info, diagnosis)
    - DebugOrders.tsx is simpler/older version - safe to delete
    - Delete `client/src/pages/DebugOrders.tsx`
    - Verify no imports reference it (grep for 'DebugOrders')
    - _Requirements: 5.2, 5.3_
  - [ ]* 7.3 Create validation script for dangling imports
    - Create `scripts/validate-no-dangling-imports.ts`
    - Script searches for imports of deleted files
    - Add to package.json scripts as `validate:imports`
    - **Validates: Requirements 5.3**
  - [x] 7.4 Document orphan page decisions
    - Add JSDoc comment to ComponentShowcase.tsx explaining it's a dev utility
    - Add comment in App.tsx explaining dev-only route
    - _Requirements: 5.4_

- [x] 8. Checkpoint - Verify orphan page cleanup
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Audit and categorize server router namespaces
  - [x] 9.1 Create namespace audit report
    - List all server namespaces not referenced by client
    - Categorize each as: admin-only, ops-only, background job, or dead code
    - _Requirements: 6.1_
  - [x] 9.2 Document admin/ops namespaces
    - For each admin/ops namespace, document purpose and access method
    - _Requirements: 6.3_
  - [x] 9.3 Mark dead code namespaces for future removal
    - Create list of confirmed dead code namespaces
    - Add TODO comments in routers.ts for future cleanup
    - _Requirements: 6.2_
  - [x] 9.4 Generate final namespace audit report
    - Create `docs/audits/SERVER_NAMESPACE_AUDIT.md`
    - Include all categorizations and recommendations
    - _Requirements: 6.4_

- [x] 10. Fix documentation route references
  - [x] 10.1 Search for invalid route references in docs
    - Search for `/orders/:id` references in docs/
    - Search for `/orders/123/edit` references
    - Search for `/orders/123` references
    - Known files: `docs/testing/ai-agents-guide.md`, `docs/prompts/AUDIT-001-feature-completeness.md`, `docs/protocols/ACCESSIBILITY_STANDARDS.md`
    - _Requirements: 7.1, 7.2_
  - [x] 10.2 Update or remove invalid references
    - Update `/orders/:id` to `/orders` (list view) or `/quotes?selected=:id` (for quotes)
    - Update `/orders/123/edit` to `/orders/create` (order creation)
    - Remove references that are no longer applicable
    - _Requirements: 7.1, 7.2, 7.3_
  - [ ]* 10.3 Create validation script for documentation routes
    - Create `scripts/validate-doc-routes.ts`
    - Script extracts route references from markdown files
    - Validates against declared routes in App.tsx
    - Add to package.json scripts as `validate:doc-routes`
    - **Property 5: Documentation Route References Are Valid**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4**

- [x] 11. Final Checkpoint - Verify all cleanup complete
  - Ensure all tests pass, ask the user if questions arise.
