# Database Schema Corruption Repair Pilot - Design Document

## Overview

The Database Schema Corruption Repair Pilot is a safety-first system designed to identify and surgically repair corrupted `deletedAt` timestamp fields in the TERP Drizzle schema. The system follows a pilot-first approach, using the `inventoryMovements` table as a proof of concept before scaling to other tables. The design emphasizes local testing, explicit safety guardrails, and a database-first approach where the actual MySQL database structure is treated as the source of truth.

The system consists of four main phases:

1. **Environment Setup & Safety Verification** - Ensure local Docker MySQL environment
2. **Corruption Detection & Surgical Repair** - Fix malformed `deletedAt` fields
3. **Pilot Table Alignment** - Align `inventoryMovements` with database structure
4. **Optional Safe Migration Testing** - Test ADD-only migrations if needed

## Architecture

### High-Level Architecture

```mermaid
graph TB
    subgraph "Safety Layer"
        HG[Host Guards]
        ENV[Environment Validation]
        LOCAL[Local Docker MySQL]
    end

    subgraph "Corruption Detection"
        SCAN[Schema Scanner]
        DETECT[Corruption Detector]
        LOCATE[Location Tracker]
    end

    subgraph "Surgical Repair"
        EXTRACT[Extract Malformed Fields]
        REPOSITION[Reposition as Siblings]
        VALIDATE[TypeScript Validation]
    end

    subgraph "Pilot Validation"
        RESET[DB Reset Light]
        DRIFT[Drift Detection]
        ALIGN[Schema Alignment]
        VERIFY[Zero Issues Verification]
    end

    subgraph "Optional Migration"
        CREATE[Migration Creation]
        MYSQL_VER[MySQL Version Check]
        TEST[Local Testing]
        ROLLBACK[Rollback Testing]
    end

    subgraph "Documentation"
        AUDIT[Audit Trail]
        PILOT_DOC[Pilot Documentation]
        SUCCESS[Success Criteria]
    end

    HG --> SCAN
    ENV --> SCAN
    LOCAL --> SCAN
    SCAN --> DETECT
    DETECT --> LOCATE
    LOCATE --> EXTRACT
    EXTRACT --> REPOSITION
    REPOSITION --> VALIDATE
    VALIDATE --> RESET
    RESET --> DRIFT
    DRIFT --> ALIGN
    ALIGN --> VERIFY
    VERIFY --> CREATE
    CREATE --> MYSQL_VER
    MYSQL_VER --> TEST
    TEST --> ROLLBACK
    ROLLBACK --> AUDIT
    AUDIT --> PILOT_DOC
    PILOT_DOC --> SUCCESS
```

### Component Interaction Flow

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant Guard as Host Guards
    participant Scanner as Schema Scanner
    participant Repair as Surgical Repair
    participant DB as Local MySQL
    participant Validator as Schema Validator
    participant Migration as Migration Tester
    participant Doc as Documentation

    Dev->>Guard: Start pilot process
    Guard->>Guard: Verify local environment only
    Guard->>Scanner: Environment safe, proceed

    Scanner->>Scanner: Scan drizzle/schema.ts
    Scanner->>Scanner: Locate deletedAt corruption
    Scanner-->>Dev: Report corruption locations

    Dev->>Repair: Apply surgical fixes
    Repair->>Repair: Extract malformed deletedAt
    Repair->>Repair: Add as table-level siblings
    Repair->>Repair: Run pnpm check
    Repair-->>Dev: TypeScript validation passed

    Dev->>DB: pnpm test:db:reset light
    DB-->>Dev: Fresh local database

    Dev->>Validator: pnpm validate:schema
    Validator->>DB: Query inventoryMovements structure
    Validator->>Scanner: Parse Drizzle schema
    Validator->>Validator: Compare structures
    Validator-->>Dev: Drift report for inventoryMovements

    Dev->>Repair: Align inventoryMovements schema
    Repair->>Repair: Match column types to DB
    Repair->>Repair: Match nullability to DB
    Repair->>Validator: Re-validate
    Validator-->>Dev: Zero issues for inventoryMovements

    opt Optional Migration Testing
        Dev->>Migration: Create safe migration
        Migration->>Migration: Check MySQL version
        Migration->>DB: Test ADD COLUMN
        Migration->>DB: Test rollback
        Migration-->>Dev: Migration tested successfully
    end

    Dev->>Doc: Document pilot results
    Doc->>Doc: Create PILOT_INVENTORYMOVEMENTS.md
    Doc-->>Dev: Pilot documentation complete
```

## Components and Interfaces

### 1. Host Guards and Environment Validation

**Purpose**: Prevent accidental execution against staging or production databases.

**Key Functions**:

```typescript
// Host protection utilities
export function validateLocalEnvironment(): void;
export function checkDatabaseHost(connectionString: string): void;
export function enforceLocalOnly(): void;
export function createHostDenylist(): string[];

// Environment validation
export function verifyTestHarnessSetup(): void;
export function validateDockerMysql(): void;
export function checkTestCredentials(): void;
```

**Implementation**:

```typescript
const PRODUCTION_HOST_PATTERNS = [
  'ondigitalocean.com',
  'amazonaws.com',
  'googlecloud.com',
  'azure.com',
  'railway.app'
];

function validateLocalEnvironment(): void {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL not set');
  }
  
  const url = new URL(dbUrl);
  const isLocal = url.hostname === 'localhost' || 
                  url.hostname === '127.0.0.1' || 
                  url.hostname === '0.0.0.0';
  
  if (!isLocal) {
    console.error('🚨 DANGER: Non-local database detected!');
    console.error(`Host: ${url.hostname}`);
    console.error('This pilot ONLY works with local Docker MySQL');
    process.exit(1);
  }
  
  console.log('✅ Local environment verified');
}
```

### 2. Schema Corruption Scanner

**Purpose**: Identify malformed `deletedAt` fields nested inside other column options.

**Key Functions**:

```typescript
// Corruption detection
export interface CorruptionLocation {
  file: string;
  table: string;
  line: number;
  column: string;
  context: string;
}

export function scanForCorruption(schemaPath: string): CorruptionLocation[];
export function detectMalformedDeletedAt(content: string): CorruptionLocation[];
export function validateCorruptionFree(schemaPath: string): boolean;
```

**Detection Patterns**:

```typescript
// Regex patterns for detecting corruption
const CORRUPTION_PATTERNS = [
  // deletedAt inside varchar options
  /varchar\([^)]+\)\.([^,}]+,\s*)*deletedAt:\s*timestamp/g,
  
  // deletedAt inside references options  
  /\.references\([^)]+\)\.([^,}]+,\s*)*deletedAt:\s*timestamp/g,
  
  // deletedAt inside decimal options
  /decimal\([^)]+\)\.([^,}]+,\s*)*deletedAt:\s*timestamp/g,
  
  // General pattern for nested deletedAt
  /\.\w+\([^)]*\)\.([^,}]+,\s*)*deletedAt:\s*timestamp/g
];
```

### 3. Surgical Repair Engine

**Purpose**: Perform minimal, targeted fixes to move `deletedAt` fields to proper table-level position.

**Key Functions**:

```typescript
// Surgical repair operations
export interface RepairOperation {
  location: CorruptionLocation;
  originalCode: string;
  repairedCode: string;
  tableLevelAddition: string;
}

export function planRepairOperations(corruptions: CorruptionLocation[]): RepairOperation[];
export function applySurgicalRepair(schemaPath: string, operations: RepairOperation[]): void;
export function validateRepairSuccess(schemaPath: string): void;
```

**Repair Logic**:

```typescript
function applySurgicalRepair(schemaPath: string, operations: RepairOperation[]): void {
  let content = fs.readFileSync(schemaPath, 'utf8');
  
  // Sort operations by line number (descending) to avoid offset issues
  const sortedOps = operations.sort((a, b) => b.location.line - a.location.line);
  
  for (const op of sortedOps) {
    // Remove malformed deletedAt from options
    content = content.replace(op.originalCode, op.repairedCode);
    
    // Add proper table-level deletedAt
    const tableEndPattern = new RegExp(`(${op.location.table}.*?})(,?\\s*\\))`);
    content = content.replace(tableEndPattern, `$1,\n  ${op.tableLevelAddition}$2`);
  }
  
  fs.writeFileSync(schemaPath, content);
  console.log(`✅ Applied ${operations.length} surgical repairs`);
}
```

### 4. Pilot Table Validator

**Purpose**: Validate and align the `inventoryMovements` table with actual database structure.

**Key Functions**:

```typescript
// Pilot validation
export interface PilotValidationResult {
  table: string;
  issuesFound: number;
  issuesResolved: number;
  alignmentChanges: SchemaChange[];
  validationPassed: boolean;
}

export function resetTestDatabase(): void;
export function validatePilotTable(tableName: string): PilotValidationResult;
export function alignSchemaWithDatabase(tableName: string, driftOutput: DriftIssue[]): void;
export function verifyZeroIssues(tableName: string): boolean;
```

**Database-First Alignment**:

```typescript
interface SchemaChange {
  type: 'column_type' | 'nullability' | 'default' | 'add_column';
  column: string;
  from: string;
  to: string;
  reason: string;
}

function alignSchemaWithDatabase(tableName: string, driftOutput: DriftIssue[]): void {
  const changes: SchemaChange[] = [];
  
  for (const issue of driftOutput) {
    if (issue.table !== tableName) continue;
    
    switch (issue.type) {
      case 'column_type_mismatch':
        changes.push({
          type: 'column_type',
          column: issue.column,
          from: issue.drizzleType,
          to: issue.databaseType,
          reason: 'Database type is source of truth'
        });
        break;
        
      case 'nullability_mismatch':
        changes.push({
          type: 'nullability',
          column: issue.column,
          from: issue.drizzleNullable ? 'nullable' : 'not null',
          to: issue.databaseNullable ? 'nullable' : 'not null',
          reason: 'Database constraint is source of truth'
        });
        break;
    }
  }
  
  applySchemaChanges(tableName, changes);
}
```

### 5. Safe Migration Tester

**Purpose**: Optionally test ADD-only migrations for missing benign columns.

**Key Functions**:

```typescript
// Migration testing
export interface MigrationTest {
  migrationFile: string;
  mysqlVersion: string;
  supportsIfNotExists: boolean;
  testResult: 'passed' | 'failed' | 'skipped';
  rollbackTested: boolean;
}

export function checkMysqlVersion(): string;
export function createSafeMigration(tableName: string, column: string): string;
export function testMigrationLocally(migrationPath: string): MigrationTest;
export function testRollbackLocally(migrationPath: string): boolean;
```

**MySQL Version Handling**:

```typescript
function createSafeMigration(tableName: string, column: string): string {
  const mysqlVersion = checkMysqlVersion();
  const supportsIfNotExists = compareVersions(mysqlVersion, '5.7.0') >= 0;
  
  let sql = `-- Pilot Migration: Add ${column} to ${tableName}\n`;
  sql += `-- MySQL Version: ${mysqlVersion}\n\n`;
  
  if (supportsIfNotExists) {
    sql += `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS ${column} TIMESTAMP NULL;\n`;
  } else {
    sql += `-- Check if column exists first\n`;
    sql += `SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS \n`;
    sql += `  WHERE TABLE_NAME='${tableName}' AND COLUMN_NAME='${column.split(' ')[0]}');\n`;
    sql += `SET @sql = IF(@col_exists = 0, 'ALTER TABLE ${tableName} ADD COLUMN ${column}', 'SELECT "Column already exists"');\n`;
    sql += `PREPARE stmt FROM @sql;\n`;
    sql += `EXECUTE stmt;\n`;
    sql += `DEALLOCATE PREPARE stmt;\n`;
  }
  
  sql += `\n-- Verification\n`;
  sql += `DESCRIBE ${tableName};\n`;
  
  sql += `\n-- Rollback (commented)\n`;
  sql += `-- ALTER TABLE ${tableName} DROP COLUMN ${column.split(' ')[0]};\n`;
  
  return sql;
}
```

## Data Models

### Core Data Structures

```typescript
// Corruption detection
interface CorruptionLocation {
  file: string;           // Path to schema file
  table: string;          // Table name containing corruption
  line: number;           // Line number of corruption
  column: string;         // Column containing malformed deletedAt
  context: string;        // Surrounding code context
  severity: 'critical' | 'high' | 'medium';
}

// Repair operations
interface RepairOperation {
  location: CorruptionLocation;
  originalCode: string;   // Code with malformed deletedAt
  repairedCode: string;   // Code with deletedAt removed
  tableLevelAddition: string; // Proper deletedAt field to add
  validated: boolean;     // Whether repair was validated
}

// Pilot validation
interface PilotValidationResult {
  table: string;
  timestamp: string;
  issuesFound: number;
  issuesResolved: number;
  alignmentChanges: SchemaChange[];
  validationPassed: boolean;
  driftOutput: DriftIssue[];
}

// Schema changes
interface SchemaChange {
  type: 'column_type' | 'nullability' | 'default' | 'add_column' | 'remove_column';
  column: string;
  from: string;
  to: string;
  reason: string;
  applied: boolean;
}

// Drift issues (from existing validation system)
interface DriftIssue {
  table: string;
  column: string;
  type: 'column_type_mismatch' | 'nullability_mismatch' | 'missing_column' | 'extra_column';
  drizzleValue: any;
  databaseValue: any;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

// Migration testing
interface MigrationTest {
  migrationFile: string;
  mysqlVersion: string;
  supportsIfNotExists: boolean;
  testResult: 'passed' | 'failed' | 'skipped';
  rollbackTested: boolean;
  executionTime: number;
  errors: string[];
}

// Environment validation
interface EnvironmentCheck {
  isLocal: boolean;
  databaseHost: string;
  testHarnessAvailable: boolean;
  dockerMysqlRunning: boolean;
  validationToolsAvailable: boolean;
  safetyGuardsActive: boolean;
}

// Pilot completion status
interface PilotStatus {
  corruptionRepaired: boolean;
  pilotTableAligned: boolean;
  validationPassed: boolean;
  migrationTested: boolean;
  documentationComplete: boolean;
  readyForScaling: boolean;
}
```

### Configuration

```typescript
// Pilot configuration
const PILOT_CONFIG = {
  // Target table for pilot
  pilotTable: 'inventoryMovements',
  
  // Schema files to scan
  schemaFiles: [
    'drizzle/schema.ts',
    'drizzle/schema-rbac.ts', 
    'drizzle/schema-vip-portal.ts'
  ],
  
  // Safety settings
  safety: {
    requireLocalOnly: true,
    hostDenylist: [
      'ondigitalocean.com',
      'amazonaws.com',
      'railway.app'
    ],
    maxChangesPerRun: 10,
    requireConfirmation: true
  },
  
  // Validation settings
  validation: {
    command: 'pnpm validate:schema',
    targetIssues: 0,
    maxRetries: 3,
    timeoutMs: 30000
  },
  
  // Migration settings
  migration: {
    directory: 'migrations/drift-fixes',
    filePrefix: '001_pilot_',
    allowedOperations: ['ADD COLUMN', 'MODIFY COLUMN (widen only)'],
    forbiddenOperations: ['DROP', 'RENAME', 'MODIFY (narrow)']
  }
} as const;
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Local Environment Enforcement

*For any* execution of the pilot system, the database connection should only be to localhost, 127.0.0.1, or 0.0.0.0, never to production hosts.
**Validates: Requirements 1.1, 6.1, 6.4**

### Property 2: Host Guard Protection

*For any* database URL containing production host patterns (ondigitalocean.com, etc.), the system should terminate immediately with a clear error message.
**Validates: Requirements 1.2, 6.2, 6.5**

### Property 3: Corruption Detection Completeness

*For any* schema file, all instances of `deletedAt: timestamp("deleted_at")` nested inside other column options should be detected and located.
**Validates: Requirements 2.1, 2.2**

### Property 4: Surgical Repair Precision

*For any* detected corruption, the repair should remove only the malformed `deletedAt` and add it as a proper table-level sibling, without affecting other code.
**Validates: Requirements 2.3, 2.4, 8.3**

### Property 5: TypeScript Validation Success

*For any* completed repair operation, running `pnpm check` should return zero TypeScript errors.
**Validates: Requirements 2.5, 10.1**

### Property 6: Database Reset Consistency

*For any* pilot validation run, `pnpm test:db:reset light` should provide a fresh, consistent database state.
**Validates: Requirements 3.1**

### Property 7: Validation Integration

*For any* pilot table validation, `pnpm validate:schema` should execute successfully and provide parseable drift output.
**Validates: Requirements 3.2, 7.1, 7.2**

### Property 8: Pilot Table Focus

*For any* schema alignment operation, only the specified pilot table (`inventoryMovements`) should be modified, not other tables.
**Validates: Requirements 3.3, 8.1, 8.2**

### Property 9: Database-First Alignment

*For any* schema change, the database structure should be treated as the source of truth, with Drizzle schema updated to match.
**Validates: Requirements 4.1, 4.2, 4.3**

### Property 10: Non-Destructive Changes Only

*For any* schema alignment, only non-destructive changes (type alignment, nullability matching) should be made, never column removal or renaming.
**Validates: Requirements 4.4, 4.5, 8.4**

### Property 11: Zero Issues Validation

*For any* successful pilot completion, `pnpm validate:schema` should report exactly zero issues for the pilot table.
**Validates: Requirements 3.4, 7.4, 10.2**

### Property 12: ADD-Only Migration Safety

*For any* created migration, only ADD COLUMN or widen-only MODIFY operations should be present, never DROP, RENAME, or narrowing operations.
**Validates: Requirements 5.1, 5.2**

### Property 13: MySQL Version Compatibility

*For any* migration creation, the system should check MySQL version and use appropriate syntax (IF NOT EXISTS vs. conditional logic).
**Validates: Requirements 5.4**

### Property 14: Migration Reversibility

*For any* created migration, a commented rollback command should be included and tested for reversibility.
**Validates: Requirements 5.6, 11.2, 11.3**

### Property 15: Scope Limitation

*For any* pilot run, changes should be limited to corruption repair and the single pilot table, with no scope creep to other issues.
**Validates: Requirements 8.1, 8.2, 8.5**

### Property 16: Documentation Completeness

*For any* completed pilot, a comprehensive `docs/PILOT_INVENTORYMOVEMENTS.md` file should be created with all required sections.
**Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5**

### Property 17: Success Criteria Verification

*For any* pilot claiming success, all success criteria (TypeScript passes, validation passes, safety verified, documentation complete) should be met.
**Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5**

### Property 18: Rollback Procedure Availability

*For any* applied change, a documented and tested rollback procedure should be available.
**Validates: Requirements 11.1, 11.4, 11.5**

### Property 19: Scaling Foundation

*For any* successful pilot, the established patterns and safety measures should be documented for application to additional tables.
**Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5**

## Error Handling

### Environment Safety Errors

```typescript
class EnvironmentSafetyError extends Error {
  constructor(message: string, public host?: string) {
    super(`🚨 ENVIRONMENT SAFETY VIOLATION: ${message}`);
    this.name = 'EnvironmentSafetyError';
  }
}

// Usage
function validateEnvironment(): void {
  try {
    const dbUrl = process.env.DATABASE_URL;
    const url = new URL(dbUrl);
    
    if (PRODUCTION_HOST_PATTERNS.some(pattern => url.hostname.includes(pattern))) {
      throw new EnvironmentSafetyError(
        `Production host detected: ${url.hostname}. This pilot ONLY works with local Docker MySQL.`,
        url.hostname
      );
    }
  } catch (error) {
    console.error(error.message);
    console.error('Terminating for safety. Use pnpm test:env:up for local testing.');
    process.exit(1);
  }
}
```

### Corruption Detection Errors

```typescript
class CorruptionDetectionError extends Error {
  constructor(message: string, public locations?: CorruptionLocation[]) {
    super(`CORRUPTION DETECTION: ${message}`);
    this.name = 'CorruptionDetectionError';
  }
}

function handleCorruptionErrors(error: CorruptionDetectionError): void {
  console.error('❌ Schema corruption detected:');
  if (error.locations) {
    error.locations.forEach(loc => {
      console.error(`  ${loc.file}:${loc.line} - ${loc.table}.${loc.column}`);
    });
  }
  console.error('Run surgical repair before proceeding.');
}
```

### Validation Errors

```typescript
class ValidationError extends Error {
  constructor(message: string, public issueCount?: number) {
    super(`VALIDATION FAILED: ${message}`);
    this.name = 'ValidationError';
  }
}

function handleValidationErrors(error: ValidationError): void {
  console.error('❌ Schema validation failed:');
  console.error(`  Issues found: ${error.issueCount || 'unknown'}`);
  console.error('Review drift output and align schema with database.');
  console.error('Re-run validation after fixes.');
}
```

### Migration Testing Errors

```typescript
class MigrationTestError extends Error {
  constructor(message: string, public migrationFile?: string) {
    super(`MIGRATION TEST FAILED: ${message}`);
    this.name = 'MigrationTestError';
  }
}

function handleMigrationErrors(error: MigrationTestError): void {
  console.error('❌ Migration test failed:');
  if (error.migrationFile) {
    console.error(`  File: ${error.migrationFile}`);
  }
  console.error('Review migration SQL and test rollback manually.');
}
```

### Graceful Degradation

- If TypeScript validation fails, provide specific error locations
- If database connection fails, verify Docker MySQL is running
- If validation command fails, check if validation tools are installed
- If migration testing fails, continue with manual verification
- Always provide clear next steps for recovery

## Testing Strategy

### Unit Testing

**Coverage Target**: 85%+ for all utility functions

**Key Test Areas**:

- Host guard validation logic
- Corruption detection patterns
- Surgical repair operations
- Schema alignment logic
- Migration creation and testing

**Example Unit Tests**:

```typescript
describe('Host Guards', () => {
  it('should block production hosts', () => {
    const productionUrl = 'mysql://user:pass@db-mysql-do-user-123.ondigitalocean.com:25060/db';
    expect(() => validateLocalEnvironment(productionUrl)).toThrow(EnvironmentSafetyError);
  });

  it('should allow localhost', () => {
    const localUrl = 'mysql://user:pass@localhost:3306/test';
    expect(() => validateLocalEnvironment(localUrl)).not.toThrow();
  });
});

describe('Corruption Detection', () => {
  it('should detect deletedAt in varchar options', () => {
    const corruptedCode = `
      name: varchar({ length: 255 }).notNull(),
      deletedAt: timestamp("deleted_at"),
    `;
    const corruptions = detectMalformedDeletedAt(corruptedCode);
    expect(corruptions).toHaveLength(1);
    expect(corruptions[0].column).toBe('name');
  });

  it('should not detect proper table-level deletedAt', () => {
    const properCode = `
      name: varchar({ length: 255 }).notNull(),
    }, (table) => ({
      deletedAt: timestamp("deleted_at"),
    }));`;
    const corruptions = detectMalformedDeletedAt(properCode);
    expect(corruptions).toHaveLength(0);
  });
});
```

### Property-Based Testing

**Framework**: fast-check (for TypeScript/Node.js)

**Configuration**: Minimum 100 iterations per property test

**Property Tests**:

```typescript
import fc from "fast-check";

// Property 1: Local Environment Enforcement
describe("Property 1: Local Environment Enforcement", () => {
  it("should only allow local database connections", () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant('localhost'),
          fc.constant('127.0.0.1'),
          fc.constant('0.0.0.0')
        ),
        fc.integer({ min: 1000, max: 65535 }),
        (host, port) => {
          const url = `mysql://user:pass@${host}:${port}/test`;
          expect(() => validateLocalEnvironment(url)).not.toThrow();
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Property 3: Corruption Detection Completeness
describe("Property 3: Corruption Detection Completeness", () => {
  it("should detect all nested deletedAt instances", () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
        columnNames => {
          let code = '';
          let expectedCount = 0;
          
          for (const col of columnNames) {
            // Create corrupted code with deletedAt nested in options
            code += `${col}: varchar({ length: 255 }).notNull(),\n`;
            code += `deletedAt: timestamp("deleted_at"),\n`;
            expectedCount++;
          }
          
          const corruptions = detectMalformedDeletedAt(code);
          return corruptions.length === expectedCount;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Property 12: ADD-Only Migration Safety
describe("Property 12: ADD-Only Migration Safety", () => {
  it("should only allow safe operations in migrations", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        (tableName, columnName) => {
          const migration = createSafeMigration(tableName, columnName);
          
          // Should contain ADD COLUMN
          const hasAdd = migration.includes('ADD COLUMN');
          
          // Should NOT contain dangerous operations
          const hasDrop = migration.includes('DROP');
          const hasRename = migration.includes('RENAME');
          
          return hasAdd && !hasDrop && !hasRename;
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

**Property Test Tags**:
Each property test must include a comment referencing the design document:

```typescript
// Feature: database-schema-corruption-repair, Property 1: Local Environment Enforcement
```

### Integration Testing

**Test Scenarios**:

1. End-to-end pilot workflow with test database
2. Corruption detection and repair cycle
3. Schema alignment and validation
4. Migration creation and testing
5. Documentation generation

**Example Integration Test**:

```typescript
describe("Pilot Workflow Integration", () => {
  beforeEach(async () => {
    // Reset test environment
    await resetTestDatabase();
    await restoreOriginalSchema();
  });

  it("should complete full pilot workflow", async () => {
    // 1. Detect corruption
    const corruptions = scanForCorruption('drizzle/schema.ts');
    expect(corruptions.length).toBeGreaterThan(0);

    // 2. Apply surgical repair
    const repairs = planRepairOperations(corruptions);
    applySurgicalRepair('drizzle/schema.ts', repairs);
    
    // 3. Verify TypeScript passes
    const tsResult = await runCommand('pnpm check');
    expect(tsResult.exitCode).toBe(0);

    // 4. Validate pilot table
    const validation = await validatePilotTable('inventoryMovements');
    expect(validation.validationPassed).toBe(true);
    expect(validation.issuesFound).toBe(0);

    // 5. Verify documentation created
    expect(fs.existsSync('docs/PILOT_INVENTORYMOVEMENTS.md')).toBe(true);
  });
});
```

### Manual Testing Checklist

- [ ] Run pilot against actual corrupted schema
- [ ] Verify host guards block production URLs
- [ ] Test with various corruption patterns
- [ ] Verify surgical repair precision
- [ ] Test schema alignment with real drift
- [ ] Verify migration creation and rollback
- [ ] Test error handling scenarios
- [ ] Verify documentation generation
- [ ] Test with different MySQL versions

## Performance Considerations

### Corruption Scanning Optimization

- Use streaming for large schema files
- Cache regex compilation for repeated scans
- Parallelize scanning of multiple schema files
- Use efficient string replacement algorithms

### Database Operations Optimization

- Use connection pooling for validation queries
- Batch schema validation operations
- Cache database structure queries
- Minimize database round trips

### Expected Performance

- Corruption scanning: < 1 second for all schema files
- Surgical repair: < 2 seconds for typical corruption count
- Pilot validation: < 5 seconds including database queries
- Migration testing: < 10 seconds including rollback test

## Security Considerations

### Database Access Control

- Never log DATABASE_URL or credentials
- Validate connection strings before use
- Use environment variables for sensitive data
- Implement connection timeout limits

### File System Security

- Validate file paths before reading/writing
- Use path.join() to prevent directory traversal
- Set appropriate file permissions on generated files
- Sanitize user input in file operations

### Error Message Security

- Don't expose database structure in error messages
- Sanitize error messages before displaying
- Log detailed errors securely for debugging
- Avoid information leakage in stack traces

## Deployment and Operations

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- Access to local MySQL test database
- Write permissions for documentation generation

### Installation and Setup

```bash
# Start local test environment
pnpm test:env:up

# Reset to clean state
pnpm test:db:reset light

# Verify validation tools work
pnpm validate:schema
```

### Pilot Execution Workflow

```bash
# Step 1: Environment verification (automatic)
# Host guards and safety checks

# Step 2: Corruption detection and repair
# Scan schema files and apply surgical fixes

# Step 3: Pilot table validation
pnpm test:db:reset light
pnpm validate:schema

# Step 4: Schema alignment
# Update inventoryMovements to match database

# Step 5: Verification
pnpm validate:schema  # Should show 0 issues

# Step 6: Optional migration testing
# Create and test ADD-only migration

# Step 7: Documentation
# Generate PILOT_INVENTORYMOVEMENTS.md
```

### Monitoring and Logging

- Log all safety check results
- Track corruption detection and repair operations
- Monitor validation command execution
- Archive pilot documentation for reference

### Success Criteria Verification

```bash
# Verify TypeScript compilation
pnpm check  # Exit code 0

# Verify schema validation
pnpm validate:schema  # 0 issues for inventoryMovements

# Verify documentation exists
ls docs/PILOT_INVENTORYMOVEMENTS.md

# Verify no production access
grep -i "ondigitalocean\|aws\|railway" logs/  # Should be empty
```

## Phased Implementation Strategy

### Core Guardrails (Always Active)

- **Local-only by default**: All work starts on local Docker MySQL via repo harness (`pnpm test:env:up`, `pnpm test:db:reset light`)
- **Host guards**: Hard-block hosts matching production patterns (e.g., `ondigitalocean.com`) unless explicitly run with `--confirm-staging`/`--confirm-prod`
- **Non-destructive rule**: Only ADD or widen types. No DROP, no RENAME, no narrowing MODIFY
- **DB-first**: Database structure is source of truth; Drizzle schema aligned to DB
- **Version-aware SQL**: Detect MySQL version, use `ADD COLUMN IF NOT EXISTS` or fallback to INFORMATION_SCHEMA checks
- **SSL on DO**: For staging/prod, enforce SSL (`ssl-mode=REQUIRED`, `rejectUnauthorized=false`)
- **Backups & rollback**: Before any staging/prod apply, take backup; each migration includes tested rollback

### Phase 0: Preflight (Local Sanity)

**Objective**: Verify all tools and environment setup before any schema changes

**Tasks**:
1. Ensure required scripts exist: `validate-schema-comprehensive.ts`, `fix-schema-drift.ts`, `testing/db-util.ts`
2. Start local DB: `pnpm test:env:up` then `pnpm test:db:reset light`
3. Run `pnpm validate:schema` to confirm end-to-end tool execution
4. Verify local `.env` matches harness DB settings (no new credentials)

**Success Criteria**: All validation tools execute successfully on local DB

### Phase 1: Pilot (inventoryMovements) — Minimal, Manual, Safe

**Objective**: Prove the repair process works on single table with manual precision

**Tasks**:
1. **Inspect corruption**: Locate malformed `deletedAt` nested in column options, note exact locations
2. **Manual repair**: Remove nested `deletedAt`, add proper table-level fields, run `pnpm check`
3. **Align pilot table**: Use DB-first approach to match `inventoryMovements` to actual database structure
4. **Optional pilot migration**: Create ADD-only migration if benign column missing in DB
5. **Document pilot**: Create `docs/PILOT_INVENTORYMOVEMENTS.md` with complete details

**Success Gate**: 
- `pnpm check` passes
- `pnpm validate:schema` reports 0 issues for `inventoryMovements`
- Any pilot migration applies/rolls back cleanly
- Pilot documentation complete

### Phase 2: Controlled Scaling (Small Batches, Local-First)

**Objective**: Apply proven process to additional tables in small, manageable batches

**Tasks**:
1. Pick next 2-3 highest-severity tables from validator output
2. For each batch: align schema to DB, generate ADD/widen-only migrations if needed
3. Local validation loop: reset DB → apply changes → validate → test rollback
4. Maintain batch log: tables covered, issues fixed, validation results

**Success Criteria**: Each batch achieves 0 validation issues with tested rollbacks

### Phase 3: Pre-Staging Hardening

**Objective**: Prepare for staging deployment with safety measures and rehearsal

**Tasks**:
1. Enforce host guards with explicit `--confirm-staging` flags
2. Staging rehearsal: backup staging DB, apply single batch, test rollback
3. Update `docs/DATABASE_SCHEMA_SYNC.md` with staging lessons and playbook
4. Validate SSL connectivity and DigitalOcean-specific requirements

**Success Criteria**: Staging deployment tested successfully with rollback capability

### Phase 4: Full Coverage + CI Guardrails

**Objective**: Complete all critical tables and add continuous integration protection

**Tasks**:
1. Continue batches until all critical/high tables are clean
2. Add CI validation: MySQL in CI, `pnpm validate:schema`, migration linting
3. Implement permanent host guards and version checks
4. Document complete coverage and CI integration

**Success Criteria**: All critical tables pass validation, CI prevents regressions

### Phase 5: Production Readiness

**Objective**: Deploy to production with full safety measures and monitoring

**Tasks**:
1. Final staging validation: all batches applied, staging clean
2. Production deployment: backup, maintenance window, SSL, host confirmations
3. Post-deployment validation and monitoring
4. Final documentation: coverage report, rollback procedures, operational runbook

**Success Criteria**: Production deployment successful with zero validation issues

## DigitalOcean-Specific Implementation

### SSL Configuration

```typescript
// DigitalOcean MySQL connection with SSL
const DO_CONNECTION_CONFIG = {
  host: process.env.DO_MYSQL_HOST,
  port: parseInt(process.env.DO_MYSQL_PORT || '25060'),
  user: process.env.DO_MYSQL_USER,
  password: process.env.DO_MYSQL_PASSWORD,
  database: process.env.DO_MYSQL_DATABASE,
  ssl: {
    mode: 'REQUIRED',
    rejectUnauthorized: false  // DigitalOcean managed MySQL requirement
  }
};
```

### Host Guard Implementation

```typescript
function validateDigitalOceanAccess(connectionString: string, confirmFlag?: string): void {
  const url = new URL(connectionString);
  
  if (url.hostname.includes('ondigitalocean.com')) {
    if (url.hostname.includes('staging') && confirmFlag !== '--confirm-staging') {
      throw new Error('Staging access requires --confirm-staging flag');
    }
    if (url.hostname.includes('prod') && confirmFlag !== '--confirm-prod') {
      throw new Error('Production access requires --confirm-prod flag');
    }
    
    console.log(`⚠️  DigitalOcean ${getEnvironment(url.hostname)} access confirmed`);
    console.log(`🔒 SSL mode: REQUIRED`);
  }
}
```

### MySQL Version Detection

```typescript
async function detectMySQLVersion(db: MySql2Database): Promise<string> {
  const result = await db.execute(sql`SELECT VERSION() as version`);
  const version = result[0]?.version as string;
  
  console.log(`📊 MySQL Version: ${version}`);
  
  // Check IF NOT EXISTS support (MySQL 5.7+)
  const supportsIfNotExists = compareVersions(version, '5.7.0') >= 0;
  console.log(`🔧 IF NOT EXISTS support: ${supportsIfNotExists ? 'Yes' : 'No (using fallback)'}`);
  
  return version;
}
```

### Backup Strategy

```typescript
async function createDigitalOceanBackup(environment: 'staging' | 'production'): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupName = `schema-repair-${environment}-${timestamp}`;
  
  // Use DigitalOcean API or mysqldump
  const backupCommand = `mysqldump --single-transaction --routines --triggers ${DB_CONFIG} > ${backupName}.sql`;
  
  console.log(`💾 Creating backup: ${backupName}`);
  await executeBash({ command: backupCommand });
  
  return backupName;
}
```

## Fast Execution Guidelines

### Avoid Common Pitfalls

1. **Don't build automated scanners for pilot**: Manual, narrow edits are faster and safer initially
2. **Always run preflight**: Verify tool existence and `pnpm validate:schema` before any edits
3. **Keep batches small**: Reduce rollback surface and debugging time
4. **Record environment details**: MySQL version, exact commands, SSL settings for future reference
5. **Test rollbacks early**: Don't wait until production to verify rollback procedures

### Execution Checklist

```bash
# Phase 0: Preflight
[ ] Scripts exist and execute
[ ] Local DB running and seeded
[ ] Validation tools working end-to-end
[ ] Environment variables correct

# Phase 1: Pilot
[ ] Corruption locations identified
[ ] Manual repairs applied
[ ] TypeScript compilation passes
[ ] Pilot table validation clean
[ ] Migration tested (if created)
[ ] Documentation complete

# Phase 2-3: Scaling & Staging
[ ] Batch selection and prioritization
[ ] Host guards implemented
[ ] SSL configuration tested
[ ] Staging rehearsal successful
[ ] Rollback procedures validated

# Phase 4-5: CI & Production
[ ] CI integration complete
[ ] All critical tables clean
[ ] Production backup strategy
[ ] Deployment monitoring ready
[ ] Final documentation updated
```

## Future Enhancements

### Immediate Next Steps (Post-Pilot)

1. **Batch Automation**: Semi-automated batch processing for remaining tables
2. **Enhanced Host Guards**: More sophisticated environment detection
3. **Migration Linting**: CI checks for forbidden operations
4. **Rollback Testing**: Automated rollback validation in CI

### Long-term Improvements

1. **Schema Drift Prevention**: Pre-commit hooks to prevent corruption
2. **Visual Diff Tools**: UI for reviewing schema changes
3. **Multi-Database Support**: PostgreSQL, SQLite corruption patterns
4. **Team Coordination**: Multi-developer schema change workflows

## Appendix

### Corruption Patterns Reference

| Pattern Type | Example | Fix |
|--------------|---------|-----|
| Varchar nested | `varchar({...}).deletedAt: timestamp(...)` | Move to table level |
| References nested | `.references(...).deletedAt: timestamp(...)` | Move to table level |
| Decimal nested | `decimal({...}).deletedAt: timestamp(...)` | Move to table level |
| Multiple nesting | `.notNull().deletedAt: timestamp(...)` | Move to table level |

### MySQL Version Compatibility

| MySQL Version | IF NOT EXISTS Support | Recommended Approach |
|---------------|----------------------|---------------------|
| 5.6.x | No | Use conditional logic |
| 5.7.x+ | Yes | Use IF NOT EXISTS |
| 8.0.x+ | Yes | Use IF NOT EXISTS |

### Safety Checklist

- [ ] Host guards active and tested
- [ ] Local Docker MySQL running
- [ ] Test harness commands available
- [ ] Validation tools functional
- [ ] Backup of original schema files
- [ ] Documentation directory writable
- [ ] No production credentials in environment
