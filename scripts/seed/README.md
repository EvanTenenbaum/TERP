# TERP Seeding System

Production-grade database seeding with concurrency control, schema validation, and PII masking.

## Quick Start

```bash
# Seed all tables with medium data volume
pnpm seed:new

# Seed specific table
pnpm seed:new --table=clients

# Preview without executing
pnpm seed:new --dry-run

# Seed with specific data volume
pnpm seed:new --size=small    # ~10 records per table
pnpm seed:new --size=medium   # ~100 records per table (default)
pnpm seed:new --size=large    # ~1000+ records per table
```

## Architecture

```
scripts/seed/
├── seed-main.ts           # CLI orchestrator with argument parsing
├── lib/
│   ├── locking.ts         # MySQL advisory locks (GET_LOCK, RELEASE_LOCK)
│   ├── validation.ts      # Schema validation using introspection
│   ├── data-masking.ts    # PII masking with Faker.js
│   └── logging.ts         # Structured logging utilities
├── seeders/
│   ├── index.ts           # Seeder types and exports
│   ├── seed-vendors.ts    # Vendor seeder (no dependencies)
│   ├── seed-clients.ts    # Client seeder (no dependencies)
│   ├── seed-products.ts   # Product seeder (depends on brands)
│   ├── seed-batches.ts    # Batch seeder (depends on products, lots, vendors)
│   ├── seed-orders.ts     # Order seeder (depends on clients, batches)
│   ├── seed-invoices.ts   # Invoice seeder (depends on clients, orders)
│   └── seed-payments.ts   # Payment seeder (depends on invoices, clients)
└── README.md              # This documentation
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLI Orchestrator                                │
│                             (seed-main.ts)                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
          ┌───────────────────────────┼───────────────────────────┐
          │                           │                           │
          ▼                           ▼                           ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│  Database Lock  │       │ Schema Validate │       │   PII Masking   │
│  (locking.ts)   │       │ (validation.ts) │       │(data-masking.ts)│
└─────────────────┘       └─────────────────┘       └─────────────────┘
          │                           │                           │
          │                           │                           │
          └───────────────────────────┼───────────────────────────┘
                                      │
                                      ▼
                    ┌─────────────────────────────────┐
                    │         MySQL Database          │
                    └─────────────────────────────────┘
```

## CLI Reference

### Commands

| Command | Description |
|---------|-------------|
| `pnpm seed:new` | Seed all tables with default settings |
| `pnpm seed:new:dry-run` | Preview seeding without executing |
| `pnpm seed:new:rollback` | Rollback seeded data (Phase 2) |

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `--table=<name>` | Seed specific table | All tables |
| `--size=<small\|medium\|large>` | Data volume | `medium` |
| `--env=<dev\|staging\|production>` | Override environment | Auto-detect |
| `--dry-run` | Preview without executing | `false` |
| `--force, -f` | Skip confirmation prompts | `false` |
| `--rollback` | Rollback seeded data | `false` |
| `--verbose, -v` | Enable verbose output | `false` |
| `--help, -h` | Show help message | - |

### Data Volumes

| Size | Records per Table | Use Case |
|------|-------------------|----------|
| `small` | ~10 | Quick testing, CI/CD |
| `medium` | ~100 | Development (default) |
| `large` | ~1000+ | Performance testing |

## Components

### 1. Database Locking (`lib/locking.ts`)

Prevents concurrent seeding operations using MySQL advisory locks.

```typescript
import { SeedingLock } from './lib/locking';

const lock = new SeedingLock(db);

try {
  const acquired = await lock.acquire('terp_seeding_global', 0);
  if (!acquired) {
    throw new Error('Another seeding operation is in progress');
  }

  // ... seeding logic ...
} finally {
  await lock.release('terp_seeding_global');
}
```

**Features:**
- MySQL `GET_LOCK()` / `RELEASE_LOCK()` for cross-process safety
- Automatic cleanup on process termination (SIGINT, SIGTERM)
- Lock status checking with `IS_USED_LOCK()`
- Per-table or global locking

### 2. Schema Validation (`lib/validation.ts`)

Validates data against database schema before insertion.

```typescript
import { SchemaValidator } from './lib/validation';

const validator = new SchemaValidator(db);

const result = await validator.validateColumns('orders', orderData);
if (!result.valid) {
  console.error('Validation errors:', result.errors);
  throw new Error('Schema validation failed');
}
```

**Features:**
- Column name validation (camelCase ↔ snake_case)
- Data type checking
- NOT NULL constraint validation
- Foreign key reference validation
- Enum value validation
- Schema metadata caching (5-minute TTL)

### 3. PII Masking (`lib/data-masking.ts`)

Anonymizes sensitive data for GDPR/CCPA compliance.

```typescript
import { PIIMasker } from './lib/data-masking';

const masker = new PIIMasker({
  environment: 'development',
  seed: 12345, // Deterministic output
});

const maskedClient = masker.maskRecord('clients', {
  name: 'John Doe',
  email: 'john@example.com',
  phone: '555-1234',
});
// Result: { name: 'Jane Smith', email: 'jane.smith@faker.com', ... }
```

**Features:**
- Auto-detection of PII fields by name pattern
- Environment-aware (disabled in production)
- Deterministic masking with seeds
- Supports: email, phone, name, address, SSN, credit card, DOB, IP
- Audit logging for compliance reporting

### 4. Structured Logging (`lib/logging.ts`)

Provides consistent, structured logging for all operations.

```typescript
import { seedLogger, withPerformanceLogging } from './lib/logging';

// Log operation lifecycle
seedLogger.operationStart('seed', { tables: ['clients', 'orders'] });
seedLogger.operationSuccess('seed', { recordsInserted: 100 });
seedLogger.operationFailure('seed', error, { table: 'clients' });

// Log with performance tracking
await withPerformanceLogging('seed-clients', async () => {
  // ... operation ...
});
```

**Log Levels:**
- `debug` - Lock operations, PII masking, detailed progress
- `info` - Operation start/success, record counts, summary
- `warn` - Validation failures, skipped operations
- `error` - Operation failures, lock conflicts, critical errors

**Output Format:**
- Development: Pretty-printed with colors
- Production: JSON for log aggregation

## Development Guide

### Adding a New Seeder (Phase 2)

1. Create seeder file in `scripts/seed/seeders/`:

```typescript
// scripts/seed/seeders/seed-clients.ts
import { db } from '../../db-sync';
import { clients } from '../../../drizzle/schema';
import { SchemaValidator } from '../lib/validation';
import { PIIMasker } from '../lib/data-masking';
import { seedLogger } from '../lib/logging';

export async function seedClients(
  count: number,
  validator: SchemaValidator,
  masker: PIIMasker
): Promise<number> {
  const records = [];

  for (let i = 0; i < count; i++) {
    const record = {
      name: faker.company.name(),
      email: faker.internet.email(),
      // ... more fields
    };

    // Validate
    const result = await validator.validateColumns('clients', record);
    if (!result.valid) {
      seedLogger.validationFailure('clients', result.errors);
      continue;
    }

    // Mask PII
    const masked = masker.maskRecord('clients', record);
    records.push(masked);
  }

  // Insert
  await db.insert(clients).values(records);

  return records.length;
}
```

2. Register seeder in `seed-main.ts`:

```typescript
import { seedClients } from './seeders/seed-clients';

// In executeSeed():
case 'clients':
  stats.recordsInserted['clients'] = await seedClients(count, validator, masker);
  break;
```

### Testing

```bash
# Run with dry-run to verify logic
pnpm seed:new --dry-run --verbose

# Test specific table
pnpm seed:new --table=clients --size=small --dry-run

# Test lock concurrency (open two terminals)
# Terminal 1: pnpm seed:new --size=large
# Terminal 2: pnpm seed:new  # Should fail with lock error
```

## Troubleshooting

### Common Errors

#### "Another seeding operation is in progress"

**Cause:** MySQL advisory lock is held by another process.

**Solution:**
1. Wait for the other operation to complete
2. Check for stuck locks: `SELECT IS_USED_LOCK('terp_seeding_global')`
3. Release manually if needed: `SELECT RELEASE_LOCK('terp_seeding_global')`

#### "Table does not exist"

**Cause:** Database schema is out of sync.

**Solution:**
1. Run database migrations: `pnpm db:push`
2. Verify table exists: `SHOW TABLES LIKE 'tablename'`

#### "Schema validation failed"

**Cause:** Data structure doesn't match database schema.

**Solution:**
1. Check error details for specific field
2. Verify column names (camelCase vs snake_case)
3. Check data types match (number vs string)
4. Ensure required fields are provided

#### "PII masking skipped"

**Cause:** Running in production environment.

**Solution:** This is expected behavior. PII masking is disabled in production to preserve real data integrity.

### Debug Mode

Enable verbose logging:

```bash
DEBUG=* pnpm seed:new --verbose
```

Or set in environment:

```bash
export NODE_ENV=development
export LOG_LEVEL=debug
```

## Compliance

### GDPR/CCPA

The PII masking system helps maintain compliance by:

1. **Auto-detection**: Automatically identifies PII fields by name pattern
2. **Environment awareness**: Only masks in non-production environments
3. **Audit logging**: Records all masked fields for compliance reporting
4. **Deterministic output**: Same seed produces same fake data for testing

### Audit Log

Access masking audit after seeding:

```typescript
const masker = new PIIMasker();
// ... after seeding ...
const audit = masker.getAuditSummary();
// { clients: ['email', 'phone', 'name'], orders: ['contactEmail'] }
```

## Related Files

| File | Purpose |
|------|---------|
| `scripts/db-sync.ts` | Database connection (reused) |
| `scripts/utils/schema-introspection.ts` | Schema utilities (reused) |
| `server/_core/logger.ts` | Logging patterns (referenced) |
| `scripts/generators/*` | Data generators (Phase 2) |
| `scripts/seed-realistic-main.ts` | Legacy seeder (to be replaced) |

## Roadmap

### Phase 1 ✅
- [x] Database locking mechanism
- [x] Schema validation utilities
- [x] PII masking utilities
- [x] CLI orchestrator
- [x] Structured logging
- [x] Documentation

### Phase 2 ✅
- [x] Individual table seeders (vendors, clients, products, batches, orders, invoices, payments)
- [x] FK dependency ordering
- [x] Schema validation before insert
- [x] PII masking in non-production
- [x] Batch inserts for performance

### Phase 3 (Future)
- [ ] Idempotency checks (seeding_metadata table)
- [ ] Rollback capabilities
- [ ] Seed data snapshots
- [ ] Cross-environment seeding
- [ ] Parallel table seeding
- [ ] Custom data templates
- [ ] Remove legacy `SKIP_SEEDING` bypass
