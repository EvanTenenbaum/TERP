# Design Document: Canonical Model Unification

## Overview

This design document outlines the technical approach for unifying TERP's party identity model around the `clients` table as the single canonical Counterparty table. The project addresses six critical areas:

1. **Party Model Unification** - Consolidating `vendors` and `clients` into a unified model
2. **Foreign Key Integrity** - Adding missing FK constraints to ~59 columns
3. **Public Procedure Security** - Securing all mutation endpoints
4. **Actor Attribution Security** - Eliminating fallback user ID patterns
5. **Schema Drift Prevention** - CI-based drift detection
6. **Data Migration Safety** - Reversible, incremental migrations

## Architecture

### Current State (Split-Brain Party Model)

```
┌─────────────────────────────────────────────────────────────────┐
│                     CURRENT PARTY MODEL                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐         ┌──────────────┐                     │
│  │   vendors    │         │   clients    │                     │
│  │──────────────│         │──────────────│                     │
│  │ id           │         │ id           │                     │
│  │ name         │         │ teriCode     │                     │
│  │ contactName  │         │ name         │                     │
│  │ contactEmail │         │ isBuyer      │                     │
│  │ paymentTerms │         │ isSeller     │                     │
│  └──────┬───────┘         │ isBrand      │                     │
│         │                 └──────┬───────┘                     │
│         │                        │                             │
│    ┌────┴────┐              ┌────┴────┐                        │
│    │         │              │         │                        │
│    ▼         ▼              ▼         ▼                        │
│ ┌──────┐ ┌──────┐      ┌────────┐ ┌────────┐                  │
│ │ lots │ │bills │      │invoices│ │ orders │                  │
│ │vendor│ │vendor│      │customer│ │ client │                  │
│ │  Id  │ │  Id  │      │   Id   │ │   Id   │                  │
│ └──────┘ └──────┘      └────────┘ └────────┘                  │
│                                                                 │
│  ANOMALY: intakeSessions.vendorId → clients.id (not vendors!)  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Target State (Unified Party Model)

```
┌─────────────────────────────────────────────────────────────────┐
│                     UNIFIED PARTY MODEL                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                    ┌──────────────────┐                        │
│                    │     clients      │                        │
│                    │  (Counterparty)  │                        │
│                    │──────────────────│                        │
│                    │ id               │                        │
│                    │ teriCode         │                        │
│                    │ name             │                        │
│                    │ isBuyer          │ ← Customer role        │
│                    │ isSeller         │ ← Supplier role        │
│                    │ isBrand          │                        │
│                    │ isReferee        │                        │
│                    │ isContractor     │                        │
│                    └────────┬─────────┘                        │
│                             │                                   │
│         ┌───────────────────┼───────────────────┐              │
│         │                   │                   │              │
│         ▼                   ▼                   ▼              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │supplierProf │    │   orders    │    │  invoices   │        │
│  │   (new)     │    │  clientId   │    │  clientId   │        │
│  │ clientId FK │    │     FK      │    │     FK      │        │
│  └─────────────┘    └─────────────┘    └─────────────┘        │
│                                                                 │
│  ┌──────────────┐  (DEPRECATED - mapping layer)                │
│  │   vendors    │  ← Queries redirected to clients             │
│  │  (legacy)    │  ← No new writes                             │
│  └──────────────┘                                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Supplier Profile Extension Table

New table to store supplier-specific fields, keyed by `clients.id`:

```typescript
// drizzle/schema.ts - NEW TABLE
export const supplierProfiles = mysqlTable(
  "supplier_profiles",
  {
    id: int("id").primaryKey().autoincrement(),
    clientId: int("client_id")
      .notNull()
      .unique()
      .references(() => clients.id, { onDelete: "cascade" }),
    
    // Supplier-specific fields migrated from vendors
    contactName: varchar("contact_name", { length: 255 }),
    contactEmail: varchar("contact_email", { length: 320 }),
    contactPhone: varchar("contact_phone", { length: 50 }),
    paymentTerms: varchar("payment_terms", { length: 100 }),
    supplierNotes: text("supplier_notes"),
    
    // Legacy vendor mapping (for migration)
    legacyVendorId: int("legacy_vendor_id"),
    
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  (table) => ({
    clientIdIdx: index("idx_supplier_profiles_client_id").on(table.clientId),
    legacyVendorIdx: index("idx_supplier_profiles_legacy_vendor").on(table.legacyVendorId),
  })
);
```

### 2. Vendor-to-Client Mapping Layer

Service layer that translates vendor operations to client operations:

```typescript
// server/services/vendorMappingService.ts
export interface VendorMappingService {
  // Map legacy vendorId to clientId
  getClientIdForVendor(vendorId: number): Promise<number | null>;
  
  // Get supplier profile by legacy vendor ID
  getSupplierByLegacyVendorId(vendorId: number): Promise<SupplierProfile | null>;
  
  // Create client from vendor (migration)
  migrateVendorToClient(vendorId: number): Promise<Client>;
  
  // Check if vendor has been migrated
  isVendorMigrated(vendorId: number): Promise<boolean>;
}
```

### 3. Protected Procedure Middleware

Enhanced tRPC middleware for authentication enforcement:

```typescript
// server/_core/trpc.ts - ENHANCED
export const protectedProcedure = publicProcedure.use(async ({ ctx, next }) => {
  if (!ctx.user?.id) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Authentication required for this operation',
    });
  }
  
  return next({
    ctx: {
      ...ctx,
      user: ctx.user, // Guaranteed non-null
      actorId: ctx.user.id, // Canonical actor attribution
    },
  });
});

// VIP Portal procedure with session verification
export const vipPortalProcedure = publicProcedure.use(async ({ ctx, next }) => {
  const sessionToken = ctx.req.headers['x-vip-session-token'];
  if (!sessionToken) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'VIP portal session required',
    });
  }
  
  const session = await verifyVipPortalSession(sessionToken);
  if (!session) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Invalid or expired VIP portal session',
    });
  }
  
  return next({
    ctx: {
      ...ctx,
      vipSession: session,
      clientId: session.clientId,
      actorId: `vip:${session.clientId}`, // VIP portal actor attribution
    },
  });
});
```

### 4. Schema Drift Detection Service

CI-integrated schema validation:

```typescript
// scripts/utils/schema-drift-detector.ts
export interface SchemaDriftDetector {
  // Compare Drizzle schema to actual database
  detectDrift(): Promise<DriftReport>;
  
  // Validate specific table
  validateTable(tableName: string): Promise<TableValidation>;
  
  // Check for missing columns
  findMissingColumns(): Promise<MissingColumn[]>;
  
  // Check for missing FK constraints
  findMissingForeignKeys(): Promise<MissingFK[]>;
  
  // Check for missing indexes
  findMissingIndexes(): Promise<MissingIndex[]>;
}

export interface DriftReport {
  hasDrift: boolean;
  missingColumns: MissingColumn[];
  missingForeignKeys: MissingFK[];
  missingIndexes: MissingIndex[];
  namingInconsistencies: NamingIssue[];
  timestamp: Date;
}
```

## Data Models

### Column Renaming Map

| Current Column | Table(s) | Target Column | FK Target |
|----------------|----------|---------------|-----------|
| `customerId` | sales, invoices, payments | `clientId` | clients.id |
| `vendorId` | bills, payments, lots, paymentHistory | `supplierClientId` | clients.id |
| `vendorId` | purchaseOrders, vendorNotes | Keep (references vendors.id during transition) | vendors.id → clients.id |

### FK Columns Requiring `.references()`

Based on audit, these columns need FK constraints added:

```typescript
// HIGH PRIORITY - Accounting tables
invoices.customerId → clients.id
payments.customerId → clients.id  
payments.vendorId → clients.id (as supplier)
bills.vendorId → clients.id (as supplier)

// MEDIUM PRIORITY - Inventory tables
sales.customerId → clients.id
sales.createdBy → users.id
lots.vendorId → vendors.id (then clients.id)
paymentHistory.vendorId → vendors.id (then clients.id)
paymentHistory.recordedBy → users.id

// LOWER PRIORITY - Other tables
cogsHistory.changedBy → users.id
auditLogs.actorId → users.id
productMedia.uploadedBy → users.id
products.brandId → brands.id
products.strainId → strains.id
batches.productId → products.id
batches.lotId → lots.id
```

### Public Mutation Audit

Routers with `publicProcedure.mutation` that need conversion:

| Router | Mutation | Action Required |
|--------|----------|-----------------|
| auth.ts | logout | KEEP - Auth primitive |
| salesSheetEnhancements.ts | deactivateExpired | CONVERT to protectedProcedure |

### Fallback User ID Pattern Locations

Files with `ctx.user?.id || 1` pattern to fix:

| File | Count | Fix Strategy |
|------|-------|--------------|
| server/routers/orders.ts | 8 | Convert to protectedProcedure, require auth |
| server/routers/calendar.ts | 5 | Convert to protectedProcedure |
| server/routers/calendarViews.ts | 6 | Convert to protectedProcedure |
| server/routers/calendarParticipants.ts | 5 | Convert to protectedProcedure |
| server/routers/calendarMeetings.ts | 3 | Convert to protectedProcedure |
| server/routers/calendarRecurrence.ts | 9 | Convert to protectedProcedure |
| server/routers/calendarReminders.ts | 4 | Convert to protectedProcedure |
| server/routers/calendarFinancials.ts | 3 | Convert to protectedProcedure |
| server/routers/calendarInvitations.ts | 4 | Convert to protectedProcedure |
| server/routers/salesSheets.ts | 2 | Convert to protectedProcedure |
| server/routers/pricingDefaults.ts | 1 | Convert to protectedProcedure |

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Canonical Party Model Integrity

*For any* party-related database operation (create, read, update), the operation SHALL resolve to a `clients.id` as the canonical identifier, regardless of whether the party is acting as customer, supplier, brand, or other role.

**Validates: Requirements 1.1, 1.2**

### Property 2: Foreign Key Referential Integrity

*For any* column identified as a foreign key reference (customerId, vendorId, clientId, etc.), the column SHALL have a valid `.references()` declaration in the Drizzle schema AND all values in that column SHALL exist in the referenced table.

**Validates: Requirements 2.1, 2.2, 2.3, 9.1**

### Property 3: Foreign Key Index Coverage

*For any* column with a `.references()` declaration, there SHALL exist a corresponding index on that column to ensure query performance.

**Validates: Requirements 2.4, 2.5**

### Property 4: Naming Convention Consistency

*For any* table or column name in the schema, the name SHALL follow a consistent convention (either camelCase or snake_case) within its context, and party reference columns SHALL use the canonical naming (`clientId` for customers, `supplierClientId` for suppliers).

**Validates: Requirements 3.1, 3.2, 3.3, 6.3**

### Property 5: Public Mutation Restriction

*For any* tRPC procedure using `publicProcedure.mutation`, the procedure SHALL be one of: (a) VIP portal authentication primitives (login, logout, forgot password, reset password), or (b) a deprecated endpoint that immediately throws without database mutation.

**Validates: Requirements 4.1, 4.2**

### Property 6: Actor Attribution from Context

*For any* database write operation that records actor attribution (createdBy, updatedBy, receivedBy, actorId), the value SHALL be derived from authenticated context (ctx.user.id or ctx.vipSession.clientId) and SHALL NOT be accepted from client request input.

**Validates: Requirements 5.1, 5.2**

### Property 7: No Fallback User ID Pattern

*For any* code path that accesses user identity, the pattern `ctx.user?.id || 1` (or similar fallback to a default ID) SHALL NOT exist. Instead, unauthenticated requests SHALL be rejected with an appropriate error.

**Validates: Requirements 5.3, 5.4, 5.5**

### Property 8: Vendor-to-Client Mapping Correctness

*For any* query that previously used `vendors.id`, when routed through the mapping layer, the query SHALL return equivalent results using `clients.id` with `isSeller=true` or via the `supplierProfiles` table.

**Validates: Requirements 8.2**

### Property 9: Orphan Record Detection

*For any* foreign key column after migration, there SHALL be zero orphaned records (values that don't exist in the referenced table).

**Validates: Requirements 9.2**

## Error Handling

### Authentication Errors

```typescript
// Unauthenticated mutation attempt
throw new TRPCError({
  code: 'UNAUTHORIZED',
  message: 'Authentication required. Please log in to perform this action.',
});

// Invalid VIP portal session
throw new TRPCError({
  code: 'UNAUTHORIZED', 
  message: 'Your VIP portal session has expired. Please log in again.',
});

// Missing actor context (should never happen after fix)
throw new TRPCError({
  code: 'INTERNAL_SERVER_ERROR',
  message: 'Unable to determine actor for this operation. Please contact support.',
});
```

### Migration Errors

```typescript
// Vendor not found for migration
throw new Error(`Vendor ID ${vendorId} not found. Cannot migrate to client.`);

// Duplicate client during migration
throw new Error(`Client with name "${name}" already exists. Manual deduplication required.`);

// FK constraint violation during migration
throw new Error(`Cannot migrate vendor ${vendorId}: referenced by ${count} records in ${table}`);
```

### Schema Drift Errors

```typescript
// Drift detected in CI
throw new Error(`Schema drift detected:\n${driftReport.summary}\nDeployment blocked.`);

// Missing column in production
throw new Error(`Column ${column} exists in schema but not in database. Run migration first.`);
```

## Testing Strategy

### Dual Testing Approach

This project requires both **unit tests** and **property-based tests**:

- **Unit tests**: Verify specific migration scenarios, edge cases, and error conditions
- **Property-based tests**: Verify universal properties hold across all valid inputs

### Property-Based Testing Framework

**Framework**: `fast-check` (TypeScript property-based testing library)

**Configuration**: Minimum 100 iterations per property test

### Test Categories

#### 1. Schema Validation Tests (Property-Based)

```typescript
// Property: All FK columns have references
// **Feature: canonical-model-unification, Property 2: Foreign Key Referential Integrity**
test.prop([fc.constantFrom(...fkColumns)], { numRuns: 100 }, (column) => {
  const hasReference = schemaHasReference(column);
  const valuesExist = allValuesExistInReferencedTable(column);
  return hasReference && valuesExist;
});
```

#### 2. Security Tests (Property-Based)

```typescript
// Property: No public mutations except allowed list
// **Feature: canonical-model-unification, Property 5: Public Mutation Restriction**
test.prop([fc.constantFrom(...allMutations)], { numRuns: 100 }, (mutation) => {
  if (isPublicMutation(mutation)) {
    return ALLOWED_PUBLIC_MUTATIONS.includes(mutation.name);
  }
  return true;
});
```

#### 3. Actor Attribution Tests (Unit + Property)

```typescript
// Unit test: Verify createdBy is rejected from input
test('should reject createdBy in request payload', async () => {
  const result = await caller.orders.create({
    ...validOrder,
    createdBy: 999, // Should be ignored or rejected
  });
  expect(result.createdBy).toBe(authenticatedUserId); // Not 999
});

// Property: No fallback patterns exist
// **Feature: canonical-model-unification, Property 7: No Fallback User ID Pattern**
test.prop([fc.constantFrom(...routerFiles)], { numRuns: 100 }, (file) => {
  const content = readFileSync(file, 'utf-8');
  return !content.includes('ctx.user?.id || 1');
});
```

#### 4. Migration Tests (Unit)

```typescript
// Unit test: Vendor to client migration preserves data
test('should migrate vendor to client with all fields', async () => {
  const vendor = await createTestVendor();
  const client = await vendorMappingService.migrateVendorToClient(vendor.id);
  
  expect(client.name).toBe(vendor.name);
  expect(client.isSeller).toBe(true);
  
  const profile = await getSupplierProfile(client.id);
  expect(profile.contactEmail).toBe(vendor.contactEmail);
  expect(profile.legacyVendorId).toBe(vendor.id);
});
```

#### 5. Mapping Layer Tests (Property-Based)

```typescript
// Property: Vendor queries return equivalent client results
// **Feature: canonical-model-unification, Property 8: Vendor-to-Client Mapping Correctness**
test.prop([fc.integer({ min: 1, max: 1000 })], { numRuns: 100 }, async (vendorId) => {
  const vendorResult = await legacyVendorQuery(vendorId);
  const clientResult = await mappedClientQuery(vendorId);
  
  return deepEqual(vendorResult, clientResult);
});
```

## Migration Strategy

### Phase 1: Foundation (Non-Breaking)

1. Create `supplierProfiles` table
2. Add schema drift detection to CI
3. Add missing FK constraints (without data changes)
4. Add missing indexes

### Phase 2: Security Hardening (Non-Breaking)

1. Convert `publicProcedure.mutation` to `protectedProcedure`
2. Remove `ctx.user?.id || 1` patterns
3. Add actor attribution validation
4. Add VIP portal session verification

### Phase 3: Data Migration (Careful)

1. Migrate vendor records to clients (with `isSeller=true`)
2. Create supplier profiles from vendor data
3. Update FK references (vendorId → clientId where appropriate)
4. Backfill legacy mapping table

### Phase 4: Column Normalization (Breaking)

1. Rename `customerId` → `clientId` with alias support
2. Update application code to use new names
3. Remove aliases after verification
4. Deprecate `vendors` table (read-only)

### Phase 5: Cleanup

1. Remove deprecated vendor code paths
2. Remove mapping layer (after verification)
3. Archive vendors table
4. Final validation and documentation

## Risk Assessment

### High Risk

1. **Data Loss During Migration**: Mitigated by backups, dry-run mode, and rollback procedures
2. **Production Downtime**: Mitigated by incremental, non-breaking changes first
3. **FK Constraint Violations**: Mitigated by data audit before adding constraints

### Medium Risk

1. **Application Code Breakage**: Mitigated by dual-write and alias columns
2. **Performance Degradation**: Mitigated by adding indexes before constraints
3. **Schema Drift Recurrence**: Mitigated by CI drift detection

### Low Risk

1. **Documentation Gaps**: Mitigated by canonical dictionary requirement
2. **Test Coverage Gaps**: Mitigated by property-based testing

## Rollback Procedures

### Phase 1 Rollback

```sql
-- Remove supplierProfiles table
DROP TABLE IF EXISTS supplier_profiles;

-- Remove added FK constraints
ALTER TABLE invoices DROP FOREIGN KEY fk_invoices_client_id;
-- ... repeat for each added constraint
```

### Phase 2 Rollback

```typescript
// Revert router changes via git
git revert <security-hardening-commits>
```

### Phase 3 Rollback

```sql
-- Restore vendor references
UPDATE lots SET vendorId = (
  SELECT legacyVendorId FROM supplier_profiles 
  WHERE client_id = lots.supplierClientId
);
-- ... repeat for each migrated table
```

### Phase 4 Rollback

```sql
-- Rename columns back
ALTER TABLE invoices CHANGE clientId customerId INT;
-- ... repeat for each renamed column
```


---

## Red-Team QA Analysis

### Assumption Validation

#### Assumption 1: `customerId` values always match `clients.id`

**Status**: ⚠️ UNVERIFIED - REQUIRES DATA AUDIT

**Evidence**:
- `invoices.customerId` has comment "Will link to clients table when created" - suggests FK was never added
- `sales.customerId` has no FK constraint
- `payments.customerId` has no FK constraint

**Counterexample Risk**: 
- Historical data may have `customerId` values that don't exist in `clients` table
- Data may have been inserted before `clients` table existed
- Orphaned records could cause FK constraint failures

**Mitigation**:
1. Run data audit query BEFORE adding FK constraints:
   ```sql
   SELECT DISTINCT customerId FROM invoices 
   WHERE customerId NOT IN (SELECT id FROM clients);
   
   SELECT DISTINCT customerId FROM sales 
   WHERE customerId IS NOT NULL AND customerId NOT IN (SELECT id FROM clients);
   
   SELECT DISTINCT customerId FROM payments 
   WHERE customerId IS NOT NULL AND customerId NOT IN (SELECT id FROM clients);
   ```
2. Create orphan resolution strategy (delete, reassign, or create placeholder clients)
3. Add FK constraints only after orphan resolution

#### Assumption 2: All "vendor" rows can be mapped to clients without collision

**Status**: ⚠️ UNVERIFIED - REQUIRES DATA AUDIT

**Evidence**:
- `vendors.name` is unique
- `clients.name` is NOT unique (only `teriCode` is unique)
- Potential for name collisions during migration

**Counterexample Risk**:
- Vendor "ABC Company" may already exist as client "ABC Company"
- Different vendors may have same name as existing clients
- Migration could create duplicate business entities

**Mitigation**:
1. Run collision detection query:
   ```sql
   SELECT v.id, v.name, c.id as existing_client_id, c.name as client_name
   FROM vendors v
   INNER JOIN clients c ON LOWER(v.name) = LOWER(c.name);
   ```
2. For collisions, determine if same entity (merge) or different (rename)
3. Create manual review queue for ambiguous cases
4. Generate unique `teriCode` for migrated vendors

#### Assumption 3: Public mutations are safe

**Status**: ✅ MOSTLY VERIFIED

**Evidence**:
- Only 2 `publicProcedure.mutation` found:
  - `auth.logout` - Safe (auth primitive)
  - `salesSheetEnhancements.deactivateExpired` - **UNSAFE** (modifies DB state)

**Counterexample Found**:
- `salesSheetEnhancements.deactivateExpired` is a public mutation that modifies database state without authentication

**Mitigation**:
1. Convert `salesSheetEnhancements.deactivateExpired` to `protectedProcedure`
2. Add RBAC permission check
3. Consider if this should be a cron job instead of API endpoint

#### Assumption 4: Schema drift is fully known

**Status**: ❌ PARTIALLY FALSE

**Evidence**:
- `SCHEMA_DRIFT_FIXES.md` documents 2240 issues
- `CRITICAL_ROOT_CAUSE_FOUND.md` documents `deleted_at` column mismatch
- Some tables have `deletedAt` in schema but not in DB
- Mixed naming conventions (camelCase vs snake_case)

**Counterexample Found**:
- `invoices` table has comment "NOTE: deletedAt removed - column does not exist in production database"
- This suggests manual schema fixes were applied inconsistently
- Unknown drift may exist in other tables

**Mitigation**:
1. Run comprehensive schema introspection before any migration
2. Compare ALL tables, not just critical ones
3. Add CI check that blocks deployment on drift
4. Create schema snapshot before and after each migration

#### Assumption 5: `intakeSessions.vendorId` → `clients.id` is intentional

**Status**: ✅ VERIFIED

**Evidence**:
```typescript
vendorId: int("vendor_id")
  .notNull()
  .references(() => clients.id, { onDelete: "restrict" }),
```

**Analysis**: This is the canonical pattern we want to adopt. The naming is confusing (`vendorId` referencing `clients.id`), but the FK is correct.

**Mitigation**:
1. Document this as the canonical supplier reference pattern
2. Consider renaming to `supplierClientId` for clarity in future
3. Use this pattern for other supplier references

#### Assumption 6: `protectedProcedure` enforces authentication

**Status**: ⚠️ PARTIALLY TRUE - HAS FALLBACK

**Evidence** (from `server/_core/trpc.ts`):
```typescript
const requireUser = t.middleware(async opts => {
  let user = ctx.user;
  
  if (!user) {
    logger.warn({ ... });
    user = await getOrCreatePublicUserFallback();
  }
  // ...
});
```

**Counterexample Found**:
- `protectedProcedure` has a fallback to "Public Demo User" with `id: -1`
- This means "protected" procedures can still run without real authentication
- The fallback was added to avoid "debug loops"

**Mitigation**:
1. For write operations, explicitly check `ctx.user.id !== -1`
2. Create new `strictlyProtectedProcedure` that rejects public user
3. Audit all mutations to ensure they reject public user
4. Consider removing the fallback for production

### Gaps Identified

#### Gap 1: Missing FK Constraints (Confirmed)

**Columns without `.references()`**:
| Table | Column | Should Reference |
|-------|--------|------------------|
| sales | customerId | clients.id |
| sales | createdBy | users.id |
| invoices | customerId | clients.id |
| invoices | createdBy | users.id |
| invoices | referenceId | (polymorphic - needs design) |
| invoiceLineItems | invoiceId | invoices.id |
| invoiceLineItems | productId | products.id |
| invoiceLineItems | batchId | batches.id |
| payments | customerId | clients.id |
| payments | vendorId | clients.id (as supplier) |
| payments | bankAccountId | bankAccounts.id |
| payments | invoiceId | invoices.id |
| payments | billId | bills.id |
| brands | vendorId | vendors.id (then clients.id) |
| expenses | vendorId | clients.id (as supplier) |
| expenses | categoryId | (needs verification) |
| lots | vendorId | vendors.id |
| paymentHistory | batchId | batches.id |
| paymentHistory | vendorId | vendors.id |
| paymentHistory | recordedBy | users.id |
| cogsHistory | batchId | batches.id |
| cogsHistory | changedBy | users.id |
| auditLogs | actorId | users.id |
| productMedia | productId | products.id |
| productMedia | uploadedBy | users.id |
| productSynonyms | productId | products.id |
| productTags | productId | products.id |
| productTags | tagId | tags.id |

#### Gap 2: Fallback User ID Pattern More Extensive Than Expected

**Files with `ctx.user?.id || 1` pattern** (50+ occurrences):
- server/routers/orders.ts (8)
- server/routers/calendar.ts (5)
- server/routers/calendarViews.ts (6)
- server/routers/calendarParticipants.ts (5)
- server/routers/calendarMeetings.ts (3)
- server/routers/calendarRecurrence.ts (9)
- server/routers/calendarReminders.ts (4)
- server/routers/calendarFinancials.ts (3)
- server/routers/calendarInvitations.ts (4)
- server/routers/salesSheets.ts (2)
- server/routers/pricingDefaults.ts (1)

**Impact**: This is a significant security and audit issue. All these need conversion.

#### Gap 3: VIP Portal Security Not Fully Implemented

**Evidence**:
- `vipPortalAuth` table exists with session management
- No `vipPortalProcedure` middleware found in `trpc.ts`
- VIP portal writes may not be properly authenticated

**Mitigation**: Create dedicated VIP portal middleware as designed.

#### Gap 4: `createdBy` Accepted from Input

**Evidence** (from `server/routers/refunds.ts`):
```typescript
createdBy: input.createdBy,
```

**Impact**: Actor attribution can be spoofed by client.

**Mitigation**: Remove from input schema, derive from context.

#### Gap 5: Mixed Naming Conventions in Schema

**Evidence**:
- Tables: `vendorNotes` (camelCase) vs `intake_sessions` (snake_case)
- Columns: `customerId` (camelCase) vs `client_id` (snake_case)
- This correlates with schema drift issues

**Mitigation**: Standardize on one convention (recommend snake_case for DB, camelCase for TypeScript).

### Bugs/Issues Found

#### Bug 1: `protectedProcedure` Allows Public User for Writes

**Severity**: HIGH

**Description**: The `requireUser` middleware falls back to a public demo user, which means "protected" mutations can still execute without real authentication.

**Fix**: Add explicit check in write operations:
```typescript
if (ctx.user.id === -1) {
  throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Authentication required' });
}
```

#### Bug 2: Inconsistent `onDelete` Behavior

**Severity**: MEDIUM

**Description**: Some FKs use `cascade`, others use `restrict`, others use `set null`. No clear pattern.

**Examples**:
- `vendorNotes.vendorId` → `cascade` (delete notes when vendor deleted)
- `purchaseOrders.vendorId` → `restrict` (prevent vendor deletion if POs exist)
- `calendarEvents.vendorId` → `set null` (keep event, clear vendor)

**Fix**: Document and standardize `onDelete` behavior by relationship type.

#### Bug 3: `invoices.customerId` Comment Suggests Incomplete Migration

**Severity**: MEDIUM

**Description**: Comment says "Will link to clients table when created" - suggests FK was planned but never added.

**Fix**: Add FK constraint as part of this migration.

### Updated Risk Assessment

| Risk | Original | Updated | Reason |
|------|----------|---------|--------|
| Data Loss | High | **Critical** | Orphan records may exist |
| Auth Bypass | Medium | **High** | Public user fallback in protected procedures |
| Schema Drift | Medium | **High** | More extensive than documented |
| FK Violations | High | **Critical** | ~30+ columns need constraints |

### Recommended Changes to Implementation Plan

1. **Add Phase 0: Data Audit** - Run orphan detection queries before any migration
2. **Add Phase 0.5: Auth Hardening** - Fix public user fallback before other changes
3. **Increase testing scope** - Add integration tests for auth bypass scenarios
4. **Add rollback testing** - Verify rollback procedures work before production
5. **Create staging environment** - Test full migration on staging before production


---

## Canonical Dictionary

### Term Definitions

| Term | Definition | Canonical Table | Canonical ID Field |
|------|------------|-----------------|-------------------|
| **Counterparty** | Any external business party | `clients` | `clients.id` |
| **Customer** | A counterparty you sell to (AR side) | `clients` with `isBuyer=true` | `clientId` |
| **Supplier** | A counterparty you buy from (AP + intake) | `clients` with `isSeller=true` | `clientId` or `supplierClientId` |
| **Vendor** | DEPRECATED - Legacy term for supplier | `vendors` (deprecated) → `clients` | `vendorId` → `clientId` |
| **Brand** | A product brand (may be same as supplier) | `clients` with `isBrand=true` | `clientId` |
| **User** | Internal system user | `users` | `userId` |
| **Actor** | Who performed an action (user or system) | `users` or system account | `actorId` (derived from context) |

### ID Field Rules

| Field Name | Always References | Notes |
|------------|-------------------|-------|
| `clientId` | `clients.id` | Canonical counterparty reference |
| `customerId` | `clients.id` | DEPRECATED - use `clientId` |
| `supplierClientId` | `clients.id` | Explicit supplier reference |
| `vendorId` | Context-dependent | If in `intakeSessions` → `clients.id`; else → `vendors.id` (deprecated) |
| `userId` | `users.id` | Internal user reference |
| `actorId` | `users.id` | Audit attribution (never from input) |
| `createdBy` | `users.id` | Audit attribution (never from input) |
| `updatedBy` | `users.id` | Audit attribution (never from input) |
| `receivedBy` | `users.id` | Audit attribution (never from input) |

### Allowed Relationships

| Source Table | Column | Target Table | Relationship Type |
|--------------|--------|--------------|-------------------|
| orders | clientId | clients | Many-to-One |
| invoices | clientId | clients | Many-to-One |
| payments | clientId | clients | Many-to-One (AR) |
| payments | supplierClientId | clients | Many-to-One (AP) |
| intakeSessions | vendorId | clients | Many-to-One (supplier) |
| supplierProfiles | clientId | clients | One-to-One |
| lots | supplierClientId | clients | Many-to-One |
| bills | supplierClientId | clients | Many-to-One |

### Write Authorization Rules

| Operation Type | Required Auth | Actor Attribution |
|----------------|---------------|-------------------|
| Internal mutation | `protectedProcedure` + RBAC | `ctx.user.id` |
| VIP portal mutation | `vipPortalProcedure` | `vip:${ctx.vipSession.clientId}` |
| System/cron job | Service account | `system:${jobName}` |
| Public read | `publicProcedure` | N/A |
| Public mutation | FORBIDDEN (except auth primitives) | N/A |

### Owning Modules

| Entity | Owning Module | Primary Router |
|--------|---------------|----------------|
| clients | CRM | `server/routers/clients.ts` |
| supplierProfiles | CRM | `server/routers/suppliers.ts` (new) |
| vendors (deprecated) | Inventory | `server/routers/vendors.ts` |
| invoices | Accounting | `server/routers/accounting.ts` |
| payments | Accounting | `server/routers/accounting.ts` |
| orders | Orders | `server/routers/orders.ts` |
| intakeSessions | Inventory | `server/routers/productIntake.ts` |

---

## Execution Plan Checklist (Machine-Actionable)

### Routers with publicProcedure.mutation to Convert

- [ ] `server/routers/salesSheetEnhancements.ts` - `deactivateExpired` → `protectedProcedure`

### Columns Needing Renaming/Repurposing

| File | Column | Current | Target | Action |
|------|--------|---------|--------|--------|
| drizzle/schema.ts | invoices.customerId | No FK | clientId + FK to clients.id | Rename + Add FK |
| drizzle/schema.ts | sales.customerId | No FK | clientId + FK to clients.id | Rename + Add FK |
| drizzle/schema.ts | payments.customerId | No FK | clientId + FK to clients.id | Rename + Add FK |
| drizzle/schema.ts | payments.vendorId | No FK | supplierClientId + FK to clients.id | Rename + Add FK |
| drizzle/schema.ts | bills.vendorId | FK to vendors.id | supplierClientId + FK to clients.id | Rename + Change FK |
| drizzle/schema.ts | lots.vendorId | No FK | supplierClientId + FK to clients.id | Rename + Add FK |
| drizzle/schema.ts | expenses.vendorId | No FK | supplierClientId + FK to clients.id | Rename + Add FK |
| drizzle/schema.ts | brands.vendorId | No FK | supplierClientId + FK to clients.id | Rename + Add FK |

### FK-like Columns Missing .references()

| Table | Column | Should Reference | Polymorphic? |
|-------|--------|------------------|--------------|
| sales | customerId | clients.id | No |
| sales | createdBy | users.id | No |
| invoices | customerId | clients.id | No |
| invoices | createdBy | users.id | No |
| invoices | referenceId | orders.id OR sales.id | Yes |
| invoiceLineItems | invoiceId | invoices.id | No |
| invoiceLineItems | productId | products.id | No |
| invoiceLineItems | batchId | batches.id | No |
| payments | customerId | clients.id | No |
| payments | vendorId | clients.id | No |
| payments | bankAccountId | bankAccounts.id | No |
| payments | invoiceId | invoices.id | No |
| payments | billId | bills.id | No |
| brands | vendorId | vendors.id → clients.id | No |
| expenses | vendorId | clients.id | No |
| expenses | categoryId | expenseCategories.id | No |
| lots | vendorId | vendors.id → clients.id | No |
| paymentHistory | batchId | batches.id | No |
| paymentHistory | vendorId | vendors.id → clients.id | No |
| paymentHistory | recordedBy | users.id | No |
| cogsHistory | batchId | batches.id | No |
| cogsHistory | changedBy | users.id | No |
| auditLogs | actorId | users.id | No |
| productMedia | productId | products.id | No |
| productMedia | uploadedBy | users.id | No |
| productSynonyms | productId | products.id | No |
| productTags | productId | products.id | No |
| productTags | tagId | tags.id | No |

### Files with createdBy/actorId Accepted from Input

| File | Line | Field | Action |
|------|------|-------|--------|
| server/routers/refunds.ts | 138 | createdBy | Remove from input, derive from ctx |
| server/routers/refunds.ts | 148 | createdBy | Remove from input, derive from ctx |

### Files with ctx.user?.id || 1 Pattern

| File | Count | Action |
|------|-------|--------|
| server/routers/orders.ts | 8 | Replace with strict auth check |
| server/routers/calendar.ts | 5 | Replace with strict auth check |
| server/routers/calendarViews.ts | 6 | Replace with strict auth check |
| server/routers/calendarParticipants.ts | 5 | Replace with strict auth check |
| server/routers/calendarMeetings.ts | 3 | Replace with strict auth check |
| server/routers/calendarRecurrence.ts | 9 | Replace with strict auth check |
| server/routers/calendarReminders.ts | 4 | Replace with strict auth check |
| server/routers/calendarFinancials.ts | 3 | Replace with strict auth check |
| server/routers/calendarInvitations.ts | 4 | Replace with strict auth check |
| server/routers/salesSheets.ts | 2 | Replace with strict auth check |
| server/routers/pricingDefaults.ts | 1 | Replace with strict auth check |
| **TOTAL** | **50** | |

---

## Red-Team Section: Assumptions, Counterexamples, and Mitigations

### Assumption 1: customerId values always match clients.id

**Counterexamples**:
1. Historical invoices created before clients table existed
2. Manually inserted test data with arbitrary IDs
3. Data imported from external systems with different ID schemes

**Mitigations**:
1. Run orphan detection query before adding FK constraints
2. Create placeholder clients for orphaned records OR reassign to "Unknown Client"
3. Add data validation to import processes

**Verification Query**:
```sql
-- Run BEFORE adding FK constraint
SELECT 'invoices' as tbl, COUNT(*) as orphans 
FROM invoices WHERE customerId NOT IN (SELECT id FROM clients)
UNION ALL
SELECT 'sales', COUNT(*) FROM sales 
WHERE customerId IS NOT NULL AND customerId NOT IN (SELECT id FROM clients)
UNION ALL
SELECT 'payments', COUNT(*) FROM payments 
WHERE customerId IS NOT NULL AND customerId NOT IN (SELECT id FROM clients);
```

### Assumption 2: All vendor rows can be mapped to clients without collision

**Counterexamples**:
1. Vendor "ABC Corp" exists, Client "ABC Corp" also exists (same entity)
2. Vendor "ABC Corp" exists, Client "ABC Corporation" exists (different entity, similar name)
3. Two vendors with same name (shouldn't happen due to unique constraint, but verify)

**Mitigations**:
1. Run collision detection query
2. Create manual review queue for ambiguous cases
3. Use fuzzy matching to detect near-duplicates
4. Generate unique teriCode using vendor ID as suffix

**Verification Query**:
```sql
-- Exact match collisions
SELECT v.id as vendor_id, v.name as vendor_name, 
       c.id as client_id, c.name as client_name
FROM vendors v
INNER JOIN clients c ON LOWER(TRIM(v.name)) = LOWER(TRIM(c.name));

-- Near-match collisions (requires application logic)
-- Use Levenshtein distance or similar
```

### Assumption 3: Public mutations are safe

**Counterexamples**:
1. `salesSheetEnhancements.deactivateExpired` - Modifies DB without auth
2. Future developers may add public mutations without realizing the risk

**Mitigations**:
1. Convert identified unsafe mutation to protectedProcedure
2. Add CI check that scans for `publicProcedure.mutation`
3. Document allowed public mutations in canonical dictionary
4. Add code review checklist item for mutation security

**Verification Script**:
```bash
# Find all public mutations
grep -r "publicProcedure\.mutation" server/routers/
# Should only return auth primitives
```

### Assumption 4: Schema drift is fully known

**Counterexamples**:
1. `invoices.deletedAt` was manually removed from schema but may exist in some environments
2. Different environments (dev, staging, prod) may have different schemas
3. Manual database changes not reflected in Drizzle schema

**Mitigations**:
1. Run schema introspection against ALL environments
2. Add CI check that compares schema to database
3. Block deployments if drift detected
4. Create schema snapshot before and after each migration

**Verification Script**:
```typescript
// scripts/verify-schema-sync.ts
import { introspectDatabase } from './utils/schema-introspection';
import * as schema from '../drizzle/schema';

async function verifySchemaSync() {
  const dbSchema = await introspectDatabase();
  const drizzleSchema = extractDrizzleSchema(schema);
  
  const drift = compareSchemas(dbSchema, drizzleSchema);
  if (drift.length > 0) {
    console.error('Schema drift detected:', drift);
    process.exit(1);
  }
}
```

### Assumption 5: protectedProcedure enforces authentication

**Counterexamples**:
1. Public demo user fallback allows "protected" procedures to run
2. `ctx.user.id === -1` is a valid user ID in the system
3. Mutations can execute with synthetic user

**Mitigations**:
1. Add explicit check for `ctx.user.id === -1` in mutations
2. Create `strictlyProtectedProcedure` that rejects public user
3. Log all operations by public user for audit
4. Consider removing fallback in production

**Verification**:
```typescript
// In each mutation
if (ctx.user.id === -1) {
  throw new TRPCError({
    code: 'UNAUTHORIZED',
    message: 'Authentication required for this operation',
  });
}
```

### Assumption 6: VIP portal has proper session verification

**Counterexamples**:
1. No `vipPortalProcedure` middleware exists currently
2. VIP portal writes may use `publicProcedure`
3. Session tokens may not be validated

**Mitigations**:
1. Create `vipPortalProcedure` middleware as designed
2. Audit all VIP portal routers
3. Add session expiration checks
4. Log all VIP portal operations

### Risk Matrix Summary

| Assumption | Confidence | Impact if Wrong | Mitigation Priority |
|------------|------------|-----------------|---------------------|
| customerId → clients.id | Low | High (FK failures) | P0 - Run audit first |
| Vendor-client mapping | Medium | Medium (duplicates) | P1 - Manual review |
| Public mutations safe | High | Low (1 found) | P1 - Quick fix |
| Schema drift known | Low | High (deployment failures) | P0 - CI check |
| protectedProcedure auth | Medium | High (security bypass) | P0 - Fix fallback |
| VIP portal security | Low | Medium (unauthorized access) | P1 - Create middleware |
