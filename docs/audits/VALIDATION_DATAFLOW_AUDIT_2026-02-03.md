# Validation & Data Flow Audit (Inventory Cursor Bug Pattern)

**Date:** 2026-02-03  
**Scope:** Validation schemas, WorkSurface pagination flows, silent failure patterns, and type mismatches.

## 1) Validation Schema Audit (positiveInt vs 0-allowed fields)

**Summary:** The only `positiveInt` validators in core schema files are used for IDs and list limits; cursor/offset fields already use non-negative validators. The specific bug pattern (cursor `0` rejected) appears to have been addressed in `listQuerySchema`.

### Findings

- `listQuerySchema.cursor` and `listQuerySchema.offset` use `nonNegativeInt`, allowing `0` for first page cursors/offsets. This explicitly documents the fix for the cursor=0 issue.  
  **Evidence:** `server/_core/validation.ts`.
- `positiveInt` appears in `listQuerySchema.limit` and ID fields (batchId, id, referenceId, etc.), not for cursor/offset/page fields.  
  **Evidence:** `server/_core/validation.ts`.

### Risk Assessment

- **No additional validation failures of the cursor=0 variety were found** in the core validation module or inventory router input definitions.
- **Potentially relevant**: most list endpoints still use `limit: z.number().min(1)` which rejects `0` if any UI ever uses `0` to mean “no limit.” This is not currently observed in the WorkSurfaces but is a future foot-gun.

## 2) WorkSurface Component Audit (Pagination/Data Flow)

### InventoryWorkSurface

- **First load pagination params:** `cursor: page * pageSize` with `page` initialized to `0`.  
  **Compatibility:** Backend `listQuerySchema` allows `cursor=0`; inventory router accepts it.  
  **Evidence:** `client/src/components/work-surface/InventoryWorkSurface.tsx`, `server/_core/validation.ts`, `server/routers/inventory.ts`.

### ClientsWorkSurface

- **First load params:** `offset: page * limit` with `page` initialized to `0`.  
  **Compatibility:** `clients.list` accepts `offset` with default `0` and no minimum restriction.  
  **Evidence:** `client/src/components/work-surface/ClientsWorkSurface.tsx`, `server/routers/clients.ts`.

### InvoicesWorkSurface

- **First load params:** `offset: (page - 1) * pageSize` with `page` initialized to `1`.  
  **Compatibility:** `accounting.invoices.list` accepts `offset` optional with no min restriction.  
  **Evidence:** `client/src/components/work-surface/InvoicesWorkSurface.tsx`, `server/routers/accounting.ts`.

### ClientLedgerWorkSurface

- **First load params:** `offset: page * ITEMS_PER_PAGE` with `page` initialized to `0`.  
  **Compatibility:** `clientLedger.getLedger` requires `offset >= 0` and `limit >= 1`.  
  **Evidence:** `client/src/components/work-surface/ClientLedgerWorkSurface.tsx`, `server/routers/clientLedger.ts`.

### Orders / Quotes / PurchaseOrders / PickPack / DirectIntake

- **Orders/Quotes:** Use `orders.getAll` without pagination params; backend accepts optional input and defaults to offset `0`.
- **PurchaseOrders:** Uses `purchaseOrders.getAll` with default pagination on server; no offset/cursor from UI.
- **PickPack:** Uses `pickPack.getPickList` with `limit: 50` and no offset.
- **DirectIntake:** Uses non-paginated endpoints for lookups.  
  **Evidence:** `client/src/components/work-surface/*`, `server/routers/orders.ts`, `server/routers/purchaseOrders.ts`, `server/routers/pickPack.ts`.

**Conclusion:** No WorkSurface currently sends `cursor: 0` to a schema that rejects it. The inventory cursor bug appears isolated and already addressed in the validation layer.

## 3) Silent Failure Pattern Audit

### Finding: Query errors are swallowed in WorkSurfaces

Most WorkSurface components do **not** surface `useQuery` errors. Instead, they coerce missing/errored data into empty arrays, which can render “No data found” states that mask validation or API errors (same symptom as the inventory cursor bug).

**Examples:**

- InventoryWorkSurface does not check `error` and uses `inventoryData?.items ?? []`, so a failed query yields empty UI data.  
  **Evidence:** `client/src/components/work-surface/InventoryWorkSurface.tsx`.
- ClientsWorkSurface captures `error` but does not render it, and falls back to empty `clients` when data is absent.  
  **Evidence:** `client/src/components/work-surface/ClientsWorkSurface.tsx`.
- OrdersWorkSurface/QuotesWorkSurface coerce `orders.getAll` responses to arrays with `Array.isArray` fallback, masking errors as empty lists.  
  **Evidence:** `client/src/components/work-surface/OrdersWorkSurface.tsx`, `client/src/components/work-surface/QuotesWorkSurface.tsx`.

### Risk Assessment

- **Severity:** P2 (Systemic UX/diagnostics issue, not a hard crash)
- **Impact:** Users see empty states instead of actionable error feedback; validation failures can look like “no data found.”

## 4) Type Mismatch Audit

### Finding: Mixed response shapes and `any` casting in WorkSurfaces

WorkSurface components frequently handle both array responses and `createSafeUnifiedResponse` shapes by casting to `any` and using `Array.isArray`. This indicates mismatched frontend expectations vs backend return types, which increases the risk of silent failures.

**Examples:**

- OrdersWorkSurface and QuotesWorkSurface cast `orders.getAll` responses to `(any)?.items`.  
  **Evidence:** `client/src/components/work-surface/OrdersWorkSurface.tsx`, `client/src/components/work-surface/QuotesWorkSurface.tsx`.
- ClientsWorkSurface casts `clients.list` response to `any` and falls back to `items`.  
  **Evidence:** `client/src/components/work-surface/ClientsWorkSurface.tsx`.

### Risk Assessment

- **Severity:** P2 (type safety and observability risk)
- **Impact:** Mismatched response shapes make it easier for validation errors to surface as empty arrays rather than visible errors.

---

# Deliverables

## 1) Issue List (Similar Issues Found)

| ID       | Issue                                                                                                                                                      | Severity | Impact                                                         | Evidence                                      |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------- | --------------------------------------------- |
| AUDIT-01 | WorkSurface queries swallow errors and show empty lists, masking validation failures.                                                                      | P2       | Users see “No data” instead of actionable error state.         | Inventory/Clients/Orders/Quotes WorkSurfaces. |
| AUDIT-02 | Mixed response shapes + `any` casting in WorkSurfaces enable silent data flow mismatches.                                                                  | P2       | Type mismatches and error masking across list views.           | Clients/Orders/Quotes WorkSurfaces.           |
| AUDIT-03 | Potential foot-gun: `limit` validators require `>=1` everywhere; if any UI sends `0` as “no limit,” queries will fail validation silently unless surfaced. | P3       | Not currently observed but likely to recur without guardrails. | Pagination schemas/routers.                   |

## 2) Root Cause Analysis (Common Patterns)

1. **Implicit empty-state fallback** in React Query consumers hides errors.
2. **Inconsistent response shapes** (`Array` vs `{ items, pagination }`) lead to defensive casting instead of strict typing.
3. **Validation strictness without explicit UI error handling** results in “valid request → invalid UI state” when errors occur.

## 3) Fix Recommendations (Prioritized)

### P1 (Next sprint)

1. **Standardize list responses** in frontend: remove `Array.isArray` fallbacks and enforce a single list response shape (prefer `{ items, pagination }`).
2. **Add uniform error UI** in WorkSurface list queries (error banner or toast + retry) to prevent silent failures.

### P2 (Medium)

3. **Codify pagination contracts** in shared types (limit/offset/cursor) and enforce via type-safe hooks so invalid `0` values are caught in TS before runtime.
4. **Audit list endpoints** for `limit: z.number().min(1)` and decide whether `0` is ever valid (if yes, replace with nonNegativeInt and handle `0` as “no limit”).

## 4) Prevention Strategy

1. **Unified list response contract**: enforce a single response shape in the tRPC router types and remove mixed-mode array responses.
2. **Error-first UI guardrails**: WorkSurfaces must render a visible error state whenever `useQuery` returns an error.
3. **Shared pagination utility**: provide a single pagination input builder for WorkSurfaces to avoid ad-hoc param math.
4. **Validation test coverage**: add tests that confirm cursor/offset default to `0` and that UI handles validation errors explicitly.
