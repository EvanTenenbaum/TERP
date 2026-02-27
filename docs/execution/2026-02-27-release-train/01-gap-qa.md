# Phase 1 - Gap QA (Validated Against Current Code)

Date: 2026-02-27
Scope: Validate seed gaps, correct stale anchors, and add high-impact missing gaps.

## Seed Gap Validation Summary

| Seed                                                 | Result                         | Notes                                                                                       |
| ---------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------- |
| 1. Inventory filtering page-local                    | VALID                          | Filters are applied to the fetched page subset, not the full dataset.                       |
| 2. Inventory Location filter fallback text           | VALID                          | Location uses fallback string match on SKU/ID/grade.                                        |
| 3. Low-stock hardcoded (`>100`)                      | VALID                          | Hardcoded threshold in UI filter logic.                                                     |
| 4. Core flow UI not fully unified                    | VALID                          | Several core routes still mount standalone surfaces/pages outside workspace tab topology.   |
| 5. Legacy route surface remains                      | VALID                          | Legacy routes still active and referenced by navigation/tests.                              |
| 6. Non-recoverable destructive delete                | VALID (anchor drift corrected) | Delete confirmation text says non-recoverable; no user-facing restore flow in key surfaces. |
| 7. Export UX basic for large ops                     | VALID                          | Hard row cap + truncation + in-memory generation model.                                     |
| 8. QA coverage gaps in high-risk areas               | VALID                          | `describe.skip`, `it.todo`, and DB-availability skip paths still present.                   |
| 9a. `/inventory/:id` bypass pattern                  | VALID                          | Route still mounts `InventoryWorkSurface` directly.                                         |
| 9b. Spreadsheet route + flag preserves fragmentation | VALID                          | Route + nav feature flag + regression spec coverage still present.                          |
| 9c. `window.confirm` deletion inconsistency          | INVALID (stale)                | Active work-surface delete flows now use dialogs/confirm component, not `window.confirm`.   |

## Prioritized Gap Register

## GAP-01 - Inventory Filtering/Pagination Is Not Full-Dataset Accurate

- Severity: **Critical**
- User impact: Users can get incorrect result counts/pages and miss records when filters are active.
- Blast radius: Inventory browse, stock decisions, export/scoping decisions, downstream operations.
- Acceptance criteria:
  - Filtering semantics are applied server-side (or against full result set), not only page-local subsets.
  - `totalCount` and pagination metadata represent full filtered dataset.
  - `hasMore` is filter-aware and cursor/page movement is consistent under filters.
- Evidence:
  - `client/src/components/work-surface/InventoryWorkSurface.tsx:586`
  - `client/src/components/work-surface/InventoryWorkSurface.tsx:693`
  - `client/src/components/work-surface/InventoryWorkSurface.tsx:832`
  - `server/routers/inventory.ts:165`
  - `server/routers/inventory.ts:317`
  - `server/routers/inventory.ts:439`

## GAP-02 - Location Filter Is Non-Semantic Fallback Match

- Severity: **High**
- User impact: "Location" filtering can return false positives/negatives and does not align with physical location fields.
- Blast radius: Inventory operations, receiving, pick/pack readiness.
- Acceptance criteria:
  - Location filter uses semantic fields (site/zone/rack/shelf/bin) from persisted location model.
  - UI data model includes location representation from API.
  - Filter behavior is deterministic and covered by tests.
- Evidence:
  - `client/src/components/work-surface/InventoryWorkSurface.tsx:738`
  - `client/src/components/work-surface/InventoryWorkSurface.tsx:740`
  - `server/routers/inventory.ts:109`
  - `server/inventoryDb.ts:895`
  - `drizzle/schema.ts:754`

## GAP-03 - Low-Stock Rule Is Hardcoded in UI (`available > 100`)

- Severity: **High**
- User impact: Business-specific stock threshold cannot be configured and conflicts with backend threshold model.
- Blast radius: Inventory triage, replenishment prioritization, dashboard consistency.
- Acceptance criteria:
  - Low-stock threshold is configurable and sourced from a single contract (UI+API).
  - UI filter logic and backend stock-status thresholds are aligned.
- Evidence:
  - `client/src/components/work-surface/InventoryWorkSurface.tsx:705`
  - `client/src/components/work-surface/InventoryWorkSurface.tsx:707`
  - `server/routers/inventory.ts:128`

## GAP-04 - Core Flow Surfaces Are Still Fragmented From Workspace-Shell Tabs

- Severity: **High**
- User impact: Operators traverse inconsistent shells/context, increasing navigation friction and context loss.
- Blast radius: Sales, fulfillment, intake workflows.
- Acceptance criteria:
  - Core sales/procurement flow pages are reachable through consolidated workspace tabs.
  - Standalone routes are reduced to compatibility redirects where needed.
- Evidence:
  - `client/src/App.tsx:428`
  - `client/src/App.tsx:436`
  - `client/src/App.tsx:586`
  - `client/src/pages/SalesWorkspacePage.tsx:49`
  - `client/src/pages/ProcurementWorkspacePage.tsx:83`

## GAP-05 - Legacy Route Surface Area Still Active (Fragmentation Risk)

- Severity: **Medium**
- User impact: Multiple route aliases keep legacy behavior paths alive and harder to reason about.
- Blast radius: Navigation, routing tests, feature-flag complexity.
- Acceptance criteria:
  - Legacy routes are redirected/deprecated behind explicit compatibility strategy.
  - Navigation/test contracts updated to canonical routes.
- Evidence:
  - `client/src/App.tsx:529`
  - `client/src/App.tsx:606`
  - `client/src/config/navigation.ts:183`
  - `tests/e2e/specs/regression.spec.ts:27`
  - `tests/e2e/specs/regression.spec.ts:386`

## GAP-06 - Key Deletes Have No Recoverable User Flow

- Severity: **High**
- User impact: Mistaken delete actions can remove working context without immediate user-level recovery.
- Blast radius: Inventory and procurement operations.
- Acceptance criteria:
  - Delete operations include a recoverable path (undo/restore flow) with explicit time/behavior.
  - API supports safe restore semantics where soft-delete exists.
- Evidence:
  - `client/src/components/work-surface/InventoryWorkSurface.tsx:2066`
  - `client/src/components/work-surface/InventoryWorkSurface.tsx:2069`
  - `server/inventoryDb.ts:1921`
  - `client/src/components/work-surface/PurchaseOrdersWorkSurface.tsx:2014`
  - `server/routers/purchaseOrders.ts:464`

## GAP-07 - Export UX Still Uses Hard Cap + Truncation + In-Memory Build

- Severity: **Medium**
- User impact: Large exports truncate by default and may degrade UX/memory on large data sets.
- Blast radius: Reporting/export-heavy operations.
- Acceptance criteria:
  - Users receive explicit truncation metadata and can choose full export strategy when needed.
  - Export flow exposes meaningful progress/cancel states and avoids unbounded in-memory growth.
- Evidence:
  - `client/src/hooks/work-surface/useExport.ts:93`
  - `client/src/hooks/work-surface/useExport.ts:274`
  - `client/src/hooks/work-surface/useExport.ts:280`
  - `client/src/hooks/work-surface/useExport.ts:300`
  - `client/src/hooks/work-surface/useExport.ts:421`

## GAP-08 - High-Risk QA Coverage Gaps Remain

- Severity: **High**
- User impact: Critical behavior can regress undetected.
- Blast radius: Calendar, sequence generation, data integrity.
- Acceptance criteria:
  - Re-enable or replace skipped/todo suites with actionable automated coverage.
  - DB-dependent integrity tests fail-fast with actionable setup guidance rather than silent skip patterns.
- Evidence:
  - `client/src/components/calendar/EventFormDialog.test.tsx:192`
  - `server/tests/sequenceDb.test.ts:18`
  - `tests/integration/data-integrity.test.ts:28`
  - `tests/integration/data-integrity.test.ts:42`

## GAP-09 - Inventory Detail Route Bypasses Workspace Pattern

- Severity: **Medium**
- User impact: Detail views bypass tab-state/telemetry patterns used by workspace shell.
- Blast radius: Inventory navigation consistency.
- Acceptance criteria:
  - `/inventory/:id` follows workspace-shell pattern or routes via workspace-managed detail context.
- Evidence:
  - `client/src/App.tsx:289`

## GAP-10 - Inventory Sort Mapping Is Semantically Incorrect

- Severity: **Medium**
- User impact: Sorting by `grade` and `unitCogs` does not actually sort by those fields.
- Blast radius: Inventory list analysis and operator trust.
- Acceptance criteria:
  - Sort contracts map each column to matching field semantics end-to-end.
- Evidence:
  - `client/src/components/work-surface/InventoryWorkSurface.tsx:562`
  - `client/src/components/work-surface/InventoryWorkSurface.tsx:573`
  - `server/routers/inventory.ts:92`

## GAP-11 - Purchase Order Soft-Deleted Rows Are Not Explicitly Excluded in List Queries

- Severity: **Critical**
- User impact: Deleted POs may continue appearing in list/getAll responses.
- Blast radius: Procurement UX, deletion trust, reporting integrity.
- Acceptance criteria:
  - `purchaseOrders.list/getAll/getById` consistently exclude soft-deleted rows by default.
  - Optional include-deleted mode (if needed) is explicit and audited.
- Evidence:
  - `server/routers/purchaseOrders.ts:100`
  - `server/routers/purchaseOrders.ts:352`
  - `server/routers/purchaseOrders.ts:464`

## Risk Summary

- Critical: 2 (`GAP-01`, `GAP-11`)
- High: 4 (`GAP-02`, `GAP-03`, `GAP-06`, `GAP-08`)
- Medium: 5 (`GAP-04`, `GAP-05`, `GAP-07`, `GAP-09`, `GAP-10`)
