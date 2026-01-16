# ST-026: Concurrent Edit Detection Implementation

## Overview

Implements optimistic locking to prevent lost updates when multiple users edit the same record simultaneously.

**Status:** ✅ IMPLEMENTED

## How It Works

### 1. Database Schema

Version columns have been added to key tables:

```sql
-- clients table
ALTER TABLE `clients` ADD COLUMN `version` INT NOT NULL DEFAULT 1;

-- orders table
ALTER TABLE `orders` ADD COLUMN `version` INT NOT NULL DEFAULT 1;

-- batches table
ALTER TABLE `batches` ADD COLUMN `version` INT NOT NULL DEFAULT 1;
```

Schema definitions in `/home/user/TERP/drizzle/schema.ts`:
- `clients.version` (line 548, 1007)
- `orders.version` (line 2565)
- `batches.version` (line 1502)
- `calendarEvents.version` (line 4825)

### 2. Backend Implementation

#### Optimistic Locking Utilities

Location: `/home/user/TERP/server/_core/optimisticLocking.ts`

**Key Functions:**

1. **`checkVersion()`** - Validates version before update
2. **`updateWithVersion()`** - Performs update with optimistic locking
3. **`OptimisticLockError`** - Custom error for version conflicts

**Example Usage in Backend:**

```typescript
import { updateWithVersion } from "./_core/optimisticLocking";
import { clients } from "../../drizzle/schema";

// In your mutation handler
if (expectedVersion !== undefined) {
  await updateWithVersion(
    db,
    clients,
    "Client",
    clientId,
    expectedVersion,
    updateData
  );
}
```

#### Implemented Endpoints

✅ **Clients Router** (`/home/user/TERP/server/routers/clients.ts`)
- `clients.update` - Accepts optional `version` parameter (line 145)
- Calls `clientsDb.updateClient()` with version (line 162)

✅ **Clients Database** (`/home/user/TERP/server/clientsDb.ts`)
- `updateClient()` - Implements optimistic locking (lines 433-444)
- Uses `updateWithVersion()` when version is provided

✅ **Orders Router** (`/home/user/TERP/server/routers/orders.ts`)
- Multiple update endpoints support version:
  - `orders.update` (line 227)
  - `orders.updateDraft` (line 530)
  - `orders.finalize` (line 726)

✅ **Orders Database** (`/home/user/TERP/server/ordersDb.ts`)
- `updateOrder()` - Uses `checkVersion()` (lines 666-670)
- `updateOrderStatus()` - Optimistic lock check (lines 1488-1500)
- Auto-increments version on update (line 698)

### 3. Frontend Implementation

#### React Hook

Location: `/home/user/TERP/client/src/hooks/useOptimisticLocking.tsx`

Provides error handling and UI for concurrent edit conflicts.

**Usage Example:**

```typescript
import { useOptimisticLocking } from "@/hooks/useOptimisticLocking";

const { handleMutationError, ConflictDialogComponent } = useOptimisticLocking({
  entityType: "Client",
  onRefresh: () => refetchClient(),
  onDiscard: () => closeDialog(),
});

const updateMutation = trpc.clients.update.useMutation({
  onError: (error) => {
    if (!handleMutationError(error)) {
      // Handle other errors
    }
  },
});

// In JSX
return (
  <>
    {/* Your form */}
    {ConflictDialogComponent}
  </>
);
```

#### Updated Components

✅ **ClientProfilePage** (`/home/user/TERP/client/src/pages/ClientProfilePage.tsx`)
- Imports `useOptimisticLocking` hook (line 59)
- Adds optimistic locking to mutation (lines 94-99, 139-145)
- Passes `version` in update request (line 962)
- Renders `ConflictDialogComponent` (line 1223)

✅ **CustomerWishlistCard** (`/home/user/TERP/client/src/components/clients/CustomerWishlistCard.tsx`)
- Accepts `version` and `onRefresh` props (lines 19-20)
- Implements optimistic locking (lines 36-43)
- Passes version in mutation (line 70)
- Renders ConflictDialogComponent (line 146)

### 4. User Experience Flow

#### Scenario: Two users editing the same client

1. **User A and User B both load Client #123**
   - Both receive: `{ id: 123, name: "ACME Corp", version: 1, ... }`

2. **User A saves first**
   - Mutation: `{ clientId: 123, version: 1, name: "ACME Corporation" }`
   - Backend updates: `version: 1 → 2`
   - Success response returned

3. **User B tries to save (with stale data)**
   - Mutation: `{ clientId: 123, version: 1, address: "123 New St" }`
   - Backend detects version mismatch (expected: 1, actual: 2)
   - Throws `OptimisticLockError` with code `CONFLICT`

4. **User B sees conflict dialog**
   - Message: "This record has been modified by another user..."
   - Options:
     - **Refresh** - Reload latest data (version 2) and reapply changes
     - **Discard** - Close dialog and abandon changes

5. **User B refreshes and retries**
   - Gets latest data: `{ id: 123, name: "ACME Corporation", version: 2, ... }`
   - Applies their changes: `{ clientId: 123, version: 2, address: "123 New St" }`
   - Success! Version: `2 → 3`

### 5. Conflict Dialog UI

Component: `/home/user/TERP/client/src/components/common/ConflictDialog.tsx`

Shows user-friendly message with options to:
- **Refresh** - Reload the record with latest data
- **Discard** - Cancel edit and close dialog

## Testing

### Manual Test Procedure

1. **Open same client in two browser tabs**
   - Tab A: Navigate to Client Profile #123
   - Tab B: Navigate to Client Profile #123

2. **Edit in Tab A**
   - Click Edit button
   - Change client name to "ACME Corporation"
   - Click Save
   - ✅ Should succeed (version 1 → 2)

3. **Edit in Tab B (without refreshing)**
   - Click Edit button
   - Change client address to "123 New Street"
   - Click Save
   - ❌ Should show conflict dialog

4. **Refresh in Tab B**
   - Click "Refresh" in conflict dialog
   - Notice name changed to "ACME Corporation" (from Tab A)
   - Change address again to "123 New Street"
   - Click Save
   - ✅ Should succeed (version 2 → 3)

### Automated Tests

Test file: `/home/user/TERP/server/__tests__/optimisticLocking.test.ts`

**Test Coverage:**
- ✅ Version check passes when version matches
- ✅ Version check throws error when version doesn't match
- ✅ Update increments version on success
- ✅ Concurrent edit throws OptimisticLockError
- ✅ Sequential updates work with correct versions
- ✅ Real-world scenario: Two users editing simultaneously

**Run tests:**
```bash
npm test -- optimisticLocking.test.ts
```

## Implementation Checklist

- [x] Version column exists in schema (clients, orders, batches)
- [x] Optimistic locking middleware created (`server/_core/optimisticLocking.ts`)
- [x] Backend endpoints updated to accept version
  - [x] `clients.update`
  - [x] `orders.update`
  - [x] `orders.updateDraft`
  - [x] `orders.finalize`
  - [x] `orders.updateStatus`
- [x] Frontend hook created (`useOptimisticLocking.tsx`)
- [x] Frontend components updated
  - [x] `ClientProfilePage`
  - [x] `CustomerWishlistCard`
- [x] Conflict dialog component (`ConflictDialog.tsx`)
- [x] Test suite created
- [x] Documentation written

## Future Enhancements

### Additional Tables
Consider adding version columns to:
- `supplier_profiles` - For supplier profile updates
- `invoices` - For invoice modifications
- `products` - For product catalog changes
- `purchase_orders` - For PO updates

### Optimistic UI Updates
Implement optimistic updates with automatic rollback on conflict:
```typescript
const mutation = trpc.clients.update.useMutation({
  onMutate: async (newData) => {
    // Cancel outgoing refetches
    await utils.clients.getById.cancel({ clientId });

    // Snapshot previous value
    const previous = utils.clients.getById.getData({ clientId });

    // Optimistically update
    utils.clients.getById.setData({ clientId }, (old) => ({
      ...old,
      ...newData,
    }));

    return { previous };
  },
  onError: (err, newData, context) => {
    // Rollback on error
    utils.clients.getById.setData({ clientId }, context.previous);
  },
});
```

### Batch Updates
Implement batch updates with version checking:
```typescript
// Update multiple records atomically
const results = await batchUpdateWithVersionCheck(db, clients, [
  { id: 1, version: 5, name: "Updated Name 1" },
  { id: 2, version: 3, name: "Updated Name 2" },
]);
```

### Version History
Track version history for audit/debugging:
```typescript
// Log version changes
await db.insert(versionHistory).values({
  entityType: "Client",
  entityId: clientId,
  version: newVersion,
  changedBy: userId,
  changes: JSON.stringify(updates),
});
```

## Related Tasks

- **DATA-005**: Optimistic locking implementation (completed)
- **ST-013**: Soft delete support (implemented with `deletedAt`)
- **CHAOS-006**: Chaos engineering for concurrent edits

## References

- Optimistic Locking Utilities: `/home/user/TERP/server/_core/optimisticLocking.ts`
- Frontend Hook: `/home/user/TERP/client/src/hooks/useOptimisticLocking.tsx`
- Conflict Dialog: `/home/user/TERP/client/src/components/common/ConflictDialog.tsx`
- Test Suite: `/home/user/TERP/server/__tests__/optimisticLocking.test.ts`
- Schema: `/home/user/TERP/drizzle/schema.ts`
