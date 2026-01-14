# TERP Comprehensive QA Audit Report

**Date:** 2026-01-14
**Auditor:** Claude Code
**Branch:** claude/qa-audit-codebase-JNzjG

---

## Executive Summary

This comprehensive QA audit identified **350+ issues** across the TERP codebase. After root cause analysis, these issues trace back to **12 systemic/underlying problems** and **50+ one-off bugs**.

### Issue Summary

| Category | Count | Root Causes |
|----------|-------|-------------|
| **Systemic Issues** | 12 | Architectural/design decisions |
| **Critical Bugs** | 25+ | Crashes, data loss, security |
| **High Priority Bugs** | 45+ | Major functionality issues |
| **Medium Priority Bugs** | 120+ | Technical debt, UX issues |
| **Low Priority** | 160+ | Code quality, minor UX |

---

# PART 1: SYSTEMIC / UNDERLYING ISSUES

These are architectural problems that manifest as multiple bugs throughout the codebase.

---

## ROOT CAUSE #1: Missing Database Transaction Wrapper Pattern

**Impact:** 25+ bugs across CRUD operations

### The Problem
The codebase lacks a consistent transaction wrapper pattern. Multi-step database operations are executed as separate queries without atomicity guarantees.

### Manifestations

| File | Lines | Issue |
|------|-------|-------|
| `creditsDb.ts` | 206-313 | Credit application race condition |
| `intakeReceipts.ts` | 1080-1087 | Cascading delete without transaction |
| `salesSheetsDb.ts` | 679-727 | Order creation + sheet update separate |
| `ordersDb.ts` | 361-392 | Order + accounting integration separate |
| `orders.ts` | 323-473 | Line item Promise.all without rollback |
| `orderPricingService.ts` | 1130-1195 | Order total recalculation no lock |

### Recommended Fix
```typescript
// Create utility: server/utils/withTransaction.ts
export async function withTransaction<T>(
  operation: (tx: Transaction) => Promise<T>,
  options?: { isolationLevel?: IsolationLevel }
): Promise<T> {
  return db.transaction(async (tx) => {
    return operation(tx);
  }, options);
}

// Usage
await withTransaction(async (tx) => {
  await tx.delete(intakeReceiptItems).where(...);
  await tx.delete(intakeReceipts).where(...);
});
```

---

## ROOT CAUSE #2: VARCHAR Used for Numeric/Financial Columns

**Impact:** 44+ columns with type mismatch, precision issues throughout

### The Problem
Database schema uses `varchar(20)` for quantities, prices, and financial values instead of `DECIMAL`. This causes:
- Type casting on every query
- Floating point precision loss
- Inability to do math in SQL
- Silent validation failures (can store "abc" as quantity)

### Affected Tables & Columns

**batches:**
- unitCogs, unitCogsMin, unitCogsMax
- amountPaid
- onHandQty, sampleQty, reservedQty, quarantineQty, holdQty, defectiveQty

**Other tables:**
- inventoryMovements.amount
- salePrices.qty
- cogsHistory (quantity, cogsAtSale, salePrice)
- cogsChangeLog (oldCogs, newCogs)
- payments.amount
- paymentAllocations.linkAmount
- creditAccounts (creditAmount, amountUsed, amountRemaining)
- creditTransactions.amountApplied
- sampleInventoryLog (allocatedQuantity, usedQuantity, remainingQuantity)

### Recommended Fix
```sql
-- Migration to fix column types
ALTER TABLE batches MODIFY COLUMN unitCogs DECIMAL(15,4);
ALTER TABLE batches MODIFY COLUMN onHandQty DECIMAL(15,4);
-- etc.
```

---

## ROOT CAUSE #3: No Decimal.js Usage for Financial Calculations

**Impact:** 20+ calculation bugs, precision loss throughout

### The Problem
`Decimal.js` is available (`utils/financialMath.ts`) but not used consistently. Raw JavaScript number operations cause floating point errors in:
- Pricing calculations
- COGS calculations
- Credit calculations
- Leaderboard scoring
- Order totals

### Example Bugs From This Root Cause

| File | Lines | Issue |
|------|-------|-------|
| `orderPricingService.ts` | 467-475 | 4 chained floating point additions |
| `priceCalculationService.ts` | 123-142 | Adjustment distribution rounding |
| `creditsDb.ts` | 246-273 | Credit balance calculations |
| `scoringService.ts` | 76-77 | Leaderboard score accumulation |
| `useOrderCalculations.ts` | 104 | Frontend margin calculations |
| `accountingDb.ts` | 374 | Accounting balance validation |

### Recommended Fix
```typescript
// Use financialMath everywhere
import { financialMath } from '../utils/financialMath';

// Instead of:
const total = price * quantity;
const margin = (price - cost) / price * 100;

// Use:
const total = financialMath.multiply(price, quantity);
const margin = financialMath.percentage(
  financialMath.subtract(price, cost),
  price
);
```

---

## ROOT CAUSE #4: React Key Prop Anti-Pattern

**Impact:** 35+ components with state/rendering issues

### The Problem
Widespread use of `key={index}` instead of stable unique IDs. When array order changes, React loses track of component identity, causing:
- State loss
- Form value disappearing
- List flickering
- Incorrect updates

### All Affected Files

| Component | File | Lines |
|-----------|------|-------|
| LineItemTable | `orders/LineItemTable.tsx` | 118 |
| ComponentShowcase | `pages/ComponentShowcase.tsx` | 1182 |
| Help | `pages/Help.tsx` | 277 |
| FarmerVerification | `pages/FarmerVerification.tsx` | 268 |
| IntakeReceipts | `pages/IntakeReceipts.tsx` | 292 |
| Orders | `pages/Orders.tsx` | 551 |
| PurchaseOrdersPage | `pages/PurchaseOrdersPage.tsx` | 503 |
| OrderTotalsPanel | `orders/OrderTotalsPanel.tsx` | 107 |
| PurchaseModal | `inventory/PurchaseModal.tsx` | 602 |
| Quotes | `pages/Quotes.tsx` | 333 |
| ClientPreview | `orders/ClientPreview.tsx` | 99 |
| ReturnsPage | `pages/ReturnsPage.tsx` | 336 |
| StockLevelChart | `inventory/StockLevelChart.tsx` | 62 |
| OrderFulfillment | `orders/OrderFulfillment.tsx` | 205 |
| field.tsx | `ui/field.tsx` | 209 |
| DashboardSkeleton | `skeletons/DashboardSkeleton.tsx` | 18, 40 |
| SearchHighlight | `inventory/SearchHighlight.tsx` | 22, 26 |
| EditBatchModal | `inventory/EditBatchModal.tsx` | 278 |
| WidgetExplainer | `dashboard/v3/WidgetExplainer.tsx` | 44, 53 |
| MonthView | `calendar/MonthView.tsx` | 107 |
| DataCardGrid | `data-cards/DataCardGrid.tsx` | 128 |
| slider.tsx | `ui/slider.tsx` | 53 |
| WeekView | `calendar/WeekView.tsx` | 64 |
| AccountsPayable | `vip-portal/AccountsPayable.tsx` | 141, 150 |
| EventInvitationDialog | `calendar/EventInvitationDialog.tsx` | 367 |
| Leaderboard | `vip-portal/Leaderboard.tsx` | 238 |
| AccountsReceivable | `vip-portal/AccountsReceivable.tsx` | 139, 148 |
| AuditModal | `audit/AuditModal.tsx` | 150, 236, 298, 350, 405 |
| AuditIcon | `audit/AuditIcon.tsx` | 187 |

### Recommended Fix
```typescript
// Instead of:
items.map((item, index) => <Item key={index} />)

// Use:
items.map((item) => <Item key={item.id} />)

// If no ID, generate one:
items.map((item) => <Item key={`${item.name}-${item.createdAt}`} />)
```

---

## ROOT CAUSE #5: SSE/EventSource Memory Leak Pattern

**Impact:** 4+ components with memory leaks, infinite loops

### The Problem
EventSource connections don't properly clean up:
1. Event listeners added but never removed
2. `refetch` functions in dependency arrays cause infinite loops
3. setTimeout for reconnection fires after unmount

### Affected Components

| File | Issue |
|------|-------|
| `WarehousePickList.tsx:56-83` | `refetch` in deps causes loop |
| `LiveShoppingSession.tsx:86-151` | setTimeout leaks on unmount |
| `useLiveSessionSSE.ts:74-193` | Listeners not removed |
| `useLiveSessionClient.ts:33-138` | Listeners not removed |

### Recommended Fix
```typescript
useEffect(() => {
  const evtSource = new EventSource(url);
  const abortController = new AbortController();

  const handleUpdate = () => {
    if (!abortController.signal.aborted) {
      queryClient.invalidateQueries(['key']);
    }
  };

  evtSource.addEventListener('UPDATE', handleUpdate);

  return () => {
    abortController.abort();
    evtSource.removeEventListener('UPDATE', handleUpdate);
    evtSource.close();
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
  };
}, [url]); // Don't include refetch!
```

---

## ROOT CAUSE #6: Inconsistent Soft Delete Implementation

**Impact:** Data integrity issues, orphaned records, audit trail gaps

### The Problem
No standardized approach to deletion:
- Some tables have `deletedAt` column
- Others use hard delete
- Some use workarounds (`isSeller: false`)
- Cascade behavior undefined

### Inconsistencies Found

| Table/Entity | Delete Type | Issue |
|--------------|-------------|-------|
| orders | Soft delete | ✓ Has deletedAt |
| calendar_events | Soft delete | ✓ Has deletedAt |
| intakeReceipts | Hard delete | ✗ Permanent loss |
| intakeReceiptItems | Hard delete | ✗ Permanent loss |
| clientDraftInterests | Hard delete | ✗ No audit trail |
| appointmentTypes | Hard delete | ✗ No recovery |
| sessionPriceOverrides | Hard delete | ✗ Missing deletedAt |
| clients (suppliers) | Workaround | `isSeller: false` |

### Recommended Fix
```typescript
// Create standard soft delete utility
export async function softDelete<T extends { deletedAt: Date | null }>(
  table: Table<T>,
  id: number,
  userId: number
): Promise<{ success: boolean; affectedRows: number }> {
  const result = await db.update(table)
    .set({
      deletedAt: new Date(),
      deletedBy: userId
    })
    .where(and(
      eq(table.id, id),
      isNull(table.deletedAt)
    ));

  return {
    success: result[0].affectedRows > 0,
    affectedRows: result[0].affectedRows
  };
}

// Add deletedAt to ALL tables via migration
```

---

## ROOT CAUSE #7: Missing Foreign Key Constraints

**Impact:** Orphaned records, referential integrity violations

### The Problem
Several columns reference other tables but lack foreign key constraints.

### Missing Constraints

| Table | Column | Should Reference |
|-------|--------|------------------|
| clientInterestLists | reviewedBy | users.id |
| clientInterestLists | convertedToOrderId | orders.id |
| clientInterestLists | convertedBy | users.id |
| clientWantMatches | convertedToOrderId | orders.id |
| salesSheetHistory | convertedToOrderId | orders.id |

### Recommended Fix
```sql
-- Migration to add constraints
ALTER TABLE client_interest_lists
ADD CONSTRAINT fk_cil_reviewed_by
FOREIGN KEY (reviewed_by) REFERENCES users(id);

ALTER TABLE client_interest_lists
ADD CONSTRAINT fk_cil_converted_order
FOREIGN KEY (converted_to_order_id) REFERENCES orders(id);
```

---

## ROOT CAUSE #8: Frontend-Backend API Contract Drift

**Impact:** Silent failures, type mismatches, authentication issues

### The Problem
No shared type definitions between frontend and backend. Contracts drift over time causing:
- Parameter name mismatches (page/pageSize vs limit/offset)
- Response structure inconsistencies
- Header vs body parameter confusion
- Missing field expectations

### Specific Drifts Found

| Issue | Frontend | Backend |
|-------|----------|---------|
| Pagination | Mixed usage | page/pageSize vs limit/offset |
| VIP Token | `{ sessionToken }` input | `x-vip-session-token` header |
| Success response | Expects object | Some return `{ success: boolean }` |
| Auth endpoints | REST fetch() | Should use tRPC |

### Recommended Fix
```typescript
// Create shared types package
// packages/shared/types/api.ts
export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

// Generate types from tRPC router
// Use tRPC inference: inferRouterOutputs<AppRouter>
```

---

## ROOT CAUSE #9: Security Configuration in Code

**Impact:** Potential unauthorized access, credential exposure

### The Problem
Security-sensitive values hardcoded or have insecure defaults.

### Security Issues Found

| File | Issue | Risk |
|------|-------|------|
| `create-admin-user.ts` | `admin/admin` credentials | Unauthorized access |
| `env.ts:16-33` | Default JWT secrets documented | Token compromise |
| `env.ts:88-92` | Public demo user | Unauthenticated access |
| `env.ts:94-105` | Test auth endpoints in prod code | Security bypass |
| `useLiveSessionClient.ts:40` | Token in URL query param | Token exposure in logs |

### Recommended Fix
```typescript
// 1. Force password change on first login
// 2. Remove default secrets - fail if not configured
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be configured');
}

// 3. Move token from URL to header
const evtSource = new EventSource(url);
// Use EventSourcePolyfill for header support
import { EventSourcePolyfill } from 'event-source-polyfill';
const evtSource = new EventSourcePolyfill(url, {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

---

## ROOT CAUSE #10: Missing UI Confirmation Pattern

**Impact:** Accidental data loss, poor UX

### The Problem
No standard confirmation dialog pattern for destructive actions.

### All Unprotected Delete Actions

| File | Line | Action |
|------|------|--------|
| Settings.tsx | 505 | Delete location |
| Settings.tsx | 639 | Delete category |
| Settings.tsx | 687-689 | Delete subcategory (BROKEN!) |
| Settings.tsx | 803 | Delete grade |
| RoomManagementModal.tsx | 308 | Remove feature |
| AddClientWizard.tsx | 464 | Remove tag |
| UserSelector.tsx | 121 | Remove user |
| EditBatchModal.tsx | 288 | Remove media |
| PricingRulesPage.tsx | 296 | Remove condition |
| ReturnsPage.tsx | 352 | Remove return item |
| OrganizationSettings.tsx | 587 | Delete unit type |
| OrganizationSettings.tsx | 885 | Delete finance status |
| CalendarAppointmentTypes.tsx | 201 | Delete appointment type |
| CalendarAvailabilitySettings.tsx | 265 | Delete blocked time |

### Recommended Fix
```typescript
// Create standard hook
const useConfirmAction = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<() => void>();

  const confirm = (action: () => void, options?: ConfirmOptions) => {
    setPendingAction(() => action);
    setIsOpen(true);
  };

  return { confirm, ConfirmDialog: () => (
    <AlertDialog open={isOpen}>
      <AlertDialogContent>
        <AlertDialogAction onClick={() => {
          pendingAction?.();
          setIsOpen(false);
        }}>
          Confirm
        </AlertDialogAction>
      </AlertDialogContent>
    </AlertDialog>
  )};
};
```

---

## ROOT CAUSE #11: Incomplete Feature Implementation Pattern

**Impact:** 30+ features partially implemented, confusing UX

### The Problem
Features are added with placeholders that never get completed. Pattern of "for now" implementations that ship to production.

### "For Now" Implementations Found

| File | Line | Placeholder |
|------|------|-------------|
| `receipts.ts` | 509 | Email service - records "sent" but doesn't send |
| `receipts.ts` | 536 | SMS service - records "sent" but doesn't send |
| `vipPortalAdminService.ts` | 441 | Tier config - returns hardcoded |
| `supplierMetrics.ts` | 166-196 | Quality score - returns null |
| `supplierMetrics.ts` | 198-215 | Return rate - returns null |
| `audit.ts` | 547 | Transaction history - placeholder |
| `liveCatalogService.ts` | 357 | Brand filter - empty array |
| `liveCatalogService.ts` | 367 | Price range - hardcoded 0-1000 |
| `clientNeedsDbEnhanced.ts` | 374 | Match count - returns 0 |
| `vendorSupplyDb.ts` | 232 | Match count - returns 0 |
| `accounting.test.ts` | 246-373 | 4 sub-routers not implemented |

### Recommended Fix
```typescript
// 1. Create feature flag system
export const features = {
  emailNotifications: process.env.FEATURE_EMAIL === 'true',
  smsNotifications: process.env.FEATURE_SMS === 'true',
};

// 2. Throw or show "coming soon" UI instead of fake success
if (!features.emailNotifications) {
  throw new TRPCError({
    code: 'NOT_IMPLEMENTED',
    message: 'Email notifications not yet available'
  });
}

// 3. Track all TODOs in issue tracker, not just comments
```

---

## ROOT CAUSE #12: Type Safety Gaps

**Impact:** 100+ potential runtime errors

### The Problem
Widespread use of `any` type, non-null assertions, and missing null checks.

### Type Safety Issues

| Category | Count | Example |
|----------|-------|---------|
| `any` type usage | 100+ | `const updates: any = {...}` |
| Non-null assertions | 20+ | `session!.id` |
| Missing null checks | 30+ | `result[0].insertId` without check |
| Unsafe type assertions | 15+ | `as SeedClient[]` |

### Files with Most `any` Usage
- `test-utils/testDb.ts` - 40+ instances
- `routers/liveShopping.ts` - 6 instances
- `ordersDb.ts` - 5+ instances
- Various test files

### Recommended Fix
```typescript
// 1. Enable strict TypeScript
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}

// 2. Create proper types instead of any
interface SessionUpdate {
  status?: SessionStatus;
  endedAt?: Date;
}

// 3. Use type guards instead of assertions
function isSession(obj: unknown): obj is Session {
  return obj !== null && typeof obj === 'object' && 'id' in obj;
}
```

---

# PART 2: ONE-OFF BUGS

These are individual bugs not caused by systemic issues.

---

## CRITICAL BUGS

### BUG-001: `refetch` Undefined in BatchDetailDrawer
**File:** `client/src/components/inventory/BatchDetailDrawer.tsx:237`
```typescript
onSuccess: () => {
  refetch(); // ERROR: refetch is not defined in this scope
}
```
**Fix:** Destructure `refetch` from the query hook at component level.

### BUG-002: Delete Subcategory Button Non-functional
**File:** `client/src/pages/Settings.tsx:687-689`
```typescript
<Button onClick={...}> // No onClick handler!
```
**Fix:** Add `onClick={() => deleteSubcategoryMutation.mutate({ id })}`

### BUG-003: Division by Zero in Weight Normalizer
**File:** `server/services/leaderboard/weightNormalizer.ts:20-25`
```typescript
const equalWeight = 100 / entries.length; // entries.length could be 0
```
**Fix:** Add `if (entries.length === 0) return {};`

### BUG-004: Date Month Arithmetic Wrong for Jan-Mar
**File:** `server/creditEngine.ts:70-73`
```typescript
new Date(now.getFullYear(), now.getMonth() - 3, 1); // Wrong for month < 3
```
**Fix:** Use `new Date(now.setMonth(now.getMonth() - 3))`

### BUG-005: VIP Tier Metrics Returns NaN
**File:** `server/services/vipTierService.ts:178`
```typescript
parseFloat(String(client?.totalSpent || "0")) // If client undefined, returns NaN
```
**Fix:** Add explicit client null check before accessing properties.

---

## HIGH PRIORITY BUGS

### BUG-006: Margin >= 100% Handling Inconsistent
**Frontend:** Returns COGS silently
**Backend:** Throws error
**Fix:** Frontend should throw same error as backend.

### BUG-007: Fixed Discounts Bypass Authority
**File:** `orderPricingService.ts:610-646`
Only validates negative amounts, not positive.
**Fix:** Add validation for positive amounts too.

### BUG-008: Cart Update Race Condition
**File:** `routers/liveShopping.ts:285-296`
`emitCartUpdate` called before DB write completes.
**Fix:** Ensure await on DB operation completes first.

### BUG-009: window.alert() in EventFormDialog
**File:** `calendar/EventFormDialog.tsx:195`
Uses native alert instead of toast.
**Fix:** Replace with `toast.error()`.

### BUG-010: Audit Trail Truncated at 10 Rows
**File:** `inventory/BatchDetailDrawer.tsx:675-703`
`.slice(0, 10)` with no "show more" button.
**Fix:** Add pagination or "show more" functionality.

### BUG-011: Accounting Tolerance Too Permissive
**File:** `accountingDb.ts:374`
`Math.abs(debit - credit) < 0.01` allows 1 cent variance.
**Fix:** Use exact equality or document business requirement.

### BUG-012: Inventory Filter URL Case Mismatch
**File:** `vip-portal/AgingInventoryWidget.tsx:101-103`
URL uses uppercase enum but filter may expect lowercase.
**Fix:** Standardize case handling.

### BUG-013: Transaction Fee Min/Max Not Validated
**File:** `routers/transactionFees.ts:54-78`
No check that `minFee <= maxFee`.
**Fix:** Add validation.

### BUG-014: COGS Adjustment Only Supports Discounts
**File:** `cogsCalculator.ts:70-72`
`1 - adjustmentPercent / 100` always reduces cost.
**Fix:** Document semantics or support increases.

---

## MEDIUM PRIORITY BUGS

### BUG-015: Props Unused - clientDetails
**File:** `orders/OrderPreview.tsx:59, 70`
**Fix:** Remove unused prop or use it.

### BUG-016: Missing Loading States
**File:** `pages/Orders.tsx`
Confirmed orders loading state unclear.
**Fix:** Add explicit loading indicator.

### BUG-017: Redundant Margin Check
**File:** `useOrderCalculations.ts:104`
`subtotal > 0 && Math.abs(subtotal) > 0.01` is redundant.
**Fix:** Simplify to `subtotal > 0`.

### BUG-018: Missing Error UI in LiveCatalog
**File:** `vip-portal/LiveCatalog.tsx:92-109`
`catalogError` exists but never rendered.
**Fix:** Add error state UI.

### BUG-019: Cash Payment Validation Missing
**File:** `orders/OrderPreview.tsx:273-277`
`cashPayment` can exceed subtotal.
**Fix:** Add validation.

### BUG-020: EventFormDialog Non-null Contradiction
**File:** `calendar/EventFormDialog.tsx:77`
`eventId!` but `{ enabled: !!eventId }` contradicts.
**Fix:** Use proper null handling.

### BUG-021: Deprecated Tables Still Used
**File:** `drizzle/schema.ts:153-177`
vendors table deprecated but still referenced.
**Fix:** Complete migration to clients table.

### BUG-022: Soft Delete Queries Include Deleted
Some list queries don't filter `deletedAt`.
**Fix:** Add `isNull(deletedAt)` to all list queries.

### BUG-023: Unvalidated JSON Parse in SSE
**File:** `useLiveSessionSSE.ts`
`JSON.parse(event.data)` can throw.
**Fix:** Error is caught but not shown to user.

### BUG-024: Silent Error Catch in ArApDb
**File:** `arApDb.ts:239, 530`
Returns empty data instead of surfacing error.
**Fix:** Throw or log appropriately.

### BUG-025: Missing Indexes on sessionPriceOverrides
**File:** `schema-live-shopping.ts:228-230`
No indexes on sessionId, productId.
**Fix:** Add indexes.

---

## LOW PRIORITY BUGS

### BUG-026: Console.log in Production (150+ instances)
**Fix:** Replace with structured logging or remove.

### BUG-027: Native HTML Select for Multi-select
**File:** `EventFormDialog.tsx:426-440`
**Fix:** Replace with Radix UI Select.

### BUG-028: Inconsistent Terminology
SKU vs Product Code vs Item Code vs Batch ID
**Fix:** Standardize terminology.

### BUG-029: Accessibility Gaps
Only 110 aria attributes in 300+ components.
**Fix:** Add appropriate aria labels.

### BUG-030: Responsive Design Issues
Hardcoded heights, tabs overflow.
**Fix:** Use responsive classes.

---

# PART 3: PRIORITIZED FIX PLAN

## Week 1 - Critical Fixes

1. **Security**
   - [ ] Force password change on admin creation
   - [ ] Remove JWT secret defaults
   - [ ] Move VIP token from URL to header

2. **Crashes**
   - [ ] Fix `refetch` undefined (BUG-001)
   - [ ] Fix division by zero (BUG-003)
   - [ ] Fix event listener cleanup (ROOT CAUSE #5)

3. **Data Integrity**
   - [ ] Add transactions to credit application (ROOT CAUSE #1)
   - [ ] Add transactions to cascading deletes (ROOT CAUSE #1)

## Week 2 - High Priority

1. **Database**
   - [ ] Add foreign key constraints (ROOT CAUSE #7)
   - [ ] Add missing indexes (BUG-025)
   - [ ] Begin VARCHAR → DECIMAL migration planning (ROOT CAUSE #2)

2. **API Alignment**
   - [ ] Standardize pagination parameters (ROOT CAUSE #8)
   - [ ] Fix VIP token header alignment (ROOT CAUSE #8)
   - [ ] Migrate auth from REST to tRPC

3. **Business Logic**
   - [ ] Fix margin handling inconsistency (BUG-006)
   - [ ] Fix discount authority bypass (BUG-007)
   - [ ] Fix date arithmetic (BUG-004)

## Week 3-4 - Medium Priority

1. **Frontend**
   - [ ] Replace all `key={index}` (ROOT CAUSE #4)
   - [ ] Add confirmation dialogs (ROOT CAUSE #10)
   - [ ] Add error states to components
   - [ ] Fix delete subcategory button (BUG-002)

2. **Backend**
   - [ ] Use Decimal.js for all financial calculations (ROOT CAUSE #3)
   - [ ] Standardize soft delete (ROOT CAUSE #6)
   - [ ] Add optimistic locking to updates

3. **Complete Features**
   - [ ] Implement email/SMS or remove UI
   - [ ] Complete VIP tier configuration storage
   - [ ] Fix accounting sub-routers

## Ongoing - Technical Debt

1. **Type Safety**
   - [ ] Replace `any` with proper types (ROOT CAUSE #12)
   - [ ] Enable strict TypeScript

2. **Code Quality**
   - [ ] Remove console.log statements
   - [ ] Replace "for now" implementations
   - [ ] Fix all test mock issues

---

# APPENDIX A: Files by Issue Count

| File | Issues | Categories |
|------|--------|------------|
| `server/routers/vipPortal.ts` | 15+ | CRUD, validation, types |
| `server/services/orderPricingService.ts` | 10+ | Math, transactions, types |
| `client/src/components/inventory/BatchDetailDrawer.tsx` | 8+ | Keys, undefined, truncation |
| `server/creditsDb.ts` | 7+ | Transactions, precision, validation |
| `client/src/pages/Settings.tsx` | 6+ | Confirmation, broken button |
| `server/pricingEngine.ts` | 6+ | Null checks, types |
| `server/routers/orders.ts` | 5+ | Transactions, rollback |
| `drizzle/schema.ts` | 50+ | VARCHAR columns, deprecated tables |

---

# APPENDIX B: Testing Checklist

After fixes, verify:

- [ ] Credit application works with concurrent requests
- [ ] Cascading deletes are atomic
- [ ] Financial calculations are precise to 2 decimals
- [ ] React lists maintain state on reorder
- [ ] SSE connections clean up on unmount
- [ ] All destructive actions show confirmation
- [ ] VIP portal authentication works
- [ ] Pagination works consistently across all lists
- [ ] Soft deleted records don't appear in lists

---

*Report generated by Claude Code QA Audit - 2026-01-14*
