# Code Quality Stabilization Implementation Plan

## Overview

This streamlined implementation plan focuses on **fixes first, tooling later**. The plan prioritizes eliminating immediate blockers (TypeScript errors, test failures, diagnostics) before building infrastructure and monitoring systems.

## Phase 1: Critical Blockers (Fix First)

**Objective:** Get codebase to green signal - eliminate development blockers
**Acceptance:** `pnpm check` passes or minimal allowlist; `pnpm test` failures → 0 or documented skips; vipPortalAdmin diagnostics = 0

### 1. Fix TypeScript Errors in High-Priority Backend Files

- [ ] 1.1 Fix TypeScript errors in critical backend services
  - Fix TypeScript errors in `server/services/priceAlertsService.ts`
  - Fix TypeScript errors in `server/services/pricingService.ts`
  - Fix TypeScript errors in `server/utils/softDelete.ts`
  - Fix TypeScript errors in `server/webhooks/` directory
  - Fix TypeScript errors in test setup files
  - **Acceptance:** `pnpm check` passes or minimal documented allowlist with 0 new errors
  - _Requirements: 1.1, 1.2_

### 2. Fix Test Infrastructure and Stabilize Core Suites

- [ ] 2.1 Fix critical test infrastructure issues
  - Resolve `testClientId` undefined issues in test setup
  - Fix `teri_code` constraint violations in test fixtures
  - Repair `groupBy` mock configuration issues
  - Fix database setup/teardown procedures in test utilities
  - _Requirements: 2.2, 2.5_

- [ ] 2.2 Stabilize core integration test suites
  - Fix failing tests in `server/**/*.test.ts` files
  - Repair client-side test failures in `client/**/*.test.tsx` files
  - Ensure test isolation and proper cleanup
  - **Acceptance:** `pnpm test` failures → 0 or explicitly skipped with reasons; core integration suites green
  - _Requirements: 2.1, 2.3, 2.4_

### 3. Fix VIP Portal Admin Diagnostics

- [ ] 3.1 Resolve vipPortalAdmin.ts diagnostic issues
  - Fix `liveCatalog` type issues and undefined handling
  - Resolve `snapshotQuantity` type mismatches
  - Fix leaderboard JSON configuration type safety
  - Add proper error handling and default values
  - **Acceptance:** 0 diagnostics in vipPortalAdmin.ts; leaderboard JSON guarded
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

## Phase 2: CI Hardening (After Green Signal)

**Objective:** Prevent regression of fixed issues
**Prerequisites:** Phase 1 complete - TypeScript errors eliminated, tests stabilized

### 4. Add CI Validation Gates

- [ ] 4.1 Add TypeScript checking to CI pipeline (only after Phase 1 complete)
  - Update existing GitHub Actions workflows to include `pnpm check`
  - Configure TypeScript checking to run on all PRs and pushes
  - Set up proper failure handling and error reporting
  - **Acceptance:** CI blocks TypeScript errors; `pnpm check` gate active
  - _Requirements: 1.4, 4.3, 4.5_

- [ ] 4.2 Implement migration linting system
  - Create migration linting utility that scans SQL files
  - Implement rules to block DROP, RENAME, and narrowing MODIFY operations
  - Add GitHub Actions workflow for migration validation
  - Configure blocking behavior for dangerous operations
  - **Acceptance:** Migration lint blocks dangerous operations; clear error messages
  - _Requirements: 4.2, 7.4_

- [ ] 4.3 Enhance existing schema drift prevention in CI
  - Extend existing schema validation workflow with migration linting
  - Implement comprehensive quality gate enforcement
  - **Acceptance:** Schema drift CI already present; enhanced with migration lint
  - _Requirements: 4.1_

## Phase 3: Staging/Production Readiness

**Objective:** Enable safe deployment with validation
**Prerequisites:** Phase 2 complete - CI hardening active

### 5. Staging Environment Validation

- [ ] 5.1 Implement staging deployment validation utilities
  - Create database backup verification system before deployments
  - Implement SSL/host configuration validation (`ssl-mode=REQUIRED`, `rejectUnauthorized=false`)
  - Build schema validation runner for staging environment
  - **Acceptance:** Backup required before applying; host/SSL guard enforcement
  - _Requirements: 5.1, 5.2, 5.3_

- [ ] 5.2 Create smoke testing framework for critical flows
  - Implement smoke tests for inventory alerts functionality
  - Create VIP portal leaderboard smoke tests
  - Build smoke tests for batches, purchase orders, returns, communications
  - **Acceptance:** Smoke critical flows; all tests pass
  - _Requirements: 5.4, 5.5_

### 6. Production Rollout Strategy

- [ ] 6.1 Create production deployment orchestration system
  - Implement deployment sequence validation (same as staging)
  - Create rollback procedure automation
  - Build deployment status monitoring and reporting
  - _Requirements: 6.2, 6.3_

- [ ] 6.2 Implement production validation and monitoring
  - Create production schema validation runner
  - Implement post-deployment smoke test execution
  - Build deployment success/failure reporting
  - **Acceptance:** Prod validation = 0 issues; smoke tests pass; rollback ready
  - _Requirements: 6.4, 6.5_

## Phase 4: Standards & SOP

**Objective:** Establish standards for future changes
**Prerequisites:** Can run in parallel with Phase 3

### 7. Schema Management Standards

- [ ] 7.1 Create migration template and validation system
  - Implement ADD/widen-only migration template generator
  - Create MySQL version guard validation
  - Build DESCRIBE verification and rollback stub generator
  - _Requirements: 7.2, 7.3_

- [ ] 7.2 Establish schema change documentation and SOP
  - Create naming convention documentation (Drizzle field = DB column)
  - Implement migration template with required elements
  - Create team documentation and reference materials
  - **Acceptance:** SOP + template committed; referenced in team docs
  - _Requirements: 7.1, 7.5_

## Phase 5: Monitoring

**Objective:** Ongoing drift prevention and monitoring
**Prerequisites:** Phase 1-4 complete

### 8. Drift Prevention Monitoring

- [ ] 8.1 Implement scheduled schema validation monitoring
  - Create nightly `pnpm validate:schema` execution on main branch
  - Implement validation result reporting and alerting
  - Build drift detection and notification system
  - **Acceptance:** Scheduled drift checks running; clear action on drift detection
  - _Requirements: 8.1, 8.3, 8.4_

- [ ] 8.2 Centralize database configuration management
  - Create centralized database utility configuration
  - Implement host guard and SSL defaults enforcement
  - Build configuration validation and drift detection
  - **Acceptance:** Guard defaults enforced; centralized config
  - _Requirements: 8.2_

## Phase 6: Final Validation & Documentation

**Objective:** Complete system integration and documentation
**Prerequisites:** All previous phases complete

### 9. Comprehensive System Validation

- [ ] 9.1 Run comprehensive system validation
  - Ensure all tests pass, ask the user if questions arise
  - Verify TypeScript compilation succeeds (`pnpm check` returns 0)
  - Confirm test harness stability (`pnpm test` returns 0 failures)
  - Validate CI pipeline hardening is functional
  - Check staging and production validation systems work
  - _Requirements: All requirements_

### 10. Documentation and Runbooks

- [ ] 10.1 Create comprehensive system documentation
  - Document all implemented systems and their usage
  - Create troubleshooting guides for common issues
  - Build runbooks for deployment and monitoring procedures
  - _Requirements: 6.1, 7.1, 7.5, 8.5_

## Deferred Tasks (Later/Optional)

**Note:** These tasks add valuable tooling but are deferred until after the codebase is stable:

### Analysis & Tooling Systems (Deferred)

- TypeScript error analysis and prioritization system (1.1)
- Error allowlist management system (1.3) - prefer fix-first approach
- Test failure analysis and categorization system (2.1)
- Diagnostic analysis system for vipPortalAdmin.ts (3.1)
- System health monitoring dashboard (10.2)

### Property-Based Tests (Deferred)

- Property test for TypeScript compilation success (1.4)
- Property test for test execution stability (2.4)
- Property test for VIP Portal Admin functionality (3.3)
- Property test for CI TypeScript enforcement (4.4)
- Property test for schema drift CI prevention (4.5)
- Property test for migration linting enforcement (4.6)
- Property test for environment schema validation (5.3)
- Property test for deployment backup procedures (5.4)
- Property test for smoke test validation (5.5)
- Property test for deployment process consistency (6.3)
- Property test for migration template compliance (7.3)
- Property test for database configuration centralization (8.3)
- Property test for drift detection response (8.4)

## Execution Strategy

### Immediate Focus: Fixes First

1. **Phase 1:** Fix TypeScript errors, test failures, vipPortalAdmin diagnostics
2. **Phase 2:** Add CI gates (only after Phase 1 is green)
3. **Phase 3-6:** Build infrastructure, standards, monitoring

### Key Principles

- **No tooling before fixes:** Don't build analysis systems until issues are resolved
- **No CI gates until green:** Don't add `pnpm check` to CI until TypeScript errors are eliminated
- **Fix-first approach:** Prefer fixing errors over allowlisting them
- **Incremental validation:** Validate after each fix to prevent breaking working code

## Success Criteria

### Phase 1 Success (Critical)

- [ ] `pnpm check` passes or minimal documented allowlist with 0 new errors
- [ ] `pnpm test` failures → 0 or explicitly skipped with documented reasons
- [ ] Core integration suites are green and provide reliable feedback
- [ ] vipPortalAdmin.ts has 0 diagnostic errors
- [ ] Leaderboard JSON configuration is properly guarded

### Phase 2 Success (CI Hardening)

- [ ] CI blocks TypeScript errors with clear messages
- [ ] Migration linting blocks dangerous operations (DROP/RENAME/narrowing MODIFY)
- [ ] Schema drift prevention enhanced with migration linting

### Phase 3-6 Success (Infrastructure)

- [ ] Staging validation with backup/SSL/host guards enforced
- [ ] Production rollout with same validation sequence as staging
- [ ] Migration template and SOP documented and committed
- [ ] Nightly schema validation monitoring active
- [ ] Centralized database configuration with guard defaults

## Risk Mitigation

### High-Risk Areas

1. **Breaking working tests during fixes**
   - Mitigation: Fix incrementally, validate after each change
2. **CI blocking legitimate deployments**
   - Mitigation: Only add CI gates after codebase is green
3. **Allowlist institutionalizing debt**
   - Mitigation: Fix-first approach, allowlist only as last resort

### Rollback Plans

- Git-based rollback for all code changes
- CI configuration rollback for pipeline changes
- Each phase can be rolled back independently
