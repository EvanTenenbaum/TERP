# GF-008: Sample Request - Specification

**Version:** 1.1
**Created:** 2026-01-27
**Last Updated:** 2026-01-27
**Status:** VERIFIED
**Author:** Agent (GF-PHASE0A-008)
**Source Files Reviewed:**
- `client/src/pages/SampleManagement.tsx` (837 lines)
- `client/src/components/samples/SampleForm.tsx` (253 lines)
- `client/src/components/samples/SampleList.tsx` (512 lines)
- `client/src/components/samples/SampleReturnDialog.tsx` (171 lines)
- `client/src/components/samples/LocationUpdateDialog.tsx` (144 lines)
- `client/src/components/samples/VendorShipDialog.tsx` (110 lines)
- `client/src/components/samples/ExpiringSamplesWidget.tsx`
- `server/routers/samples.ts` (518 lines)
- `server/samplesDb.ts` (930 lines)
- `drizzle/schema.ts` (sampleRequests, sampleAllocations, sampleLocationHistory)

---

## Overview

The Sample Request flow manages sales samples distributed to clients and prospects. Sales representatives create sample requests specifying products and quantities, which are then fulfilled from sample-designated inventory. The system tracks sample distribution, monthly allocation limits, conversions to sales, sample returns, and vendor returns. This flow provides ROI visibility into sample programs and ensures proper inventory tracking.

**Key Clarification**: There is no separate "APPROVED" status for sample requests. When a sample is "approved" for distribution, it moves directly from PENDING to FULFILLED. The UI displays "Approved" as the label for FULFILLED status.

---

## User Journey

### Primary Flow: Create and Fulfill Sample Request

1. **Sales Rep navigates to `/samples` (SampleManagement page)**
   - Views list of existing sample requests with status, client, and product information
   - Can filter by status tabs: ALL, PENDING, FULFILLED (labeled "Approved"), RETURN_REQUESTED, RETURNED, VENDOR_RETURN_REQUESTED
   - Can search by product name, client name, or notes
   - Sees ExpiringSamplesWidget showing samples expiring within 30 days

2. **Sales Rep clicks "New Sample" button**
   - SampleForm dialog opens

3. **Sales Rep fills out request form**
   - **Product**: Searchable input with datalist (searches via `search.global` tRPC endpoint)
   - **Client**: Select dropdown (populated from `clients.list`)
   - **Quantity**: Number input (step 0.01, stored as string)
   - **Due Date** (optional): Date input - Note: stored in `notes` field as "Due Date: YYYY-MM-DD"
   - **Notes** (optional): Textarea

4. **Sales Rep submits request**
   - Frontend calls `samples.createRequest` with:
     ```typescript
     {
       clientId: number,
       requestedBy: user.id,
       products: [{ productId: number, quantity: string }],
       notes?: string  // May include "Due Date: YYYY-MM-DD"
     }
     ```
   - System validates monthly allocation is not exceeded (default 7.0g/month)
   - Sample request created with PENDING status
   - Toast success: "Sample request created."

5. **Warehouse/Manager fulfills request**
   - From SampleList, no explicit "Fulfill" button exists in current UI
   - Fulfillment would be done via `samples.fulfillRequest` mutation:
     - System finds batches with `sampleAvailable=1` OR `sampleOnly=1`
     - Prefers `sampleOnly` batches first (ORDER BY sampleOnly DESC)
     - Verifies `batch.sampleQty >= requested quantity`
     - Decrements `batch.sampleQty`
     - Creates `inventoryMovements` record with type `SAMPLE`
     - Calculates total cost using batch COGS
     - Updates monthly allocation `usedQuantity` and `remainingQuantity`
     - Status changes to FULFILLED
   - **Note**: The current UI doesn't expose a fulfill button - this may be a gap

6. **Sample delivered to client**
   - User can update location via "Update Location" action
   - Typical transition: WAREHOUSE → WITH_CLIENT
   - Location history tracked in `sampleLocationHistory` table

### Alternative Flow: Cancel/Delete Request

1. User selects sample from list
2. Clicks "Delete" in actions dropdown
3. Confirm dialog appears
4. System calls `samples.cancelRequest` with reason "Deleted via Sample Management"
5. Status changes to CANCELLED
6. Toast success: "Sample request deleted."

### Alternative Flow: Sample Return (SAMPLE-006)

1. **Request Return** (FULFILLED → RETURN_REQUESTED)
   - User clicks "Request Return" on FULFILLED sample
   - SampleReturnDialog opens with type="sample"
   - Fields:
     - Reason (required textarea)
     - Condition (select: GOOD, DAMAGED, OPENED, EXPIRED)
     - Expected Return Date (optional date input)
   - Calls `samples.requestReturn`

2. **Approve Return** (RETURN_REQUESTED → RETURN_APPROVED)
   - Manager clicks "Approve Return" action
   - Directly calls `samples.approveReturn` (no dialog)

3. **Complete Return** (RETURN_APPROVED → RETURNED)
   - Warehouse clicks "Complete Return" action
   - Directly calls `samples.completeReturn`
   - Location automatically set to RETURNED
   - Location history entry created

### Alternative Flow: Vendor Return (SAMPLE-007)

1. **Request Vendor Return** (RETURNED or FULFILLED → VENDOR_RETURN_REQUESTED)
   - User clicks "Request Vendor Return" action
   - SampleReturnDialog opens with type="vendor"
   - Fields:
     - Reason (required textarea only)
   - Calls `samples.requestVendorReturn`

2. **Ship to Vendor** (VENDOR_RETURN_REQUESTED → SHIPPED_TO_VENDOR)
   - User clicks "Ship to Vendor" action
   - VendorShipDialog opens
   - Fields:
     - Tracking Number (required text input)
   - Calls `samples.shipToVendor`

3. **Confirm Vendor Return** (SHIPPED_TO_VENDOR → VENDOR_CONFIRMED)
   - User clicks "Confirm Vendor Received" action
   - Directly calls `samples.confirmVendorReturn` (no dialog)

---

## UI Components and States

### SampleManagement Page (`client/src/pages/SampleManagement.tsx`)

**Route**: `/samples`

**Page Layout**:
- Header with "Sample Management" title and "New Sample" button
- Grid layout: 2/3 for search card, 1/3 for ExpiringSamplesWidget
- Status filter tabs (buttons)
- SampleList table

| Page State | Trigger | Display |
|------------|---------|---------|
| Loading | Initial data fetch | LoadingState component with "Loading samples..." |
| Error (DB) | Database error detected | DatabaseErrorState with retry button |
| Error (Other) | Other API error | ErrorState with error message and retry |
| Empty | Zero samples in database | EmptyState with "Create Sample Request" action |
| Populated | Samples exist | Full page with filters and list |

### SampleForm Component (`client/src/components/samples/SampleForm.tsx`)

**Form Schema (Zod)**:
```typescript
{
  productId: z.number().min(1, "Product is required"),
  clientId: z.number().min(1, "Client is required"),
  quantity: z.string().min(1, "Quantity is required"),
  notes: z.string().optional(),
  dueDate: z.string().optional().nullable()
}
```

| State | Trigger | Display |
|-------|---------|---------|
| Initial | Dialog opens | Empty form, default values (productId: 0, clientId: 0) |
| Product Searching | User types in product field | "Searching..." text below input |
| Product Selected | Product chosen from datalist | "Selected: {productLabel}" below input |
| Submitting | Form submitted | "Creating..." button text, all fields disabled |
| Error | Submission failed | Toast error, form remains open for retry |
| Success | Submission succeeded | Form closes, form reset, list refreshes |

**Important Implementation Detail**:
- Product search uses `<input list="product-options">` with `<datalist>` for suggestions
- Product ID is entered as the input value, parsed to number
- If search returns no results, falls back to products extracted from existing samples

### SampleList Component (`client/src/components/samples/SampleList.tsx`)

**Status Labels Mapping** (UI label differs from DB value):
| DB Status | UI Label |
|-----------|----------|
| PENDING | Pending |
| FULFILLED | Approved |
| CANCELLED | Cancelled |
| RETURNED | Returned |
| RETURN_REQUESTED | Return Requested |
| RETURN_APPROVED | Return Approved |
| VENDOR_RETURN_REQUESTED | Vendor Return Requested |
| SHIPPED_TO_VENDOR | Shipped to Vendor |
| VENDOR_CONFIRMED | Vendor Confirmed |

**Table Columns**:
| Column | Sortable | Content |
|--------|----------|---------|
| ID | Yes | Sample request ID |
| Product | Yes | Product summary with expiration warning badge |
| Client | Yes | Client name |
| Status | Yes | Badge with color coding |
| Requested Date | Yes | Formatted date |
| Due Date | Yes | Extracted from notes field |
| Location | No | Location enum with MapPin icon |
| Actions | No | Dropdown menu |

**Action Menu Logic by Status**:
```typescript
FULFILLED → [Request Return, Request Vendor Return, Update Location, Delete]
RETURN_REQUESTED → [Approve Return, Update Location, Delete]
RETURN_APPROVED → [Complete Return, Update Location, Delete]
RETURNED → [Request Vendor Return, Update Location, Delete]
VENDOR_RETURN_REQUESTED → [Ship to Vendor, Update Location, Delete]
SHIPPED_TO_VENDOR → [Confirm Vendor Received, Update Location, Delete]
CANCELLED, VENDOR_CONFIRMED → [Delete only]
PENDING → [Delete only]  // Note: No Fulfill action in UI
```

**Expiration Indicators**:
| Condition | Display |
|-----------|---------|
| Expired (past date) | Red "Expired" with AlertTriangle icon |
| ≤7 days | Red "{N}d" with AlertTriangle icon |
| ≤30 days | Yellow "{N}d" with AlertTriangle icon |
| >30 days | No indicator |

### SampleReturnDialog Component (`client/src/components/samples/SampleReturnDialog.tsx`)

**Form Schema**:
```typescript
{
  reason: z.string().min(1, "Reason is required"),
  condition: z.enum(["GOOD", "DAMAGED", "OPENED", "EXPIRED"]),
  returnDate: z.string().optional(),
  trackingNumber: z.string().optional()  // Not used in current implementation
}
```

| Mode | Trigger | Fields Shown |
|------|---------|--------------|
| Sample Return (type="sample") | Request Return clicked | Reason, Condition, Expected Return Date |
| Vendor Return (type="vendor") | Request Vendor Return clicked | Reason only |

### LocationUpdateDialog Component (`client/src/components/samples/LocationUpdateDialog.tsx`)

**Form Schema**:
```typescript
{
  location: z.enum(["WAREHOUSE", "WITH_CLIENT", "WITH_SALES_REP", "RETURNED", "LOST"]),
  notes: z.string().optional()
}
```

| State | Display |
|-------|---------|
| Initial | Current location pre-selected |
| Submitting | "Updating..." button |

### VendorShipDialog Component (`client/src/components/samples/VendorShipDialog.tsx`)

**Form Schema**:
```typescript
{
  trackingNumber: z.string().min(1, "Tracking number is required")
}
```

### ExpiringSamplesWidget Component

- Displayed in top-right of SampleManagement page
- Default: Shows samples expiring within 30 days, limit 5
- Uses `samples.getExpiring` endpoint

---

## API Endpoints

### Core Operations

| Endpoint | Type | Permission | Input Schema | Notes |
|----------|------|------------|--------------|-------|
| `samples.list` | Query | `samples:read` | `{ limit?: 1-1000, offset?: 0+, clientId?: number, status?: enum }` | Paginated, returns UnifiedResponse |
| `samples.createRequest` | Mutation | `samples:create` | `{ clientId, requestedBy, products: [{productId, quantity}], notes? }` | Validates allocation |
| `samples.fulfillRequest` | Mutation | `samples:allocate` | `{ requestId, fulfilledBy }` | Decrements inventory |
| `samples.cancelRequest` | Mutation | `samples:delete` | `{ requestId, cancelledBy, reason }` | Soft cancel |
| `samples.getById` | Query | `samples:read` | `{ requestId }` | Returns single or null |
| `samples.getByClient` | Query | `samples:read` | `{ clientId, limit? }` | Client's samples |
| `samples.getPending` | Query | `samples:read` | none | UnifiedResponse |
| `samples.getAll` | Query | `samples:read` | `{ limit?: default 100 }` | UnifiedResponse, enhanced logging |

### Allocation Management

| Endpoint | Type | Permission | Input Schema | Notes |
|----------|------|------------|--------------|-------|
| `samples.getMonthlyAllocation` | Query | `samples:read` | `{ clientId, monthYear?: "YYYY-MM" }` | Returns allocation or default 7.0g |
| `samples.setMonthlyAllocation` | Mutation | `samples:allocate` | `{ clientId, monthYear, allocatedQuantity: string }` | Creates or updates |
| `samples.checkAllocation` | Query | `samples:read` | `{ clientId, requestedQuantity: string }` | Returns `{ canAllocate: boolean }` |

### Sample Return Workflow (SAMPLE-006)

| Endpoint | Type | Permission | Input Schema | Notes |
|----------|------|------------|--------------|-------|
| `samples.requestReturn` | Mutation | `samples:return` | `{ requestId, requestedBy, reason, condition: enum, returnDate? }` | FULFILLED → RETURN_REQUESTED |
| `samples.approveReturn` | Mutation | `samples:approve` | `{ requestId, approvedBy }` | RETURN_REQUESTED → RETURN_APPROVED |
| `samples.completeReturn` | Mutation | `samples:return` | `{ requestId, completedBy }` | RETURN_APPROVED → RETURNED, sets location |

### Vendor Return Workflow (SAMPLE-007)

| Endpoint | Type | Permission | Input Schema | Notes |
|----------|------|------------|--------------|-------|
| `samples.requestVendorReturn` | Mutation | `samples:vendorReturn` | `{ requestId, requestedBy, reason }` | From RETURNED or FULFILLED |
| `samples.shipToVendor` | Mutation | `samples:vendorReturn` | `{ requestId, shippedBy, trackingNumber }` | Stores tracking number |
| `samples.confirmVendorReturn` | Mutation | `samples:vendorReturn` | `{ requestId, confirmedBy }` | Final state |

### Location Tracking (SAMPLE-008)

| Endpoint | Type | Permission | Input Schema | Notes |
|----------|------|------------|--------------|-------|
| `samples.updateLocation` | Mutation | `samples:track` | `{ requestId, location: enum, changedBy, notes? }` | Creates history entry |
| `samples.getLocationHistory` | Query | `samples:read` | `{ requestId }` | Ordered DESC by changedAt |

### Expiration Tracking (SAMPLE-009)

| Endpoint | Type | Permission | Input Schema | Notes |
|----------|------|------------|--------------|-------|
| `samples.getExpiring` | Query | `samples:read` | `{ daysAhead?: default 30 }` | Excludes RETURNED, VENDOR_CONFIRMED, CANCELLED |
| `samples.setExpirationDate` | Mutation | `samples:track` | `{ requestId, expirationDate: string }` | ISO date string |

### Conversion Tracking

| Endpoint | Type | Permission | Input Schema | Notes |
|----------|------|------------|--------------|-------|
| `samples.linkOrderToSample` | Mutation | `samples:track` | `{ orderId, sampleRequestId }` | Updates both records |

### Analytics

| Endpoint | Type | Permission | Input Schema |
|----------|------|------------|--------------|
| `samples.getDistributionReport` | Query | `samples:track` | `{ startDate, endDate }` |
| `samples.getConversionReport` | Query | `samples:track` | `{ startDate, endDate }` |
| `samples.getEffectivenessByProduct` | Query | `samples:track` | `{ startDate, endDate }` |
| `samples.getCostByProduct` | Query | `samples:track` | `{ startDate, endDate }` |
| `samples.getCostByClient` | Query | `samples:track` | `{ startDate, endDate }` |
| `samples.getROIAnalysis` | Query | `samples:track` | `{ startDate, endDate }` |

---

## Data Model

### sampleRequests Table

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | INT | No | PK, auto-increment |
| clientId | INT | No | FK → clients.id (CASCADE) |
| requestedBy | INT | No | FK → users.id |
| requestDate | TIMESTAMP | No | When created |
| products | JSON | No | `Array<{productId: number, quantity: string}>` |
| sampleRequestStatus | ENUM | No | Default "PENDING" |
| fulfilledDate | TIMESTAMP | Yes | When fulfilled |
| fulfilledBy | INT | Yes | FK → users.id |
| cancelledDate | TIMESTAMP | Yes | When cancelled |
| cancelledBy | INT | Yes | FK → users.id |
| cancellationReason | TEXT | Yes | Why cancelled |
| notes | TEXT | Yes | May contain "Due Date: YYYY-MM-DD" |
| totalCost | DECIMAL(10,2) | Yes | COGS of samples |
| relatedOrderId | INT | Yes | FK → orders.id (conversion) |
| conversionDate | TIMESTAMP | Yes | When converted to order |
| returnRequestedDate | TIMESTAMP | Yes | When return requested |
| returnRequestedBy | INT | Yes | FK → users.id |
| returnReason | TEXT | Yes | Why returning |
| returnCondition | VARCHAR(50) | Yes | GOOD/DAMAGED/OPENED/EXPIRED |
| returnApprovedDate | TIMESTAMP | Yes | When approved |
| returnApprovedBy | INT | Yes | FK → users.id |
| returnDate | TIMESTAMP | Yes | When physically returned |
| vendorReturnTrackingNumber | VARCHAR(100) | Yes | Shipping tracking |
| vendorShippedDate | TIMESTAMP | Yes | When shipped to vendor |
| vendorConfirmedDate | TIMESTAMP | Yes | When vendor confirmed |
| location | ENUM | Yes | Default "WAREHOUSE" |
| expirationDate | TIMESTAMP | Yes | When sample expires |
| createdAt | TIMESTAMP | No | Auto |
| updatedAt | TIMESTAMP | No | Auto, on update |

**Indexes**:
- `idx_sample_requests_client` (clientId)
- `idx_sample_requests_status` (sampleRequestStatus)
- `idx_sample_requests_date` (requestDate)
- `idx_sample_requests_order` (relatedOrderId)
- `idx_sample_requests_location` (location)
- `idx_sample_requests_expiration` (expirationDate)

### sampleAllocations Table

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | INT | No | PK |
| clientId | INT | No | FK → clients.id (CASCADE) |
| monthYear | VARCHAR(7) | No | "YYYY-MM" format |
| allocatedQuantity | DECIMAL(15,4) | No | Monthly limit (default 7.0) |
| usedQuantity | DECIMAL(15,4) | No | Amount used |
| remainingQuantity | DECIMAL(15,4) | No | Computed: allocated - used |
| createdAt | TIMESTAMP | No | Auto |
| updatedAt | TIMESTAMP | No | Auto |

**Indexes**:
- `idx_sample_allocations_client_month` (clientId, monthYear)

### sampleLocationHistory Table

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | INT | No | PK |
| sampleRequestId | INT | No | FK → sampleRequests.id (CASCADE) |
| fromLocation | ENUM | Yes | Previous location (null for initial) |
| toLocation | ENUM | No | New location |
| changedBy | INT | No | FK → users.id |
| changedAt | TIMESTAMP | No | Default NOW() |
| notes | TEXT | Yes | Optional notes |

**Indexes**:
- `idx_sample_location_history_sample` (sampleRequestId)

---

## State Transitions

### sampleRequestStatus State Machine

```
                    ┌──────────────────────────────────────────────────────────────┐
                    │                                                              │
PENDING ────────────┼─────► FULFILLED ─────────┬────► RETURN_REQUESTED            │
    │               │                          │           │                       │
    └──► CANCELLED  │                          │           ▼                       │
                    │                          │    RETURN_APPROVED                │
                    │                          │           │                       │
                    │                          │           ▼                       │
                    │                          │       RETURNED ───────────────────┤
                    │                          │                                   │
                    │                          └────► VENDOR_RETURN_REQUESTED ◄────┘
                    │                                       │
                    │                                       ▼
                    │                                SHIPPED_TO_VENDOR
                    │                                       │
                    │                                       ▼
                    │                                VENDOR_CONFIRMED
                    │                                       │
                    └───────────────────────────────────────┘
```

### Valid Transitions Table

| From | To | Trigger | Actor | Side Effects |
|------|-----|---------|-------|--------------|
| PENDING | FULFILLED | `fulfillRequest` | Warehouse | Inventory decremented, movement created, allocation updated, cost calculated |
| PENDING | CANCELLED | `cancelRequest` | Manager | None |
| FULFILLED | RETURN_REQUESTED | `requestReturn` | Any | Return metadata set |
| FULFILLED | VENDOR_RETURN_REQUESTED | `requestVendorReturn` | Any | Return metadata set |
| RETURN_REQUESTED | RETURN_APPROVED | `approveReturn` | Manager | Approval metadata set |
| RETURN_APPROVED | RETURNED | `completeReturn` | Warehouse | Location set to RETURNED, history entry created |
| RETURNED | VENDOR_RETURN_REQUESTED | `requestVendorReturn` | Any | Return metadata updated |
| VENDOR_RETURN_REQUESTED | SHIPPED_TO_VENDOR | `shipToVendor` | Warehouse | Tracking number set |
| SHIPPED_TO_VENDOR | VENDOR_CONFIRMED | `confirmVendorReturn` | Warehouse | Confirmation date set |

### Location Enum Values

| Value | Description | Typical Transition |
|-------|-------------|-------------------|
| WAREHOUSE | Sample in warehouse | Initial state |
| WITH_CLIENT | Delivered to client | After fulfillment |
| WITH_SALES_REP | With sales representative | Optional intermediate |
| RETURNED | Returned to company | After completeReturn |
| LOST | Sample is lost | Manual update |

---

## Business Rules

### Allocation Rules

1. **Monthly Allocation Limit**
   - Each client has a monthly sample allocation (default: 7.0 grams)
   - Stored in `sampleAllocations` table with `monthYear` format "YYYY-MM"
   - Requests cannot exceed `remainingQuantity`
   - Allocation resets each calendar month (new record created)

2. **Allocation Check Flow**
   ```
   createSampleRequest()
   → checkMonthlyAllocation(clientId, totalQuantity)
     → Get/create allocation for current month
     → Compare requestedQuantity <= remainingQuantity
     → Return boolean
   → If false, throw "Monthly sample allocation exceeded"
   ```

3. **Allocation Update Flow**
   ```
   fulfillSampleRequest()
   → updateMonthlyAllocation(clientId, monthYear, usedQuantity)
     → newUsed = current.usedQuantity + usedQuantity
     → newRemaining = allocatedQuantity - newUsed
     → Update record
   ```

### Inventory Rules

4. **Sample Inventory Sourcing** (in `fulfillSampleRequest`)
   ```sql
   SELECT * FROM batches
   WHERE productId = :productId
     AND (sampleAvailable = 1 OR sampleOnly = 1)
     AND CAST(sampleQty AS DECIMAL) >= :requestedQuantity
   ORDER BY sampleOnly DESC  -- Prefer sample-only batches
   LIMIT 1
   ```

5. **Inventory Decrement**
   ```typescript
   // For each product in request:
   batch.sampleQty = (parseFloat(batch.sampleQty) - parseFloat(quantity)).toString()

   // Create inventory movement:
   {
     batchId: batch.id,
     inventoryMovementType: "SAMPLE",
     quantityChange: `-${quantity}`,
     quantityBefore,
     quantityAfter,
     referenceType: "SAMPLE_REQUEST",
     referenceId: requestId,
     notes: `Sample request #${requestId}`,
     performedBy: fulfilledBy
   }
   ```

### Cost Tracking

6. **COGS Calculation** (in `fulfillSampleRequest`)
   ```typescript
   const unitCogs = batch.cogsMode === "FIXED"
     ? parseFloat(batch.unitCogs || "0")
     : (parseFloat(batch.unitCogsMin || "0") + parseFloat(batch.unitCogsMax || "0")) / 2;

   totalCost += unitCogs * parseFloat(quantity);
   ```

### Return Rules

7. **Sample Return Prerequisites**
   - Only FULFILLED samples can have return requested
   - Return requires: reason (required), condition (required), returnDate (optional)

8. **Vendor Return Prerequisites**
   - Can be initiated from FULFILLED or RETURNED status
   - Requires tracking number to mark as shipped

### Location Tracking

9. **Automatic Location Updates**
   - `completeReturn` automatically sets location to RETURNED
   - Manual location updates always create history entry

---

## Error States

| Error Message | Trigger | HTTP | Recovery |
|---------------|---------|------|----------|
| "Monthly sample allocation exceeded" | Request exceeds remaining allocation | 400 | Request smaller qty or wait for new month |
| "Sample request not found" | Invalid requestId in any operation | 404 | Verify ID |
| "Sample request is not pending" | fulfillRequest on non-PENDING | 400 | Check status first |
| "Insufficient sample inventory for product {id}" | No batch has sufficient sampleQty | 400 | Add samples to batches |
| "Only fulfilled samples can be returned" | requestReturn on non-FULFILLED | 400 | Wait for fulfillment |
| "Sample is not in return requested status" | approveReturn on wrong status | 400 | Check status |
| "Sample return is not approved" | completeReturn on non-RETURN_APPROVED | 400 | Get approval first |
| "Sample must be returned or fulfilled to initiate vendor return" | requestVendorReturn on wrong status | 400 | Complete sample return first |
| "Sample is not in vendor return requested status" | shipToVendor on wrong status | 400 | Request vendor return first |
| "Sample is not shipped to vendor" | confirmVendorReturn on wrong status | 400 | Ship first |
| "Database not available" | DB connection failed | 500 | Retry |
| "Failed to fetch sample requests. Database error." | Query failure in getAll | 500 | Check logs, retry |
| "You need to be logged in..." | No user in context (frontend) | N/A | Login |

---

## Invariants

| ID | Invariant | Verification | Severity |
|----|-----------|--------------|----------|
| SAMPLE-INV-001 | Status transitions follow valid state machine | Check transition table before each update | P0 |
| SAMPLE-INV-002 | `sampleAllocation.remainingQuantity = allocatedQuantity - usedQuantity` | Recompute on each allocation change | P0 |
| SAMPLE-INV-003 | Fulfilled samples have inventory movement records | Query movements by referenceType='SAMPLE_REQUEST' | P1 |
| SAMPLE-INV-004 | `batch.sampleQty >= 0` after fulfillment | Check before decrement in fulfillSampleRequest | P0 |
| SAMPLE-INV-005 | All mutations have actor attribution (requestedBy/fulfilledBy/changedBy) | Schema required fields | P0 |
| SAMPLE-INV-006 | Location changes create history entries | Trigger in updateSampleLocation | P1 |
| SAMPLE-INV-007 | Monthly used quantity ≤ allocated quantity | Check in checkMonthlyAllocation | P0 |
| SAMPLE-INV-008 | relatedOrderId only set via linkOrderToSample | Single point of update | P1 |

### Verification Queries

```sql
-- SAMPLE-INV-002: Allocation math integrity
SELECT id, clientId, monthYear,
       allocatedQuantity, usedQuantity, remainingQuantity,
       CAST(allocatedQuantity AS DECIMAL) - CAST(usedQuantity AS DECIMAL) as expected
FROM sample_allocations
WHERE CAST(remainingQuantity AS DECIMAL) !=
      CAST(allocatedQuantity AS DECIMAL) - CAST(usedQuantity AS DECIMAL);

-- SAMPLE-INV-003: Fulfilled samples without movements
SELECT sr.id
FROM sample_requests sr
WHERE sr.sampleRequestStatus IN ('FULFILLED', 'RETURN_REQUESTED', 'RETURN_APPROVED', 'RETURNED',
                                  'VENDOR_RETURN_REQUESTED', 'SHIPPED_TO_VENDOR', 'VENDOR_CONFIRMED')
  AND NOT EXISTS (
    SELECT 1 FROM inventory_movements im
    WHERE im.referenceType = 'SAMPLE_REQUEST' AND im.referenceId = sr.id
  );

-- SAMPLE-INV-004: Negative sample quantities
SELECT id, productId, sampleQty FROM batches
WHERE CAST(sampleQty AS DECIMAL) < 0;

-- SAMPLE-INV-007: Over-allocation
SELECT id, clientId, monthYear, usedQuantity, allocatedQuantity
FROM sample_allocations
WHERE CAST(usedQuantity AS DECIMAL) > CAST(allocatedQuantity AS DECIMAL);
```

---

## Cross-Flow Touchpoints

### GF-007: Inventory Management

**Direction**: GF-008 → GF-007 (GF-008 modifies inventory)

| Touchpoint | Trigger | Impact |
|------------|---------|--------|
| `batch.sampleQty` decrement | `samples.fulfillRequest` | Reduces available sample inventory |
| `inventoryMovements` creation | `samples.fulfillRequest` | Creates SAMPLE type movement record |

**Implementation** (`samplesDb.fulfillSampleRequest`):
```typescript
// 1. Find batch
const batch = await db.select().from(batches).where(...)

// 2. Decrement
await db.update(batches).set({ sampleQty: quantityAfter })

// 3. Create movement
await db.insert(inventoryMovements).values({
  inventoryMovementType: "SAMPLE",
  referenceType: "SAMPLE_REQUEST",
  referenceId: requestId
})
```

### GF-003: Order-to-Cash

**Direction**: GF-008 ↔ GF-003 (bidirectional linking)

| Touchpoint | Trigger | Impact |
|------------|---------|--------|
| `samples.linkOrderToSample` | Manual user action | Links order to sample for conversion tracking |
| `orders.relatedSampleRequestId` | linkOrderToSample | Order references originating sample |
| `sampleRequests.relatedOrderId` | linkOrderToSample | Sample references resulting order |
| `sampleRequests.conversionDate` | linkOrderToSample | Tracks when conversion happened |

### GF-006: Client Ledger Review

**Direction**: GF-008 → GF-006 (data for reporting)

| Touchpoint | Trigger | Impact |
|------------|---------|--------|
| `sampleRequests.totalCost` | fulfillRequest | COGS attributed to client for ROI analysis |
| Analytics endpoints | Report generation | Sample cost by client, ROI analysis |

### GF-001: Direct Intake (Potential)

**Direction**: GF-001 → GF-008 (inventory sourcing)

| Touchpoint | Trigger | Impact |
|------------|---------|--------|
| `batch.sampleAvailable` flag | Set during intake | Makes batch eligible for sample allocation |
| `batch.sampleOnly` flag | Set during intake | Creates sample-dedicated inventory |

---

## Known Issues and Gaps

### UI Gaps

1. **Missing Fulfill Action**: The SampleList component does not expose a "Fulfill" action button. The `fulfillRequest` endpoint exists but has no UI trigger. Fulfillment may need to be done via API or admin tools.

2. **Due Date Storage**: Due dates are stored embedded in the `notes` field as "Due Date: YYYY-MM-DD" rather than as a separate column. The `extractDueDate` function parses this for display.

3. **Product Search UX**: The product search uses native `<datalist>` which has limited cross-browser styling and no loading indicator in the dropdown itself.

### Data Model Gaps

4. **No Approval Workflow for Request Creation**: Samples go PENDING → FULFILLED without manager approval. The task mentioned an approval step but it's not implemented.

5. **Return Doesn't Credit Inventory**: Completing a return doesn't add samples back to inventory. The location changes but `batch.sampleQty` is not incremented.

### API Gaps

6. **Actor from Input**: Several endpoints accept actor ID from input rather than deriving from context. This is documented in the codebase as a known issue pattern.

---

## Permissions Reference

| Permission | Endpoints | Typical Role |
|------------|-----------|--------------|
| `samples:read` | list, getById, getByClient, getPending, getAll, getMonthlyAllocation, checkAllocation, getLocationHistory, getExpiring | Sales Rep, Manager, Warehouse |
| `samples:create` | createRequest | Sales Rep |
| `samples:allocate` | fulfillRequest, setMonthlyAllocation | Warehouse, Manager |
| `samples:delete` | cancelRequest | Manager |
| `samples:return` | requestReturn, completeReturn | Sales Rep, Warehouse |
| `samples:approve` | approveReturn | Manager |
| `samples:vendorReturn` | requestVendorReturn, shipToVendor, confirmVendorReturn | Warehouse, Manager |
| `samples:track` | updateLocation, setExpirationDate, linkOrderToSample, all analytics | Sales Rep, Manager |

---

## Testing Checklist

### Unit Tests Required

- [ ] `checkMonthlyAllocation` returns true when under limit
- [ ] `checkMonthlyAllocation` returns false when over limit
- [ ] `checkMonthlyAllocation` creates default allocation for new client
- [ ] State transition validation rejects invalid transitions
- [ ] Cost calculation uses FIXED mode correctly
- [ ] Cost calculation uses RANGE mode (average) correctly
- [ ] Inventory decrement calculates correctly

### Integration Tests Required

- [ ] Create request respects allocation limit
- [ ] Fulfill request decrements correct batch
- [ ] Fulfill request creates inventory movement
- [ ] Complete return workflow (request → approve → complete)
- [ ] Complete vendor return workflow (request → ship → confirm)
- [ ] Location tracking creates history entries

### E2E Tests Required

- [ ] Sales rep creates sample request (happy path)
- [ ] Sales rep sees validation error on empty form
- [ ] Manager cancels sample request
- [ ] Full sample return workflow via UI
- [ ] Full vendor return workflow via UI
- [ ] Expiring samples widget shows correct data
- [ ] Search filters work correctly
- [ ] Status tab filters work correctly

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-27 | Agent | Initial specification |
| 1.1 | 2026-01-27 | Agent | Added verified implementation details, corrected state machine (no APPROVED status), documented form schemas, identified UI gaps, added cross-flow details |
