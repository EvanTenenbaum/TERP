# Canonical Flows QA Review

**Date**: 2026-02-10
**Reviewer**: Claude (automated codebase verification)
**Scope**: 10 canonical flow decisions verified against actual code

---

## Summary

| # | Domain | Claim | Verdict | Details |
|---|--------|-------|---------|---------|
| 1 | Orders | `createDraftEnhanced` + `finalizeDraft` is canonical | **CORRECT** with nuance | Two separate paths exist; `confirmDraftOrder` is a competing legacy path |
| 2 | Inventory | Reserve at finalize, decrement on-hand at ship | **PARTIALLY INCORRECT** | Two conflicting shipping paths handle inventory differently |
| 3 | Invoicing | Order-driven creation is primary | **CORRECT** | Manual creation endpoint exists but is unused by UI |
| 4 | Payments | `payments.recordPayment` is source of truth | **CORRECT** | Significantly more complete than accounting variants |
| 5 | Auth | Demo fallback should be demo-only | **INCORRECT** (as stated) | Production provisions a public user after logout, not just demo |
| 6 | Suppliers | `clients` with `isSeller=true` is canonical | **CORRECT** | `supplierClientId` is canonical FK; `vendorId` is legacy |
| 7 | Feature Flags | `getAuditHistory` 500s are defects | **UNSUBSTANTIATED** | Code has proper error handling; no evidence of 500s |
| 8 | Credits/Referrals | Failures on `/orders/create` not acceptable | **CORRECT** | Weak error handling confirmed |
| 9 | Settings | `/settings/display` should redirect | **CORRECT** | Route does not exist; hits 404 |
| 10 | Samples | Sample fulfillment is user-facing | **CORRECT** | Properly gated behind `strictlyProtectedProcedure` + permissions |

---

## Detailed Findings

### 1. Canonical Order Path

**Claim**: Use `/orders/create` with `createDraftEnhanced` + `finalizeDraft` as canonical.
**Verdict**: CORRECT, but a competing path exists that should be retired.

**Two distinct paths exist today:**

| Aspect | New Path (Canonical) | Legacy Path |
|--------|---------------------|-------------|
| **Creation** | `createDraftEnhanced` (orders.ts:703) | N/A |
| **Confirmation** | `finalizeDraft` (orders.ts:1074) | `confirmDraftOrder` (orders.ts:614, ordersDb.ts:1163) |
| **Inventory** | Reserves (`reservedQty++`) | Consumes (`onHandQty--`) |
| **Payment terms** | Saved optionally | Required + immediate |
| **Order type** | User chooses QUOTE or SALE | Forced to SALE |
| **Used by** | OrderCreatorPage.tsx | OrdersWorkSurface.tsx:598 |

**Risk**: These two paths have different inventory semantics. `finalizeDraft` reserves inventory while `confirmDraftOrder` immediately consumes it. Running both paths in parallel means inventory accounting behaves differently depending on which UI the user is in.

**Recommendation**: Retire `confirmDraftOrder` from OrdersWorkSurface and migrate it to use `finalizeDraft`. This is the stated direction and aligns with the golden flow specs.

---

### 2. Inventory Movement Timing

**Claim**: Reserve at finalize, decrement on-hand at ship, release reservation at ship.
**Verdict**: PARTIALLY INCORRECT - two conflicting shipping paths.

**What actually happens:**

| Step | Modern Path (`shipOrder`, orders.ts:1799) | Legacy Path (`updateOrderStatus`, ordersDb.ts:1747) |
|------|------------------------------------------|-----------------------------------------------------|
| Finalize | `reservedQty += qty` | N/A (uses `confirmDraftOrder`) |
| Confirm | N/A | `onHandQty -= qty` (immediate) |
| Ship | `reservedQty -= qty` (release only) | `onHandQty -= qty` via `decrementInventoryForOrder` |

**Key discrepancy**: The modern `shipOrder` path releases reservations but does NOT decrement `onHandQty`. The legacy `updateOrderStatus` SHIPPED path decrements `onHandQty` but does NOT release `reservedQty`.

**Neither path does both operations in the same transaction as claimed.**

**For samples**: `sampleQty -= qty` at finalize is confirmed (orders.ts:1202-1206).

**Impact**: If orders go through the modern path, `onHandQty` is never decremented. If they go through the legacy path, `reservedQty` is never released. Both lead to inventory drift.

**Recommendation**: The canonical ship path must do both: release `reservedQty` AND decrement `onHandQty` in the same transaction. This is currently a gap.

---

### 3. Invoice Creation Path

**Claim**: Invoices should be created from orders, not as manual accounting entries.
**Verdict**: CORRECT.

- **Primary path**: `invoices.generateFromOrder` (invoices.ts:337-476) creates invoices from shipped orders. This is used by the UI and called automatically during order status transitions (ordersDb.ts:1805).
- **Secondary path**: `accounting.invoices.create` (accounting.ts:800-873) allows manual invoice creation but has **no client-side UI usage** found anywhere.
- **InvoicesWorkSurface.tsx**: Focused on managing/viewing existing invoices, not creating new ones.

The architecture already matches the stated direction. The unused manual creation endpoint could be removed or explicitly deprecated.

---

### 4. Payment Backend Source of Truth

**Claim**: `payments.recordPayment` is the practical source of truth.
**Verdict**: CORRECT.

| Capability | `payments.recordPayment` (payments.ts:230) | `accounting.invoices.recordPayment` (accounting.ts:923) |
|------------|---------------------------------------------|----------------------------------------------------------|
| Payment record creation | Yes (generates payment number) | Delegates to arApDb |
| Validation | Comprehensive (amount, status, invoice) | Basic amount check |
| GL entries | Yes (Cash debit, AR credit, fiscal period) | Yes (separate call) |
| Client balance sync | Yes (explicit call) | No |
| Error handling | Full try/catch + Sentry | Partial |
| Client UI usage | RecordPaymentDialog, PaymentInspector | **None found** |

GF-004-INVOICE-PAYMENT.md (line 63) explicitly names `payments.recordPayment` as the canonical path. The accounting variant appears to be unused dead code.

---

### 5. Demo/Public Fallback After Logout

**Claim**: Should be demo-only, not production. Logout should return true unauthenticated state.
**Verdict**: THE DIRECTION IS CORRECT, but the claim about current behavior needs clarification.

**Current behavior (context.ts:203-232):**
- `DEMO_MODE=true`: After logout, next request provisions a demo admin user
- `DEMO_MODE=false`: After logout, next request provisions a **public user** (id=-1, role="user")

There is **no true unauthenticated state** in the current implementation. Even without `DEMO_MODE`, the system provisions a public user with a valid session. This means:

- Users can never be fully logged out
- The public user has `role="user"` (not "anonymous" or similar)
- Permission checks may not properly distinguish "logged out" from "limited access"

**The stated direction is sound** - production logout should result in a true unauthenticated state, not a fallback user. But the document implies this is already gated by `DEMO_MODE` when in fact the public user fallback happens regardless.

---

### 6. Supplier Identity Model

**Claim**: Official direction is `clients` with `isSeller=true`, using `supplierClientId` as canonical FK.
**Verdict**: CORRECT. Fully confirmed.

- GF-002-PROCURE-TO-PAY.md explicitly states RULE-001: "Supplier must be a client with `isSeller=true`" and RULE-002: "Use `supplierClientId` (canonical)"
- Schema (drizzle/schema.ts:232): `supplierClientId` references `clients.id`
- Schema (drizzle/schema.ts:238): `vendorId` marked deprecated
- `supplier_profiles` table (schema.ts:1734) extends clients with supplier-specific data
- Pattern applied consistently: `purchaseOrders.supplierClientId`, `inventoryLots.supplierClientId`

Legacy `vendorId` columns remain for migration compatibility only.

---

### 7. featureFlags.getAuditHistory 500s

**Claim**: These are production defects, not expected transitional behavior.
**Verdict**: UNSUBSTANTIATED - no evidence of 500s in the code.

The implementation has proper error handling at every layer:
- **Router** (featureFlags.ts:372): Standard `adminProcedure` with input validation
- **Service** (featureFlagService.ts:356): Direct delegation
- **Database** (featureFlagsDb.ts:458): Returns empty array `[]` when DB unavailable (not 500)

The QA document (FEATURE_FLAG_E2E_QA_LIVE.md:85) notes "No audit history yet" as expected empty state and confirms the system is "fully operational."

**If 500s are occurring in production**, they are not caused by the getAuditHistory implementation itself. Possible causes to investigate:
- Database connection issues
- Schema mismatch (table doesn't exist)
- Permission errors at middleware level

---

### 8. Credit/Referral Failures on `/orders/create`

**Claim**: These must be fixed or permission-gated before relying on the flow.
**Verdict**: CORRECT. Weak error handling confirmed.

**ReferredBySelector.tsx** (used on OrderCreatorPage.tsx:592):
- Calls `trpc.referrals.getEligibleReferrers.useQuery()` and `trpc.referrals.getSettings.useQuery()`
- **Neither query has `isError` handling**
- `getSettings` uses `adminProcedure` - non-admin users get permission denied silently
- Fallback `settings?.globalPercentage || 10` handles null but not query errors

**ReferralCreditsPanel.tsx** (used on OrderCreatorPage.tsx:720):
- Calls `trpc.referrals.getPendingCredits.useQuery()`
- Slightly better: checks `if (!creditsData)` and returns null
- Still no explicit error state UI

**Impact**: For non-admin users creating orders, the referral components silently fail. This doesn't crash the page but creates a degraded experience on a core flow.

**Recommendation**: Either:
1. Add error boundaries/fallback UI to these components, or
2. Gate their rendering behind a permission check before the query fires

---

### 9. `/settings/display` Route

**Claim**: Should redirect to `/settings` for backwards compatibility.
**Verdict**: CORRECT. Route does not exist.

**Current settings routes in App.tsx:**
- `/settings/cogs` (line 293)
- `/settings/notifications` (line 297)
- `/settings/feature-flags` (line 301)
- `/settings` (line 305)

No `/settings/display` route or redirect exists. Navigating there hits the 404 NotFound handler (App.tsx:488).

**Fix**: Add a `<Route path="/settings/display" component={() => <Navigate to="/settings" />} />` or equivalent redirect.

---

### 10. Sample Fulfillment Visibility

**Claim**: User-facing for authorized internal users, properly permissioned.
**Verdict**: CORRECT.

- **Route**: `/samples` renders `SampleManagement` component (App.tsx:350)
- **Navigation**: Listed under "inventory" group with Beaker icon (navigation.ts:174)
- **Permissions**:
  - List: `protectedProcedure` + `samples:read` (samples.ts:60)
  - Create: `strictlyProtectedProcedure` + `samples:create` (samples.ts:141)
  - Fulfill: `strictlyProtectedProcedure` + `samples:allocate` (samples.ts:166)
  - Cancel: `strictlyProtectedProcedure` + `samples:delete` (samples.ts:182)

Properly gated at both the route level and the API level. Not public, not backend-only.

---

## Action Items (Prioritized)

### HIGH - Inventory Integrity
1. **Unify shipping inventory path**: The modern `shipOrder` and legacy `updateOrderStatus` handle inventory differently. The canonical path must release `reservedQty` AND decrement `onHandQty` in one transaction.
2. **Retire `confirmDraftOrder`**: Migrate OrdersWorkSurface to use `finalizeDraft` to eliminate the competing inventory model.

### MEDIUM - Core Flow Stability
3. **Fix referral/credit error handling on `/orders/create`**: Add error boundaries or permission gates to ReferredBySelector and ReferralCreditsPanel.
4. **Add `/settings/display` redirect**: Trivial fix to prevent 404s.

### LOW - Cleanup
5. **Investigate auth fallback**: Determine if the public user (id=-1) fallback in production is intentional or a gap.
6. **Remove unused `accounting.invoices.create`**: Dead code that could cause confusion.
7. **Verify getAuditHistory in production**: If 500s are actually occurring, investigate infrastructure (not code).
