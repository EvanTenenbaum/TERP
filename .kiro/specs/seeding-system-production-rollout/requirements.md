# Requirements Document

## Introduction

This specification defines the production rollout plan for the TERP Database Seeding System (DATA-011). The seeding system has been implemented and tested locally with Phase 1 (infrastructure) and Phase 2 (individual table seeders) complete. This rollout plan covers deploying the system to the production/beta environment, validating it works correctly, and establishing operational procedures.

## Glossary

- **Seeding System**: The modular database seeding infrastructure in `scripts/seed/`
- **Beta Environment**: The DigitalOcean App Platform deployment used for beta testing (https://terp-app-b9s35.ondigitalocean.app)
- **PII Masking**: Automatic anonymization of personally identifiable information
- **FK Dependency Order**: The sequence of table operations that respects foreign key constraints
- **Advisory Lock**: MySQL `GET_LOCK()` mechanism for concurrency control
- **Dry Run**: Preview mode that shows what would happen without making changes

## Requirements

### Requirement 1

**User Story:** As a developer, I want to verify the seeding system works in the production environment, so that I can confidently use it for beta testing data setup.

#### Acceptance Criteria

1. WHEN the seeding system is deployed to DigitalOcean THEN the system SHALL successfully connect to the production database
2. WHEN running `pnpm seed:new --dry-run` in production THEN the system SHALL complete without errors and show accurate preview
3. WHEN running `pnpm seed:new --clean --size=small --force` in production THEN the system SHALL seed all 7 tables successfully
4. IF the database connection fails THEN the system SHALL provide clear error messages with troubleshooting guidance

### Requirement 2

**User Story:** As a system administrator, I want the seeding system to have proper environment safeguards, so that production data is protected from accidental modification.

#### Acceptance Criteria

1. WHEN running in production environment without `--force` flag THEN the system SHALL require explicit confirmation
2. WHEN PII masking is enabled in non-production THEN the system SHALL mask all sensitive fields (email, phone, name, address)
3. WHEN PII masking is disabled in production THEN the system SHALL preserve real data integrity
4. WHEN the `--clean` flag is used in production THEN the system SHALL require `--force` flag for safety

### Requirement 3

**User Story:** As a developer, I want clear documentation for production seeding operations, so that I can safely seed the beta environment.

#### Acceptance Criteria

1. WHEN a developer needs to seed production THEN the documentation SHALL provide step-by-step instructions
2. WHEN troubleshooting is needed THEN the documentation SHALL include common error scenarios and solutions
3. WHEN rollback is needed THEN the documentation SHALL provide manual rollback procedures
4. WHEN monitoring seeding operations THEN the documentation SHALL explain how to view logs and verify success

### Requirement 4

**User Story:** As a QA engineer, I want to verify seeded data quality, so that I can trust the beta environment for testing.

#### Acceptance Criteria

1. WHEN seeding completes THEN the system SHALL report accurate record counts per table
2. WHEN FK constraints exist THEN the seeded data SHALL maintain referential integrity
3. WHEN validation errors occur THEN the system SHALL log specific field-level errors
4. WHEN seeding is successful THEN the application SHALL function correctly with seeded data

### Requirement 5

**User Story:** As a system administrator, I want to clean up legacy seeding code, so that the codebase is maintainable.

#### Acceptance Criteria

1. WHEN the new seeding system is validated THEN the legacy `SKIP_SEEDING` bypass SHALL be deprecated with warnings
2. WHEN deprecation warnings are added THEN the system SHALL continue to function for backward compatibility
3. WHEN legacy code is archived THEN the old seeding scripts SHALL be moved to `scripts/legacy/`
4. WHEN documentation is updated THEN all references SHALL point to the new seeding system
