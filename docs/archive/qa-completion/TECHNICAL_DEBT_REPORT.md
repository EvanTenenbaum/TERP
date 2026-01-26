# Technical Debt Report

**Date:** December 30, 2025  
**Total Items:** 47 TODO/FIXME/HACK comments identified

## Summary by Priority

| Priority        | Count | Description                               |
| --------------- | ----- | ----------------------------------------- |
| **P1 - High**   | 8     | Blocking features or causing data issues  |
| **P2 - Medium** | 15    | Affects functionality but has workarounds |
| **P3 - Low**    | 24    | Minor improvements or future enhancements |

---

## P1 - High Priority (Blocking/Critical)

These items should be addressed in the next sprint.

### 1. Accounting Integration (Orders)

**File:** `server/ordersDb.ts:321-323`

```typescript
// TODO: Create invoice (accounting integration)
// TODO: Record cash payment (accounting integration)
// TODO: Update credit exposure (credit intelligence integration)
```

**Impact:** Core financial flow incomplete

### 2. Schema Drift - Seeding Disabled

**File:** `server/_core/index.ts:161`

```typescript
// TODO: Fix schema drift and re-enable seeding
```

**Impact:** Database seeding may be broken

### 3. Soft Delete Implementation

**File:** `server/inventoryDb.ts:401`

```typescript
// TODO: Add deletedAt column to clients table for proper soft delete
```

**Impact:** Client deletion may not work correctly

### 4. Soft Delete Router

**File:** `server/routers/clients.ts:151`

```typescript
// TODO: Implement proper soft delete when deletedAt column is added to clients table
```

**Impact:** Related to above - client deletion incomplete

### 5. Notification Service

**File:** `server/services/notificationService.ts:24`

```typescript
// TODO: Implement actual notification delivery
```

**Impact:** Notifications may not be sent

### 6. VIP Portal Tier Configuration (2 items)

**Files:** `server/services/vipPortalAdminService.ts:418, 468`

```typescript
// TODO: Implement tier configuration storage
```

**Impact:** VIP tier configuration may not persist

### 7. Batch Schema - Expiration Date

**File:** `server/dataCardMetricsDb.ts:258`

```typescript
// TODO: Add expirationDate to batches schema or remove this metric
```

**Impact:** Expiration tracking incomplete

---

## P2 - Medium Priority (Functionality Affected)

These items affect functionality but have workarounds.

### UI Components

1. **BatchDetailDrawer - Product Relation** (`client/src/components/inventory/BatchDetailDrawer.tsx:324, 334, 611`)
   - Product relation display disabled
   - Profitability calculation missing

2. **ClientInterestWidget - Navigation** (`client/src/components/inventory/ClientInterestWidget.tsx:196`)
   - Client page navigation not implemented

3. **Widget Migration** (`client/src/components/dashboard/widgets-v3/index.ts:2`)
   - Widgets being migrated from v2 to v3

### Server/API

4. **Matching Engine - Strain Type** (`server/matchingEngineEnhanced.ts:650`)
   - Strain type not populated from strain library

5. **Reverse Matching** (`server/matchingEngineReverseSimplified.ts:146`)
   - Vendor supply logic not implemented

6. **Live Catalog - Brand Data** (`server/services/liveCatalogService.ts:356`)
   - Brand extraction not implemented

7. **Live Catalog - Pricing** (`server/services/liveCatalogService.ts:366`)
   - Price range calculation not implemented

8. **Order Schema - Ship Date** (`server/dataCardMetricsDb.ts:379`)
   - Expected ship date field missing or using different field

9. **Calendar Jobs - Admin Alert** (`server/_core/calendarJobs.ts:328`)
   - Admin alerts not sent

---

## P3 - Low Priority (Future Enhancements)

These are minor improvements or future enhancements.

### Scripts (Development Tools)

1. `scripts/benchmark-api.ts:46` - Replace with actual tRPC client call
2. `scripts/generate-calendar-v32.ts:218-219` - Implement transaction logic
3. `scripts/legacy/seed-realistic-main.ts:326, 337` - Refunds table mapping
4. `scripts/seed-complete.ts:357` - Fix schema definition

### Database Queries

5. `server/db.ts:133` - Add feature queries as schema grows

### False Positives (Not Actually Debt)

The following are not technical debt - they are legitimate uses of "TODO" as a status value:

- `scripts/generators/lists-tasks.ts:64, 167, 211, 212` - "TODO" is a task status
- `server/todoListsDb.ts:19` - "TODO LISTS QUERIES" is a section header
- `server/todoTasksDb.ts:15` - "TODO TASKS QUERIES" is a section header
- `client/src/components/dashboard/widgets-v2/TemplateSelector.tsx:30` - "TODO" is an ID value

---

## Recommendations

### Immediate Actions

1. **Create GitHub Issues** for all P1 items
2. **Add to Sprint Backlog** for P2 items
3. **Track in MASTER_ROADMAP.md** for visibility

### Process Improvements

1. **Pre-commit Hook:** Add a check that warns when adding new TODO comments
2. **Regular Audits:** Run this audit monthly to track debt reduction
3. **Documentation:** Require all TODO comments to include a ticket reference (e.g., `// TODO(BUG-123): Fix this`)

---

## Raw Inventory

The full raw inventory is available in `TECHNICAL_DEBT_INVENTORY.txt` in the repository root.
