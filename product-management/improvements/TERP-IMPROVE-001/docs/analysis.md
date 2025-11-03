# TERP Inventory System Analysis Notes

## Analysis Date
November 3, 2025

## Overview
The TERP inventory system is a comprehensive batch-tracking solution for cannabis industry ERP. The system manages vendors, brands, products, lots, batches, and inventory movements with audit trails.

## Database Schema Analysis

### Core Tables
1. **vendors** - Supplier information
2. **brands** - Product brands (linked to vendors)
3. **strains** - Cannabis strain library with OpenTHC integration
4. **products** - Product catalog (linked to brands and strains)
5. **lots** - Vendor intake events
6. **batches** - Sellable units within lots (primary inventory unit)
7. **batchLocations** - Physical location tracking
8. **inventoryMovements** - Audit trail of all quantity changes
9. **inventoryAlerts** - Low stock, expiring, overstock alerts
10. **inventoryViews** - Saved filter configurations

### Batch Quantity Fields
- `onHandQty` - Total physical inventory
- `reservedQty` - Reserved for orders
- `quarantineQty` - Quarantined items
- `holdQty` - On hold items
- `defectiveQty` - Damaged/defective items
- `sampleQty` - Sample quantities

### Batch Status Lifecycle
- AWAITING_INTAKE → LIVE, QUARANTINED
- LIVE → ON_HOLD, QUARANTINED, SOLD_OUT
- ON_HOLD → LIVE, QUARANTINED
- QUARANTINED → LIVE, ON_HOLD, CLOSED
- SOLD_OUT → CLOSED
- CLOSED → (terminal state)

## Code Organization

### Server-Side
- **routers/inventory.ts** - Main inventory API endpoints
- **routers/inventoryMovements.ts** - Movement tracking API
- **inventoryDb.ts** - Database query layer (~1148 lines)
- **inventoryMovementsDb.ts** - Movement database operations
- **inventoryUtils.ts** - Business logic utilities (242 lines)
- **inventoryAlerts.ts** - Alert generation logic

### Client-Side
- **pages/Inventory.tsx** - Main inventory page (~825 lines)
- **components/inventory/** - Inventory-specific components
- **hooks/useInventoryFilters.ts** - Filter state management
- **hooks/useInventorySort.ts** - Sorting logic

## Critical Issues Identified

### 1. **RACE CONDITION IN INVENTORY DECREASES** ⚠️ HIGH PRIORITY
**Location:** `inventoryMovementsDb.ts:69-126` (decreaseInventory function)
**Issue:** The function has a documented race condition risk:
```typescript
// ⚠️ RACE CONDITION RISK: This function should be wrapped in a database transaction
// to prevent concurrent sales from the same batch causing negative inventory.
// Consider using SELECT ... FOR UPDATE on the batch record.
```

**Impact:** 
- Concurrent sales could cause negative inventory
- Overselling risk in high-traffic scenarios
- Data integrity compromise

**Recommendation:**
- Implement database transactions with row-level locking
- Use `SELECT ... FOR UPDATE` to lock batch records during updates
- Add retry logic for transaction conflicts

### 2. **Hardcoded Sequence Numbers**
**Location:** `inventory.ts:149` and `inventoryUtils.ts:100`
**Issue:** 
```typescript
const batchSequence = 1; // TODO: Get actual sequence from DB
const sequence = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
```

**Impact:**
- Potential SKU/code collisions
- Non-sequential batch numbering
- Unreliable lot code generation

**Recommendation:**
- Create sequence tracking table
- Implement atomic sequence generation
- Remove random number generation

### 3. **Missing Data Validation**
**Location:** Multiple files
**Issues:**
- No validation for negative quantity adjustments in some paths
- Missing bounds checking on COGS values
- Incomplete metadata validation
- No validation for location field constraints

**Recommendation:**
- Add comprehensive Zod schemas for all inputs
- Implement business rule validation layer
- Add database constraints where missing

### 4. **Inconsistent Error Handling**
**Location:** Throughout codebase
**Issues:**
- Mix of throw new Error() and AppError
- Inconsistent error messages
- Some errors not properly logged
- Missing context in error messages

**Recommendation:**
- Standardize on AppError class
- Add error codes for all error types
- Implement structured error logging
- Include context (batchId, userId) in all errors

### 5. **No Transaction Support**
**Location:** All database operations
**Issue:** Multi-step operations (intake, movements) not wrapped in transactions

**Impact:**
- Partial updates possible on failure
- Data inconsistency risk
- Difficult rollback scenarios

**Recommendation:**
- Implement transaction wrapper utility
- Wrap all multi-step operations in transactions
- Add transaction retry logic

## Performance Concerns

### 1. **N+1 Query Patterns**
**Location:** `inventoryDb.ts:236-258` (getBatchesWithDetails)
**Issue:** Uses LEFT JOINs but could be optimized further
**Recommendation:** 
- Add database indexes on foreign keys
- Consider query result caching
- Implement pagination for large datasets

### 2. **Missing Indexes**
**Location:** Database schema
**Potential Missing Indexes:**
- `batches.status` (frequently filtered)
- `batches.createdAt` (frequently sorted)
- `products.category` (frequently filtered)
- `inventoryMovements.batchId` (already has index)
- `inventoryMovements.createdAt` (for sorting)

### 3. **Large Result Sets**
**Location:** `inventory.ts:14` and client-side
**Issue:** Default limit of 100, but no pagination implemented
**Recommendation:**
- Implement cursor-based pagination
- Add virtual scrolling on client
- Reduce default page size

## Data Integrity Issues

### 1. **Quantity Calculation Inconsistencies**
**Location:** Multiple files
**Issue:** Available quantity calculated in multiple places:
- `inventoryUtils.ts:17` - Server calculation
- `Inventory.tsx:245` - Client-side calculation
- Potential for drift if formulas differ

**Recommendation:**
- Single source of truth for calculations
- Use database computed columns or views
- Add validation to ensure consistency

### 2. **Metadata Handling**
**Location:** `inventoryUtils.ts:226-240`
**Issue:** 
- Metadata stored as JSON text
- No schema validation
- Silent failures on parse errors
- Returns empty object on error

**Recommendation:**
- Define metadata schema with Zod
- Validate metadata on insert/update
- Log parse errors
- Consider structured metadata tables

### 3. **Audit Log Completeness**
**Location:** Various mutation endpoints
**Issue:** Not all operations create audit logs
**Recommendation:**
- Audit all mutations automatically
- Add database triggers as backup
- Include before/after snapshots consistently

## Code Quality Issues

### 1. **Code Duplication**
**Locations:**
- Vendor/brand/product creation logic repeated in intake endpoint
- Quantity parsing logic duplicated
- Error handling patterns repeated

**Recommendation:**
- Extract common patterns to utilities
- Create reusable service functions
- Implement DRY principle

### 2. **Large Functions**
**Location:** `inventory.ts:64-202` (intake mutation - 138 lines)
**Issue:** Single function handles too many responsibilities
**Recommendation:**
- Break into smaller service functions
- Separate concerns (validation, entity creation, batch creation)
- Improve testability

### 3. **Type Safety Gaps**
**Issues:**
- Use of `any` type in metadata handling
- Type assertions without validation
- Optional chaining without null handling

**Recommendation:**
- Eliminate `any` types
- Add runtime type validation
- Improve TypeScript strict mode compliance

## Missing Features for Robustness

### 1. **Inventory Reconciliation**
- No periodic inventory count support
- No variance tracking
- No reconciliation workflow

### 2. **Batch Expiration Tracking**
- No expiration date field
- No automated status updates for expired batches
- No expiration alerts (mentioned in schema but not implemented)

### 3. **Inventory Reservations**
- Reserved quantity tracked but no reservation records
- No reservation expiration
- No automatic release of expired reservations

### 4. **Batch Splitting/Merging**
- No support for splitting batches
- No support for merging batches
- No transfer between locations with quantity split

### 5. **Multi-Location Support**
- Location tracking exists but limited
- No transfer workflow between locations
- No location-specific availability

## Testing Gaps

### 1. **No Unit Tests**
**Impact:** Changes risk breaking existing functionality
**Recommendation:**
- Add Vitest tests for utilities
- Test calculation functions
- Test validation logic

### 2. **No Integration Tests**
**Impact:** Database operations not tested
**Recommendation:**
- Add integration tests for critical paths
- Test race conditions
- Test transaction rollback scenarios

### 3. **No Load Testing**
**Impact:** Unknown performance under load
**Recommendation:**
- Test concurrent inventory operations
- Measure query performance with large datasets
- Identify bottlenecks

## Security Concerns

### 1. **Authorization Checks**
**Issue:** Some endpoints use `publicProcedure as protectedProcedure`
**Location:** `inventory.ts:2` and `inventoryMovements.ts:7`
**Impact:** Potential unauthorized access
**Recommendation:**
- Use proper protectedProcedure
- Add role-based access control
- Audit all authorization checks

### 2. **Input Sanitization**
**Issue:** Limited SQL injection protection (using ORM helps)
**Recommendation:**
- Validate all string inputs
- Sanitize search queries
- Add rate limiting on search endpoints

## Monitoring and Observability

### 1. **Missing Metrics**
- No tracking of inventory operation latency
- No alerting on failed operations
- No dashboard for system health

### 2. **Limited Logging**
- Inconsistent logging
- No structured logging
- Missing correlation IDs

**Recommendation:**
- Implement structured logging protocol
- Add performance metrics
- Set up monitoring dashboards

## Summary of Priority Improvements

### Critical (P0) - Data Integrity
1. Fix race condition in decreaseInventory with transactions
2. Implement proper sequence generation for SKUs/codes
3. Add transaction support for multi-step operations

### High (P1) - Stability
4. Add comprehensive error handling and logging
5. Implement missing database indexes
6. Add data validation at all entry points

### Medium (P2) - Robustness
7. Implement inventory reconciliation
8. Add batch expiration tracking
9. Improve reservation management
10. Add unit and integration tests

### Low (P3) - Enhancement
11. Optimize query performance
12. Reduce code duplication
13. Improve type safety
14. Add monitoring and metrics

## Next Steps
1. Review findings with user
2. Prioritize improvements based on business impact
3. Create detailed implementation plan for each improvement
4. Estimate effort and timeline
