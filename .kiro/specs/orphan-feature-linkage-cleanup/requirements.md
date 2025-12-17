# Requirements Document

## Introduction

This specification addresses orphan features (built but unreachable/unreferenced code) and broken linkages (modules pointing to non-existent routes or improperly wired functionality) discovered during a comprehensive audit of the TERP codebase at commit `b40be175090a57821b01857d4e8387f7e63d32bf`.

The audit identified four high-priority issues:
1. **Broken linkage**: Search results for quotes point to `/orders/:id` which doesn't exist as a route
2. **Orphan feature**: Quotes page exists but is unreachable (no route, no navigation)
3. **Legacy entrypoint**: `server/index.ts` is not used by production but contains cron job initialization
4. **Cron linkage gap**: Price alerts cron doesn't run under the real entrypoint (`server/_core/index.ts`)

## Glossary

- **Orphan Feature**: A fully or partially implemented feature that is unreachable through normal application navigation or API calls
- **Broken Linkage**: A reference from one module to another that resolves to a non-existent route, file, or endpoint
- **Client Router**: The wouter-based routing system in `client/src/App.tsx` that maps URL paths to React page components
- **tRPC Namespace**: A server-side router namespace exposed via the `appRouter` in `server/routers.ts`
- **Price Alerts Cron**: A scheduled job that checks for price alert conditions hourly
- **Real Entrypoint**: The production server entrypoint at `server/_core/index.ts` used by `pnpm dev` and production builds
- **Legacy Entrypoint**: The deprecated server entrypoint at `server/index.ts` that is no longer used

## Requirements

### Requirement 1

**User Story:** As a user searching for quotes, I want search results to navigate to a valid page, so that I can view quote details without encountering a 404 error.

#### Acceptance Criteria

1. WHEN a user clicks a quote search result THEN the System SHALL navigate to a valid route that displays the quote details
2. WHEN the search router returns quote results THEN the System SHALL provide URLs that match declared client routes
3. IF a quote URL is generated THEN the System SHALL ensure the target route exists and renders appropriate content
4. WHEN displaying quote details THEN the System SHALL show order number, total, client information, and status

### Requirement 2

**User Story:** As a product owner, I want to decide the fate of the Quotes feature, so that the codebase doesn't contain unreachable functionality.

#### Acceptance Criteria

1. WHEN the Quotes feature is enabled THEN the System SHALL provide a route at `/quotes` that renders the Quotes page component
2. WHEN the Quotes feature is enabled THEN the System SHALL include a navigation entry in the appropriate menu section
3. WHEN the Quotes feature is disabled THEN the System SHALL remove or quarantine the `Quotes.tsx` page component
4. WHEN the Quotes feature is disabled THEN the System SHALL remove quote-related search results from the search router
5. WHERE the Quotes feature decision is made THEN the System SHALL document the decision in the codebase

### Requirement 3

**User Story:** As a system administrator, I want price alert cron jobs to run in production, so that users receive timely notifications about price changes.

#### Acceptance Criteria

1. WHEN the production server starts THEN the System SHALL initialize the price alerts cron job
2. WHEN the price alerts cron runs THEN the System SHALL execute on the configured schedule (hourly at minute 0)
3. IF the cron job fails to start THEN the System SHALL log an error with diagnostic information
4. WHEN migrating cron initialization THEN the System SHALL preserve the existing cron schedule and behavior

### Requirement 4

**User Story:** As a developer, I want the legacy server entrypoint removed or clearly marked as deprecated, so that there is no confusion about which entrypoint to use.

#### Acceptance Criteria

1. WHEN the legacy entrypoint is deprecated THEN the System SHALL add clear deprecation comments at the top of `server/index.ts`
2. WHEN the legacy entrypoint is removed THEN the System SHALL verify no deployment scripts reference it
3. WHEN the legacy entrypoint is removed THEN the System SHALL migrate any unique functionality to the real entrypoint
4. IF the legacy entrypoint must be retained THEN the System SHALL document the reason and usage scenario

### Requirement 5

**User Story:** As a developer, I want orphan pages identified and handled appropriately, so that the codebase remains maintainable.

#### Acceptance Criteria

1. WHEN `ComponentShowcase.tsx` is evaluated THEN the System SHALL either route it for development use or remove it
2. WHEN `DebugOrders.tsx` is evaluated THEN the System SHALL either route it for debugging use or consolidate with `OrdersDebug.tsx`
3. WHEN orphan pages are removed THEN the System SHALL verify no imports reference them
4. WHEN orphan pages are retained THEN the System SHALL add routes and document their purpose

### Requirement 6

**User Story:** As a developer, I want server router namespaces audited, so that unused code can be identified and potentially removed.

#### Acceptance Criteria

1. WHEN auditing server namespaces THEN the System SHALL categorize each unused namespace as: admin-only, ops-only, background job, or dead code
2. WHEN a namespace is confirmed dead code THEN the System SHALL mark it for removal in a future cleanup
3. WHEN a namespace is admin/ops-only THEN the System SHALL document its purpose and access method
4. WHEN auditing is complete THEN the System SHALL produce a report of namespace categorizations

### Requirement 7

**User Story:** As a developer, I want documentation references to non-existent routes fixed, so that documentation remains accurate.

#### Acceptance Criteria

1. WHEN documentation references `/orders/:id` THEN the System SHALL update to reference the correct route or remove the reference
2. WHEN documentation references `/orders/123/edit` THEN the System SHALL update to reference the correct route or remove the reference
3. WHEN fixing documentation THEN the System SHALL verify the new references are valid
4. WHEN documentation is updated THEN the System SHALL maintain consistency across all affected files
