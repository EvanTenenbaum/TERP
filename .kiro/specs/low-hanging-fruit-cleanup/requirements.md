# Requirements Document

## Introduction

This spec addresses multiple low-hanging fruit tasks identified in the MASTER_ROADMAP that can be quickly resolved to improve code quality, security, and reliability. These are small, focused fixes that don't require architectural changes.

## Glossary

- **Structured Logger**: The pino-based logger at `server/_core/logger.ts` that provides JSON-formatted, searchable logs
- **Connection Pool**: MySQL connection pool managed by `server/_core/connectionPool.ts`
- **Memory Leak**: Unreleased resources (like intervals) that accumulate over time
- **MYSQL_PWD**: Environment variable for securely passing MySQL passwords

## Requirements

### Requirement 1: Connection Pool Memory Leak Fix (REL-003)

**User Story:** As a system administrator, I want the connection pool to properly clean up resources, so that the application doesn't leak memory over time.

#### Acceptance Criteria

1. WHEN the connection pool creates a statistics logging interval THEN the system SHALL store the interval reference in a module-level variable
2. WHEN closeConnectionPool() is called THEN the system SHALL clear the statistics interval before closing the pool
3. WHEN the pool is closed THEN the system SHALL set the interval reference to null

### Requirement 2: Connection Pool Configuration (REL-004)

**User Story:** As a system administrator, I want optimal connection pool settings, so that the database can handle production load.

#### Acceptance Criteria

1. WHEN the connection pool is created THEN the system SHALL use a connectionLimit of 25 (not 10)
2. WHEN the connection pool is created THEN the system SHALL use a queueLimit of 100 (not 0)

### Requirement 3: Backup Script Security (IMPROVE-001)

**User Story:** As a security engineer, I want database passwords to be passed securely, so that credentials are not exposed in process listings.

#### Acceptance Criteria

1. WHEN the backup script runs THEN the system SHALL NOT pass the password via --password command line argument
2. WHEN the backup script runs THEN the system SHALL set MYSQL_PWD environment variable before mysqldump
3. WHEN mysqldump completes THEN the system SHALL unset MYSQL_PWD from the environment

### Requirement 4: Structured Logging - clientNeedsDbEnhanced (QUAL-001-A)

**User Story:** As a DevOps engineer, I want structured logging in clientNeedsDbEnhanced.ts, so that errors are searchable and parseable in production.

#### Acceptance Criteria

1. WHEN an error occurs in clientNeedsDbEnhanced.ts THEN the system SHALL log using logger.error() with structured format
2. WHEN logging errors THEN the system SHALL include msg, error message, and stack trace fields

### Requirement 5: Structured Logging - recurringOrdersDb (QUAL-001-B)

**User Story:** As a DevOps engineer, I want structured logging in recurringOrdersDb.ts, so that errors are searchable and parseable in production.

#### Acceptance Criteria

1. WHEN an error occurs in recurringOrdersDb.ts THEN the system SHALL log using logger.error() with structured format
2. WHEN logging errors THEN the system SHALL include msg, error message, and stack trace fields

### Requirement 6: Structured Logging - matchingEngineEnhanced (QUAL-001-C)

**User Story:** As a DevOps engineer, I want structured logging in matchingEngineEnhanced.ts, so that errors are searchable and parseable in production.

#### Acceptance Criteria

1. WHEN an error occurs in matchingEngineEnhanced.ts THEN the system SHALL log using logger.error() with structured format
2. WHEN logging errors THEN the system SHALL include msg, error message, and stack trace fields
