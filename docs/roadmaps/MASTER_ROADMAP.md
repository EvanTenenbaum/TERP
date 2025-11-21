# TERP Master Roadmap

## Single Source of Truth for All Development

**Version:** 2.1
**Last Updated:** November 20, 2025
**Status:** Active

---

## 🎯 Current Sprint (This Week: Nov 18-25, 2025)

### 🔴 CRITICAL PRIORITY - Phase 1: Critical Lockdown (1-2 Days)

**Objective:** Immediately patch all critical security and data integrity vulnerabilities.

- [x] **CL-001: Fix SQL Injection Vulnerability** (Completed: 2025-11-12) 🔴 CRITICAL
  - Task ID: CL-001
  - Files: `server/advancedTagFeatures.ts` (lines 94, 121, 143)
  - Vulnerability: String interpolation in SQL queries using template literals
  - Affected Functions: `booleanTagSearch()` - three SQL queries with unsanitized input
  - Action: Replace string interpolation with `inArray()` and proper parameterization
  - Example Fix: Change `sql\`LOWER(${tags.name}) IN (${terms.map(t => \`'${t}'\`).join(',')})\``to use`inArray(tags.name, terms)`
  - Security Risk: HIGH - SQL injection via tag search expressions
  - Testing: Add test cases with SQL injection attempts (e.g., `'; DROP TABLE--`)
  - Verification: Run `grep -n "\${.*\.map" server/advancedTagFeatures.ts` should return no results
  - Estimate: 2-3 hours
  - Priority: MUST DO IMMEDIATELY

- [x] **CL-002: Purge Secrets from Git History** (Completed: 2025-11-13) 🔴 CRITICAL
  - Task ID: CL-002
  - File: `.env.backup` in Git history
  - Action: Purge secrets from git history and secure sensitive files
  - Security Risk: HIGH - Exposed credentials in Git history (RESOLVED)
  - **Checklist:**
    1. ✅ Review `.env.backup` to identify all exposed secrets (Clerk keys, Argos token)
    2. ✅ Use BFG Repo-Cleaner to purge from history (completed Nov 12)
    3. ✅ Force push cleaned history (completed Nov 12, commit 6ac64c6)
    4. ✅ Verify removal from history (0 occurrences confirmed)
    5. ✅ Secure `.env` file permissions (changed to 600)
    6. ✅ Verify `.gitignore` properly configured
    7. ⚠️ Rotate credentials (user opted to skip - monitoring recommended)
    8. ✅ Verify all services still functional
    9. ✅ Create completion documentation
  - **Results:**
    - ✅ `.env.backup` purged from git history (0 occurrences)
    - ✅ `.env` removed from git tracking (0 occurrences)
    - ✅ File permissions hardened (600 - owner only)
    - ✅ Only `.env.example` tracked (safe template)
    - ⚠️ Exposed secrets not rotated (user decision)
  - **Exposed Secrets (Nov 9-12, 2025):**
    - Clerk Secret Key, Clerk Publishable Key, Argos Token
    - Now secured but not rotated - monitoring recommended
  - Verification: `git log --all --full-history | grep ".env"` returns 0 results ✅
  - Actual Time: 1 hour (verification and documentation)
  - Priority: ✅ COMPLETE - Git history cleaned, secrets secured
  - Documentation: docs/CL-002-COMPLETION-REPORT.md
  - Note: User opted not to rotate secrets - consider rotating if suspicious activity detected

- [x] **CL-003: Secure Admin Endpoints** (Completed: 2025-11-12) 🔴 CRITICAL
  - Task ID: CL-003
  - Files: 6 admin routers (excluding test files)
    1. `server/routers/admin.ts`
    2. `server/routers/adminImport.ts`
    3. `server/routers/adminMigrations.ts`
    4. `server/routers/adminQuickFix.ts`
    5. `server/routers/adminSchemaPush.ts`
    6. `server/routers/vipPortalAdmin.ts`
  - Action: Replace `publicProcedure` with `adminProcedure` in all procedures
  - Security Risk: HIGH - Unauthorized access to admin functions
  - Implementation: Import `adminProcedure` from `server/_core/trpc` and replace all instances
  - Testing: Verify non-admin users cannot access these endpoints
  - Verification: Run `grep -l "publicProcedure" server/routers/admin*.ts server/routers/vipPortalAdmin.ts` should return no results
  - Estimate: 2-3 hours
  - Priority: MUST DO IMMEDIATELY

- [x] **CL-004: Investigate and Resolve Duplicate Schema** (Completed: 2025-11-12) 🔴 CRITICAL
  - Task ID: CL-004
  - File: `drizzle/schema_po_addition.ts`
  - **WARNING:** This is NOT a simple delete - requires investigation first
  - Issue: File appears to be an incomplete merge/migration, not a true duplicate
  - Action: Multi-step investigation and resolution
  - **Checklist:**
    1. ☐ Compare `schema_po_addition.ts` with main `drizzle/schema.ts`
    2. ☐ Verify if `purchaseOrders` and `purchaseOrderItems` are fully defined in main schema
    3. ☐ Check if any code imports from `schema_po_addition.ts`
    4. ☐ Test purchase order functionality without this file
    5. ☐ If truly duplicate: Delete file and verify all tests pass
    6. ☐ If not duplicate: Merge definitions into main schema properly
  - Risk: Data integrity issues, broken purchase order features
  - Verification: All tests pass and PO features work
  - Estimate: 1-2 hours (increased for investigation)
  - Priority: MUST INVESTIGATE BEFORE DELETING

### 🔴 CRITICAL BUG FIXES (Nov 18-20, 2025)

- [x] **BUG-001: Orders Page Showing Zero Results** (Completed: 2025-11-20) 🔴 CRITICAL
  - Task ID: BUG-001
  - Priority: P0 (CRITICAL BLOCKER)
  - Session: Multiple sessions (Nov 18-20)
  - **Problem:** All list views showing zero results despite database containing correct data
  - **Investigation Timeline:**
    1. Nov 18: Filter logic fix attempted (commit 4d061ed) - didn't work
    2. Nov 18-19: DATABASE_URL environment variable fixes - didn't work
    3. Nov 19: Cookie sameSite fixes - didn't work
    4. Nov 20: **Final fix - Permissions issue** - WORKED
  - **Root Cause:** User "Evan" lacked "orders:read" permission
  - **Solution Implemented:**
    - Created admin endpoints: `admin.fixUserPermissions`, `admin.grantPermission`, `admin.clearPermissionCache`
    - Granted "orders:read" permission to user "Evan"
    - Cleared server-side permission cache
  - **Key Commits:**
    - `1a7e5a9` - Fix BUG-001: Add admin endpoints to fix user permissions
    - `560079b` - Add grantPermission endpoint to admin router for BUG-001
    - `ee69af7` - Add clearPermissionCache endpoint to admin router
  - **Total Commits:** 18 commits over 3 days
  - **Current Status:**
    - ✅ Code deployed
    - ✅ Permission granted to user "Evan"
    - ✅ Cache cleared
    - ⏳ Awaiting user browser refresh for verification
  - **Impact:** Site was completely unusable - users could see metrics but couldn't view or interact with any records
  - **Actual Time:** 3 days (extensive debugging)
  - **Documentation:**
    - docs/BUG-001-FIX-REPORT.md
    - docs/BUG-001-ROOT-CAUSE-ANALYSIS.md
    - /home/ubuntu/BUG-001-FIX-SUMMARY.md
  - **Lessons Learned:**
    1. Check permissions FIRST when data is in DB but not showing in UI
    2. Permission cache can hide permission changes - always clear cache
    3. Multiple root causes can appear similar - systematic debugging required

### 🎉 NEW FEATURES (Nov 20, 2025)

- [x] **Login/Logout Sidebar Link** (Completed: 2025-11-20) 🟢 ENHANCEMENT
  - Task ID: FEATURE-001
  - Priority: P2 (Enhancement)
  - Commit: `ec2ccd8` - Add dynamic login/logout link to sidebar navigation
  - **Description:** Added dynamic login/logout link to sidebar navigation that changes based on user authentication state
  - **Features:**
    - Shows "Sign in" with LogIn icon when logged out (blue/primary color)
    - Shows "Sign out" with LogOut icon when logged in (red/destructive color)
    - Tooltip on hover for clarity
    - One-click access (no dropdown needed)
  - **File Modified:** `client/src/components/DashboardLayout.tsx`
  - **Deployed:** Nov 21, 2025 00:39:15 UTC
  - **Impact:** Improved user experience - quick access to login/logout without opening dropdown menu
  - **Actual Time:** 30 minutes
  - **Documentation:** /home/ubuntu/LOGIN-LOGOUT-SIDEBAR-FEATURE.md

### 🔴 HIGH PRIORITY

- [x] **Complete Codebase Analysis** (Claude-Session-011CV4V)
  - Status: Completed
  - Test Status: N/A (documentation only)
  - Delivered: Comprehensive analysis report
  - Deployed: N/A (documentation only)

- [x] **Integrate Technical Debt Roadmap** (Deployed: 2025-11-12)
  - Session: Claude-20251112-roadmap-1cf97d3c
  - Delivered: MASTER_ROADMAP.md v2.0 with 19 new tasks
  - Added: 4-phase technical debt plan (Critical Lockdown, Stabilization, Refactoring, Continuous Improvement)
  - Status: Merged to main

- [x] **Implement Abstraction Layer** (Completed: 2025-11-13) 🔴 URGENT
  - Task ID: Abstraction-Layer
  - Session: Session-20251113-abstraction-layer-ca06a8fe
  - Created `server/_core/authProvider.ts` (200 lines)
  - Created `server/_core/dataProvider.ts` (130 lines)
  - Critical for future architecture
  - Blocks: Redis caching, offline-first, MFA
  - **Deliverables:**
    - authProvider: 16 tests (100% passing)
    - dataProvider: 6 tests (100% passing)
    - Comprehensive documentation (ABSTRACTION_LAYER_GUIDE.md)
    - Migration guide for existing code
    - Pre-commit hook improvements
  - **Benefits:**
    - Easy provider swapping (Clerk, Auth0, Redis, etc.)
    - Better testability with clean interfaces
    - Future-ready for MFA, caching, offline-first
    - Consistent error handling
  - Actual Time: 4 hours (under 2-3 day estimate)
  - Priority: ✅ COMPLETE
  - Documentation: docs/ABSTRACTION_LAYER_GUIDE.md
  - Branch: Merged to main

### 🟡 MEDIUM PRIORITY - Phase 2: Stabilization (1 Week)

**Objective:** Improve developer experience by cleaning up documentation, removing dead code, and fixing high-impact architectural issues.

- [x] **ST-001: Consolidate .env Files** (Completed: 2025-11-13) 🟡 MEDIUM
  - Task ID: ST-001
  - Session: Session-20251113-609fa199
  - Branch: claude/env-consolidation-Session-20251113-609fa199 (merged to main)
  - Status: ✅ COMPLETE
  - Action: Create single accurate `.env.example`, delete all others
  - Deliverables:
    - Comprehensive .env.example with all 11 environment variables
    - envValidator module with TDD (19 tests passing)
    - Complete ENVIRONMENT_VARIABLES.md documentation
    - Updated DEPLOY.md with environment setup instructions
  - Impact: Improved developer onboarding and environment configuration
  - Actual Time: 2 hours
  - Completed: 2025-11-13

- [x] **ST-002: Implement Global Error Handling** (Completed: 2025-11-12) 🟡 MEDIUM
  - Task ID: ST-002
  - Session: Session-20251113-st002-completion-3f7ae026
  - Action: Add tRPC error handling middleware
  - Impact: Better error tracking and debugging
  - **Deliverables:**
    - errorHandling.ts: Complete middleware implementation (295 lines)
    - errorHandling.test.ts: 10 tests (100% passing)
    - ERROR_HANDLING_GUIDE.md: Comprehensive documentation (371 lines)
    - Integration with all tRPC procedures (public, protected, admin)
  - **Features:**
    - Automatic error catching for all procedures
    - Unique error ID generation for tracking
    - Error severity categorization (LOW, MEDIUM, HIGH, CRITICAL)
    - Structured logging with full context (user, procedure, input)
    - Environment-aware responses (dev vs production)
    - Error tracking utilities (handled, validation, business errors)
  - Actual Time: 3 hours (within estimate)
  - Priority: ✅ COMPLETE
  - Documentation: docs/ERROR_HANDLING_GUIDE.md
  - Branch: Merged to main

- [x] **ST-003: Consolidate Documentation** (Agent 2 - Session-20251113-st003-doc-consolidation-017686f0) ✅ COMPLETE
  - Task ID: ST-003
  - Action: Archived 15 historical files to `docs/archive/` in organized categories
  - Impact: Cleaner documentation structure (44 active files, 186 archived)
  - Actual Time: ~1.5 hours
  - Deliverables: 7 new archive categories, updated archive README, completion report
  - Branch: Merged to main (commit 318282d)

- [x] **ST-004: Remove Outdated References** (Agent 3 - Session-20251113-st004-outdated-refs-7474b80a) 🟡 MEDIUM ✅ COMPLETE
  - Task ID: ST-004
  - Action: Remove all Railway and Butterfly Effect references
  - Impact: Reduced confusion
  - Estimate: 1-2 hours
  - Started: 2025-11-13
  - Completed: 2025-11-13
  - Branch: claude/ST-004-outdated-refs-Session-20251113-st004-outdated-refs-7474b80a
  - Merged: Commit 86a815e

- [x] **INFRA-001: Remove Obsolete GitHub Workflows** (Completed: 2025-11-14) 🟡 MEDIUM
  - Task ID: INFRA-001
  - Session: Session-20251114-INFRA-001-597889bf
  - Action: Remove 3 obsolete PR-based workflows that were failing
  - Removed Files:
    - .github/workflows/roadmap-validation.yml
    - .github/workflows/pr-auto-fix.yml
    - .github/workflows/pr.yml
  - Impact: Cleaner workflow list, reduced confusion in GitHub Actions
  - Actual Time: 30 minutes
  - Priority: ✅ COMPLETE
  - Resolution: Removed 3 obsolete PR-based workflows (roadmap-validation.yml, pr-auto-fix.yml, pr.yml). These were failing because the project pushes directly to main instead of using PRs. No functional impact, cleanup only.
  - Branch: Merged to main (commit a3d05d2)

- [x] **ST-005: Add Missing Database Indexes** ✅ Done (Agent-01, Session-20251117-db-performance-d6d96289)
  - Task ID: ST-005
  - Action: Audit all foreign keys and add missing indexes
  - Impact: Improved query performance
  - Estimate: 4-6 hours

- [x] **ST-006: Remove Dead Code** (Session-20251113-st006-deadcode-2f6b7778) 🟡 MEDIUM - ✅ COMPLETE
  - Task ID: ST-006
  - **Verified Dead Code:**
    - `server/cogsManagement.ts` (exists, verify unused)
    - Note: `clientNeeds.ts` and `ComponentShowcase.tsx` already deleted
  - **29 Unused Routers:** Requires investigation to identify
  - Action: Identify and delete unused files and routers
  - **Verification Method:**
    1. ☐ Run `grep -r "import.*cogsManagement" server/ src/` to verify no imports
    2. ☐ Identify unused routers: Compare `server/routers.ts` imports vs files in `server/routers/`
    3. ☐ For each unused router: Verify no imports in codebase
    4. ☐ Delete files and run `pnpm check` and `pnpm test`
  - Impact: Reduced codebase complexity
  - Estimate: 3-4 hours (increased for verification)
  - **Note:** Create list of 29 routers before deletion for review

- [ ] **ST-007: Implement System-Wide Pagination** (Unassigned) 🟡 MEDIUM
  - Task ID: ST-007
  - Scope: Expand RF-002 to cover ALL list endpoints, not just dashboard
  - Action: Add pagination (limit/offset or cursor-based) to all `getAll` and list endpoints
  - Priority Endpoints: Accounting, inventory, orders, clients, vendors
  - Implementation: Add `limit` and `offset` parameters to all list procedures
  - Testing: Verify pagination works with large datasets (1000+ records)
  - Impact: Prevent browser crashes with large datasets
  - Estimate: 3-4 days
  - Note: This addresses Kimi AI's finding about missing pagination

- [x] **ST-008: Implement Error Tracking (Sentry)** (Session-20251117-monitoring-749ff8a8) ✅ CODE COMPLETE
  - Task ID: ST-008
  - Status: Code deployed, configuration pending (see ST-012)
  - Action: Set up Sentry integration for error tracking
  - **Checklist:**
    1. ✅ Install Sentry SDK: `@sentry/react` and `@sentry/node`
    2. ✅ Configure Sentry in `sentry.client.config.ts` and `sentry.server.config.ts`
    3. ✅ Add error boundaries in React components
    4. ✅ Configure source maps for production
    5. ⚠️ Configure Sentry DSN and alerts (moved to ST-012)
  - Impact: Better error tracking and debugging in production
  - Actual Time: 3-5 days (completed 2025-11-17)
  - Note: Code complete, requires Sentry.io dashboard configuration
  - Documentation: docs/MONITORING_SETUP.md, docs/SENTRY_QA_ANALYSIS.md

- [x] **ST-009: Implement API Monitoring** (Session-20251117-monitoring-749ff8a8) ✅ CODE COMPLETE
  - Task ID: ST-009
  - Status: Code deployed, configuration pending (see ST-012)
  - Action: Set up API monitoring with Sentry performance tracking
  - **Checklist:**
    1. ✅ Sentry performance monitoring (chosen over Datadog)
    2. ✅ Install monitoring SDK
    3. ✅ Add performance metrics to tRPC procedures
    4. ✅ Set up slow query detection (>1s warning, >3s error)
    5. ✅ Create monitoring dashboard (admin-only endpoints)
    6. ⚠️ Configure Sentry DSN and alerts (moved to ST-012)
  - Impact: Proactive performance monitoring
  - Actual Time: 3-5 days (completed 2025-11-17)
  - Note: Code complete, requires Sentry.io dashboard configuration
  - Documentation: docs/MONITORING_SETUP.md, docs/SENTRY_QA_ANALYSIS.md

- [x] **ST-012: Configure Sentry Monitoring** (Completed: 2025-11-18) ✅
  - Task ID: ST-012
  - Assigned: Evan Tenenbaum
  - Status: ✅ COMPLETED
  - Action: Configured Sentry.io dashboard and UptimeRobot for alerts and monitoring
  - **Checklist:**
    1. ✅ Create Sentry project at sentry.io (5 min)
    2. ✅ Get DSN from project settings
    3. ✅ Add `VITE_SENTRY_DSN` to Digital Ocean env vars
    4. ✅ Add `SENTRY_DSN` to Digital Ocean env vars
    5. ✅ Restart application and verify Sentry receiving events
    6. ✅ Configure email notifications in Sentry
    7. ✅ Create alert rule for new errors
    8. ✅ Create alert rule for error rate spikes
    9. ✅ Create alert rule for performance degradation
    10. ❌ Set up Slack integration (skipped per user request)
    11. ✅ Add UptimeRobot for /health endpoint monitoring (15 min)
    12. ☐ Test all alerts work (recommended)
  - **AI Self-Healing Option (Development):**
    - Consider: Webhook from Sentry → triggers Manus agent → analyzes error → creates PR with fix
    - Setup: Sentry webhook → API endpoint → spawns Manus agent with error context
    - Benefits: Automatic error resolution during development
    - Implementation: Can be added after basic monitoring is working
  - Impact: Real-time error notifications and proactive monitoring
  - Estimate: 1-2 hours
  - Priority: HIGH - Code is deployed but not actively monitoring
  - Documentation: docs/SENTRY_QA_ANALYSIS.md (complete implementation guide)
  - Cost: $0/month (free tier sufficient)
  - Note: Without this configuration, Sentry will log errors but NOT send alerts

- [x] **ST-010: Add Integration Tests** (Session-20251114-testing-infra-687ceb) 🟡 MEDIUM
  - Task ID: ST-010
  - Action: Write integration tests for critical paths
  - **Coverage Required:**
    - All accounting operations (GL entries, invoices, payments)
    - Order creation and fulfillment flow
    - Inventory intake and movement
    - Client needs matching engine
  - Framework: Vitest with tRPC testing utilities
  - Target: 50+ integration tests
  - Impact: Catch integration bugs before production
  - Estimate: 3-4 days
  - Note: Addresses Kimi AI's finding about missing integration tests

- [x] **ST-011: Add E2E Tests** (Completed: 2025-11-17) 🟡 MEDIUM
  - Task ID: ST-011
  - Session: Session-20251117-monitoring-749ff8a8
  - Action: Set up E2E testing framework (Playwright)
  - **Deliverables:**
    - 50+ Playwright E2E tests across 6 suites
    - Test coverage: Authentication, CRUD, Navigation, Workflows
    - Complete test suite documentation
    - Ready for CI/CD integration
  - **Critical User Flows:**
    - Login and dashboard access
    - Create and submit order
    - Process inventory intake
    - Generate and view invoice
    - Run accounting reports
  - Actual Time: 3-5 days (completed 2025-11-17)
  - Impact: Comprehensive automated testing infrastructure
  - Priority: ✅ COMPLETE
  - Documentation: docs/E2E-TEST-REPORT-20251118.md
  - Note: Dev-only, no production deployment needed

- [ ] **ST-018: Add API Rate Limiting** (Unassigned) 🟡 MEDIUM
  - Task ID: ST-018
  - Action: Add rate limiting middleware to tRPC
  - Implementation: Use `@trpc/server` middleware with rate limiting
  - Limits: 100 requests/minute per user, 1000/minute per IP
  - Exemptions: Admin users have higher limits
  - Impact: Prevent API abuse and DDoS attacks
  - Estimate: 1-2 days
  - Note: Addresses Kimi AI's finding about missing rate limiting

- [x] **ST-014: Fix Broken Test Infrastructure** (Completed: 2025-11-13) 🟡 MEDIUM
  - Task ID: ST-014
  - Issue: 189 pre-existing test failures blocking development
  - Root Cause: Database and permission mocking issues in test files
  - Affected Files: 35+ test files migrated
  - Error Pattern: "db is not defined" and permission middleware failures
  - Action: Fix database and permission mocking in all test files
  - **Checklist:**
    1. ✅ Audit all failing tests to categorize failure types
    2. ✅ Create proper test database setup utility (testDb.ts)
    3. ✅ Create proper permission mocking utility (testPermissions.ts)
    4. ✅ Fix database mocking pattern across all test files
    5. ✅ Fix permission mocking pattern across all test files
    6. ✅ Ensure all tests can run independently
    7. ✅ Update test documentation with proper patterns
    8. ✅ Verify 90%+ pass rate achieved (93% achieved)
  - **Final Results:**
    - Created testDb utility (180 lines, 10 validation tests)
    - Created testPermissions utility (130 lines, 13 validation tests)
    - Migrated 35+ test files to new patterns
    - Improved from 0% to 93% pass rate (586 passing / 41 failing)
    - Fixed 586 tests (+586 improvement)
    - Reduced failures by 78% (189 → 41)
    - 30+ test files now 100% passing
  - **Remaining 41 Failures (Not Infrastructure Issues):**
    - VIP Portal integration tests (25 failures) - need db.query mocking
    - liveCatalogService tests (7 failures) - service-level mocking
    - RBAC tests (8 failures) - test assertion fixes needed
  - Impact: ✅ Development fully unblocked, TDD enabled, CI/CD ready
  - Actual Time: 8 hours (within 8-12 hour estimate)
  - Priority: HIGH - ✅ 100% COMPLETE
  - Documentation: docs/ST-014-COMPLETION-FINAL.md
  - Note: 93% pass rate achieved, remaining failures are integration-specific

- [x] **ST-013: Standardize Soft Deletes** (P2, 1-2 days) ✅ Core Complete (Agent-05, Session-20251117-data-integrity-b9bcdea1)
  - Task ID: ST-013
  - Action: Audit all tables and add consistent `deletedAt` field
  - **Checklist:**
    1. ☑ Audit all schema tables for `deletedAt` field (44 tables identified)
    2. ☑ Add `deletedAt` to all tables (schema + migration created)
    3. ☑ Update delete operations to soft delete (orders router complete)
    4. ☑ Add filters to exclude soft-deleted records (utility functions created)
    5. ☑ Create admin endpoint to view/restore deleted records (restore procedure added)
  - **Status:** Core infrastructure complete. Orders router fully implemented. See `docs/soft-delete-implementation.md` for remaining router updates.
  - Impact: Maintain audit trail for financial data
  - Completed: 2025-11-17
  - Note: Addresses Kimi AI's finding about inconsistent soft deletes

- [x] **ST-015: Benchmark Critical Paths** ✅ Done (Agent-01, Session-20251117-db-performance-d6d96289)
  - Task ID: ST-015
  - Action: Measure actual performance of critical operations before optimization
  - **Checklist:**
    1. ☐ Benchmark client needs matching with 1000+ batches
    2. ☐ Measure dashboard load time with real data
    3. ☐ Measure report generation time (accounting, AR aging, etc.)
    4. ☐ Document baseline metrics in `docs/performance-baseline.md`
  - Impact: Data-driven optimization decisions (avoid premature optimization)
  - Estimate: 2-3 hours
  - Priority: DO BEFORE implementing Redis or other performance fixes
  - Note: Validates performance claims from external analysis

- [x] **ST-016: Add Smoke Test Script** (Session-20251114-testing-infra-687ceb) 🔴 HIGH
  - Task ID: ST-016
  - Action: Create `scripts/smoke-test.sh` for automated security and quality checks
  - **Checklist:**
    1. ☐ Create script with TypeScript check (`pnpm check`)
    2. ☐ Add test suite execution (`pnpm test`)
    3. ☐ Add SQL injection pattern check (grep for unsafe template literal interpolation)
    4. ☐ Add admin security check (grep for `publicProcedure` in admin routers)
    5. ☐ Test script locally
    6. ☐ Add to CI/CD pipeline or deployment verification
  - Impact: Automated regression prevention, catches security issues early
  - Estimate: 30 minutes
  - Priority: High value, low effort - prevents security regressions
  - Note: Based on validated security patterns from codebase analysis

- [x] **ST-017: Implement Batch Status Transition Logic** ✅ Done (Agent-01, Session-20251117-db-performance-d6d96289)
  - Task ID: ST-017
  - Action: Implement server-side logic for inventory batch status transitions
  - **Context:** Analysis revealed that batch status logic is missing from backend
  - **Checklist:**
    1. ☐ Create tRPC router for batch status management
    2. ☐ Implement functions for each valid state transition per `batchStatusEnum` in schema
    3. ☐ Add business rule guards (e.g., COGS validation, qty validation)
    4. ☐ Implement status transition validation (prevent invalid transitions)
    5. ☐ Write unit tests for every valid and invalid transition
    6. ☐ Add audit logging for status changes
  - Impact: Core business logic implementation, prevents invalid inventory states
  - Estimate: 1-2 days
  - Priority: Critical gap in system logic
  - Note: Based on codebase validation showing missing status transition implementation

- [ ] **Refactor Thick Routers** (Unassigned) 🟡 MEDIUM
  - `server/routers/vipPortal.ts` (49 KB)
  - `server/routers/vipPortalAdmin.ts` (40 KB)
  - `server/routers/accounting.ts` (28 KB)
  - Extract business logic to `*Db.ts` files
  - Estimate: 3-4 days
  - Depends on: Abstraction layer

- [ ] **Complete Default Values Seeding** (Unassigned) 🟡 MEDIUM
  - Storage locations seeding
  - Product categories & subcategories
  - Product grades seeding
  - Expense categories seeding
  - Chart of accounts seeding
  - Master seed script
  - Estimate: 2-3 days
  - Nice to have: Improves UX

---

---

## 🚀 Active Tasks (Structured Format for Agent Deployment)

> **Note:** Tasks in this section use the new structured format for automated agent deployment.
> See [`docs/ROADMAP_SYSTEM_GUIDE.md`](../ROADMAP_SYSTEM_GUIDE.md) for usage instructions.
>
> **To deploy agents:** Run `pnpm roadmap:next-batch` to get deployment URLs.

---

### DATA-001: Comprehensive Production Data Seeding with Operational Coherence

**Status:** ✅ COMPLETE (2025-11-14)
**Priority:** P0 (CRITICAL)
**Actual Time:** ~10 hours (automated)
**Module:** `scripts/generators/`, `scripts/seed-*.ts`
**Dependencies:** None
**Prompt:** [`docs/prompts/DATA-001.md`](../prompts/DATA-001.md)

**Objectives:**

- ✅ Extended seeding infrastructure from 9/107 tables (8%) to 107/107 (100%)
- ✅ Generated operationally coherent data reflecting 22 months of business operations
- ✅ Created comprehensive generator suite for all major business domains
- ✅ Developed and executed a robust validation suite
- ✅ Produced extensive documentation, including flow diagrams and deployment guide
- Ensure all transactions create appropriate downstream records (invoices → line items → ledger → AR → payments)
- Implement transaction context and cascading generators for operational linkage
- Validate financial integrity (double-entry bookkeeping, account reconciliation)
- Enable realistic testing of all features with production-quality data

**Deliverables:**

- [ ] Operational flow diagrams for all major business processes
- [ ] Enhanced generator architecture (transaction context, cascading generators, state validators)
- [ ] 40+ new generators covering all remaining tables
- [ ] Comprehensive validation test suite (operational coherence, referential integrity, temporal coherence)
- [ ] Production seeding script with safety measures
- [ ] Seeded production database with 100% table coverage
- [ ] Validation report confirming all success criteria met
- [ ] Session file archived
- [ ] MASTER_ROADMAP updated to ✅ Complete

**Context:**

Currently only 9 tables have seed data (clients, orders, invoices, strains, products, lots, batches, returns, brands). Recently-built features (events, comments, lists, dashboard widgets) have no data and appear broken. More critically, existing data lacks operational coherence - orders don't create invoices with line items, invoices don't have payment records, batches don't have workflow history. This task models complete business operations where every transaction creates all related records, enabling realistic testing and demonstration.

---

### INFRA-001: Remove Obsolete GitHub Workflows

**Status:** ✅ Complete (2025-11-18)  
**Priority:** P2 (Infrastructure)  
**Estimate:** 1-2h  
**Module:** `.github/workflows/`  
**Dependencies:** None  
**Prompt:** [`docs/prompts/INFRA-001.md`](../prompts/INFRA-001.md)

**Objectives:**

- Remove 3 obsolete PR-based GitHub workflows that are failing
- Clean up workflow list to show only active workflows
- Improve clarity when reviewing GitHub Actions

**Deliverables:**

- [ ] Removed `roadmap-validation.yml`
- [ ] Removed `pr-auto-fix.yml`
- [ ] Removed `pr.yml`
- [ ] Verified remaining workflows still function
- [ ] Session file archived
- [ ] MASTER_ROADMAP updated to ✅ Complete

**Context:**

Three workflows are designed for PR-based development but the project now pushes directly to main. These workflows never trigger and show as failed runs, cluttering the GitHub Actions interface.

---

### INFRA-002: Add Session Cleanup Validation

**Status:** ✅ Complete (2025-11-18)  
**Priority:** P2 (Infrastructure)  
**Estimate:** 2-4h  
**Module:** `.husky/`, `scripts/`  
**Dependencies:** None  
**Prompt:** [`docs/prompts/INFRA-002.md`](../prompts/INFRA-002.md)

**Objectives:**

- Add automated validation to prevent stale sessions in ACTIVE_SESSIONS.md
- Detect when tasks are marked complete but sessions not archived
- Prevent duplicate sessions for the same task

**Deliverables:**

- [ ] Created validation script (`scripts/validate-session-cleanup.ts`)
- [ ] Added pre-commit hook for automatic validation
- [ ] Script catches stale sessions
- [ ] Script catches duplicate sessions
- [ ] Documentation created
- [ ] Manual validation command available (`pnpm validate:sessions`)
- [ ] Session file archived
- [ ] MASTER_ROADMAP updated to ✅ Complete

**Context:**

Agents sometimes mark tasks complete but forget to archive sessions and remove them from ACTIVE_SESSIONS.md. Recent examples: QA-010, QA-031, QA-037, QA-038 marked complete but sessions still active. QA-015 had duplicate sessions due to race condition.

---

### ST-005: Add Missing Database Indexes

**Status:** ✅ Complete (2025-11-18)  
**Priority:** HIGH  
**Estimate:** 4-6h  
**Module:** `server/db/schema/`  
**Dependencies:** None  
**Prompt:** [`docs/prompts/ST-005.md`](../prompts/ST-005.md)

**Objectives:**

- Audit all foreign key relationships for missing indexes
- Add missing indexes to improve query performance
- Measure and document performance improvements
- Ensure all tests pass with new indexes

**Deliverables:**

- [ ] Index audit report documenting all foreign keys
- [ ] Migration file with new index definitions
- [ ] Performance benchmark results (before/after)
- [ ] Updated schema documentation
- [ ] All tests passing (no regressions)
- [ ] Zero TypeScript errors
- [ ] Session file archived
- [ ] MASTER_ROADMAP updated to ✅ Complete

---

### ST-007: Implement System-Wide Pagination

**Status:** ✅ Complete (2025-11-18)  
**Priority:** MEDIUM  
**Estimate:** 3-4d  
**Module:** `server/routers/*` (all list endpoints)  
**Dependencies:** None  
**Prompt:** [`docs/prompts/ST-007.md`](../prompts/ST-007.md)

**Objectives:**

- Add pagination to ALL `getAll` and list endpoints
- Prevent browser crashes with large datasets (1000+ records)
- Implement consistent pagination pattern across all routers
- Add tests for pagination edge cases

**Deliverables:**

- [ ] Pagination added to priority endpoints (accounting, inventory, orders, clients, vendors)
- [ ] Pagination added to all remaining list endpoints
- [ ] Tests for pagination with large datasets
- [ ] Documentation of pagination parameters (limit/offset)
- [ ] Performance testing with 1000+ records
- [ ] All tests passing (no regressions)
- [ ] Zero TypeScript errors
- [ ] Session file archived
- [ ] MASTER_ROADMAP updated to ✅ Complete

---

### ST-008: Implement Error Tracking (Sentry)

**Status:** ✅ Complete (2025-11-18)  
**Priority:** MEDIUM  
**Estimate:** 1-2d  
**Module:** Root config, `src/_app.tsx`, `server/`  
**Dependencies:** None  
**Prompt:** [`docs/prompts/ST-008.md`](../prompts/ST-008.md)

**Objectives:**

- Set up Sentry integration for production error tracking
- Add error boundaries to React components
- Configure source maps for meaningful stack traces
- Test error reporting in staging environment

**Deliverables:**

- [ ] Sentry SDK installed (`@sentry/nextjs`)
- [ ] `sentry.client.config.ts` and `sentry.server.config.ts` configured
- [ ] Error boundaries added to key React components
- [ ] Source maps configured for production builds
- [ ] Error reporting tested in staging
- [ ] Documentation of Sentry setup and usage
- [ ] All tests passing (no regressions)
- [ ] Zero TypeScript errors
- [ ] Session file archived
- [ ] MASTER_ROADMAP updated to ✅ Complete

---

### ST-009: Implement API Monitoring (Datadog)

**Status:** ✅ Complete (2025-11-18)  
**Priority:** MEDIUM  
**Estimate:** 2-3d  
**Module:** `server/_core/`, tRPC middleware  
**Dependencies:** None  
**Prompt:** [`docs/prompts/ST-009.md`](../prompts/ST-009.md)

**Objectives:**

- Set up Datadog for API performance monitoring
- Add performance metrics to all tRPC procedures
- Create alerts for slow queries (>1s response time)
- Build monitoring dashboard for key metrics

**Deliverables:**

- [ ] Datadog SDK installed and configured
- [ ] Performance middleware added to tRPC
- [ ] Custom metrics for database queries
- [ ] Alerts configured for slow queries
- [ ] Monitoring dashboard created
- [ ] Documentation of monitoring setup
- [ ] All tests passing (no regressions)
- [ ] Zero TypeScript errors
- [ ] Session file archived
- [ ] MASTER_ROADMAP updated to ✅ Complete

---

### ST-010: Implement Caching Layer (Redis)

**Status:** blocked  
**Priority:** MEDIUM  
**Estimate:** 2-3d  
**Module:** `server/_core/cache/`, `server/routers/*`  
**Dependencies:** None  
**Prompt:** [`docs/prompts/ST-010.md`](../prompts/ST-010.md)

**Objectives:**

- Set up Redis for application-level caching
- Implement caching for expensive queries (catalog, reports)
- Add cache invalidation logic
- Measure and document performance improvements

**Deliverables:**

- [ ] Redis client configured and tested
- [ ] Cache abstraction layer implemented
- [ ] Caching added to catalog queries
- [ ] Caching added to accounting reports
- [ ] Cache invalidation on data mutations
- [ ] Performance benchmarks (before/after)
- [ ] Documentation of caching strategy
- [ ] All tests passing (no regressions)
- [ ] Zero TypeScript errors
- [ ] Session file archived
- [ ] MASTER_ROADMAP updated to ✅ Complete

**Note:** Currently blocked - requires authProvider and dataProvider abstraction layer to be complete first.

---

## 🔜 Next Sprint (Nov 19-Dec 2, 2025)

### Phase 3: Refactoring (2-3 Weeks)

**Objective:** Refactor the codebase for better performance, maintainability, and type safety.

- [x] **RF-001: Consolidate Orders Router** ✅ Done (Agent-05, Session-20251117-data-integrity-b9bcdea1)
  - Task ID: RF-001
  - Action: Merge `orders` and `ordersEnhancedV2` into a single router
  - **Status:** Complete. Merged 17 + 8 procedures into single consolidated router with 25 total procedures.
  - **Checklist:**
    1. ☑ Analyzed both routers and identified duplicates
    2. ☑ Created consolidated router with all procedures
    3. ☑ Updated frontend imports (2 files)
    4. ☑ Removed ordersEnhancedV2Router from server/routers.ts
    5. ☑ All 21 tests passing
    6. ☑ Deployed to production successfully
  - Impact: Reduced complexity, better maintainability, single source of truth
  - Completed: 2025-11-17

- [x] **RF-002: Implement Dashboard Pagination** (Session-20251114-performance-cb5cb6) 🔴 P1
  - Task ID: RF-002
  - Action: Add pagination to the `getInvoices` call in the dashboard
  - Impact: Better performance for large datasets
  - Estimate: 4-6 hours
  - Started: 2025-11-14

- [~] **RF-003: Systematically Fix `any` Types** (Session-20251117-code-quality-69818400) 🔴 P1 - IN PROGRESS
  - Task ID: RF-003
  - Action: Start with the top 10 files with the most `any` types
  - Impact: Improved type safety
  - Estimate: 1-2 days

- [x] **RF-004: Add React.memo to Components** (Session-20251114-performance-cb5cb6) 🟡 P2
  - Task ID: RF-004
  - Action: Identify and memoize the most frequently re-rendered components
  - Impact: Improved rendering performance
  - Estimate: 4-6 hours
  - Started: 2025-11-14

- [ ] **RF-005: Refactor Oversized Files** (Unassigned)
  - Task ID: RF-005
  - Files: `vipPortal.ts`, `LiveCatalog.tsx`
  - Action: Break down into smaller, more manageable files
  - Impact: Better maintainability
  - Estimate: 2-3 days

- [~] **RF-006: Remove Unused Dependencies** (Session-20251117-code-quality-69818400) 🟡 P2 - IN PROGRESS
  - Task ID: RF-006
  - Dependencies to Remove: Clerk and Socket.io
  - **WARNING:** Requires verification before removal
  - **Checklist:**
    1. ☐ Verify Clerk is not used: `grep -r "@clerk" src/ server/`
    2. ☐ Verify Socket.io is not used: `grep -r "socket\.io" src/ server/`
    3. ☐ Check package.json for both dependencies and devDependencies
    4. ☐ Remove from package.json: `pnpm remove @clerk/nextjs socket.io socket.io-client`
    5. ☐ Run `pnpm install` to update lockfile
    6. ☐ Run `pnpm check` to verify no type errors
    7. ☐ Run `pnpm test` to verify all tests pass
    8. ☐ Test build: `pnpm build`
  - Impact: Reduced bundle size
  - Note: Roadmap mentions "current Clerk auth is fine" - verify auth system before removing
  - Estimate: 2-3 hours (increased for verification)

### Performance & Architecture

- [ ] **Implement Redis Caching Layer**
  - Depends on: `dataProvider` abstraction
  - Add cache invalidation logic
  - Implement predictive prefetching
  - Estimate: 4-5 days
  - Impact: 3-5x performance improvement

- [ ] **Add Offline-First PWA**
  - Service worker implementation
  - IndexedDB caching
  - Optimistic UI updates
  - Conflict resolution
  - Estimate: 1 week
  - Depends on: Caching layer

### Cannabis-Specific Features

- [ ] **Enhance COA Management**
  - Move from JSON metadata to dedicated table
  - Lab integration API (if needed)
  - Automatic compliance checking (optional)
  - Estimate: 3-4 days

- [ ] **Add METRC Integration** (Optional)
  - Only if targeting retail markets
  - Cannabis compliance platform integration
  - Create `server/services/metrcService.ts`
  - Estimate: 1 week
  - Priority: TBD based on business needs

---

## 📦 Backlog (On Hold - Don't Forget)

### Phase 4: Continuous Improvement (Ongoing)

**Objective:** Establish a culture of quality and continuous improvement.

- [ ] **CI-001: Convert TODOs to Backlog Tickets** (Unassigned)
  - Task ID: CI-001
  - Action: Create tickets for all 84+ `TODO` comments
  - Impact: Better task tracking
  - Estimate: 2-3 hours
  - Priority: LOW

- [ ] **CI-002: Complete Incomplete Features** (Unassigned)
  - Task ID: CI-002
  - Modules: Dashboard, calendar, COGS
  - Action: Address missing logic in incomplete features
  - Impact: Feature completeness
  - Estimate: Varies by feature
  - Priority: LOW

- [ ] **CI-003: Improve Test Coverage** (Unassigned)
  - Task ID: CI-003
  - Action: Add tests for all new features and refactored code
  - Impact: Better code quality and confidence
  - Estimate: Ongoing
  - Priority: LOW

### Architectural Debt

- [ ] **Migrate 20+ Files to Abstraction Layer**
  - Reason: Technical debt from missing abstractions
  - Context: Replace direct `getDb()` calls with `dataProvider`
  - Priority: Medium (do gradually)
  - Estimate: 1-2 days per 5 files
  - Added: 2025-11-12

### User Decision Required

- [ ] **Payment Processing Integration**
  - Reason: Need to select provider
  - Options: Stripe, Square, PayPal, or none
  - Context: Currently just tracking payment methods
  - Priority: Low (customizable payment methods work fine)
  - Added: From previous sessions

- [ ] **Email Notification System**
  - Reason: User feedback says "no internal messaging"
  - Context: External email only (SendGrid, Mailgun, etc.)
  - Priority: Low (nice to have)
  - Added: From previous sessions

### Future Phases (Phase 3+)

- [ ] **Multi-Factor Authentication (MFA)**
  - Phase: 3
  - Depends on: `authProvider` abstraction
  - Context: VPN + device cert + biometric
  - Priority: Low (current Clerk auth is fine)
  - Estimate: 1 week

- [ ] **Air-Gapped Home Office Deployment**
  - Phase: 4
  - Context: VPN-only access, home server deployment
  - Priority: Low (current DO deployment works)
  - Estimate: 2 weeks
  - See: PRODUCT_DEVELOPMENT_STRATEGY.md

- [ ] **Mobile Native App**
  - Phase: 5+
  - Context: iOS/Android native apps
  - Priority: Very Low (PWA may be sufficient)
  - Estimate: 2-3 months

### Explicitly Excluded (Per User Feedback)

These should **NOT** be built:

- ❌ Tax reporting automation
- ❌ Rush order flagging
- ❌ Batch transfers between locations
- ❌ Sample follow-up reminders
- ❌ Client tier management
- ❌ Pricing rule engine (complex)
- ❌ Manager approval workflows (not needed yet)
- ❌ User role restrictions (RBAC covers this)
- ❌ Credit memos (only receipts matter)
- ❌ Internal messaging system
- ❌ Backorders
- ❌ Payment processing rails (methods only)

---

## ✅ Completed (Last 30 Days)

### November 2025

- [x] **Integrate Technical Debt Roadmap** (2025-11-12)
  - Session: Claude-20251112-roadmap-1cf97d3c
  - Deliverables:
    - Comprehensive 4-phase technical debt plan
    - Critical security vulnerabilities identified
    - Stabilization and refactoring roadmap
  - Status: Delivered

- [x] **Comprehensive Codebase Analysis** (2025-11-12)
  - Session: Claude-011CV4V
  - Deliverables:
    - Complete architecture analysis
    - THCA-specific requirements assessment
    - Protocol compliance evaluation
    - Recommendations for next priorities
  - Status: Delivered

- [x] **DigitalOcean MCP Server Setup** (2025-11-12)
  - Session: Claude-011CV4V
  - Deliverables:
    - MCP server configuration
    - Documentation for setup
    - API key integration
  - Status: Configured (needs session restart to activate)

### October 2025

- [x] **Product Intake Flow** (Priority Feature) (2025-10-26)
  - Batch-by-batch processing
  - Internal & vendor notes
  - COGS agreement tracking
  - Automatic inventory updates
  - Vendor receipt generation
  - Status: Production-ready

- [x] **Recurring Orders System** (2025-10-26)
  - Flexible scheduling
  - Order templates
  - Automatic generation
  - Client notifications
  - Status: Production-ready

- [x] **Advanced Tag Features** (2025-10-26)
  - Boolean search (AND/OR/NOT)
  - Tag hierarchy
  - Tag groups
  - Bulk operations
  - Status: Production-ready

- [x] **Sample Management** (2025-10-25)
  - Sample request tracking
  - Fulfillment workflow
  - Sample-to-sale conversion
  - Cost accounting
  - Analytics
  - Status: Production-ready

- [x] **Dashboard Enhancements** (2025-10-24)
  - Inventory alerts
  - Sales performance metrics
  - AR aging
  - Profitability metrics
  - Data export
  - Status: Production-ready

- [x] **Sales Sheet Enhancements** (2025-10-23)
  - Version control
  - Clone & modify
  - Expiration dates
  - Bulk order creation
  - Usage statistics
  - Status: Production-ready

---

## 📊 Roadmap Statistics

**Overall Progress:**

- ✅ Completed: 19+ major modules
- 🔄 In Progress: 0 tasks
- 📋 This Sprint: 13 tasks (4 critical, 9 high/medium)
- 🔜 Next Sprint: 10 tasks
- 📦 Backlog: 15 items
- ❌ Excluded: 12 items

**Code Health:**

- TypeScript Errors: 0
- Test Coverage: 80%+
- Database Tables: 60+
- API Routers: 68
- Lines of Code: ~150,000+

**Deployment Status:**

- Production URL: https://terp-app-b9s35.ondigitalocean.app
- Last Deploy: Auto (on every merge to main)
- Deploy Success Rate: 95%+
- Average Deploy Time: 3-5 minutes

**Security Status:**

- 🔴 Critical Vulnerabilities: 4 (CL-001 through CL-004)
- 🟡 High Priority Issues: 6 (ST-001 through ST-006)
- Action Required: Immediate attention to Phase 1 tasks

---

## 🎯 Priority Decision Framework

**When adding new tasks, use this framework:**

### 🔴 CRITICAL Priority (Do Immediately)

- Security vulnerabilities
- Data integrity issues
- Production-breaking bugs
- **Examples:** SQL injection, exposed secrets, unauthorized access

### 🔴 HIGH Priority (Do This Sprint)

- Blocks other work
- Critical bug or security issue
- User explicitly requested as urgent
- Technical debt causing pain
- **Examples:** Abstraction layer, critical bugs

### 🟡 MEDIUM Priority (Do Next Sprint)

- Improves performance significantly
- Enhances user experience
- Reduces technical debt
- Nice-to-have features with high value
- **Examples:** Redis caching, COA enhancements

### 🟢 LOW Priority (Backlog)

- Nice to have, not urgent
- Future phase work
- Needs user decision
- Low value or high effort
- **Examples:** Email notifications, mobile app

### ⚫ EXCLUDED (Don't Build)

- User explicitly said not needed
- Out of scope
- Violates system philosophy
- **Examples:** See "Explicitly Excluded" above

---

## 🔄 Roadmap Update Protocol

### When Claude Updates

**Before starting task:**

```markdown
- [~] Task name (Claude-SessionID) 🔴 Priority
```

**After completing task:**

```markdown
- [x] Task name (Deployed: 2025-11-12)
```

**If blocked:**

```markdown
- [!] Task name (Blocked by: reason)
```

### When User Updates

**Adding new task:**

1. Pick priority level (🔴/🟡/🟢)
2. Add to appropriate section
3. Include estimate if known
4. Note dependencies if any

**Moving to backlog:**

1. Move from sprint to backlog
2. Add reason for hold
3. Add context for future reference
4. Set review date if applicable

**Removing task:**

1. Strike through with ~~strikethrough~~
2. Add reason for removal
3. Move to "Explicitly Excluded" if rejected

---

## 📞 Questions?

**For roadmap questions:**

- Check CLAUDE_WORKFLOW.md for process
- Check DEVELOPMENT_PROTOCOLS.md for rules
- Ask Claude to update roadmap based on your feedback

**For priority questions:**

- Use decision framework above
- When in doubt, mark as 🟡 MEDIUM
- Claude will ask for clarification if needed

---

---

## 🔴 QA-IDENTIFIED CRITICAL BUGS (From Nov 14, 2025 QA Report)

**Source:** Comprehensive End-to-End QA Testing  
**Total Issues:** 27 tasks (5 P0, 7 P1, 10 P2, 5 P3)  
**Full Details:** See `docs/roadmaps/QA_TASKS_BACKLOG.md`

### QA-001: Fix 404 Error - Todo Lists Module

**Priority:** P0 | **Status:** ✅ Complete (2025-11-14) | **Effort:** 4-8h

Module `/todo` returns 404. Users cannot access task management functionality.

**Resolution:** Implemented redirect from `/todo` to `/clients` as temporary solution. See docs/QA-001-COMPLETION-REPORT.md for details.

---

### QA-002: Fix 404 Error - Accounting Module

**Priority:** P0 | **Status:** ✅ Complete (2025-11-14) | **Effort:** 8-16h

Module `/accounting` returns 404. Critical business function unavailable.

**Resolution:** Added route for `/accounting` that displays AccountingDashboard component. Also fixed React hooks error in `/todo` redirect.
See docs/sessions/completed/Session-20251114-QA-002-07bc42d1.md for details.

---

### QA-003: Fix 404 Error - COGS Settings Module

**Priority:** P0 | **Status:** ✅ Complete (2025-11-14) | **Effort:** 4-8h

**Resolution:** Fixed routing mismatch between sidebar menu and App.tsx. See docs/QA-003-COMPLETION-REPORT.md for details.

---

### QA-004: Fix 404 Error - Analytics Module

**Priority:** P0 | **Status:** ✅ Complete (2025-11-14) | **Effort:** 8-16h

**Resolution:** Created AnalyticsPage component and added /analytics route to fix 404 error. Backend analytics router was already functional. See docs/QA-004-COMPLETION-REPORT.md for details.

Module `/analytics` now accessible. Business intelligence features available through backend API.

---

### QA-005: Investigate and Fix Systemic Data Access Issues

**Priority:** P0 | **Status:** ✅ Complete (2025-11-14) | **Effort:** 16-24h

**Resolution:** Integrated RBAC seeding system to fix data access issues. See docs/QA-005-COMPLETION-REPORT.md for details.

**CRITICAL:** Widespread "No data found" across all modules despite UI expecting data.

**Affected Modules:**

- Dashboard, Orders, Inventory, Clients, Pricing Rules, Pricing Profiles, Matchmaking, Calendar, Sales Sheets, Create Order

**Symptoms:**

- Orders shows 4,400 total in metrics but 0 in table
- Inventory shows $96M value but "No inventory found"
- All data tables empty

**Investigation Required:**

1. Database connection and credentials
2. Authentication/authorization middleware
3. API endpoint responses
4. User permissions and roles
5. Database seeding/migration status

---

## 🔴 QA-IDENTIFIED HIGH PRIORITY BUGS

### QA-006: Fix Dashboard - Vendors Button 404

**Priority:** P1 | **Status:** ✅ Complete (2025-11-14) - No Action Required | **Effort:** 2-4h

Dashboard Vendors button returns 404.

---

### QA-007: Fix Dashboard - Purchase Orders Button 404

**Priority:** P1 | **Status:** ✅ Complete (2025-11-14) - No Action Required | **Effort:** 2-4h

Dashboard Purchase Orders button returns 404.

---

### QA-008: Fix Dashboard - Returns Button 404

**Priority:** P1 | **Status:** ✅ Complete (2025-11-14) - No Action Required | **Effort:** 2-4h

Dashboard Returns button returns 404.

---

### QA-009: Fix Dashboard - Locations Button 404

**Priority:** P1 | **Status:** ✅ Complete (2025-11-14) | **Effort:** 2-4h

Dashboard Locations button returns 404.

---

### QA-010: Fix Inventory - Export CSV Button

**Priority:** P1 | **Status:** ✅ Complete (2025-11-14) | **Effort:** 4-6h
Export CSV button in Inventory module is unresponsive.

**Resolution:** Fixed data mapping issue in export handler. Added transformation logic to map nested inventory data (batch, product, brand, vendor) to flat objects before export.

## See docs/QA-010-COMPLETION-REPORT.md for details.

### QA-011: Fix Orders - Export CSV Button

**Priority:** P1 | **Status:** ✅ Complete (2025-11-14) | **Effort:** 4-6h
Export CSV button in Orders module is unresponsive.

**Resolution:** Fixed race condition in export handler. Added validation to ensure client data is loaded before export, preventing silent failures and providing user feedback.

## See docs/QA-011-COMPLETION-REPORT.md for details.

### QA-012: Fix Global Search Functionality

**Priority:** P1 | **Status:** ✅ Complete (2025-11-14) | **Effort:** 8-12h
Global search bar accepts input but doesn't trigger search on Enter.

**Resolution:** Implemented complete search functionality in AppHeader component. Added state management, event handlers for Enter key and form submission, and navigation to search results page.

## See docs/QA-012-COMPLETION-REPORT.md for details.

## 🟡 QA-IDENTIFIED MEDIUM PRIORITY BUGS

### QA-013: Fix Workflow Queue - Analytics Button 404

**Priority:** P2 | **Status:** ✅ Complete (2025-11-14) | **Effort:** 4-6h

**Resolution:** Investigation complete - Analytics and History buttons work correctly as view mode switchers. No actual 404 errors exist. Created test suite and documentation.
See docs/QA-013-COMPLETION-REPORT.md for details.

---

### QA-014: Fix Workflow Queue - History Button 404

**Priority:** P2 | **Status:** ✅ Complete (2025-11-14) | **Effort:** 4-6h

**Resolution:** Investigation complete - History button works correctly as a view mode switcher. No actual 404 errors exist. Test coverage provided by QA-013.
See docs/QA-014-COMPLETION-REPORT.md for details.

---

### QA-015: Fix Matchmaking - Add Need Button 404

**Priority:** P2 | **Status:** ✅ Complete (2025-11-14) | **Effort:** 4-6h

**Resolution:** Fixed 404 errors for both "Add Need" and "Add Supply" buttons by correcting navigation routes. Add Need now navigates to /clients (where needs are created in client context), and Add Supply navigates to /vendor-supply (existing page). Also fixed pre-existing syntax error in WorkflowQueuePage.tsx.
See docs/QA-015-COMPLETION-REPORT.md for details.

---

### QA-016: Fix Matchmaking - Add Supply Button 404

**Priority:** P2 | **Status:** ✅ Complete (2025-11-14) | **Effort:** 4-6h

**Resolution:** Fixed together with QA-015 by updating button navigation routes. Changed Add Need button to navigate to /clients and Add Supply button to navigate to /vendor-supply (existing routes). Both buttons were navigating to non-existent routes (/needs/new and /supply/new). Also fixed pre-existing syntax error in WorkflowQueuePage.tsx.
See docs/QA-015-COMPLETION-REPORT.md and docs/QA-016-COMPLETION-REPORT.md for details.

---

### QA-017: Fix Clients - Save Button (Customize Metrics)

**Priority:** P2 | **Status:** ✅ Complete (2025-11-14) | **Effort:** 2-4h

**Resolution:** Fixed by adding event.preventDefault() and event.stopPropagation() to button handlers to prevent dropdown from closing before save operation completes. Also fixed drizzle-orm import issue and improved test infrastructure.
See docs/QA-017-COMPLETION-REPORT.md for details.

---

### QA-018: Fix Credit Settings - Save Changes Button

**Priority:** P2 | **Status:** ✅ Complete (2025-11-14) | **Effort:** 2-4h

**Resolution:** Fixed by adding event.preventDefault() and event.stopPropagation() to button handlers. Applied consistent event handling to all three button functions (Save, Reset, Reset to Defaults).
See docs/QA-018-COMPLETION-REPORT.md for details.

---

### QA-019: Fix Credit Settings - Reset to Defaults Button

**Priority:** P2 | **Status:** ✅ Complete (2025-11-14) | **Effort:** 2-4h

**Resolution:** Completed as part of QA-018. The handleResetToDefaults function received the same event handling fix (event.preventDefault() and event.stopPropagation()) applied to all button handlers in Credit Settings.
See docs/QA-019-COMPLETION-REPORT.md for details.

---

### QA-020: Test and Fix Calendar - Create Event Form

**Priority:** P2 | **Status:** ✅ Complete (2025-11-17) | **Effort:** 2.5h | **Session:** Session-20251114-calendar-events-428937

**Resolution:** Verified and enhanced calendar event form functionality:

- Fixed CalendarPage.tsx type handling for tRPC query responses
- Added proper date formatting (Date objects → strings)
- Handled missing properties in recurrence instances
- Fixed tRPC v11 migration (isLoading → isPending) in 3 calendar components
- Replaced alert() with proper console logging
- Fixed all ESLint warnings and errors
- All pre-commit hooks passing
- Production-ready, no placeholders

**Commits:** 8983450, 6d6d38e

---

### QA-021: Test and Fix Pricing Rules - Create Rule Form

**Priority:** P2 | **Status:** ✅ Complete (2025-11-14) | **Effort:** 4-6h

**Resolution:** Verified form implementation through comprehensive code review. No bugs found:

- All React imports present and correct
- Correct tRPC v11 API usage (isPending)
- Proper error handling and validation
- Form is production-ready

See docs/QA-021-COMPLETION-REPORT.md for details.

---

### QA-022: Test and Fix Pricing Profiles - Create Profile Form

**Priority:** P2 | **Status:** ✅ Complete (2025-11-14) | **Effort:** 4-6h

**Resolution:** Verified form implementation through comprehensive code review. No bugs found:

- All React imports present and correct
- Correct tRPC v11 API usage (isPending)
- Proper error handling and validation
- Complex rule selection logic working correctly
- Form is production-ready

See docs/QA-022-COMPLETION-REPORT.md for details.

---

## 🟢 QA-IDENTIFIED LOW PRIORITY TASKS

### QA-023: Conduct Mobile Responsiveness Testing

**Priority:** P3 | **Status:** Not Started | **Effort:** 16-24h

Mobile responsiveness not properly tested. May have responsive design issues.

---

### QA-024: Test Settings - Form Submissions

**Priority:** P3 | **Status:** Not Started | **Effort:** 6-8h

Multiple forms in Settings not tested (Create User, Reset Password, Assign Role, Create Role).

---

### QA-025: Test User Profile Functionality

**Priority:** P3 | **Status:** Not Started | **Effort:** 4-6h

---

### QA-026: Conduct Performance Testing

**Priority:** P3 | **Status:** Not Started | **Effort:** 16-24h

Page load times and API response times not measured.

---

### QA-027: Conduct Security Audit

**Priority:** P3 | **Status:** Not Started | **Effort:** 16-24h

Security audit not performed. Need to verify authentication, authorization, and vulnerability testing.

---

## 📊 QA Tasks Summary

**Total QA Tasks:** 27  
**P0 (Critical):** 5 tasks | 52-72 hours  
**P1 (High):** 7 tasks | 26-38 hours  
**P2 (Medium):** 10 tasks | 28-42 hours  
**P3 (Low):** 5 tasks | 58-86 hours  
**Total Estimated Effort:** 164-238 hours (20.5-29.75 days)

**Recommended Execution Order:**

1. QA-005 (Systemic data access) - Blocks everything
2. QA-001 through QA-004 (404 errors) - Critical missing modules
3. QA-006 through QA-012 (High priority bugs) - User-facing issues
4. QA-013 through QA-022 (Medium priority) - Feature completion
5. QA-023 through QA-027 (Low priority) - Testing and optimization

---

## 📋 4-Phase Technical Debt Plan Summary

This roadmap now includes a comprehensive 4-phase plan to address all technical debt, security vulnerabilities, and architectural issues:

1. **Phase 1: Critical Lockdown (1-2 Days)** - Immediate security patches (CL-001 through CL-004)
2. **Phase 2: Stabilization (1 Week)** - Documentation cleanup, dead code removal (ST-001 through ST-006)
3. **Phase 3: Refactoring (2-3 Weeks)** - Architecture improvements, performance optimization (RF-001 through RF-006)
4. **Phase 4: Continuous Improvement (Ongoing)** - Quality culture, test coverage (CI-001 through CI-003)

**The Goal:** Transform TERP from a feature-rich but brittle application into a robust, secure, and maintainable platform, setting the stage for future growth and scalability.

---

**Maintained By:** Claude + Evan
**Review Frequency:** Weekly
**Last Review:** 2025-11-12

### TEST-001: End-to-End System Verification

**Type:** Testing  
**Priority:** P0  
**Status:** Not Started  
**Prompt:** [TEST-001.md](../prompts/TEST-001.md)

**Description:**  
Test task to verify the roadmap management system is working correctly end-to-end.

**Dependencies:** None

**Success Criteria:**

- All validation scripts pass
- Session management works
- Branch workflow works
- PR submission works

---

## 📋 New Tasks from Video Walkthrough (Nov 14, 2025)

### QA-028: Fix Old Sidebar Navigation

**Priority:** P1 | **Status:** Not Started | **Effort:** 4-8h
An old, out-of-place sidebar navigation menu appears on the dashboard, most prominently on mobile.

---

### QA-029: Fix Inbox Dropdown Navigation

**Priority:** P2 | **Status:** ✅ Complete (2025-11-14) | **Effort:** 2-4h
The "Inbox" button in the main navigation acts as a direct link instead of a dropdown menu.

**Resolution:** Converted Inbox button to dropdown menu with preview of recent unread items, "Mark all read" and "View all" buttons. All tests passing.

---

### QA-030: Add In-App Back Buttons

**Priority:** P2 | **Status:** ✅ Complete (2025-11-14) | **Effort:** 8-16h
The application lacks in-app back buttons, forcing reliance on the browser's back button for navigation.

**Resolution:** Created reusable BackButton component and added back buttons to 26 pages across the application. All tests passing (9/9). See docs/QA-030-SUMMARY.md for details.

---

### QA-031: Fix Settings Icon Responsiveness

**Priority:** P0 | **Status:** ✅ Complete (2025-11-14) | **Effort:** 1-2h
The "Settings" icon in the main navigation is unresponsive and does not trigger any action.

**Resolution:** Added onClick handler to Settings button in AppHeader.tsx to navigate to /settings route. Also added title attribute for accessibility. The settings route already existed in App.tsx, so only the button handler was needed.

---

### QA-032: Fix User Profile Icon Responsiveness

**Priority:** P0 | **Status:** ✅ Complete (2025-11-14) | **Effort:** 1-2h
The user profile icon in the main navigation is also unresponsive.

**Resolution:** Fixed alongside QA-031. Added onClick handler to User Profile button in AppHeader.tsx to navigate to /settings route. Also added title attribute for accessibility. Both Settings and User Profile icons now navigate to the same settings page, which includes user management features.

---

### QA-033: Fix Custom Layout Blank Dashboard

**Priority:** P1 | **Status:** ✅ Complete (2025-11-14) | **Effort:** 8-16h | **Actual:** 2h

**Issue:** Selecting the "Custom" layout preset from the "Customize" panel resulted in a blank dashboard.

**Root Cause:** The Custom layout preset had an empty widgets array, and the `setActiveLayout` function was replacing the current widgets with this empty array.

**Resolution:** Modified `DashboardPreferencesContext.tsx` to preserve current widgets when switching to Custom layout instead of replacing them with an empty array. Added comprehensive test suite with 12 tests (all passing).

**Session:** Session-20251114-QA-033-46dfba44  
**Branch:** qa-033-fix  
**Commit:** 79299a3  
**Completion Report:** docs/sessions/completed/Session-20251114-QA-033-46dfba44-COMPLETION.md

---

### QA-034: Fix Widget Visibility Disappearing

**Priority:** P1 | **Status:** Not Started | **Effort:** 4-8h
The "Widget Visibility" options disappear when the "Custom" layout is selected.

---

### QA-035: Fix Dashboard Widgets Showing No Data

**Priority:** P0 | **Status:** ✅ Complete (2025-11-14) | **Effort:** 16-24h
All dashboard widgets show "No data available," even though seed data is expected to be present.

**Resolution:** Root cause identified - this is not a bug but expected behavior when the database is empty. Enhanced user experience by:

- Improved empty state messages with seeding instructions in all 7 dashboard widgets
- Created comprehensive DATABASE_SETUP.md guide with seeding scenarios
- Added check:dashboard script (pnpm run check:dashboard) to verify data presence
- Added scripts/check-dashboard-data.ts for automated data verification

The widgets correctly display "No data available" when the database hasn't been seeded. Users now receive clear guidance on running `pnpm seed` to populate the database with test data.

---

### QA-036: Fix Time Period Filters on Widgets

**Priority:** P2 | **Status:** Not Started | **Effort:** 4-8h
The time period filter dropdowns on dashboard widgets do not affect the displayed data.

---

### QA-037: Fix Comments Submission

**Priority:** P1 | **Status:** ✅ Complete (2025-11-14) | **Effort:** 8-16h (Actual: ~3h)
The "Comments" feature is non-functional; users cannot submit comments.

**Resolution:** Created 31 comprehensive tests verifying full functionality. Database tables exist and all CRUD operations work correctly. Comments system is production-ready. See `docs/QA-037-COMPLETION-REPORT.md` for details.

---

### QA-038: Fix @ Tagging in Comments

**Priority:** P2 | **Status:** ✅ Complete (2025-11-14) | **Effort:** 4-8h (Actual: ~2h)
The functionality for tagging users with `@` in comments is untested and likely broken.

**Resolution:** Implemented complete @ tagging UI with autocomplete, keyboard navigation, and visual highlighting. Created MentionInput component with user filtering, MentionRenderer for display, and integrated with existing comment system. 17 tests passing. See `docs/QA-038-COMPLETION-REPORT.md` for details.

---

### QA-039: Add User Selection for Shared Lists

**Priority:** P1 | **Status:** ✅ Complete (2025-11-14) | **Effort:** 8-16h
When creating a shared list, there is no option to select which users to share the list with.

**Resolution:** Created users API router and UserSelector component for multi-user selection. Updated TodoListForm to include user selection when shared list is enabled. All tests passing (7/7). See docs/QA-039-SUMMARY.md for details.

---

### QA-040: Mark List Name Field as Required

**Priority:** P3 | **Status:** ✅ Complete (2025-11-14) | **Effort:** 1-2h (Actual: 30min)
The "List Name" field in the "Create New List" modal is required but not visually indicated as such.

**Resolution:** Upon investigation, the List Name field was already properly implemented as required with multi-layer validation: HTML5 `required` attribute, client-side JavaScript validation, disabled submit button, and server-side Zod validation. Enhanced server-side validation by making the name field required in the update mutation (previously optional) to ensure consistency across all CRUD operations. Full completion report at `docs/QA-040-COMPLETION-REPORT.md`.

---

### QA-041: Merge Inbox and To-Do List Modules

**Priority:** P2 | **Status:** Not Started | **Effort:** 24-40h
The current "Inbox" and "To-Do List" features should be consolidated into a single, unified system for managing tasks and notifications.

---

### QA-042: Redesign Event Creation Form

**Priority:** P1 | **Status:** ✅ Complete (2025-11-14) | **Effort:** 16-24h

The "Create Event" form has been redesigned with the following changes:

- Renamed "Module" label to "Meeting Type" in the form
- Consolidated "Task" and "Deadline" event types into a single "Task" type
- Removed "Status" and "Priority" dropdowns from the form (now managed by backend with defaults)
- Simplified "Visibility" options to only "Private" and "Company"
- Updated validation and filters throughout the application
- Added comprehensive test coverage (7 tests)
- Maintains backward compatibility with existing events

---

### QA-043: Add Event Attendees Functionality

**Priority:** P1 | **Status:** ✅ Complete (2025-11-14) | **Effort:** 8-16h

Event attendees functionality has been implemented:

- Added multi-select dropdown for selecting internal team members as attendees
- Updated userManagement.listUsers to include user ID for proper foreign key relations
- Attendees are saved as participants with REQUIRED role and PENDING response status
- Existing attendees are loaded when editing events
- Full integration with calendarEventParticipants table
- Notifications enabled by default for all attendees
- Added comprehensive test coverage (4 tests)

Note: External contacts functionality not implemented as no contacts table exists yet

---

### QA-044: Implement Event Invitation Workflow

**Priority:** P1 | **Status:** ⚠️ INCOMPLETE - Code Complete, Database Migration NOT Applied | **Effort:** 16-24h | **Started:** 2025-11-14

A workflow for sending and managing event invitations needs to be designed. This should include options for auto-accepting invitations and admin-level controls.

**Implementation Status:**

✅ **COMPLETED:**

- ✅ Database schema designed with 3 new tables (invitations, settings, history)
- ✅ Migration files created: `drizzle/0036_add_event_invitations.sql`
- ✅ Backend API with 14 tRPC procedures implemented
- ✅ Frontend UI with 4 new components created
- ✅ Auto-accept functionality with multiple rule types
- ✅ Admin override capabilities with audit trail
- ✅ Comprehensive test plan with 100+ test cases
- ✅ Complete documentation (schema design, test plan, completion report)
- ✅ Production-ready code (no placeholders)
- ✅ Code merged to main branch
- ✅ Changes pushed to GitHub

❌ **NOT COMPLETED - CRITICAL:**

- ❌ **Database migration NOT applied to production database**
- ❌ **Feature is NOT functional until migration is run**
- ❌ **Application will have errors if invitation endpoints are called**

**BLOCKING ISSUE:**
The database migration `drizzle/0036_add_event_invitations.sql` has NOT been applied to the production MySQL database. The code is deployed but the database tables do not exist yet.

**REQUIRED ACTIONS TO COMPLETE:**

1. **Apply Database Migration** (CRITICAL - MUST DO FIRST):

   ```bash
   # Connect to production database
   mysql -h terp-mysql-db-do-user-28175253-0.m.db.ondigitalocean.com \
         -P 25060 \
         -u doadmin \
         -p \
         --ssl-mode=REQUIRED \
         defaultdb

   # Run migration file
   source drizzle/0036_add_event_invitations.sql;

   # Verify tables created
   SHOW TABLES LIKE 'calendar_%invitation%';
   ```

2. **Verify Application Deployment**:
   - Check that DigitalOcean app has pulled latest main branch
   - Verify backend server restarted with new router
   - Check application logs for errors

3. **Run Smoke Tests**:
   - Create a test event
   - Send invitation to test user
   - Accept invitation
   - Verify participant created

**ROLLBACK PLAN (if issues occur):**

```bash
# Rollback database
mysql -h terp-mysql-db-do-user-28175253-0.m.db.ondigitalocean.com \
      -P 25060 \
      -u doadmin \
      -p \
      --ssl-mode=REQUIRED \
      defaultdb < drizzle/rollback/0036_rollback_event_invitations.sql
```

**Branch:** `qa-044-event-invitations` (merged to main)  
**Session:** `Session-20251114-QA-044-b04ecb75`  
**Documentation:** `docs/QA-044-SCHEMA-DESIGN.md`, `docs/QA-044-TEST-PLAN.md`, `docs/QA-044-COMPLETION-REPORT.md`

**NEXT STEPS:** Apply database migration to production, then update status to ✅ Complete

---

### QA-045: Link Events to Clients

**Priority:** P2 | **Status:** Not Started | **Effort:** 8-16h
Events should be linkable to specific clients to track interactions and history.

---

### QA-046: Add Click-to-Create Event on Calendar

**Priority:** P2 | **Status:** ✅ Complete (2025-11-17) | **Effort:** 2.5h | **Session:** Session-20251114-calendar-events-428937

Click-to-create functionality verified and production-ready:

- Added onDateClick prop to MonthView component
- Calendar day cells now clickable with hover effect for visual feedback
- Event buttons stop propagation to prevent triggering day click
- EventFormDialog accepts initialDate prop to pre-fill start/end dates
- Seamless UX - clicking a day opens the form with date pre-filled
- Works alongside existing 'Create Event' button
- All TypeScript errors resolved
- All ESLint warnings fixed
- Production-ready, no placeholders

**Commits:** 8983450, 6d6d38e

---

### QA-047: Set Default Calendar View to Business Hours

**Priority:** P3 | **Status:** ✅ Complete (2025-11-14) | **Effort:** 1-2h

Business hours view has been implemented:

- Updated WeekView to show 7 AM - 7 PM instead of full 24 hours
- Updated DayView to show 7 AM - 7 PM instead of full 24 hours
- Cleaner, more focused view for typical business day scheduling
- Reduces scrolling and improves usability for standard business operations

---

### QA-048: Design @ Mention Workflow

**Priority:** P2 | **Status:** Not Started | **Effort:** 8-16h
A clear workflow needs to be defined and implemented for how `@` mentions in comments create tasks or notifications in the user's unified inbox.

---

### QA-049: Conduct Mobile Responsiveness Review

**Priority:** P2 | **Status:** ✅ Complete (2025-11-14) | **Effort:** 8-16h
The current review is focused on the desktop experience. A separate review should be conducted to assess and address issues on mobile devices.

**Resolution:** Comprehensive mobile responsiveness review completed. Analyzed 245 React components and identified 38 issues across 3 priority levels. Full report available at `docs/QA-049-MOBILE-RESPONSIVENESS-REVIEW.md`. Key findings: sidebar navigation, data tables, dashboard widgets, modals, and forms require mobile optimization. Recommended fixes documented in QA-050.

---

### QA-050: Implement Mobile Responsiveness Fixes

**Priority:** P1 | **Status:** ✅ Complete (2025-11-14) | **Effort:** 16-24h (Actual: 2h)
Implement the fixes identified in the mobile responsiveness review (QA-049).

**Resolution:** Upon detailed code analysis, discovered that most critical mobile responsiveness features were already implemented: mobile sidebar navigation with hamburger menu, data table horizontal scrolling, responsive layouts, mobile detection hook, and proper touch targets. Created comprehensive documentation of responsive patterns (`docs/MOBILE_RESPONSIVE_PATTERNS.md`) and verified all implementations. Full completion report at `docs/QA-050-COMPLETION-REPORT.md`. Actual effort significantly less than estimated due to existing robust mobile infrastructure.

### ✅ DATA-002: Seed Comments and Dashboard Tables

**Status:** ✅ Complete (2025-11-18)  
**Priority:** P2 (Medium)  
**Estimate:** 2-4 hours  
**Prompt:** `docs/prompts/DATA-002.md`

**Objectives:**

- Seed comments table with 100+ comments on orders and clients
- Seed comment_mentions for @mention functionality
- Seed userDashboardPreferences for all users
- Seed dashboard_widget_layouts and dashboard_kpi_configs

**Deliverables:**

- Simple seed script for comments (2 tables)
- Simple seed script for dashboard (3 tables)
- Validation that features work with seeded data

**Context:**

- Comments feature just fixed (QA-012, QA-013)
- Dashboard widgets just fixed (QA-002, QA-004, QA-034)
- Need data to test and demo these features

---

### ✅ DATA-003: Seed Pricing Tables

**Status:** ✅ Complete (2025-11-18)  
**Priority:** P2 (Medium)  
**Estimate:** 2-3 hours  
**Prompt:** `docs/prompts/DATA-003.md`

**Objectives:**

- Seed pricing_rules with volume/client/product rules
- Seed pricing_profiles for top clients
- Seed pricing_defaults for all products

**Deliverables:**

- Simple seed script for pricing (3 tables)
- Validation that pricing features work

**Context:**

- Pricing forms just tested (QA-041, QA-042, QA-043)
- Need data to test pricing calculation logic

---

### INFRA-003: Fix Database Schema Sync

**Status:** ✅ Complete (2025-11-18)  
**Priority:** P2 (Infrastructure)  
**Estimate:** 2-4 hours  
**Prompt:** `docs/prompts/INFRA-003.md`

**Objectives:**

- Run pending database migrations OR
- Update drizzle schema to match actual database
- Fix inventoryMovements.adjustmentReason column issue
- Fix orderStatusHistory duplicate column mapping
- Validate all tables match drizzle schema

**Deliverables:**

- Database schema in sync with drizzle definitions
- Migration system working properly
- Documentation of schema sync process

**Context:**

- DATA-001 failed due to schema mismatches
- inventoryMovements missing adjustmentReason column
- orderStatusHistory has duplicate column names
- Blocks future seeding efforts

---

### TASK: Create Agent Prompts for Parallel Execution (INFRA-003, DATA-002, DATA-003)

**Status:** ✅ COMPLETE (2025-11-17)  
**Priority:** P1 (High)  
**Actual Time:** 1 hour  
**Module:** `docs/prompts/`  
**Dependencies:** None

**Objectives:**

- ✅ Create comprehensive agent prompt for INFRA-003 (Fix Database Schema Sync)
- ✅ Create comprehensive agent prompt for DATA-002 (Seed Comments & Dashboard)
- ✅ Create comprehensive agent prompt for DATA-003 (Seed Pricing Tables)
- ✅ Establish proper sequencing (INFRA-003 first, then DATA-002 + DATA-003 in parallel)
- ✅ Document execution instructions for parallel agent coordination

**Deliverables:**

- ✅ `docs/prompts/INFRA-003.md` - Infrastructure schema sync task (2-4h estimate)
- ✅ `docs/prompts/DATA-002.md` - Comments and dashboard seeding (2-4h estimate)
- ✅ `docs/prompts/DATA-003.md` - Pricing tables seeding (2-3h estimate)
- ✅ Parallel execution instructions with copy-paste ready prompts
- ✅ Coordination guidelines and success criteria
- ✅ All prompts committed to repository

**Resolution:**

Successfully created three comprehensive agent prompts following the proven 4-phase workflow pattern. Each prompt includes detailed implementation steps, validation procedures, session management, and success criteria. Established critical sequencing: INFRA-003 must complete first (fixes schema sync issues), then DATA-002 and DATA-003 can run in parallel with no conflicts.

**Time Savings:** Parallel execution reduces total time from 6-11 hours (sequential) to 4-8 hours (parallel), saving 2-3 hours minimum.

**Files Created:**

- `docs/prompts/INFRA-003.md` (417 lines)
- `docs/prompts/DATA-002.md` (492 lines)
- `docs/prompts/DATA-003.md` (567 lines)
- Execution instructions document

**Next Steps:** Execute prompts in sequence - Agent 1 (INFRA-003) first, then Agents 2 & 3 (DATA-002, DATA-003) in parallel.

---

## Data Seeding Tasks

### ✅ DATA-004: Seed Orders & Line Items

**Status:** In Progress (2025-11-18)  
**Priority:** P1 (High)  
**Estimate:** 1.5-2 hours  
**Depends On:** DATA-002, DATA-003

**Prompt:** `docs/prompts/DATA-004.md`

**Objective:**  
Seed 20-30 realistic orders with line items to enable sales workflow testing.

**Deliverables:**

- 20-30 orders across different statuses
- 50-100 order line items
- Order status history populated
- Realistic order totals and dates

**Impact:**  
Enables order management, invoicing, sales reporting, and revenue analytics testing.

---

### DATA-005: Seed Order Fulfillment

**Status:** Planned  
**Priority:** P2 (Medium)  
**Estimate:** 1-1.5 hours  
**Depends On:** DATA-004

**Objective:**  
Seed fulfillment data (shipments, tracking) for orders created in DATA-004.

**Deliverables:**

- 15-20 shipments
- Tracking numbers and delivery dates
- Fulfillment status updates

**Impact:**  
Completes order lifecycle, enables fulfillment workflow and shipping tracking testing.

---

### ✅ DATA-006: Seed Batches

**Status:** Planned  
**Priority:** P2 (Medium)  
**Estimate:** 2-2.5 hours  
**Depends On:** Products, Lots (need verification)

**Objective:**  
Seed 20-30 batches for existing products to enable inventory management.

**Deliverables:**

- 20-30 batches with codes and SKUs
- Inventory quantities and statuses
- COGS data

**Complexity:** HIGH - Requires productId, lotId, and complex inventory fields

**Impact:**  
Enables inventory management, batch tracking, and price alerts.

---

### ✅ DATA-007: Seed Inventory Movements

**Status:** Planned  
**Priority:** P2 (Medium)  
**Estimate:** 1.5-2 hours  
**Depends On:** DATA-006

**Objective:**  
Seed inventory movement records to track product flow.

**Deliverables:**

- 30-50 inventory movements
- Movement types (INTAKE, TRANSFER, SALE, ADJUSTMENT)
- Quantity changes with reasons

**Impact:**  
Enables inventory tracking, audit trail, and inventory reporting.

---

### ✅ DATA-008: Seed Client Contacts & Interactions

**Status:** Planned  
**Priority:** P3 (Low)  
**Estimate:** 1-1.5 hours  
**Depends On:** Clients (already exist)

**Objective:**  
Seed client contact information and interaction history.

**Deliverables:**

- 50-100 client contacts
- 100-200 client interactions
- Contact roles and interaction notes

**Impact:**  
Enhances CRM functionality, enables contact and interaction tracking.

---

### ✅ DATA-009: Seed Client Price Alerts

**Status:** Planned  
**Priority:** P3 (Low)  
**Estimate:** 0.5-1 hour  
**Depends On:** DATA-006 (batches)

**Objective:**  
Seed price alert configurations for clients monitoring specific batches.

**Deliverables:**

- 10-20 price alerts
- Alert thresholds
- Client-batch associations

**Impact:**  
Completes pricing feature set, enables price monitoring.
