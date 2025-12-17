# Design Document

## Overview

This design document covers the implementation of 6 low-hanging fruit fixes identified in the roadmap. Each fix is small, focused, and can be completed independently.

## Architecture

No architectural changes required. All fixes are localized to specific files.

## Components and Interfaces

### 1. Connection Pool (server/_core/connectionPool.ts)

**Current State:**
- setInterval for stats logging is created but never stored
- connectionLimit is 10 (too low for production)
- queueLimit is 0 (unlimited, should be bounded)

**Target State:**
- Module-level `statsInterval` variable stores the interval
- closeConnectionPool() clears the interval
- connectionLimit: 25, queueLimit: 100

### 2. Backup Script (scripts/backup-database.sh)

**Current State:**
- Password passed via `--password="${DB_PASSWORD}"` (visible in `ps aux`)

**Target State:**
- Password set via `export MYSQL_PWD="${DB_PASSWORD}"`
- Password cleared via `unset MYSQL_PWD` after use

### 3. Logging Files

**Files to Update:**
- server/clientNeedsDbEnhanced.ts (~14 console.error calls)
- server/recurringOrdersDb.ts (~11 console.error calls)
- server/matchingEngineEnhanced.ts (~6 console.error calls)

**Pattern:**
```typescript
// Before
console.error("Error message:", error);

// After
logger.error({
  msg: "Error message",
  error: error instanceof Error ? error.message : String(error),
  stack: error instanceof Error ? error.stack : undefined,
});
```

## Data Models

No data model changes required.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Interval Cleanup
*For any* connection pool lifecycle, when closeConnectionPool() is called, the stats interval should be cleared and set to null.
**Validates: Requirements 1.2, 1.3**

### Property 2: Pool Configuration
*For any* new connection pool, the connectionLimit should be 25 and queueLimit should be 100.
**Validates: Requirements 2.1, 2.2**

### Property 3: Password Security
*For any* backup script execution, the mysqldump command should not contain --password in its arguments.
**Validates: Requirements 3.1**

### Property 4: Structured Logging Format
*For any* error logged in the updated files, the log should be a structured object with msg, error, and stack fields.
**Validates: Requirements 4.1, 4.2, 5.1, 5.2, 6.1, 6.2**

## Error Handling

All error handling remains unchanged - we're only changing how errors are logged, not how they're handled.

## Testing Strategy

### Manual Verification
- TypeScript compilation (`pnpm typecheck`)
- Linting (`pnpm lint`)
- Bash syntax check (`bash -n scripts/backup-database.sh`)

### Visual Inspection
- Verify no console.error remains in updated files
- Verify no --password flag in backup script
- Verify interval is stored and cleared in connectionPool.ts
