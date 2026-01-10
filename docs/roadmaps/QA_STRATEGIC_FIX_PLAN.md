# TERP QA Strategic Fix Plan

**Version:** 1.0
**Created:** 2026-01-10
**Source:** QA Sales Manager / TERP Operator Role Testing (January 10, 2026)
**Status:** Active

---

## Executive Summary

| Metric | Count |
|--------|-------|
| Total Flows Attempted | 12 |
| PASS | 5 |
| FAIL | 6 |
| BLOCKED | 3 |
| New Bugs Identified | 10 |
| Critical (P0) | 1 |
| High (P1) | 3 |
| Medium (P2) | 3 |
| Permission Blocks | 3 |

---

## Root Cause Analysis

### Systemic Root Causes Identified

After analyzing all 10 issues from the QA report, they can be grouped into **5 systemic root causes**:

| Root Cause ID | Description | Bugs Affected | Impact |
|---------------|-------------|---------------|--------|
| **RC-001** | Missing Pricing Defaults Data | BUG-086 | P0 - Blocks revenue |
| **RC-002** | API Query/Pagination Validation | BUG-087, BUG-088 | P1 - Blocks product browsing |
| **RC-003** | Frontend Event Handler Wiring | BUG-089, BUG-090 | P1/P2 - Blocks workflows |
| **RC-004** | Grid Data Rendering Pipeline | BUG-091, BUG-092 | P2 - Reduces usability |
| **RC-005** | RBAC Permission Gaps | BLOCKED-001/002/003 | P2 - Blocks role access |

---

## Bug Registry (New from QA Report)

### P0 - Critical (Revenue Blocking)

#### BUG-086: Cannot finalize sales order due to missing pricing defaults
- **Area:** Sales → Orders → Finalize
- **Root Cause:** RC-001 (related to existing BUG-084)
- **Systemic Issue:** `pricingDefaults` table is empty/not seeded
- **Impact:** Prevents completing orders - blocks core revenue workflow
- **Fix Strategy:**
  1. Ensure pricing defaults are seeded via `pnpm seed:pricing`
  2. Add fallback logic in order finalization if no pricing default exists
  3. Add validation in order creation to warn if pricing defaults missing

### P1 - High (Major Functionality)

#### BUG-087: Inventory → Products fails to load ("limit parameter too large")
- **Area:** Inventory → Products
- **Root Cause:** RC-002
- **Systemic Issue:** Frontend sending invalid pagination params or different endpoint than `productCatalogue.list`
- **Note:** `productCatalogue.list` already has `limit: z.number().min(1).max(100).default(50)` validation
- **Fix Strategy:**
  1. Identify which products endpoint is being called (may be legacy `products.list`)
  2. Add consistent pagination validation across all product-related endpoints
  3. Ensure frontend defaults to valid limit values

#### BUG-088: Spreadsheet View → Clients detail query fails with raw SQL error
- **Area:** Inventory → Spreadsheet View → Clients tab
- **Root Cause:** RC-002 (related to existing BUG-078 orders.getAll failure)
- **Systemic Issue:** Orders query fails when fetching client order history
- **Security Risk:** Leaks internal query structure to UI
- **Fix Strategy:**
  1. Fix underlying orders query failure (BUG-078)
  2. Add proper error handling to hide raw SQL from users
  3. Show user-friendly "Unable to load orders" message

#### BUG-089: Invoices "New Invoice" button is non-functional
- **Area:** Sales → Invoices
- **Root Cause:** RC-003
- **Systemic Issue:** Button component missing `onClick` handler
- **Location:** `client/src/pages/accounting/Invoices.tsx:225-228`
- **Fix Strategy:**
  1. Add `onClick` handler to open invoice creation modal/route
  2. Implement invoice creation flow (modal or new page)
  3. Connect to `accounting.invoices.create` mutation

### P2 - Medium (Usability Issues)

#### BUG-090: Client edit save is inconsistent / phone update not reliably persisting
- **Area:** Clients → Client Detail → Edit
- **Root Cause:** RC-003
- **Systemic Issue:** Optimistic update not syncing with server response, or mutation not awaited
- **Fix Strategy:**
  1. Review client update mutation and ensure await/invalidation
  2. Add success toast only after confirmed server response
  3. Verify cache invalidation triggers refetch

#### BUG-091: Spreadsheet View → Inventory grid renders blank body
- **Area:** Inventory → Spreadsheet View → Inventory tab
- **Root Cause:** RC-004 (duplicate of existing BUG-047, BUG-074)
- **Systemic Issue:** Grid data request fails or data mapping issue
- **Fix Strategy:**
  1. Debug API response for spreadsheet inventory data
  2. Verify grid component receives and renders data correctly
  3. Add loading/error states for empty data

#### BUG-092: Finance → AR/AP dashboard widgets stuck loading
- **Area:** Finance → AR/AP
- **Root Cause:** RC-004 (related to existing API-010)
- **Systemic Issue:** Accounting procedures not registered or endpoints failing
- **Fix Strategy:**
  1. Register missing `accounting.getARSummary`, `accounting.getARAging`, etc.
  2. Ensure endpoints return data or graceful empty state
  3. Add timeout handling for loading states

### Permission Blocks (RBAC Configuration)

#### BLOCKED-001: Inventory → Samples requires samples:read permission
- **Role:** Sales Manager
- **Missing Permission:** `samples:read`
- **Fix:** Add `samples:read` to `salesManagerPermissions` in `rbacDefinitions.ts`

#### BLOCKED-002: Spreadsheet View → Pick & Pack requires permission 10002
- **Role:** Sales Manager
- **Missing Permission:** Internal permission code 10002 (likely `inventory:pickpack` or similar)
- **Fix:** Identify permission 10002 mapping and add to Sales Manager role

#### BLOCKED-003: Finance → Reports blocked by permissions
- **Role:** Sales Manager
- **Missing Permission:** `accounting:reports:view`
- **Fix:** Add `accounting:reports:view` to `salesManagerPermissions` in `rbacDefinitions.ts`

---

## Dependency Graph

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FIX DEPENDENCY GRAPH                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  LAYER 1: Database/Data (Must fix first)                               │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ BUG-084 (pricing_defaults table)  ──────►  BUG-086 (order finalize) │
│  │ BUG-078 (orders.getAll)           ──────►  BUG-088 (client orders)  │
│  │ API-010 (accounting procedures)   ──────►  BUG-092 (AR/AP widgets)  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                              │                                          │
│                              ▼                                          │
│  LAYER 2: API/Backend (Depends on Layer 1)                             │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ BUG-087 (Products limit validation)    - Independent              │  │
│  │ BUG-047/074/091 (Spreadsheet grid)     - Depends on API fixes    │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                              │                                          │
│                              ▼                                          │
│  LAYER 3: Frontend/UI (Depends on Layer 2)                             │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ BUG-089 (New Invoice button)           - Independent              │  │
│  │ BUG-090 (Client edit save)             - Independent              │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                              │                                          │
│                              ▼                                          │
│  LAYER 4: RBAC/Permissions (Can fix in parallel)                       │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ BLOCKED-001 (samples:read)             - Independent              │  │
│  │ BLOCKED-002 (permission 10002)         - Independent              │  │
│  │ BLOCKED-003 (accounting:reports:view)  - Independent              │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Strategic Fix Order

### Phase 1: Unblock Revenue (P0) - Immediate
**Goal:** Fix order finalization to restore core revenue workflow

| Order | Bug ID | Task | Est. Effort | Dependencies |
|-------|--------|------|-------------|--------------|
| 1.1 | BUG-084 | Seed pricing_defaults table with default data | 1h | None |
| 1.2 | BUG-086 | Add fallback logic for missing pricing defaults | 2h | 1.1 |

**Validation:** Create and finalize a sales order successfully

### Phase 2: Restore Core Browsing (P1) - High Priority
**Goal:** Fix products and client data loading

| Order | Bug ID | Task | Est. Effort | Dependencies |
|-------|--------|------|-------------|--------------|
| 2.1 | BUG-087 | Fix products pagination validation across all endpoints | 2h | None |
| 2.2 | BUG-078 | Fix orders.getAll database query | 3h | None |
| 2.3 | BUG-088 | Add error handling to Spreadsheet Clients view | 1h | 2.2 |

**Validation:** Products page loads, Spreadsheet Clients detail works

### Phase 3: Fix UI Wiring (P1/P2) - Normal Priority
**Goal:** Restore invoice creation and client editing

| Order | Bug ID | Task | Est. Effort | Dependencies |
|-------|--------|------|-------------|--------------|
| 3.1 | BUG-089 | Add onClick handler to New Invoice button | 3h | None |
| 3.2 | BUG-090 | Fix client edit mutation and cache invalidation | 2h | None |

**Validation:** New Invoice opens creation flow, Client edits persist

### Phase 4: Fix Dashboard/Grid Issues (P2) - Normal Priority
**Goal:** Restore Finance dashboard and Spreadsheet grids

| Order | Bug ID | Task | Est. Effort | Dependencies |
|-------|--------|------|-------------|--------------|
| 4.1 | API-010 | Register missing accounting procedures | 3h | None |
| 4.2 | BUG-092 | Fix AR/AP widgets with timeout handling | 1h | 4.1 |
| 4.3 | BUG-091 | Fix Spreadsheet inventory grid rendering | 3h | None |

**Validation:** Finance dashboard loads, Spreadsheet shows data

### Phase 5: RBAC Permissions (P2) - Can Parallel
**Goal:** Enable blocked features for Sales Manager role

| Order | Bug ID | Task | Est. Effort | Dependencies |
|-------|--------|------|-------------|--------------|
| 5.1 | BLOCKED-001 | Add samples:read to Sales Manager | 30m | None |
| 5.2 | BLOCKED-002 | Add Pick & Pack permission to Sales Manager | 30m | None |
| 5.3 | BLOCKED-003 | Add accounting:reports:view to Sales Manager | 30m | None |

**Validation:** Sales Manager can access Samples, Pick & Pack, Finance Reports

---

## Consolidated Effort Estimate

| Phase | Description | Est. Effort | Priority |
|-------|-------------|-------------|----------|
| Phase 1 | Unblock Revenue | 3h | P0 - Immediate |
| Phase 2 | Restore Core Browsing | 6h | P1 - High |
| Phase 3 | Fix UI Wiring | 5h | P1/P2 - Normal |
| Phase 4 | Fix Dashboard/Grid | 7h | P2 - Normal |
| Phase 5 | RBAC Permissions | 1.5h | P2 - Parallel |
| **Total** | | **22.5h** | |

---

## Risk Register

| Risk | Severity | Mitigation |
|------|----------|------------|
| Revenue blockage (P0) | Critical | Phase 1 is highest priority |
| Data leakage from raw SQL errors | High | Phase 2.3 adds proper error handling |
| Catalog/inventory visibility | High | Phase 2 restores browsing |
| Invoicing interruption | High | Phase 3.1 wires button handler |
| Finance visibility incomplete | Medium | Phase 4 restores AR/AP |

---

## Files to Modify

### Database/Seed Scripts
- `scripts/seed-pricing.ts` - Ensure pricing defaults are seeded

### Backend (server/)
- `server/routers/orders.ts` - Fix getAll query (BUG-078)
- `server/routers/accounting.ts` - Register missing procedures (API-010)
- `server/routers/products.ts` or legacy endpoint - Add pagination validation (BUG-087)
- `server/services/pricingService.ts` - Add fallback for missing defaults (BUG-086)
- `server/services/rbacDefinitions.ts` - Add permissions for Sales Manager (BLOCKED-001/002/003)

### Frontend (client/src/)
- `client/src/pages/accounting/Invoices.tsx:225-228` - Add onClick handler (BUG-089)
- `client/src/components/clients/ClientDetail.tsx` or similar - Fix edit mutation (BUG-090)
- `client/src/pages/SpreadsheetView.tsx` or similar - Add error handling (BUG-088, BUG-091)

---

## Success Criteria

After all phases complete:

1. **Revenue Flow:** Sales orders can be created, finalized, and saved
2. **Product Browsing:** Products page loads with pagination
3. **Client Management:** Client edits persist correctly
4. **Invoice Creation:** New Invoice button opens creation flow
5. **Spreadsheet Views:** All grids render data correctly
6. **Finance Dashboard:** AR/AP widgets load with data
7. **Role Access:** Sales Manager can access Samples, Pick & Pack, Reports

---

## Related Roadmap Items

These new bugs relate to existing roadmap items:

| New Bug | Related Existing Item | Notes |
|---------|----------------------|-------|
| BUG-086 | BUG-084 | Same root cause (pricing_defaults) |
| BUG-088 | BUG-078 | Same root cause (orders query) |
| BUG-091 | BUG-047, BUG-074 | Same issue (spreadsheet grid) |
| BUG-092 | API-010 | Same root cause (accounting procedures) |

---

## Appendix: Original QA Report Mapping

| QA RowKey | Bug ID | Status |
|-----------|--------|--------|
| Sales\|Orders\|FinalizeSalesOrder\|Base | BUG-086 | FAIL (P0) |
| Inventory\|Products\|ListLoad\|Base | BUG-087 | FAIL (P1) |
| Inventory\|SpreadsheetView\|Clients\|ClientSelectDetailQuery | BUG-088 | FAIL (P1) |
| Sales\|Invoices\|NewInvoiceButton\|Base | BUG-089 | FAIL (P1) |
| Sales\|Clients\|EditClient\|PhoneUpdate | BUG-090 | FAIL (P2) |
| Inventory\|SpreadsheetView\|InventoryGrid\|Base | BUG-091 | FAIL (P2) |
| Finance\|ARAP\|Dashboard\|LoadAgingWidgets | BUG-092 | FAIL (P2) |
| Inventory\|Samples\|ListLoad\|Permission | BLOCKED-001 | BLOCKED |
| Inventory\|SpreadsheetView\|PickPack\|Permission | BLOCKED-002 | BLOCKED |
| Finance\|Reports\|Open\|Permission | BLOCKED-003 | BLOCKED |
