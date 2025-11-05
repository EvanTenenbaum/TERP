# TERP Changelog

All notable changes to the TERP project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed - UI Broken Elements (2025-11-05)

- **Fixed 3 broken toggle switches** in COGS Global Settings that prevented users from configuring COGS behavior
- **Added edit dialog and handlers** in COGS Client Settings for managing client-specific COGS adjustments
- **Fixed delete subcategory button** in Settings page that was non-functional
- **Added edit and find matching clients handlers** in Vendor Supply page
- **Improved accessibility** with proper aria-labels and htmlFor attributes on all fixed elements
- **Added comprehensive error handling** with user-friendly toast notifications for all actions
- **Fixed TypeScript types** to eliminate any types and improve type safety
- **Resolved ESLint warnings** in all modified files

### Added - Client Module Workflow Improvements (2025-11-04)

- **Enhanced Search**: Multi-field fuzzy search across TERI code, name, email, phone, and address.
- **Keyboard Shortcuts**: `⌘/Ctrl+K` for search, `⌘/Ctrl+N` for new client, `↑/↓` for table navigation, and `Enter` to open profile.
- **Smart Column Sorting**: All numeric columns in the client table are now sortable with visual indicators.
- **Quick Actions Menu**: Context menu with 6 actions (View, Edit, Add Transaction, Record Payment, Add Note, Archive).
- **Advanced Filtering & Saved Views**: Default and custom filter views with `localStorage` persistence.
- **Inline Quick Edit**: Inline editing for a client's name, email, and phone directly in the table.
- **Payment Recording Enhancement**: Visual alert icon (⚠️) and one-click payment recording for clients with debt.

### Changed

- Replaced the `View` button in the client table with the new Quick Actions Menu.
- The `Amount Owed` column now provides a one-click path to record payments.

### Fixed

- Resolved multiple ESLint errors and warnings in `ClientsListPage.tsx` and `clientsDb.ts`.

### Added - P2 Performance & Operational Excellence (2025-10-27)

#### Connection Pooling
- Created `server/_core/connectionPool.ts` for MySQL connection pooling
- Configured pool with 10 connections, unlimited queue, keep-alive enabled
- Automatic pool statistics logging every 5 minutes
- Integrated into `server/db.ts` for all database operations

#### Health Check Endpoints
- Created `server/_core/healthCheck.ts` with comprehensive health monitoring
- `/health` - Full health check (database, memory, connection pool)
- `/health/live` - Liveness probe (always returns OK if server is running)
- `/health/ready` - Readiness probe (returns OK if server can handle requests)
- Health status: healthy, degraded, or unhealthy based on checks

#### Graceful Shutdown
- Created `server/_core/gracefulShutdown.ts` for zero-downtime deploys
- Handles SIGTERM, SIGINT signals gracefully
- Handles uncaughtException and unhandledRejection
- Closes database connection pool before exit
- Extensible shutdown handler registration system

### Changed
- Database connections now use connection pooling instead of single connection
- Server startup now includes graceful shutdown handlers
- Health check endpoints available on server startup

### Performance
- **Connection Pooling**: Reuses database connections for better performance
- **Scalability**: Supports up to 10 concurrent database connections
- **Zero-Downtime**: Graceful shutdown enables rolling deployments

### Added - P1 Pragmatic Improvements (2025-10-27)

#### Input Sanitization Middleware
- Created `server/_core/sanitizationMiddleware.ts` for automatic XSS prevention
- Applied to all `protectedProcedure` and `adminProcedure` (379 endpoints)
- Recursive sanitization of all string inputs using DOMPurify
- Logging when sanitization occurs for security monitoring
- Zero code changes required in individual routers

#### Critical Transaction Fixes
- **CRITICAL FIX**: Wrapped `postJournalEntry()` in transaction (prevents unbalanced books)
- **CRITICAL FIX**: Wrapped `recordPayment()` in transaction (prevents inconsistent payment data)
- Both operations now atomic with automatic rollback on errors

### Changed
- Enhanced tRPC middleware chain with sanitization before authentication
- `protectedProcedure` now includes `.use(sanitizationMiddleware)`
- `adminProcedure` now includes `.use(sanitizationMiddleware)`

### Security
- **XSS Prevention**: 100% coverage across all protected and admin endpoints
- **Attack Surface Reduction**: 379 endpoints now automatically sanitize inputs
- **Security Monitoring**: Logs all sanitization events for audit trail

### Added - P0 Critical Fixes (2025-10-27)

#### P0.1: Error Handling Infrastructure
- Created `AppError` class for structured application errors
- Implemented `handleError` utility for centralized error processing
- Added error handling imports to all 31 routers
- Created basic logger infrastructure (upgraded in P0.4)
- All errors now logged with context and converted to user-friendly messages

#### P0.2: Database Transactions
- Implemented `withTransaction` utility for atomic database operations
- Created `withRetryableTransaction` with exponential backoff for deadlock handling
- Added row-level locking utilities (`forUpdate`, `forUpdateSkipLocked`, `forUpdateNoWait`)
- Transaction infrastructure ready for critical operations (orders, payments, accounting)

#### P0.3: Security Hardening
- Implemented input sanitization with DOMPurify (`sanitizeHtml`, `sanitizeText`, `sanitizeUserInput`)
- Added rate limiting with express-rate-limit:
  - General API: 100 requests per 15 minutes
  - Auth endpoints: 5 requests per 15 minutes
  - Strict limiter: 10 requests per minute (available for sensitive operations)
- Integrated rate limiters into all API routes
- SQL injection prevention infrastructure in place

#### P0.4: Monitoring & Logging
- Upgraded logger to Pino with structured logging
- Integrated Sentry for error tracking and monitoring
- Added request logging middleware with timing information
- Replaced all console.log with structured logger
- Monitoring automatically initialized on server startup
- Production-ready observability infrastructure

#### P0.5: Backup & Recovery
- Created automated database backup script (`scripts/backup-database.sh`):
  - Compressed backups with gzip
  - 30-day retention policy
  - Optional S3 upload support
  - Integrity verification
- Created database restore script (`scripts/restore-database.sh`):
  - Backup file integrity checking
  - Confirmation prompt before restoration
  - Detailed progress reporting
- Comprehensive backup documentation in `docs/BACKUP_SETUP.md`
- Ready for cron job automation

### Changed
- Server startup now initializes monitoring and structured logging
- All API routes protected with rate limiting
- Error handling patterns standardized across all routers

### Technical Details
- All changes TypeScript-validated (zero compilation errors)
- Bible-compliant implementation (Impact Analysis, Integration Verification, System-Wide Validation)
- Production-ready code with no placeholders or stubs

## [1.0.0] - 2025-10-27

### Added
- Initial TERP ERP system
- Version display in header (desktop and mobile)
- Version Management Protocol in DEVELOPMENT_PROTOCOLS.md
- Quality Remediation Roadmap in `docs/QUALITY_REMEDIATION_ROADMAP.md`
- CTO Audit Report identifying software quality gaps

### Documentation
- DEVELOPMENT_PROTOCOLS.md (The Bible) - v2.1
- PROJECT_CONTEXT.md - Project background and handoff context
- QUALITY_REMEDIATION_ROADMAP.md - Comprehensive improvement plan
- BACKUP_SETUP.md - Backup and recovery procedures

---

## Version History

- **1.0.0** (2025-10-27): Initial release with P0 critical fixes
- **Unreleased**: Ongoing development

## Notes

- Version numbers follow Semantic Versioning (MAJOR.MINOR.PATCH)
- All changes must be documented in this file
- Breaking changes must be clearly marked
- Each entry should reference relevant issue/PR numbers when available

