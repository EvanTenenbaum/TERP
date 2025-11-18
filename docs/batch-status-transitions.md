# Batch Status Transition Logic

**Task:** ST-017  
**Status:** ✅ Complete  
**Session:** Session-20251117-db-performance-d6d96289  
**Date:** 2025-11-17

## Overview

This document describes the batch status transition logic implemented in the TERP inventory system. The logic ensures that inventory batches follow a valid lifecycle and prevents invalid state transitions.

## Status Enum

The system supports 7 distinct batch statuses defined in `batchStatusEnum`:

1. **AWAITING_INTAKE** - Initial state when batch is expected but not yet received
2. **LIVE** - Batch is active and available for sale
3. **PHOTOGRAPHY_COMPLETE** - Batch photos have been taken (sub-status of LIVE)
4. **ON_HOLD** - Batch is temporarily unavailable
5. **QUARANTINED** - Batch has quality issues and is isolated
6. **SOLD_OUT** - All inventory has been sold
7. **CLOSED** - Terminal state, batch lifecycle complete

## Valid Transitions

The `VALID_TRANSITIONS` map in `server/inventoryUtils.ts` defines all allowed state transitions:

### From AWAITING_INTAKE
- ✅ **LIVE** - Batch received and ready for sale
- ✅ **QUARANTINED** - Quality issues found during intake

### From LIVE
- ✅ **PHOTOGRAPHY_COMPLETE** - Photos taken
- ✅ **ON_HOLD** - Temporarily unavailable
- ✅ **QUARANTINED** - Quality issues discovered
- ✅ **SOLD_OUT** - All inventory sold

### From PHOTOGRAPHY_COMPLETE
- ✅ **LIVE** - Return to active status
- ✅ **ON_HOLD** - Temporarily unavailable
- ✅ **QUARANTINED** - Quality issues discovered
- ✅ **SOLD_OUT** - All inventory sold

### From ON_HOLD
- ✅ **LIVE** - Release from hold
- ✅ **QUARANTINED** - Move to quarantine

### From QUARANTINED
- ✅ **LIVE** - Quality issues resolved
- ✅ **ON_HOLD** - Move to hold status
- ✅ **CLOSED** - Dispose of batch

### From SOLD_OUT
- ✅ **CLOSED** - Complete lifecycle

### From CLOSED
- ❌ **No transitions allowed** - Terminal state

## Invalid Transitions (Business Rules)

The following transitions are **explicitly blocked** to maintain data integrity:

### Cannot Skip Lifecycle Steps
- ❌ AWAITING_INTAKE → PHOTOGRAPHY_COMPLETE (must go LIVE first)
- ❌ AWAITING_INTAKE → ON_HOLD (must go LIVE first)
- ❌ AWAITING_INTAKE → SOLD_OUT (must go LIVE first)
- ❌ AWAITING_INTAKE → CLOSED (must go through proper lifecycle)

### Cannot Reactivate Terminal/Near-Terminal States
- ❌ CLOSED → any status (terminal state)
- ❌ SOLD_OUT → LIVE (cannot reactivate sold inventory)
- ❌ SOLD_OUT → ON_HOLD (cannot hold sold inventory)
- ❌ SOLD_OUT → QUARANTINED (cannot quarantine sold inventory)

### Cannot Bypass Required Paths
- ❌ LIVE → CLOSED (must go through SOLD_OUT or QUARANTINED)
- ❌ ON_HOLD → SOLD_OUT (must return to LIVE first)
- ❌ ON_HOLD → CLOSED (must go through proper path)
- ❌ QUARANTINED → SOLD_OUT (cannot sell quarantined inventory)

## Implementation

### Core Functions

#### `isValidStatusTransition(currentStatus, newStatus)`
Validates if a transition from `currentStatus` to `newStatus` is allowed.

```typescript
// Example usage
if (!isValidStatusTransition(batch.status, newStatus)) {
  throw new Error('Invalid status transition');
}
```

#### `getAllowedNextStatuses(currentStatus)`
Returns an array of all valid next statuses for the given current status.

```typescript
// Example usage
const allowedStatuses = getAllowedNextStatuses('LIVE');
// Returns: ['PHOTOGRAPHY_COMPLETE', 'ON_HOLD', 'QUARANTINED', 'SOLD_OUT']
```

### API Endpoint

**Endpoint:** `inventory.updateStatus`  
**Method:** Mutation  
**Permission:** `inventory:update`

**Input:**
```typescript
{
  id: number;        // Batch ID
  status: string;    // New status
  reason?: string;   // Optional reason for change
}
```

**Behavior:**
1. Fetches current batch
2. Validates transition using `isValidStatusTransition()`
3. Updates batch status in database
4. Creates audit log with before/after snapshots
5. Returns success response

**Error Handling:**
- Throws `BATCH_NOT_FOUND` if batch doesn't exist
- Throws `INVALID_STATUS_TRANSITION` if transition is not allowed

## Audit Trail

Every status change creates an audit log entry with:
- **Actor ID** - User who made the change
- **Entity** - "Batch"
- **Entity ID** - Batch ID
- **Action** - "STATUS_CHANGE"
- **Before** - Snapshot of batch before change
- **After** - Snapshot of batch after change
- **Reason** - Optional explanation

This provides complete traceability for all status changes.

## Testing

Comprehensive test suite in `server/routers/batches.test.ts` covers:

### Valid Transitions (17 test cases)
- All allowed transitions from each status
- Idempotent transitions (same → same)

### Invalid Transitions (18 test cases)
- Terminal state enforcement
- Lifecycle step validation
- Business rule enforcement

### Helper Functions (4 test cases)
- `getAllowedNextStatuses()` for each status
- Terminal state behavior

### Business Rules (6 test cases)
- Complete lifecycle paths
- Recovery scenarios
- Reversibility

**Total:** 45+ test cases ensuring comprehensive coverage

## Common Lifecycles

### Normal Sale Flow
```
AWAITING_INTAKE → LIVE → PHOTOGRAPHY_COMPLETE → SOLD_OUT → CLOSED
```

### Quarantine Flow
```
AWAITING_INTAKE → QUARANTINED → CLOSED
```

### Quality Issue During Sale
```
LIVE → QUARANTINED → LIVE → SOLD_OUT → CLOSED
```

### Hold and Release
```
LIVE → ON_HOLD → LIVE → SOLD_OUT → CLOSED
```

## Performance Considerations

With the database indexes added in ST-005:
- `idx_batches_status` - Fast filtering by status
- Status transition queries are optimized
- Audit log queries benefit from entity indexes

## Related Tasks

- **ST-005:** Add Missing Database Indexes ✅
- **ST-015:** Benchmark Critical Paths ✅
- **ST-017:** Implement Batch Status Transition Logic ✅ (this document)

## Maintenance Notes

When adding new statuses:
1. Add to `batchStatusEnum` in schema
2. Update `VALID_TRANSITIONS` map in `inventoryUtils.ts`
3. Add test cases for new transitions
4. Update this documentation
5. Run migration to add new enum value to database

## References

- Implementation: `server/inventoryUtils.ts` (lines 132-160)
- API Endpoint: `server/routers/inventory.ts` (lines 137-176)
- Tests: `server/routers/batches.test.ts`
- Schema: `drizzle/schema.ts` (batchStatusEnum)
