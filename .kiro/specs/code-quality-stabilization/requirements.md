# Code Quality Stabilization Requirements

## Introduction

Following the successful completion of schema drift fixes (Tasks A & D from QA Follow-up), there are 8 remaining critical tasks needed to complete the code quality stabilization initiative. These tasks address pre-existing TypeScript errors, test failures, and infrastructure hardening that were deferred during the schema drift emergency response.

The current state shows significant technical debt that is blocking development velocity and masking new regressions:

- ~100+ TypeScript errors across the codebase
- 52 failing tests in the test harness
- 14 diagnostics errors in vipPortalAdmin.ts
- Missing CI hardening for schema validation
- No staging/production rollout plan for schema fixes

## Glossary

- **TypeScript Errors**: Compilation errors, type mismatches, and linting violations detected by `pnpm check`
- **Test Harness**: The automated testing infrastructure including unit tests, integration tests, and test utilities
- **Diagnostics**: IDE-level error detection including TypeScript compiler errors and linting issues
- **CI Hardening**: Strengthening continuous integration pipeline with additional validation checks
- **Schema Drift**: Misalignment between Drizzle ORM definitions and actual database structure
- **Migration Linting**: Automated validation of database migration files to prevent dangerous operations
- **Staging Rollout**: Controlled deployment of changes to staging environment for validation
- **Production Rollout**: Final deployment of validated changes to production environment
- **SOP**: Standard Operating Procedure for repeatable processes

## Requirements

### Requirement 1: TypeScript Error Elimination

**User Story:** As a developer, I want a clean TypeScript compilation so that new regressions are immediately visible and development velocity is not impacted by noise.

#### Acceptance Criteria

1. WHEN running `pnpm check` THEN the system SHALL return exit code 0 with no TypeScript errors
2. WHEN TypeScript errors are fixed THEN the system SHALL prioritize high-churn backend files first (priceAlertsService, pricingService, softDelete, webhooks, test setup)
3. WHEN errors are resolved THEN the system SHALL maintain a documented minimal allowlist if any errors cannot be immediately fixed
4. WHEN new code is written THEN the system SHALL prevent introduction of new TypeScript errors through CI validation
5. WHEN error fixing is complete THEN the system SHALL have reduced the error count from ~100+ to 0 or documented allowlist

### Requirement 2: Test Harness Stabilization

**User Story:** As a developer, I want a reliable test suite so that CI has clear signal and I can confidently deploy changes without breaking existing functionality.

#### Acceptance Criteria

1. WHEN running `pnpm test` THEN the system SHALL have 0 failing tests or explicitly skipped tests with documented reasons
2. WHEN test failures occur THEN the system SHALL fix setup/fixtures/mocks including `testClientId` undefined, `teri_code` constraints, and `groupBy` mocks
3. WHEN tests are stabilized THEN the system SHALL ensure core integration suites are green and provide reliable feedback
4. WHEN test infrastructure is fixed THEN the system SHALL reduce failing tests from 52 to 0 or documented skips
5. WHEN tests pass THEN the system SHALL maintain test stability through proper setup and teardown procedures

### Requirement 3: VIP Portal Admin Diagnostics Resolution

**User Story:** As a developer, I want clean diagnostics in vipPortalAdmin.ts so that the remaining schema-related errors are eliminated and the module is fully functional.

#### Acceptance Criteria

1. WHEN running diagnostics on `server/routers/vipPortalAdmin.ts` THEN the system SHALL return 0 diagnostic errors
2. WHEN fixing diagnostics THEN the system SHALL resolve liveCatalog type issues, snapshotQuantity problems, and other identified errors
3. WHEN leaderboard functionality is accessed THEN the system SHALL ensure JSON guards and defaults are safe and prevent runtime errors
4. WHEN diagnostics are clean THEN the system SHALL have eliminated all 14 pre-existing errors without introducing new ones
5. WHEN vipPortalAdmin is fixed THEN the system SHALL maintain full functionality of all admin features

### Requirement 4: CI Pipeline Hardening

**User Story:** As a DevOps engineer, I want robust CI validation so that schema drift regressions are prevented and dangerous migrations are blocked before they reach production.

#### Acceptance Criteria

1. WHEN schema validation workflow runs THEN the system SHALL block PRs and pushes that introduce schema drift
2. WHEN migrations are created THEN the system SHALL implement migration linting to fail on DROP, RENAME, or narrowing MODIFY operations
3. WHEN TypeScript errors are eliminated THEN the system SHALL add `pnpm check` to CI pipeline to prevent new errors
4. WHEN CI hardening is complete THEN the system SHALL have a plan ready for enabling TypeScript checking in CI
5. WHEN dangerous operations are attempted THEN the system SHALL prevent deployment and provide clear error messages

### Requirement 5: Staging Environment Validation

**User Story:** As a QA engineer, I want to validate changes in staging so that production deployments are safe and schema changes are proven before rollout.

#### Acceptance Criteria

1. WHEN deploying to staging THEN the system SHALL backup the staging database before applying changes
2. WHEN connecting to staging THEN the system SHALL ensure host guard and SSL configuration (`ssl-mode=REQUIRED`, `rejectUnauthorized=false`)
3. WHEN validating staging THEN the system SHALL run `pnpm validate:schema` and expect 0 drift issues
4. WHEN testing staging THEN the system SHALL smoke test critical flows: inventory alerts, vip portal leaderboard, batches, purchase orders, returns, communications
5. WHEN staging validation passes THEN the system SHALL confirm no host/SSL violations and all smoke tests pass

### Requirement 6: Production Rollout Strategy

**User Story:** As a system administrator, I want a safe production deployment process so that schema fixes can be applied with confidence and rollback capability.

#### Acceptance Criteria

1. WHEN planning production rollout THEN the system SHALL define a maintenance window and prepare database backup procedures
2. WHEN deploying to production THEN the system SHALL prepare git rollback steps and database restoration procedures
3. WHEN applying changes THEN the system SHALL follow the same sequence as staging validation
4. WHEN production deployment completes THEN the system SHALL run `pnpm validate:schema` and expect 0 issues
5. WHEN rollout is complete THEN the system SHALL have smoke tests passing, logs monitored, and rollback procedures ready

### Requirement 7: Schema Management Standards

**User Story:** As a database administrator, I want standardized schema change procedures so that future migrations are safe and follow consistent patterns.

#### Acceptance Criteria

1. WHEN creating schema changes THEN the system SHALL document naming convention: Drizzle field name equals database column name (especially enums)
2. WHEN writing migrations THEN the system SHALL use ADD/widen-only migration template with MySQL version guard and verification
3. WHEN creating migrations THEN the system SHALL include DESCRIBE verification and rollback stub procedures
4. WHEN dangerous operations are needed THEN the system SHALL forbid DROP/RENAME/narrowing MODIFY operations without explicit approval
5. WHEN standards are established THEN the system SHALL have SOP and template committed and referenced in team documentation

### Requirement 8: Ongoing Drift Prevention

**User Story:** As a system maintainer, I want automated drift detection so that schema misalignments are caught early and prevented from accumulating.

#### Acceptance Criteria

1. WHEN implementing monitoring THEN the system SHALL add nightly/scheduled `pnpm validate:schema` execution on main branch
2. WHEN configuring database utilities THEN the system SHALL centralize host guard and SSL defaults to prevent connection issues
3. WHEN drift is detected THEN the system SHALL define clear failure handling with alerts and blocking mechanisms
4. WHEN monitoring is active THEN the system SHALL have scheduled drift checks running and guard defaults enforced
5. WHEN drift occurs THEN the system SHALL have clear action plans for drift detection and resolution
