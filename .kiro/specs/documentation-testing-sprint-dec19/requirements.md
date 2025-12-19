# Requirements Document

## Introduction

This document defines requirements for a **Documentation & Testing Sprint** that can be executed safely alongside:
- The Parallel Sprint Dec 19 (2 agents on UX/Code Quality)
- Active data flow debugging work

The sprint focuses on **documentation consolidation**, **test coverage expansion**, and **infrastructure improvements** in modules that have NO overlap with active work.

**Sprint Theme:** Documentation, Testing & Infrastructure Hardening
**Duration:** 1-2 days
**Parallelization:** 3 agents can work simultaneously

## Glossary

- **TERP**: The ERP system for cannabis businesses
- **Documentation Sprint**: Tasks focused on docs, tests, and infrastructure
- **Module Isolation**: Ensuring tasks don't modify files being edited by other agents
- **Property-Based Testing**: Testing with randomly generated inputs using fast-check

## Requirements

### Requirement 1: Consolidate and Clean Up Root Documentation

**User Story:** As a developer, I want the root directory cleaned of excessive markdown files, so that I can find relevant documentation quickly.

#### Acceptance Criteria

1. WHEN a developer views the root directory THEN the system SHALL have fewer than 20 markdown files
2. WHEN documentation is archived THEN the system SHALL preserve all content in `docs/archive/`
3. WHEN documentation is consolidated THEN the system SHALL update any internal links
4. WHEN the cleanup is complete THEN the system SHALL have a clear README pointing to key docs

**Module:** Root `*.md` files, `docs/archive/`
**Estimate:** 2h
**No Conflict:** Documentation files are not being edited by any active agent

---

### Requirement 2: Add Property Tests to Calendar Router

**User Story:** As a developer, I want property-based tests for the calendar module, so that edge cases are automatically discovered.

#### Acceptance Criteria

1. WHEN calendar events are created THEN the system SHALL validate date ranges are valid
2. WHEN recurring events are generated THEN the system SHALL produce correct occurrence counts
3. WHEN events overlap THEN the system SHALL detect conflicts correctly
4. WHEN timezone conversions occur THEN the system SHALL preserve event times accurately

**Module:** `server/routers/calendar.ts`, `server/routers/calendar.property.test.ts` (new)
**Estimate:** 3h
**No Conflict:** Calendar module is not part of any active sprint

---

### Requirement 3: Add Property Tests to Pricing Router

**User Story:** As a developer, I want property-based tests for pricing calculations, so that financial accuracy is guaranteed.

#### Acceptance Criteria

1. WHEN margins are calculated THEN the system SHALL produce non-negative results for valid inputs
2. WHEN discounts are applied THEN the system SHALL never exceed the original price
3. WHEN COGS adjustments are made THEN the system SHALL maintain calculation consistency
4. WHEN price tiers are evaluated THEN the system SHALL select the correct tier for any quantity

**Module:** `server/routers/pricing.ts`, `server/routers/pricing.property.test.ts` (new)
**Estimate:** 2h
**No Conflict:** Pricing module is not part of any active sprint

---

### Requirement 4: Add Property Tests to Inventory Router

**User Story:** As a developer, I want property-based tests for inventory calculations, so that stock levels are always accurate.

#### Acceptance Criteria

1. WHEN quantities are allocated THEN the system SHALL never exceed available stock
2. WHEN batch statuses change THEN the system SHALL maintain valid state transitions
3. WHEN reserved quantities are updated THEN the system SHALL preserve total quantity invariants
4. WHEN inventory is transferred THEN the system SHALL maintain zero-sum across locations

**Module:** `server/routers/inventory.ts`, `server/routers/inventory.property.test.ts` (new)
**Estimate:** 3h
**No Conflict:** Inventory module is not part of any active sprint

---

### Requirement 5: Remove Debug Router from Production

**User Story:** As a security engineer, I want the debug router removed from production, so that internal data is not exposed.

#### Acceptance Criteria

1. WHEN the application runs in production THEN the system SHALL NOT expose the debug router
2. WHEN the debug router is accessed in production THEN the system SHALL return 404
3. WHEN the application runs in development THEN the system SHALL allow debug router access

**Module:** `server/routers/debug.ts`, `server/routers.ts`
**Estimate:** 30min
**No Conflict:** Debug router is not part of any active sprint

---

### Requirement 6: Add TypeScript Types to Analytics Router

**User Story:** As a developer, I want proper TypeScript types in the analytics router, so that I can catch type errors at compile time.

#### Acceptance Criteria

1. WHEN the analytics router is compiled THEN the system SHALL have zero TypeScript errors
2. WHEN functions return data THEN the system SHALL have explicit return type annotations
3. WHEN parameters are received THEN the system SHALL have proper Zod schema validation
4. WHEN database queries return results THEN the system SHALL properly type the results

**Module:** `server/routers/analytics.ts`
**Estimate:** 1h
**No Conflict:** Analytics module is not part of any active sprint

---

### Requirement 7: Add TypeScript Types to Dashboard Router

**User Story:** As a developer, I want proper TypeScript types in the dashboard router, so that I can catch type errors at compile time.

#### Acceptance Criteria

1. WHEN the dashboard router is compiled THEN the system SHALL have zero TypeScript errors
2. WHEN functions return data THEN the system SHALL have explicit return type annotations
3. WHEN parameters are received THEN the system SHALL have proper Zod schema validation
4. WHEN database queries return results THEN the system SHALL properly type the results

**Module:** `server/routers/dashboard.ts`, `server/routers/dashboardEnhanced.ts`
**Estimate:** 1.5h
**No Conflict:** Dashboard module is not part of any active sprint

---

### Requirement 8: Create API Documentation Generator

**User Story:** As a developer, I want auto-generated API documentation, so that I can understand available endpoints without reading code.

#### Acceptance Criteria

1. WHEN the generator runs THEN the system SHALL produce markdown documentation for all routers
2. WHEN a router has Zod schemas THEN the system SHALL document input/output types
3. WHEN procedures have JSDoc comments THEN the system SHALL include them in documentation
4. WHEN the documentation is generated THEN the system SHALL output to `docs/api/`

**Module:** `scripts/generate-api-docs.ts` (new), `docs/api/` (new)
**Estimate:** 2h
**No Conflict:** New files, no overlap with active work

---

### Requirement 9: Add Health Check Endpoint Tests

**User Story:** As a DevOps engineer, I want comprehensive health check tests, so that deployment monitoring is reliable.

#### Acceptance Criteria

1. WHEN the health endpoint is called THEN the system SHALL return database connectivity status
2. WHEN the health endpoint is called THEN the system SHALL return response time metrics
3. WHEN a dependency is down THEN the system SHALL report degraded status
4. WHEN all systems are healthy THEN the system SHALL return 200 OK

**Module:** `server/routers/monitoring.ts`, `server/routers/monitoring.test.ts` (new)
**Estimate:** 1h
**No Conflict:** Monitoring module is not part of any active sprint

---

### Requirement 10: Standardize Error Logging in Calendar Module

**User Story:** As a developer, I want consistent error logging in the calendar module, so that I can debug issues efficiently.

#### Acceptance Criteria

1. WHEN an error occurs in calendar routers THEN the system SHALL log with structured context
2. WHEN logging errors THEN the system SHALL include user ID, session ID, and operation name
3. WHEN errors are logged THEN the system SHALL use the Pino logger instead of console.error
4. WHEN sensitive data is involved THEN the system SHALL mask PII in log messages

**Module:** `server/routers/calendar*.ts` (6 files)
**Estimate:** 1.5h
**No Conflict:** Calendar module is not part of any active sprint
