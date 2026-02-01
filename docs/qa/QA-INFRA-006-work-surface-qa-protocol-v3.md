# QA-INFRA-006 Inventory Surfacing QA Protocol v3.0 (Work Surface Alignment)

## Phase 0: Intake & Scope

### A) Classify the Work

- **Type:** B — Feature Spec / UX Flow (inventory surfacing plan updated to use Work Surface UI and global UX improvements).

### B) Autonomy Mode

- **Mode:** 🟡 **STRICT** — Inventory surfacing touches core data/visibility and Work Surface routing.

### C) Blast Radius Map (Dependency Map)

```
[Inventory Surfacing Plan Update]
    ↓ calls/relies on
[Client UI Surfaces]
  - Inventory (legacy) → client/src/pages/Inventory.tsx
  - Inventory (Work Surface) → client/src/components/work-surface/InventoryWorkSurface.tsx
  - Work Surface routing → client/src/App.tsx
  - Order creation flow (Work Surface) → client/src/components/work-surface/golden-flows/OrderCreationFlow.tsx
  - Batch selection dialog → client/src/components/orders/BatchSelectionDialog.tsx
  - Dashboard widgets (KPI/Snapshot/Aging) → client/src/components/dashboard/*
  - Sales sheet inventory browser → client/src/pages/SalesSheetCreatorPage.tsx
  - Analytics inventory metrics → client/src/pages/AnalyticsPage.tsx
  - Spreadsheet view inventory tab → client/src/pages/SpreadsheetViewPage.tsx
  - VIP portal live catalog config → client/src/components/vip-portal/LiveCatalogConfig.tsx
    ↓ calls
[API Routers]
  - inventory router → server/routers/inventory.ts
  - dashboard router → server/routers/dashboard.ts
  - sales sheets router → server/routers/salesSheets.ts
    ↓ calls
[DB/Services]
  - inventoryDb, dashboardDb, arApDb, salesSheetsDb (via routers)

[Reverse Dependencies]
  - Inventory totals drive dashboard KPIs and analytics
  - Inventory availability drives order creation + sales sheets
  - VIP portal catalog visibility depends on inventory availability
```

---

## Phase 1: Five-Lens Deep Analysis

### Lens 1: Static Pattern Scan (Breadth)

**Commands executed (rg equivalents):**

- `rg -n "ctx\.user\?\.id \|\| 1" <scoped files>` → **No matches**
- `rg -n "ctx\.user\?\.id \?\? 1" <scoped files>` → **No matches**
- `rg -n "input\.createdBy|input\.userId" <scoped files>` → **No matches**
- `rg -n "db\.query\.vendors" <scoped files>` → **No matches**
- `rg -n ": any\b" <scoped files>` → **Matches found** (see Issue QA-WS-002)
- `rg -n "db\.delete\(" <scoped files>` → **No matches**
- `rg -n "\.catch\(\(\) =>|\.catch\(e =>" <scoped files>` → **No matches**

**Incomplete code patterns:**

- `rg -n "TODO|FIXME|XXX|TBD|HACK" <scoped files>` → **No matches**
- `rg -n "throw new Error\(.[^)]*\)" <scoped files>` → **Matches found** (see Issue QA-WS-003)
- `rg -n "console\.log|console\.error" <scoped files>` → **No matches**
- `rg -n "return \[\]\s*$|return \{\}\s*$" <scoped files>` → **No matches**
- `rg -n "// @ts-ignore|// @ts-expect-error" <scoped files>` → **No matches**

**TERP-specific violations:**

- `rg -n "vendorId|vendor_id" <scoped files>` → **Matches found** (see Issue QA-WS-001)
- `rg -n "customerId\b" <scoped files>` → **Matches found** (see Issue QA-WS-004)
- `rg -n "mysqlEnum\(" <scoped files>` → **No matches**

---

### Lens 2: Execution Path Tracing (Depth)

#### 2.1 Entry Point Inventory

| Entry Point                              | Type        | Auth Required?  | Inputs                                       |
| ---------------------------------------- | ----------- | --------------- | -------------------------------------------- |
| Inventory page (legacy)                  | UI route    | Yes             | Filters, search, pagination                  |
| Inventory Work Surface                   | UI route    | Yes             | Grid edits, filters, inspector selection     |
| Work Surface order creation              | UI workflow | Yes             | Intake ID, selected batches, pricing, client |
| Batch selection dialog                   | UI modal    | Yes             | Product ID, quantity selection               |
| Dashboard KPIs/widgets                   | UI widgets  | Yes             | Time filters (implicit)                      |
| Sales sheet inventory browser            | UI page     | Yes             | Client selection                             |
| Analytics inventory metrics              | UI page     | Yes             | Module selection                             |
| Spreadsheet view inventory tab           | UI page     | Yes (flagged)   | Feature flag state                           |
| VIP portal catalog config                | UI page     | Yes (admin)     | Client ID, catalog config                    |
| inventory.getEnhanced                    | tRPC query  | Yes             | intakeId, filters, pagination                |
| inventory.getAvailableForProduct         | tRPC query  | Yes             | productId, minQuantity                       |
| inventory.getAgingSummary                | tRPC query  | Yes             | none (server-filtered)                       |
| dashboard.getKpis / getInventorySnapshot | tRPC query  | Yes             | time ranges (server derived)                 |
| salesSheets.getInventory / getByToken    | tRPC query  | Yes (protected) | clientId or share token                      |

#### 2.2 Branch Coverage Analysis (Key Functions)

1. **inventory.getAvailableForProduct** (server/routers/inventory.ts)

- Branch A: DB connection present → query batches → filter by LIVE → calculate availability.
- Branch B: DB connection missing → throws `Database not available` (Issue QA-WS-003).

2. **inventory.getEnhanced** (server/routers/inventory.ts)

- Branch A: intakeId provided → filters by intake + pagination.
- Branch B: intakeId omitted → default list search across inventory.
- Branch C: filter sets (status/category/availability) applied → filter results.

3. **dashboard.getKpis / getInventorySnapshot** (server/routers/dashboard.ts)

- Branch A: ctx.user present → normal execution.
- Branch B: ctx.user missing → throws Unauthorized (Issue QA-WS-003).
- Branch C: admin-only role checks for layout config → throws Forbidden (Issue QA-WS-003).

4. **salesSheets.getByToken** (server/routers/salesSheets.ts)

- Branch A: token resolves to sheet → increments view count, returns sanitized data.
- Branch B: sheet not found → throws `Sales sheet not found or link has expired` (Issue QA-WS-003).

#### 2.3 Error Path Tracing (Representative Operations)

| Operation                                   | Can Fail? | Error Handled? | User Sees What? | State Left How?            |
| ------------------------------------------- | --------- | -------------- | --------------- | -------------------------- |
| DB query (inventory.getAvailableForProduct) | Yes       | Throw Error    | Generic error   | No write                   |
| Dashboard layout save/load                  | Yes       | Throw Error    | Generic error   | No write                   |
| Sales sheet getByToken                      | Yes       | Throw Error    | Not found       | View count not incremented |
| VIP portal catalog queries                  | Yes       | Query error    | UI error state  | No write                   |

---

### Lens 3: Data Flow Analysis (State)

#### 3.1 Input → Transform → Output (Sample Flows)

**inventory.getAvailableForProduct**

- INPUT: productId, minQuantity
- TRANSFORMS: query LIVE batches → compute availableQty (onHand - reserved - hold - quarantine) → filter by minQuantity
- OUTPUT: list of available batches with computed availability

**inventory.getAgingSummary**

- INPUT: none
- TRANSFORMS: group inventory by age brackets → filter sellable statuses
- OUTPUT: aging buckets + totals

**dashboard.getKpis**

- INPUT: none
- TRANSFORMS: aggregate totals from inventory + orders → compute percent changes
- OUTPUT: KPI summary

#### 3.2 State Mutation Audit

| State                 | Where Modified         | Conditions  | Rollback Possible?     |
| --------------------- | ---------------------- | ----------- | ---------------------- |
| salesSheets.viewCount | salesSheets.getByToken | valid token | Yes (manual decrement) |

#### 3.3 Invariant Verification

| Invariant                     | How Verified                              | Status                                         |
| ----------------------------- | ----------------------------------------- | ---------------------------------------------- |
| Inventory >= 0                | Check availability calc uses max(0, ...)  | **Partial** (no end-to-end verification in UI) |
| Order total = sum(line items) | Sales sheet conversion uses pricing rules | **Unverified** in Work Surface flows           |
| Soft delete only              | No delete patterns in scope               | **Verified** (no db.delete)                    |
| Actor attribution present     | Protected procedures                      | **Partial** (errors for missing ctx.user)      |

---

### Lens 4: Adversarial Scenario Generation (Attack)

**20+ scenarios generated (execution marked):**

| #   | Scenario                                                      | Expected                     | Attempted?                       |
| --- | ------------------------------------------------------------- | ---------------------------- | -------------------------------- |
| 1   | Null intakeId in inventory.getEnhanced                        | Graceful default list        | Not executed (no running server) |
| 2   | minQuantity=0 in getAvailableForProduct                       | Clamp to >=1 or allow        | Not executed                     |
| 3   | minQuantity=-1                                                | Reject                       | Not executed                     |
| 4   | productId=0                                                   | 400 or empty                 | Not executed                     |
| 5   | productId=MAX_INT                                             | Empty                        | Not executed                     |
| 6   | Product has all qty reserved                                  | availableQty=0, filtered out | Not executed                     |
| 7   | Inventory batch with negative onHand                          | Clamp to 0                   | Not executed                     |
| 8   | Aging summary with future createdAt                           | Bucket into 0-7 days         | Not executed                     |
| 9   | Duplicate request for getAvailableForProduct                  | Idempotent                   | Not executed                     |
| 10  | Rapid toggle Work Surface flag                                | UI stable; no stale data     | Not executed                     |
| 11  | Work Surface order creation with empty client list            | Show empty state             | Not executed                     |
| 12  | Batch selection with quantity > available                     | Validation error             | Not executed                     |
| 13  | Sales sheet share token expired                               | 404 message                  | Not executed                     |
| 14  | VIP portal list contains 10MB strings                         | Reject/limit                 | Not executed                     |
| 15  | SQL injection payload in search                               | Escaped                      | Not executed                     |
| 16  | Unicode/RTL in batch name                                     | Render correctly             | Not executed                     |
| 17  | Concurrent edits on Work Surface grid                         | Conflict dialog              | Not executed                     |
| 18  | Catalog config toggles while list loads                       | UI consistent                | Not executed                     |
| 19  | Dashboard drill-down to inventory when flag off               | Fallback to legacy UI        | Not executed                     |
| 20  | Spreadsheet view flag enabled but no data                     | Empty state shown            | Not executed                     |
| 21  | Work Surface keyboard shortcut conflicts with Command Palette | Consistent action            | Not executed                     |
| 22  | VIP portal admin without permissions                          | 403                          | Not executed                     |

**Execution note:** No runtime environment was started in this session. Scenarios are documented for local/CI execution.

---

### Lens 5: Integration & Blast Radius (Ripple Effects)

#### 5.1 Contract Verification

| Caller                  | Callee                                 | Contract                        | Validated?             |
| ----------------------- | -------------------------------------- | ------------------------------- | ---------------------- |
| Inventory UI            | inventory.getEnhanced                  | Query schema + response shape   | **Static review only** |
| Work Surface order flow | inventory.getEnhanced                  | Response includes batches/items | **Static review only** |
| Dashboard widgets       | dashboard.getInventorySnapshot/getKpis | Shape + totals                  | **Static review only** |
| Sales sheets UI         | salesSheets.getInventory               | Pricing fields + availability   | **Static review only** |
| VIP portal config       | liveCatalog endpoints                  | Items + config                  | **Static review only** |

#### 5.2 Side Effect Inventory

| Side Effect             | When          | Reversible? | Failure Mode         |
| ----------------------- | ------------- | ----------- | -------------------- |
| salesSheets view count  | getByToken    | Yes         | Overcount if retries |
| inventory seed (manual) | seed mutation | Yes         | Duplicates if rerun  |

#### 5.3 Downstream Impact Analysis (for P0/P1 Issues)

- **P0: vendorId usage in inventory router** → misaligned party model → incorrect joins → missing inventory batches for vendors → downstream failures in orders, sales sheets, and dashboards.
- **P1: customerId usage in dashboard** → inconsistent naming with clients → incorrect joins/labels → incorrect dashboard analytics and decision-making.
- **P0: any types in Work Surface/VIP portal** → type safety bypass → runtime mismatches in inventory selection and VIP catalog rendering → potential UI breakage.

---

## Phase 2: Verification Execution

**Mandatory commands executed:**

- `pnpm typecheck` → ✅ PASS
- `pnpm check` → ✅ PASS
- `pnpm lint` → ❌ FAIL (repo-wide lint violations unrelated to this doc-only change)
- `pnpm test` → ❌ FAIL (DB connection refused in comments tests; jest globals import in data-integrity test)
- `pnpm build` → ✅ PASS (warnings: VITE_APP_TITLE unset, large chunks)

**Status:** **UNVERIFIED** (lint + tests failed)

---

## Phase 3: Issue Documentation

### P0 BLOCKER

═══════════════════════════════════════════════════════════════
ISSUE: QA-WS-001 [P0 BLOCKER]
═══════════════════════════════════════════════════════════════

WHAT: Deprecated `vendorId` surfaced in inventory router (Party Model violation)

WHERE:
File: server/routers/inventory.ts
Lines: 1309-1334
Function: getBatchesByVendor

EVIDENCE:

- `input(z.object({ vendorId: z.number() }))`
- `inventoryDb.getBatchesByVendor(input.vendorId)`

WHY IT BREAKS:
Party model requires `clientId` / `supplierClientId`. Using `vendorId` risks incorrect joins and missing inventory for suppliers, leading to empty selection lists in order workflows and inventory views.

REPRODUCTION:

1. Call inventory.getBatchesByVendor with vendorId on a client-only dataset.
2. Observe empty or mismatched results.

BLAST RADIUS:

- Direct: Inventory vendor lookups
- Downstream: Order creation, sales sheets, dashboard vendor-based filters

FIX:

- Replace `vendorId` with `supplierClientId` and align inventoryDb query to clients table.

VERIFY FIX:

- Add integration test for vendor lookup using client/supplier party model.

═══════════════════════════════════════════════════════════════

═══════════════════════════════════════════════════════════════
ISSUE: QA-WS-002 [P0 BLOCKER]
═══════════════════════════════════════════════════════════════

WHAT: `any` types in inventory-adjacent Work Surface and VIP portal UI bypass type safety

WHERE:
File: client/src/components/work-surface/golden-flows/OrderCreationFlow.tsx
Lines: 293, 394, 582-613, 596
Function: OrderCreationFlow / step components

File: client/src/components/vip-portal/LiveCatalogConfig.tsx
Lines: 469, 598, 654, 694
Function: LiveCatalogConfig / InterestListDetailModal

File: server/routers/dashboard.ts
Lines: 801-808
Function: getTotalDebt

File: server/routers/salesSheets.ts
Lines: 347-348
Function: getByToken

EVIDENCE:

- `value: any`, `clients: any[]`, `(item: any) => ...`

WHY IT BREAKS:
`any` bypasses compile-time guarantees. Inventory flows that rely on typed data (batch selection, client selection, sales sheet items) can silently accept invalid shapes and render incorrect quantities/prices.

REPRODUCTION:

1. Return malformed item shape (missing quantity) in salesSheets.getByToken.
2. UI renders without compile-time warning and may crash at runtime.

BLAST RADIUS:

- Direct: Work Surface order creation, VIP portal catalog lists
- Downstream: Orders, inventory selection, client pricing

FIX:

- Replace `any` with explicit interfaces/types and safe guards for response shapes.

VERIFY FIX:

- Add unit tests validating response typing for Work Surface data shapes.

═══════════════════════════════════════════════════════════════

### P1 MAJOR

═══════════════════════════════════════════════════════════════
ISSUE: QA-WS-003 [P1 MAJOR]
═══════════════════════════════════════════════════════════════

WHAT: Stopgap `throw new Error` patterns in inventory/dashboard flows bypass standardized error handling

WHERE:
File: server/routers/dashboard.ts
Lines: 276-360
Function: getLayout/saveLayout/resetLayout/getRoleDefault/saveRoleDefault/getKpiConfig

File: server/routers/inventory.ts
Lines: 839-841
Function: getAvailableForProduct

File: server/routers/salesSheets.ts
Lines: 336-337
Function: getByToken

EVIDENCE:

- `throw new Error("Unauthorized")`
- `throw new Error("Database not available")`

WHY IT BREAKS:
Generic errors may not map cleanly to standardized tRPC error codes, leading to inconsistent UI error states across Work Surfaces.

REPRODUCTION:

1. Call endpoints without auth or DB availability.
2. Observe generic error messaging without consistent UI handling.

BLAST RADIUS:

- Direct: Dashboard configuration, inventory availability, sales sheet sharing
- Downstream: UI error handling and UX consistency

FIX:

- Replace `throw new Error` with `TRPCError` or standardized error utility.

VERIFY FIX:

- Add tests asserting standardized error codes and user-friendly messages.

═══════════════════════════════════════════════════════════════

═══════════════════════════════════════════════════════════════
ISSUE: QA-WS-004 [P1 MAJOR]
═══════════════════════════════════════════════════════════════

WHAT: `customerId` naming persists in dashboard data types and aggregations (clientId should be canonical)

WHERE:
File: server/routers/dashboard.ts
Lines: 101-130, 399-476
Function: getSalesByClient/getCashCollected

EVIDENCE:

- Interfaces and reducers keyed on `customerId`

WHY IT BREAKS:
Party model enforces `clientId` as canonical. Continued usage of `customerId` risks confusion and wrong joins when shared across modules.

REPRODUCTION:

1. Compare client name resolution in dashboard widgets with party model.
2. Observe inconsistent naming and higher chance of mis-joins.

BLAST RADIUS:

- Direct: Dashboard analytics
- Downstream: Customer reporting, AR/AP decisions

FIX:

- Rename to `clientId` and map field names at query boundary.

VERIFY FIX:

- Add test to ensure client mapping uses canonical ID fields.

═══════════════════════════════════════════════════════════════

---

## Phase 4: Completeness Checklist

- [x] **Lens 1 Complete**: All pattern scans run, matches documented
- [x] **Lens 2 Complete**: Entry points, branches, error paths documented
- [x] **Lens 3 Complete**: Data flow + state mutation audit documented
- [x] **Lens 4 Complete**: 20+ adversarial scenarios documented
- [x] **Lens 5 Complete**: Integration boundaries + blast radius mapped
- [ ] **Verification Run**: Lint/tests failed → **UNVERIFIED**
- [x] **Nothing Skipped**: Documented all match findings

---

## Phase 5: Required Output

### 1. Executive Summary

QA COMPLETE: **NO**
VERDICT: **NO-SHIP**
ISSUES FOUND: 2 P0, 2 P1, 0 P2, 0 P3
LENSES COMPLETED: **[1,2,3,4,5]**
CONFIDENCE: **MEDIUM** — Static analysis complete, runtime verification blocked by failing lint/tests.

### 2. Verification Results

VERIFICATION RESULTS
════════════════════
TypeScript: ✅ PASS
Lint: ❌ FAIL (repo-wide lint violations)
Tests: ❌ FAIL (comments DB connection refused; data-integrity jest globals import)
Build: ✅ PASS (warnings about VITE_APP_TITLE + chunk sizes)
E2E: ⬜ N/A
Deployment: ⬜ N/A

### 3. Issue Ledger

(See Issue Documentation above.)

### 4. Lens Summaries

- **Lens 1**: Found `any`, `vendorId`, `customerId`, and stopgap errors. No forbidden `ctx.user?.id || 1` patterns.
- **Lens 2**: Mapped entry points for legacy + Work Surface inventory flows; error paths rely on generic throws.
- **Lens 3**: Identified one state mutation (sales sheet view count) and partial invariant coverage.
- **Lens 4**: 22 adversarial scenarios documented; execution deferred without runtime env.
- **Lens 5**: Contract boundaries traced; downstream impact documented for P0/P1 issues.

### 5. Risk Register (STRICT mode)

| Risk                                    | Likelihood | Impact | Mitigation                             | Monitoring              |
| --------------------------------------- | ---------- | ------ | -------------------------------------- | ----------------------- |
| Party model drift (vendorId/customerId) | High       | High   | Replace with clientId/supplierClientId | Inventory/UI error logs |
| Type safety bypass in Work Surfaces     | Medium     | High   | Replace `any` with strict types        | Runtime error tracking  |
| Generic errors in inventory/dashboard   | Medium     | Medium | Standardize TRPC errors                | UI error monitoring     |

### 6. Rollback Plan (STRICT mode)

IF: Work Surface alignment or inventory surfacing tests regress production data surfaces
THEN:

1. Disable Work Surface flags for Inventory/Orders
2. Revert to legacy Inventory UI paths
   VERIFY: Inventory list, dashboard snapshot, and order batch selection load without errors.
