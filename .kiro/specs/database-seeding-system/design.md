# Design Document

## Overview

The Production-Grade Database Seeding System is a CLI-based tool for populating TERP's database with mock or initial data. The system is completely decoupled from application startup to prevent the production crashes that occurred with the previous embedded approach. The design incorporates industry best practices from Salesforce, Tighten, Liquibase, and Microsoft EF Core, including explicit rollback strategies, PII masking, performance optimization, concurrency protection, and comprehensive data integrity validation.

The system consists of an orchestrator script that coordinates individual seeders for each entity type (clients, batches, inventory, orders), with shared utilities for locking, logging, validation, and data masking. All seeding operations are idempotent, logged comprehensively, and designed to fail gracefully without impacting application stability.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CLI Interface                            │
│  (seed-main.ts - Orchestrator)                              │
│  - Argument parsing (--table, --size, --env, --dry-run)    │
│  - Confirmation prompts                                      │
│  - Progress reporting                                        │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ├──────────────────────────────────────────┐
                 │                                          │
        ┌────────▼────────┐                    ┌───────────▼──────────┐
        │  Locking Layer  │                    │   Logging Layer      │
        │  (lib/locking)  │                    │   (winston/pino)     │
        │  - Advisory     │                    │   - Structured JSON  │
        │    locks        │                    │   - Log rotation     │
        │  - Timeout      │                    │   - Audit trail      │
        └────────┬────────┘                    └───────────┬──────────┘
                 │                                          │
                 └──────────────┬───────────────────────────┘
                                │
                 ┌──────────────▼──────────────┐
                 │   Seeder Coordination       │
                 │   - Dependency ordering     │
                 │   - Error isolation         │
                 │   - Progress tracking       │
                 └──────────────┬──────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
┌───────▼────────┐    ┌────────▼────────┐    ┌────────▼────────┐
│ seed-clients   │    │ seed-batches    │    │ seed-inventory  │
│ - Faker data   │    │ - Faker data    │    │ - Faker data    │
│ - Validation   │    │ - Validation    │    │ - Validation    │
│ - Idempotency  │    │ - Idempotency   │    │ - Idempotency   │
└───────┬────────┘    └────────┬────────┘    └────────┬────────┘
        │                      │                       │
        └──────────────────────┼───────────────────────┘
                               │
                ┌──────────────▼──────────────┐
                │   Shared Utilities          │
                │   - data-masking.ts (PII)   │
                │   - validation.ts (schema)  │
                │   - Database operations     │
                └──────────────┬──────────────┘
                               │
                ┌──────────────▼──────────────┐
                │   Database (Drizzle ORM)    │
                │   - MySQL                   │
                │   - Advisory locks          │
                │   - Bulk inserts            │
                └─────────────────────────────┘
```

### Separation of Concerns

The architecture strictly separates seeding from application startup. The seeding system is invoked only via CLI commands and has no integration points with the application's initialization code. This ensures that seeding failures cannot crash the application and allows independent testing and debugging.

### Concurrency Model

The system uses database advisory locks to prevent concurrent seeding operations. When a seeding operation starts, it acquires a named lock in the database. If another operation attempts to start while the lock is held, it detects the lock and exits with an informative error. Locks are released on both successful completion and failure to prevent deadlocks.

### Error Handling Strategy

Each seeder is wrapped in try/catch blocks with detailed error logging. Errors in individual seeders do not prevent other seeders from running. The orchestrator collects all errors and presents a summary report at the end. This fail-safe approach ensures maximum data seeding even when some operations encounter issues.

## Components and Interfaces

### CLI Orchestrator (seed-main.ts)

**Purpose:** Coordinates execution of individual seeders based on CLI arguments and manages the overall seeding workflow.

**Interface:**

```typescript
interface OrchestratorOptions {
  table?: string; // Specific table to seed (optional)
  size?: "small" | "medium" | "large"; // Data volume
  env?: "dev" | "staging" | "production"; // Environment
  dryRun?: boolean; // Preview without executing
  force?: boolean; // Skip confirmation prompts
}

interface SeederResult {
  seeder: string;
  success: boolean;
  recordsInserted: number;
  duration: number;
  error?: Error;
}

class SeedOrchestrator {
  async run(options: OrchestratorOptions): Promise<SeederResult[]>;
  async confirmDestructiveOperation(): Promise<boolean>;
  async reportProgress(seeder: string, progress: number): Promise<void>;
  async generateSummary(results: SeederResult[]): Promise<void>;
}
```

**Responsibilities:**

- Parse and validate CLI arguments
- Acquire global seeding lock
- Determine seeding order based on dependencies
- Execute seeders sequentially
- Collect and report results
- Release lock on completion or failure

### Locking Mechanism (lib/locking.ts)

**Purpose:** Prevent concurrent seeding operations using database advisory locks.

**Interface:**

```typescript
interface LockOptions {
  lockName: string;
  timeout: number; // Milliseconds
}

class SeedingLock {
  async acquire(options: LockOptions): Promise<boolean>;
  async release(lockName: string): Promise<void>;
  async isLocked(lockName: string): Promise<boolean>;
  async forceRelease(lockName: string): Promise<void>; // Emergency use only
}
```

**Implementation:**

- MySQL: `SELECT GET_LOCK('seed_lock', timeout)`
- PostgreSQL: `SELECT pg_advisory_lock(hashtext('seed_lock'))`
- Automatic cleanup on process exit
- Timeout handling for stuck locks

### Logging Infrastructure

**Purpose:** Provide structured, machine-parseable logs for all seeding operations.

**Interface:**

```typescript
interface LogContext {
  seeder?: string;
  operation?: string;
  recordCount?: number;
  duration?: number;
  error?: Error;
  [key: string]: any;
}

class SeederLogger {
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
  debug(message: string, context?: LogContext): void;
}
```

**Configuration:**

- Format: Structured JSON
- Levels: debug, info, warn, error
- Output: Console + file rotation
- Audit trail: All operations logged with timestamps

### Individual Seeders

**Purpose:** Generate and insert mock data for specific entity types.

**Base Interface:**

```typescript
interface SeederConfig {
  tableName: string;
  dependencies: string[]; // Tables that must be seeded first
  recordCount: {
    small: number;
    medium: number;
    large: number;
  };
  piiFields: string[]; // Fields requiring masking
}

interface SeederOptions {
  size: "small" | "medium" | "large";
  env: "dev" | "staging" | "production";
  dryRun: boolean;
}

abstract class BaseSeeder {
  abstract config: SeederConfig;

  async seed(options: SeederOptions): Promise<SeederResult>;
  async generateData(count: number): Promise<any[]>;
  async validateData(data: any[]): Promise<ValidationResult>;
  async checkIdempotency(): Promise<boolean>;
  async insertData(data: any[]): Promise<number>;
}
```

**Concrete Seeders:**

- `ClientSeeder` - Customer/client data
- `BatchSeeder` - Cannabis batch data
- `InventorySeeder` - Product inventory data
- `OrderSeeder` - Transaction/order data

### Schema Validation (lib/validation.ts)

**Purpose:** Validate data against database schema before insertion to catch schema drift.

**Interface:**

```typescript
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

interface ValidationError {
  field: string;
  issue: string;
  expected: any;
  actual: any;
}

class SchemaValidator {
  async validateSchema(tableName: string): Promise<ValidationResult>;
  async validateData(tableName: string, data: any[]): Promise<ValidationResult>;
  async checkForeignKeys(
    tableName: string,
    data: any[]
  ): Promise<ValidationResult>;
  async checkConstraints(
    tableName: string,
    data: any[]
  ): Promise<ValidationResult>;
}
```

**Validation Checks:**

- Column existence
- Data type compatibility
- Foreign key references
- Unique constraints
- Not-null constraints
- Check constraints

### PII Masking (lib/data-masking.ts)

**Purpose:** Anonymize personally identifiable information in non-production environments.

**Interface:**

```typescript
interface MaskingStrategy {
  field: string;
  maskFn: (value: any) => any;
}

class PIIMasker {
  async maskData(data: any[], strategies: MaskingStrategy[]): Promise<any[]>;
  async detectPII(data: any[]): Promise<string[]>;
  async logMasking(fields: string[]): Promise<void>;
}

// Predefined masking functions
const maskingFunctions = {
  email: (email: string) => faker.internet.email(),
  phone: (phone: string) => faker.phone.number(),
  name: (name: string) => faker.person.fullName(),
  address: (addr: string) => faker.location.streetAddress(),
  ssn: (ssn: string) => "***-**-" + ssn.slice(-4),
};
```

**Environment-Specific Behavior:**

- Development: Full masking of all PII
- Staging: Partial masking, preserve patterns
- Production: No seeding allowed (or no masking if authorized)

### Rollback Script (seed-rollback.ts)

**Purpose:** Remove seeded data from the database in the correct order.

**Interface:**

```typescript
interface RollbackConfig {
  strategy: "delete" | "truncate" | "none";
  condition?: string; // WHERE clause for selective deletion
  confirmation: boolean;
}

interface RollbackResult {
  table: string;
  recordsDeleted: number;
  success: boolean;
  error?: Error;
}

class RollbackManager {
  async rollback(options: { dryRun?: boolean }): Promise<RollbackResult[]>;
  async identifySeededData(table: string): Promise<any[]>;
  async deleteInOrder(tables: string[]): Promise<RollbackResult[]>;
  async confirmRollback(): Promise<boolean>;
  async logRollback(results: RollbackResult[]): Promise<void>;
}
```

**Rollback Order:**

1. Identify all seeded data using markers
2. Determine deletion order (respect foreign keys)
3. Prompt for confirmation (unless --force)
4. Delete child records first, then parents
5. Log all deletions for audit trail

## Data Models

### Seeding Metadata

To support idempotency and rollback, we track seeding metadata:

```typescript
// New table: seeding_metadata
interface SeedingMetadata {
  id: number;
  tableName: string;
  seederName: string;
  recordCount: number;
  environment: string;
  createdAt: Date;
  createdBy: string; // 'seeder' marker
}
```

This metadata table allows us to:

- Identify which records were created by seeders
- Implement idempotency checks
- Support selective rollback
- Maintain audit trail

### Seeded Record Markers

Each seeded record includes a marker field to identify it:

```typescript
// Added to all seeded tables
interface SeededRecord {
  // ... existing fields ...
  createdBy?: string; // Set to 'seeder' for seeded records
  seededAt?: Date; // Timestamp of seeding operation
}
```

This allows selective deletion during rollback without affecting manually created data.

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property 1: CLI Independence

_For any_ application startup sequence, the seeding system should not execute automatically, and the application should start successfully regardless of database seeding state.
**Validates: Requirements 1.1, 1.2**

### Property 2: Invalid Argument Handling

_For any_ invalid CLI argument combination, the system should display usage information and exit with a non-zero status code without attempting to seed.
**Validates: Requirements 1.4**

### Property 3: Graceful Error Handling

_For any_ error encountered during seeding, the system should log the error in structured JSON format, continue with remaining seeders, and exit gracefully without crashing.
**Validates: Requirements 1.5**

### Property 4: Lock Acquisition

_For any_ seeding operation, the system should acquire a database advisory lock before proceeding with any data insertion.
**Validates: Requirements 2.1**

### Property 5: Lock Release on Completion

_For any_ seeding operation that completes (successfully or with errors), the system should release the advisory lock before exiting.
**Validates: Requirements 2.3, 2.4**

### Property 6: Schema Validation Before Insertion

_For any_ data to be inserted, the seeder should validate it against the Drizzle schema before attempting insertion.
**Validates: Requirements 3.2**

### Property 7: Invalid Data Handling

_For any_ data that fails schema validation, the seeder should log the validation errors and skip the invalid record without crashing.
**Validates: Requirements 3.3**

### Property 8: Foreign Key Validation

_For any_ record with foreign key relationships, the seeder should verify that referenced records exist before insertion.
**Validates: Requirements 3.4, 12.2**

### Property 9: Constraint Respect

_For any_ database constraint (unique, not-null, check), the seeder should generate data that respects the constraint.
**Validates: Requirements 3.5**

### Property 10: Idempotency Check

_For any_ seeder execution, the system should check for existing seeded data before inserting new records.
**Validates: Requirements 4.1**

### Property 11: Idempotent Execution

_For any_ seeder, running it multiple times should produce the same database state as running it once (no duplicate data).
**Validates: Requirements 4.2, 4.3**

### Property 12: Dependency Ordering

_For any_ set of tables with foreign key relationships, the orchestrator should seed parent tables before child tables.
**Validates: Requirements 5.4, 12.1**

### Property 13: Rollback Identification

_For any_ seeded data, the rollback script should be able to identify it using deterministic markers.
**Validates: Requirements 6.1**

### Property 14: Rollback Ordering

_For any_ set of tables with foreign key relationships, the rollback script should delete child records before parent records.
**Validates: Requirements 6.2**

### Property 15: Rollback Audit Logging

_For any_ rollback operation, the system should log all deleted records with timestamps for audit purposes.
**Validates: Requirements 6.4**

### Property 16: PII Masking in Non-Production

_For any_ PII field in development or staging environments, the seeder should mask the data using Faker.js.
**Validates: Requirements 7.1**

### Property 17: Masked Data Format Preservation

_For any_ masked PII field, the masked data should maintain realistic formats and patterns (e.g., valid email format, phone number format).
**Validates: Requirements 7.3**

### Property 18: PII Masking Audit

_For any_ seeding operation that masks PII, the system should log which fields were masked for audit purposes.
**Validates: Requirements 7.4**

### Property 19: Operation Start Logging

_For any_ seeding operation, the system should log the start time, environment, and configuration at the beginning.
**Validates: Requirements 8.1**

### Property 20: Insertion Count Logging

_For any_ successful data insertion, the seeder should log the count of records inserted.
**Validates: Requirements 8.2**

### Property 21: Error Logging Completeness

_For any_ error that occurs, the system should log the error message, stack trace, and context information.
**Validates: Requirements 8.3**

### Property 22: Completion Summary Logging

_For any_ seeding operation that completes, the system should log the total execution time and summary statistics.
**Validates: Requirements 8.4**

### Property 23: Structured JSON Logging

_For any_ log output, the system should produce valid, parseable JSON with consistent structure.
**Validates: Requirements 8.5**

### Property 24: Environment Detection

_For any_ seeding execution, the orchestrator should correctly detect the current environment from environment variables.
**Validates: Requirements 9.1**

### Property 25: Foreign Key Integrity Post-Seeding

_For any_ completed seeding operation, all foreign key constraints in the database should be satisfied.
**Validates: Requirements 12.5**

### Property 26: Validation Error Handling

_For any_ data integrity validation failure, the seeder should log the validation error and skip the invalid record.
**Validates: Requirements 12.4**

## Error Handling

### Error Categories

**1. Configuration Errors**

- Invalid CLI arguments
- Missing environment variables
- Invalid environment configuration

**Handling:** Display usage information, exit with code 1, no database operations performed.

**2. Lock Acquisition Errors**

- Lock already held by another process
- Lock acquisition timeout
- Database connection failure

**Handling:** Log error with context, exit with code 2, no seeding attempted.

**3. Schema Validation Errors**

- Missing columns
- Type mismatches
- Schema drift detected

**Handling:** Log detailed schema comparison, skip affected records, continue with other seeders, exit with code 3.

**4. Data Generation Errors**

- Faker.js failures
- Constraint violation during generation
- Memory exhaustion

**Handling:** Log error with context, retry with smaller batch, skip seeder if persistent, continue with other seeders.

**5. Insertion Errors**

- Foreign key violations
- Unique constraint violations
- Database connection loss

**Handling:** Log error with SQL query and data, skip affected records, continue with remaining records, report in summary.

**6. Rollback Errors**

- Foreign key constraint prevents deletion
- Record not found
- Database connection loss

**Handling:** Log error with context, continue with remaining deletions, report incomplete rollback in summary.

### Error Recovery Strategies

**Retry Logic:**

- Database connection errors: Retry up to 3 times with exponential backoff
- Lock acquisition: Retry with timeout, then fail
- Transient errors: Retry once, then skip

**Graceful Degradation:**

- If one seeder fails, continue with others
- If validation fails for some records, insert valid ones
- If rollback partially fails, report what was deleted

**Error Reporting:**

- Structured error logs with full context
- Summary report at end of execution
- Exit codes indicate error category
- Detailed error messages for debugging

## Testing Strategy

### Unit Testing

**Scope:** Individual functions and utilities

**Coverage Target:** >80% for all modules

**Key Test Areas:**

- Locking mechanism (acquire, release, timeout)
- Data generation (Faker.js wrappers)
- Schema validation (column checks, type validation)
- PII masking (all masking functions)
- Logging utilities (JSON structure, log levels)

**Tools:**

- Vitest for test runner
- Mock database connections
- Faker.js for test data generation

### Integration Testing

**Scope:** End-to-end seeding workflows

**Test Scenarios:**

- Full seeding workflow (all tables)
- Partial seeding (specific table)
- Idempotency (run twice, verify no duplicates)
- Rollback (seed then rollback, verify clean state)
- Error handling (inject failures, verify recovery)
- Concurrent execution (verify lock prevents conflicts)

**Environment:**

- Test database (separate from development)
- Automated setup/teardown
- Isolated test data

### Property-Based Testing

**Library:** fast-check (JavaScript property-based testing)

**Test Properties:**

- Idempotency: `seed(seed(db)) === seed(db)`
- Lock safety: `concurrent(seed, seed) => one succeeds, one fails`
- Rollback completeness: `rollback(seed(db)) === empty(db)`
- Foreign key integrity: `∀ record, foreignKeys(record) exist`
- PII masking: `∀ piiField in dev, masked(piiField) !== original(piiField)`

**Configuration:**

- Minimum 100 iterations per property
- Shrinking enabled for counterexample minimization
- Seed for reproducibility

### Performance Testing

**Benchmarks:**

- 1,000 records: < 5 seconds
- 10,000 records: < 1 minute
- 50,000 records: < 5 minutes

**Metrics:**

- Execution time
- Memory usage
- Database connection count
- Query count

**Tools:**

- Benchmark.js for timing
- Memory profiling
- Database query logging

### End-to-End Testing

**Scenarios:**

- Fresh database seeding
- Seeding with existing data
- Environment-specific behavior (dev vs staging)
- CLI flag combinations
- Error scenarios (schema drift, connection loss)

**Validation:**

- Data integrity checks
- Foreign key validation
- Constraint satisfaction
- Log output verification

## Performance Considerations

### Insert Strategy

**Small Datasets (< 100 records):**

- Use Drizzle's `create()` method
- Acceptable overhead for model events
- Simpler error handling

**Medium Datasets (100-10,000 records):**

- Use Drizzle's `insert()` method
- Single query for bulk insert
- 60x faster than `create()`

**Large Datasets (> 10,000 records):**

- Consider database-native CSV import
- Fastest option for bulk data
- Requires additional tooling

### Memory Management

**Batch Processing:**

- Generate data in batches of 1,000 records
- Insert in batches to limit memory usage
- Clear batch after insertion

**Streaming:**

- For very large datasets, use streaming
- Generate and insert incrementally
- Prevents memory exhaustion

### Database Optimization

**Indexes:**

- Disable indexes during bulk insert (if supported)
- Rebuild indexes after seeding
- Significant performance improvement

**Transactions:**

- Use transactions for batch inserts
- Rollback on error
- Improves consistency and performance

**Connection Pooling:**

- Reuse database connections
- Configure appropriate pool size
- Avoid connection exhaustion

## Security Considerations

### PII Protection

**Masking Requirements:**

- All PII fields masked in development
- Partial masking in staging (preserve patterns)
- No seeding in production (or explicit authorization required)

**Audit Trail:**

- Log all PII masking operations
- Track which fields were masked
- Maintain compliance documentation

### Access Control

**Production Protection:**

- Require explicit authorization for production seeding
- Environment variable check: `ALLOW_PRODUCTION_SEEDING=true`
- Confirmation prompt with warning

**Credential Management:**

- Database credentials from environment variables
- No hardcoded credentials
- Secure credential storage

### Compliance

**GDPR/CCPA:**

- Data minimization (only necessary fields)
- Right to erasure (rollback capability)
- Data retention policies
- Audit logging

**Documentation:**

- PII field inventory
- Masking strategies
- Data retention policies
- Compliance review process

## Deployment Strategy

### Development Environment

**Setup:**

```bash
# Install dependencies
pnpm install

# Run migrations
pnpm db:migrate

# Seed database
pnpm seed --env=dev --size=small
```

**Workflow:**

- Seed on demand via CLI
- Small datasets for fast iteration
- Full PII masking
- Frequent rollback and reseed

### Staging Environment

**Setup:**

```bash
# Run migrations
pnpm db:migrate

# Seed with medium dataset
pnpm seed --env=staging --size=medium
```

**Workflow:**

- Seed during deployment
- Medium datasets for realistic testing
- Partial PII masking
- Periodic rollback and reseed

### Production Environment

**Policy:**

- No automatic seeding
- Only reference data seeding (if needed)
- Explicit authorization required
- Full audit logging

**Procedure:**

```bash
# Require explicit authorization
export ALLOW_PRODUCTION_SEEDING=true

# Seed only reference data
pnpm seed --env=production --table=reference_data --force
```

## Monitoring and Observability

### Logging

**Log Levels:**

- DEBUG: Detailed execution flow
- INFO: Operation start/complete, record counts
- WARN: Non-fatal issues, skipped records
- ERROR: Failures, exceptions

**Log Format:**

```json
{
  "timestamp": "2025-12-09T10:30:00Z",
  "level": "info",
  "seeder": "ClientSeeder",
  "operation": "insert",
  "recordCount": 1000,
  "duration": 2.5,
  "environment": "dev"
}
```

### Metrics

**Key Metrics:**

- Seeding duration
- Records inserted per seeder
- Error count per seeder
- Lock acquisition time
- Memory usage

**Reporting:**

- Summary report at end of execution
- Structured logs for analysis
- Performance benchmarks

### Alerting

**Alert Conditions:**

- Seeding duration exceeds threshold
- Error rate exceeds threshold
- Lock acquisition timeout
- Memory usage exceeds limit

**Notification:**

- Log to monitoring system
- Email/Slack notification (if configured)
- Exit code indicates severity

## Maintenance and Evolution

### Adding New Seeders

**Process:**

1. Create new seeder class extending `BaseSeeder`
2. Implement `generateData()` method
3. Define dependencies in config
4. Add to orchestrator's seeder list
5. Write unit tests
6. Update documentation

**Template:**

```typescript
export class NewEntitySeeder extends BaseSeeder {
  config: SeederConfig = {
    tableName: "new_entity",
    dependencies: ["parent_table"],
    recordCount: { small: 10, medium: 100, large: 1000 },
    piiFields: ["email", "phone"],
  };

  async generateData(count: number): Promise<any[]> {
    // Implementation
  }
}
```

### Schema Evolution

**Migration Workflow:**

1. Update Drizzle schema
2. Generate migration
3. Test migration in development
4. Update seeders for new schema
5. Test seeding with new schema
6. Deploy migration and updated seeders together

**Backward Compatibility:**

- Schema validation catches missing columns
- Seeders fail gracefully on schema mismatch
- Clear error messages guide fixes

### Performance Tuning

**Monitoring:**

- Track seeding duration over time
- Identify slow seeders
- Profile memory usage

**Optimization:**

- Adjust batch sizes
- Optimize data generation
- Consider database-native import for large datasets
- Add indexes strategically

## Dependencies

### External Libraries

**Required:**

- `@faker-js/faker` - Mock data generation
- `drizzle-orm` - Database ORM
- `winston` or `pino` - Structured logging
- `commander` or `yargs` - CLI argument parsing

**Development:**

- `vitest` - Unit testing
- `fast-check` - Property-based testing
- `@types/*` - TypeScript type definitions

### Database Requirements

**MySQL:**

- Version 5.7+ (for advisory locks)
- `GET_LOCK()` and `RELEASE_LOCK()` support

**PostgreSQL:**

- Version 9.1+ (for advisory locks)
- `pg_advisory_lock()` support

### Environment Variables

**Required:**

- `DATABASE_URL` - Database connection string
- `NODE_ENV` - Environment (development/staging/production)

**Optional:**

- `ALLOW_PRODUCTION_SEEDING` - Enable production seeding
- `SEEDING_LOG_LEVEL` - Override log level
- `SEEDING_BATCH_SIZE` - Override batch size

## Rollback and Recovery

### Rollback Scenarios

**1. Full Rollback**

- Remove all seeded data
- Restore database to pre-seeding state
- Use case: Clean slate for testing

**2. Partial Rollback**

- Remove specific table's seeded data
- Preserve other seeded data
- Use case: Re-seed single entity

**3. Selective Rollback**

- Remove seeded data matching criteria
- Preserve manually created data
- Use case: Remove test data, keep real data

### Recovery Procedures

**Interrupted Seeding:**

1. Check seeding_metadata table for partial completion
2. Identify which seeders completed
3. Resume from next seeder in sequence
4. Idempotency prevents duplicates

**Failed Rollback:**

1. Check rollback logs for partial completion
2. Identify which tables were rolled back
3. Manually complete rollback if needed
4. Verify foreign key integrity

**Schema Drift:**

1. Run migrations to sync schema
2. Update seeders for new schema
3. Test in development
4. Re-seed with updated seeders

## Future Enhancements

### Potential Improvements

**1. Parallel Seeding**

- Seed independent tables in parallel
- Respect dependency graph
- Improve performance for large datasets

**2. Incremental Seeding**

- Add records to existing data
- Maintain referential integrity
- Support data growth scenarios

**3. Data Snapshots**

- Save seeded data state
- Restore to specific snapshot
- Support reproducible testing

**4. Custom Data Profiles**

- Define custom data generation rules
- Support specific test scenarios
- Configurable via JSON/YAML

**5. Web UI**

- Visual interface for seeding
- Progress monitoring
- Error visualization

### Extensibility Points

**Custom Seeders:**

- Plugin architecture for custom seeders
- Register seeders dynamically
- Support third-party seeders

**Custom Masking:**

- Pluggable masking strategies
- Industry-specific masking rules
- Configurable masking policies

**Custom Validation:**

- Pluggable validation rules
- Business logic validation
- Custom constraint checking
