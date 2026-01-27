# GF-008: Sample Request - Specification

**Version:** 1.0
**Created:** 2026-01-27
**Status:** DRAFT
**Author:** Agent (GF-PHASE0A-008)

---

## Overview

The Sample Request flow manages sales samples distributed to clients and prospects. Sales representatives create sample requests specifying products and quantities, which are then fulfilled from sample-designated inventory. The system tracks sample distribution, monthly allocation limits, conversions to sales, sample returns, and vendor returns. This flow provides ROI visibility into sample programs and ensures proper inventory tracking.

---

## User Journey

### Primary Flow: Create and Fulfill Sample Request

1. **Sales Rep navigates to Samples page**
   - Views list of existing sample requests with status, client, and product information
   - Can filter by status (ALL, PENDING, FULFILLED, CANCELLED, etc.)
   - Can search by product name, client name, or notes

2. **Sales Rep clicks "Create Sample Request"**
   - Sample Form dialog opens

3. **Sales Rep fills out request form**
   - Selects product (searchable dropdown with product ID/name)
   - Selects client (dropdown of existing clients)
   - Enters quantity (decimal value)
   - Optionally sets due date
   - Optionally adds notes

4. **Sales Rep submits request**
   - System validates monthly allocation is not exceeded
   - Sample request created with PENDING status
   - Request appears in list

5. **Warehouse/Manager fulfills request**
   - Selects pending request from list
   - Clicks "Fulfill" action
   - System allocates inventory from sample-available batches
   - Creates inventory movement record
   - Updates monthly allocation used
   - Calculates and stores total cost (COGS)
   - Status changes to FULFILLED

6. **Sample delivered to client**
   - Location updated to WITH_CLIENT
   - Location history tracked

### Alternative Flow: Cancel Request

1. Manager selects pending request
2. Clicks "Cancel" action
3. Enters cancellation reason
4. Status changes to CANCELLED
5. No inventory impact

### Alternative Flow: Sample Return

1. **Request Return** (FULFILLED → RETURN_REQUESTED)
   - User initiates return request
   - Provides reason and condition (GOOD, DAMAGED, OPENED, EXPIRED)
   - Optionally sets expected return date

2. **Approve Return** (RETURN_REQUESTED → RETURN_APPROVED)
   - Manager reviews return request
   - Approves the return

3. **Complete Return** (RETURN_APPROVED → RETURNED)
   - Warehouse confirms physical receipt
   - Location updated to RETURNED
   - Location history logged

### Alternative Flow: Vendor Return

1. **Request Vendor Return** (RETURNED or FULFILLED → VENDOR_RETURN_REQUESTED)
   - User initiates return to vendor
   - Provides reason for vendor return

2. **Ship to Vendor** (VENDOR_RETURN_REQUESTED → SHIPPED_TO_VENDOR)
   - User enters tracking number
   - Shipment marked as sent

3. **Confirm Vendor Return** (SHIPPED_TO_VENDOR → VENDOR_CONFIRMED)
   - User confirms vendor received the sample

---

## UI Components and States

### SampleList Component (`client/src/components/samples/SampleList.tsx`)

| State | Trigger | Display |
|-------|---------|---------|
| Loading | Initial load | Skeleton placeholders |
| Empty | No samples match filters | "No samples match the current filters" message |
| Populated | Samples exist | Table with sortable columns |
| Deleting | Delete action initiated | Confirm dialog |

**Table Columns:**
- ID (sortable)
- Product (sortable, shows expiration warning if applicable)
- Client (sortable)
- Status (sortable, badge with color coding)
- Requested Date (sortable)
- Due Date (sortable)
- Location (with icon)
- Actions (dropdown menu)

**Action Menu Items (contextual by status):**
- FULFILLED: Request Return, Request Vendor Return, Update Location
- RETURN_REQUESTED: Approve Return, Update Location
- RETURN_APPROVED: Complete Return, Update Location
- VENDOR_RETURN_REQUESTED: Ship to Vendor, Update Location
- SHIPPED_TO_VENDOR: Confirm Vendor Received, Update Location
- All statuses: Delete

### SampleForm Component (`client/src/components/samples/SampleForm.tsx`)

| State | Trigger | Display |
|-------|---------|---------|
| Initial | Dialog opens | Empty form |
| Searching | Product search query | "Searching..." indicator |
| Product Selected | Product chosen | Selected product label shown |
| Submitting | Form submitted | "Creating..." button, fields disabled |
| Error | Submission failed | Toast error message, form remains open |
| Success | Submission succeeded | Form closes, list refreshes |

**Form Fields:**
- Product (searchable input with datalist)
- Client (select dropdown)
- Quantity (number input, step 0.01)
- Due Date (date input, optional)
- Notes (textarea, optional)

### SampleReturnDialog Component (`client/src/components/samples/SampleReturnDialog.tsx`)

| State | Trigger | Display |
|-------|---------|---------|
| Sample Return Mode | type="sample" | Condition and return date fields shown |
| Vendor Return Mode | type="vendor" | Simplified form, reason only |
| Submitting | Form submitted | "Submitting..." button |

**Fields:**
- Reason (required textarea)
- Condition (select: GOOD, DAMAGED, OPENED, EXPIRED) - sample mode only
- Expected Return Date (date input) - sample mode only

### LocationUpdateDialog Component (`client/src/components/samples/LocationUpdateDialog.tsx`)

| State | Trigger | Display |
|-------|---------|---------|
| Initial | Dialog opens | Current location selected |
| Submitting | Form submitted | "Updating..." button |

**Fields:**
- Location (select: WAREHOUSE, WITH_CLIENT, WITH_SALES_REP, RETURNED, LOST)
- Notes (optional textarea)

### VendorShipDialog Component (`client/src/components/samples/VendorShipDialog.tsx`)

| State | Trigger | Display |
|-------|---------|---------|
| Initial | Dialog opens | Empty tracking number |
| Submitting | Form submitted | "Shipping..." button |

**Fields:**
- Tracking Number (required text input)

### ExpiringSamplesWidget Component (`client/src/components/samples/ExpiringSamplesWidget.tsx`)

Dashboard widget showing samples expiring within configurable days.

| State | Trigger | Display |
|-------|---------|---------|
| Loading | Initial load | Skeleton placeholders |
| Empty | No expiring samples | "No samples expiring in the next X days" |
| Populated | Expiring samples exist | List with expiration badges |

**Expiration Indicators:**
- Expired: Red badge "Expired"
- ≤7 days: Red badge "Xd left"
- ≤30 days: Yellow badge "Xd left"

---

## API Endpoints

### Core Operations

| Endpoint | Method | Permission | Request Shape | Response Shape |
|----------|--------|------------|---------------|----------------|
| `samples.list` | Query | `samples:read` | `{ limit?, offset?, clientId?, status? }` | `UnifiedResponse<SampleRequest[]>` |
| `samples.createRequest` | Mutation | `samples:create` | `{ clientId, requestedBy, products: [{productId, quantity}], notes? }` | `SampleRequest` |
| `samples.fulfillRequest` | Mutation | `samples:allocate` | `{ requestId, fulfilledBy }` | `SampleRequest` |
| `samples.cancelRequest` | Mutation | `samples:delete` | `{ requestId, cancelledBy, reason }` | `SampleRequest` |
| `samples.getById` | Query | `samples:read` | `{ requestId }` | `SampleRequest \| null` |
| `samples.getByClient` | Query | `samples:read` | `{ clientId, limit? }` | `SampleRequest[]` |
| `samples.getPending` | Query | `samples:read` | none | `UnifiedResponse<SampleRequest[]>` |
| `samples.getAll` | Query | `samples:read` | `{ limit? }` | `UnifiedResponse<SampleRequest[]>` |

### Allocation Management

| Endpoint | Method | Permission | Request Shape | Response Shape |
|----------|--------|------------|---------------|----------------|
| `samples.getMonthlyAllocation` | Query | `samples:read` | `{ clientId, monthYear? }` | `SampleAllocation` |
| `samples.setMonthlyAllocation` | Mutation | `samples:allocate` | `{ clientId, monthYear, allocatedQuantity }` | `{ success: true }` |
| `samples.checkAllocation` | Query | `samples:read` | `{ clientId, requestedQuantity }` | `{ canAllocate: boolean }` |

### Sample Return Workflow

| Endpoint | Method | Permission | Request Shape | Response Shape |
|----------|--------|------------|---------------|----------------|
| `samples.requestReturn` | Mutation | `samples:return` | `{ requestId, requestedBy, reason, condition, returnDate? }` | `SampleRequest` |
| `samples.approveReturn` | Mutation | `samples:approve` | `{ requestId, approvedBy }` | `SampleRequest` |
| `samples.completeReturn` | Mutation | `samples:return` | `{ requestId, completedBy }` | `SampleRequest` |

### Vendor Return Workflow

| Endpoint | Method | Permission | Request Shape | Response Shape |
|----------|--------|------------|---------------|----------------|
| `samples.requestVendorReturn` | Mutation | `samples:vendorReturn` | `{ requestId, requestedBy, reason }` | `SampleRequest` |
| `samples.shipToVendor` | Mutation | `samples:vendorReturn` | `{ requestId, shippedBy, trackingNumber }` | `SampleRequest` |
| `samples.confirmVendorReturn` | Mutation | `samples:vendorReturn` | `{ requestId, confirmedBy }` | `SampleRequest` |

### Location Tracking

| Endpoint | Method | Permission | Request Shape | Response Shape |
|----------|--------|------------|---------------|----------------|
| `samples.updateLocation` | Mutation | `samples:track` | `{ requestId, location, changedBy, notes? }` | `SampleRequest` |
| `samples.getLocationHistory` | Query | `samples:read` | `{ requestId }` | `SampleLocationHistory[]` |

### Expiration Tracking

| Endpoint | Method | Permission | Request Shape | Response Shape |
|----------|--------|------------|---------------|----------------|
| `samples.getExpiring` | Query | `samples:read` | `{ daysAhead? }` | `SampleRequest[]` |
| `samples.setExpirationDate` | Mutation | `samples:track` | `{ requestId, expirationDate }` | `SampleRequest` |

### Conversion Tracking

| Endpoint | Method | Permission | Request Shape | Response Shape |
|----------|--------|------------|---------------|----------------|
| `samples.linkOrderToSample` | Mutation | `samples:track` | `{ orderId, sampleRequestId }` | `{ success: true }` |

### Analytics

| Endpoint | Method | Permission | Request Shape | Response Shape |
|----------|--------|------------|---------------|----------------|
| `samples.getDistributionReport` | Query | `samples:track` | `{ startDate, endDate }` | Distribution analytics |
| `samples.getConversionReport` | Query | `samples:track` | `{ startDate, endDate }` | Conversion metrics |
| `samples.getEffectivenessByProduct` | Query | `samples:track` | `{ startDate, endDate }` | Product effectiveness[] |
| `samples.getCostByProduct` | Query | `samples:track` | `{ startDate, endDate }` | Product costs[] |
| `samples.getCostByClient` | Query | `samples:track` | `{ startDate, endDate }` | Client costs[] |
| `samples.getROIAnalysis` | Query | `samples:track` | `{ startDate, endDate }` | Comprehensive ROI report |

---

## Data Model

### sampleRequests Table

Primary table for all sample request data.

| Column | Type | Description |
|--------|------|-------------|
| id | INT | Primary key, auto-increment |
| clientId | INT | FK to clients.id (CASCADE delete) |
| requestedBy | INT | FK to users.id |
| requestDate | TIMESTAMP | When request was created |
| products | JSON | Array of `{productId, quantity}` |
| sampleRequestStatus | ENUM | Current status (see State Transitions) |
| fulfilledDate | TIMESTAMP | When request was fulfilled |
| fulfilledBy | INT | FK to users.id |
| cancelledDate | TIMESTAMP | When request was cancelled |
| cancelledBy | INT | FK to users.id |
| cancellationReason | TEXT | Why cancelled |
| notes | TEXT | Optional notes |
| totalCost | DECIMAL(10,2) | COGS of samples distributed |
| relatedOrderId | INT | FK to orders.id (if converted) |
| conversionDate | TIMESTAMP | When sample led to order |
| returnRequestedDate | TIMESTAMP | When return was requested |
| returnRequestedBy | INT | FK to users.id |
| returnReason | TEXT | Why being returned |
| returnCondition | VARCHAR(50) | GOOD, DAMAGED, OPENED, EXPIRED |
| returnApprovedDate | TIMESTAMP | When return was approved |
| returnApprovedBy | INT | FK to users.id |
| returnDate | TIMESTAMP | When physically returned |
| vendorReturnTrackingNumber | VARCHAR(100) | Shipping tracking number |
| vendorShippedDate | TIMESTAMP | When shipped to vendor |
| vendorConfirmedDate | TIMESTAMP | When vendor confirmed receipt |
| location | ENUM | Physical location |
| expirationDate | TIMESTAMP | When sample expires |
| createdAt | TIMESTAMP | Record creation |
| updatedAt | TIMESTAMP | Last modification |

**Indexes:**
- `idx_sample_requests_client` (clientId)
- `idx_sample_requests_status` (sampleRequestStatus)
- `idx_sample_requests_date` (requestDate)
- `idx_sample_requests_order` (relatedOrderId)
- `idx_sample_requests_location` (location)
- `idx_sample_requests_expiration` (expirationDate)

### sampleAllocations Table

Tracks monthly sample allocation limits per client.

| Column | Type | Description |
|--------|------|-------------|
| id | INT | Primary key, auto-increment |
| clientId | INT | FK to clients.id (CASCADE delete) |
| monthYear | VARCHAR(7) | Format: "YYYY-MM" (e.g., "2026-01") |
| allocatedQuantity | DECIMAL(15,4) | Monthly limit (default 7.0g) |
| usedQuantity | DECIMAL(15,4) | Amount used this month |
| remainingQuantity | DECIMAL(15,4) | allocatedQuantity - usedQuantity |
| createdAt | TIMESTAMP | Record creation |
| updatedAt | TIMESTAMP | Last modification |

**Indexes:**
- `idx_sample_allocations_client_month` (clientId, monthYear)

### sampleLocationHistory Table

Audit trail for sample location changes.

| Column | Type | Description |
|--------|------|-------------|
| id | INT | Primary key, auto-increment |
| sampleRequestId | INT | FK to sampleRequests.id (CASCADE delete) |
| fromLocation | ENUM | Previous location (nullable for initial) |
| toLocation | ENUM | New location |
| changedBy | INT | FK to users.id |
| changedAt | TIMESTAMP | When change occurred |
| notes | TEXT | Optional notes about change |

**Indexes:**
- `idx_sample_location_history_sample` (sampleRequestId)

---

## State Transitions

### sampleRequestStatus Enum

```
PENDING ─────────┬────────────────► FULFILLED ────────┬─────────────────► RETURN_REQUESTED ─► RETURN_APPROVED ─► RETURNED
                 │                                    │
                 └────────────────► CANCELLED         └─────────────────► VENDOR_RETURN_REQUESTED ─► SHIPPED_TO_VENDOR ─► VENDOR_CONFIRMED
```

### Valid Transitions

| From Status | To Status | Trigger | Actor |
|-------------|-----------|---------|-------|
| PENDING | FULFILLED | `fulfillRequest` | Warehouse |
| PENDING | CANCELLED | `cancelRequest` | Manager |
| FULFILLED | RETURN_REQUESTED | `requestReturn` | Any authorized user |
| FULFILLED | VENDOR_RETURN_REQUESTED | `requestVendorReturn` | Any authorized user |
| RETURN_REQUESTED | RETURN_APPROVED | `approveReturn` | Manager |
| RETURN_APPROVED | RETURNED | `completeReturn` | Warehouse |
| RETURNED | VENDOR_RETURN_REQUESTED | `requestVendorReturn` | Any authorized user |
| VENDOR_RETURN_REQUESTED | SHIPPED_TO_VENDOR | `shipToVendor` | Warehouse |
| SHIPPED_TO_VENDOR | VENDOR_CONFIRMED | `confirmVendorReturn` | Warehouse |

### sampleLocation Enum

| Value | Description |
|-------|-------------|
| WAREHOUSE | Sample is in warehouse |
| WITH_CLIENT | Sample delivered to client |
| WITH_SALES_REP | Sample with sales representative |
| RETURNED | Sample returned to company |
| LOST | Sample is lost |

### returnCondition Values

| Value | Description |
|-------|-------------|
| GOOD | Sample in good condition |
| DAMAGED | Sample is damaged |
| OPENED | Sample has been opened/used |
| EXPIRED | Sample has expired |

---

## Business Rules

### Allocation Rules

1. **Monthly Allocation Limit**
   - Each client has a monthly sample allocation (default: 7.0 grams)
   - Requests cannot exceed remaining monthly allocation
   - Allocation resets each calendar month

2. **Allocation Tracking**
   - On request creation: System checks `checkMonthlyAllocation`
   - On fulfillment: System updates `usedQuantity` and `remainingQuantity`

### Inventory Rules

3. **Sample Inventory Sourcing**
   - Samples are allocated from batches with `sampleAvailable = true` OR `sampleOnly = true`
   - System prefers `sampleOnly` batches first
   - Batch must have sufficient `sampleQty` for the request

4. **Inventory Decrement on Fulfillment**
   - When fulfilled, `batch.sampleQty` is decremented
   - An inventory movement record is created with type `SAMPLE`
   - Movement references the sample request

### Cost Tracking

5. **COGS Calculation**
   - Sample cost calculated using batch COGS
   - For FIXED mode: uses `unitCogs`
   - For RANGE mode: uses average of `unitCogsMin` and `unitCogsMax`
   - Total cost stored on sample request

### Conversion Tracking

6. **Sample-to-Order Linking**
   - When a sample leads to an order, link via `linkOrderToSample`
   - Updates both order (`relatedSampleRequestId`) and sample request (`relatedOrderId`, `conversionDate`)
   - Enables ROI analytics

### Return Rules

7. **Return Workflow**
   - Only FULFILLED samples can have return requested
   - Returns require manager approval
   - Return condition must be specified

8. **Vendor Return**
   - Can be initiated from FULFILLED or RETURNED status
   - Requires tracking number to mark as shipped
   - Final confirmation marks end of lifecycle

### Expiration

9. **Expiration Tracking**
   - Samples can have optional expiration dates
   - Dashboard widget shows expiring samples
   - Expired samples highlighted in list view

---

## Error States

| Error | Cause | HTTP Code | Recovery |
|-------|-------|-----------|----------|
| "Monthly sample allocation exceeded" | Requested quantity exceeds client's remaining allocation | 400 | Request smaller quantity or wait for next month |
| "Sample request not found" | Invalid requestId | 404 | Verify request ID |
| "Sample request is not pending" | Trying to fulfill non-PENDING request | 400 | Check current status |
| "Insufficient sample inventory for product {id}" | No sample-available batches with sufficient quantity | 400 | Check inventory, add samples to batches |
| "Only fulfilled samples can be returned" | Return requested on non-FULFILLED sample | 400 | Check status |
| "Sample is not in return requested status" | Trying to approve non-RETURN_REQUESTED sample | 400 | Check status |
| "Sample return is not approved" | Trying to complete non-RETURN_APPROVED return | 400 | Wait for approval |
| "Sample must be returned or fulfilled to initiate vendor return" | Wrong status for vendor return | 400 | Complete regular return first |
| "Sample is not in vendor return requested status" | Trying to ship without request | 400 | Request vendor return first |
| "Sample is not shipped to vendor" | Trying to confirm before shipping | 400 | Enter tracking number first |
| "Tracking number is required" | Missing tracking number on ship | 400 | Provide tracking number |
| "Reason is required" | Missing reason on return request | 400 | Provide reason |
| "Database not available" | Database connection failed | 500 | Retry, check database status |

---

## Invariants

These invariants MUST be preserved at all times:

| ID | Invariant | Verification |
|----|-----------|--------------|
| SAMPLE-INV-001 | `sampleRequest.status` follows valid state machine transitions | Check transition table on each update |
| SAMPLE-INV-002 | `sampleAllocation.remainingQuantity = allocatedQuantity - usedQuantity` | Recompute on each allocation change |
| SAMPLE-INV-003 | Fulfilled samples have inventory movement records | Query movements by reference |
| SAMPLE-INV-004 | `batch.sampleQty >= 0` after fulfillment | Validate before decrement |
| SAMPLE-INV-005 | All mutations have `requestedBy`/`fulfilledBy`/`changedBy` actor attribution | Required fields in schema |
| SAMPLE-INV-006 | Location history exists for all location changes | Trigger on `updateLocation` |
| SAMPLE-INV-007 | Monthly used quantity ≤ allocated quantity | Check before fulfillment |
| SAMPLE-INV-008 | `relatedOrderId` only set when sample converted to order | Only via `linkOrderToSample` |

### Verification Queries

```sql
-- SAMPLE-INV-002: Check allocation math
SELECT id, clientId, monthYear,
       allocatedQuantity, usedQuantity, remainingQuantity,
       CAST(allocatedQuantity AS DECIMAL) - CAST(usedQuantity AS DECIMAL) as expected
FROM sampleAllocations
WHERE remainingQuantity != CAST(allocatedQuantity AS DECIMAL) - CAST(usedQuantity AS DECIMAL);

-- SAMPLE-INV-004: Check for negative sample quantities
SELECT id, productId, sampleQty FROM batches WHERE CAST(sampleQty AS DECIMAL) < 0;

-- SAMPLE-INV-007: Check over-allocation
SELECT sa.id, sa.clientId, sa.monthYear, sa.usedQuantity, sa.allocatedQuantity
FROM sampleAllocations sa
WHERE CAST(sa.usedQuantity AS DECIMAL) > CAST(sa.allocatedQuantity AS DECIMAL);
```

---

## Cross-Flow Touchpoints

### GF-007: Inventory Management

**Relationship:** Sample fulfillment decrements inventory
- When `samples.fulfillRequest` is called:
  - System queries `batches` for sample-available inventory
  - Decrements `batch.sampleQty`
  - Creates `inventoryMovements` record with type `SAMPLE`
- Inventory Management UI should show sample allocations

### GF-003: Order-to-Cash

**Relationship:** Sample conversion tracking
- When sample leads to order, use `samples.linkOrderToSample`
- Order creation flow could prompt to link to recent samples
- Analytics show sample-to-order conversion rates

### GF-006: Client Ledger Review

**Relationship:** Sample cost attribution
- Sample costs tracked per client via `totalCost`
- Client analytics should include sample investment
- ROI analysis correlates sample costs with client revenue

### GF-001: Direct Intake (Potential)

**Relationship:** Sample inventory sourcing
- Batches marked as sample-available during intake
- `sampleOnly` batches created specifically for samples

---

## Permissions Reference

| Permission | Endpoints | Typical Role |
|------------|-----------|--------------|
| `samples:read` | list, getById, getByClient, getPending, getAll, getMonthlyAllocation, checkAllocation, getLocationHistory, getExpiring | Sales Rep, Manager |
| `samples:create` | createRequest | Sales Rep |
| `samples:allocate` | fulfillRequest, setMonthlyAllocation | Warehouse, Manager |
| `samples:delete` | cancelRequest | Manager |
| `samples:return` | requestReturn, completeReturn | Sales Rep, Warehouse |
| `samples:approve` | approveReturn | Manager |
| `samples:vendorReturn` | requestVendorReturn, shipToVendor, confirmVendorReturn | Warehouse, Manager |
| `samples:track` | updateLocation, setExpirationDate, linkOrderToSample, analytics endpoints | Sales Rep, Manager |

---

## Testing Checklist

### Unit Tests Required

- [ ] Monthly allocation calculation
- [ ] State transition validation
- [ ] Inventory decrement logic
- [ ] Cost calculation (FIXED vs RANGE mode)

### Integration Tests Required

- [ ] Create request with allocation check
- [ ] Fulfill request with inventory update
- [ ] Complete return workflow (request → approve → complete)
- [ ] Complete vendor return workflow
- [ ] Location tracking with history

### E2E Tests Required

- [ ] Sales rep creates sample request
- [ ] Manager fulfills sample request
- [ ] Manager cancels sample request
- [ ] Full return workflow
- [ ] Full vendor return workflow
- [ ] Expiration widget displays correctly

---

## Open Questions / Future Considerations

1. **Partial Fulfillment:** Currently all-or-nothing; may need partial fulfillment
2. **Sample Approval Workflow:** Currently no approval before fulfillment; may add manager approval step
3. **Return Inventory Credit:** Returned samples don't credit back to inventory; may want option
4. **Email Notifications:** No notifications on status changes; may add
5. **Sample Request Queue:** No priority/queue system for fulfillment

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-27 | Agent | Initial specification |
