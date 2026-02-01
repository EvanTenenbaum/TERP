# Inventory Surfacing E2E Plan

## Objective

Provide a comprehensive, deterministic end-to-end (E2E) verification plan ensuring inventory data surfaces consistently across all UI and API touchpoints while minimizing changes to the existing codebase outside of inventory data services.

## Scope: Inventory Surfacing Locations

The plan covers the following inventory surfaces (UI + API):

1. **Inventory module (primary list + details, legacy + Work Surface)**
   - UI (legacy): Inventory page uses the enhanced inventory API, filtering, pagination, and export flows. See `client/src/pages/Inventory.tsx`.【F:client/src/pages/Inventory.tsx†L1-L220】
   - UI (standard Work Surface): Inventory Work Surface provides the standardized, keyboard-first surface for inventory list + detail interactions and is routed behind the Work Surface flag in `App.tsx`.【F:client/src/components/work-surface/InventoryWorkSurface.tsx†L1-L360】【F:client/src/App.tsx†L52-L188】
   - API: `inventory.getEnhanced`, `inventory.list`, `inventory.batch`, and supporting endpoints in `server/routers/inventory.ts`.【F:server/routers/inventory.ts†L1-L220】

2. **Dashboard inventory KPIs and widgets**
   - KPI row uses `inventoryValue` and `lowStockCount` to link back to `/inventory`.【F:client/src/components/dashboard/KpiSummaryRow.tsx†L1-L138】
   - Inventory Snapshot widget uses `dashboard.getInventorySnapshot` and links to filtered inventory by category.【F:client/src/components/dashboard/widgets-v2/InventorySnapshotWidget.tsx†L1-L151】
   - Aging Inventory widget uses `inventory.getAgingSummary` and deep-links to filtered inventory views by age bracket.【F:client/src/components/dashboard/widgets-v2/AgingInventoryWidget.tsx†L1-L220】
   - API: `dashboard.getInventorySnapshot` and KPI inventory stats from `dashboard.getKpis` (inventory stats sourced from `inventoryDb.getDashboardStats`).【F:server/routers/dashboard.ts†L150-L240】【F:server/routers/dashboard.ts†L700-L760】
   - API: `inventory.getAgingSummary` is the backing source for the aging widget and filters sellable inventory statuses for consistency.【F:server/routers/inventory.ts†L470-L620】

3. **Sales Sheets / Sales Inventory Browser**
   - UI: Sales sheet creator loads inventory with pricing per client for selection workflows.【F:client/src/pages/SalesSheetCreatorPage.tsx†L1-L200】
   - API: `salesSheets.getInventory` returns inventory with pricing for the selected client.【F:server/routers/salesSheets.ts†L60-L120】

4. **Order creation / batch selection**
   - UI (legacy): Batch selection dialog surfaces available inventory per product and validates availability/quantity selection.【F:client/src/components/orders/BatchSelectionDialog.tsx†L1-L220】
   - UI (Work Surface): Order creation flow uses Work Surface patterns for high-frequency workflows; inventory selection should be verified when Work Surface order flows are enabled.【F:client/src/components/work-surface/golden-flows/OrderCreationFlow.tsx†L1-L220】
   - API: `inventory.getAvailableForProduct` filters inventory batches by product and LIVE status with availability calculations.【F:server/routers/inventory.ts†L800-L930】

5. **Analytics / inventory metrics**
   - UI: Analytics page shows inventory items metric and provides inventory-specific export tab.【F:client/src/pages/AnalyticsPage.tsx†L130-L260】

6. **Spreadsheet view (inventory grid)**
   - UI: Spreadsheet view includes an inventory grid tab accessible via feature flag `spreadsheet-view`.【F:client/src/pages/SpreadsheetViewPage.tsx†L1-L120】

7. **VIP Portal (Live Catalog visibility)**
   - UI: Live catalog config controls inventory visibility for VIP clients and should reflect inventory availability semantics (quantity, grade, etc.).【F:client/src/components/vip-portal/LiveCatalogConfig.tsx†L120-L220】

8. **Work Surface feature flag gating**
   - UI: Work Surface routing is gated by `WorkSurfaceGate` and module-level flags such as `WORK_SURFACE_INVENTORY`; E2E must validate both the fallback legacy UI and Work Surface UI states.【F:client/src/App.tsx†L52-L188】

9. **Existing E2E baselines**
   - Inventory CRUD E2E baseline already exists and can be extended for cross-surface consistency checks.【F:tests-e2e/inventory-crud.spec.ts†L1-L200】
   - Dashboard workflow E2E baseline verifies widget visibility and navigation to inventory from dashboard flows.【F:tests-e2e/workflows-dashboard.spec.ts†L1-L200】

---

## Strategy: Deterministic Inventory Data Setup

**Goal:** use deterministic fixtures to seed inventory data once and validate all surfaces against it. This avoids flaky tests and reduces changes to existing code.

### Data fixture requirements

Define a stable dataset that includes:

- Batches across key statuses: `LIVE`, `PHOTOGRAPHY_COMPLETE`, `ON_HOLD`, `QUARANTINED`, `SOLD_OUT`.
- At least two categories/subcategories for dashboard snapshot and inventory filters.
- Inventory with aging variance (e.g., 3, 10, 20, 45 days) to populate the aging widget brackets.
- At least one product with multiple batches to validate batch selection allocation in orders.
- At least one client with pricing to validate sales sheets inventory.
- At least one VIP client with live catalog enabled and visibility flags for quantity/grade.

**Recommended approach (minimal touches):**

1. Reuse existing seeding helpers or fixtures in `tests-e2e/fixtures` and only extend them if required.
2. Prefer test-only data creation via existing intake endpoints (avoid schema changes).
3. If seed extensions are required, keep them isolated to test fixtures (no production behavior changes).

---

## Test Matrix (Surface-by-Surface)

### 1) Inventory Module (Primary)

**Goal:** Verify the primary inventory surface matches seed data and calculates availability/aging correctly.

- **Setup:** Seed baseline inventory dataset.
- **API assertions:**
  - `inventory.getEnhanced` returns expected items, availability, and pagination metadata.【F:server/routers/inventory.ts†L1-L220】
  - Filtered results match the status and category filters used in the UI.
- **UI assertions:**
  - Inventory list displays seeded items with correct on-hand, reserved, and available values.【F:client/src/pages/Inventory.tsx†L1-L220】
  - Export CSV includes expected columns and seeded values (batch ID, SKU, vendor, on-hand).【F:client/src/pages/Inventory.tsx†L150-L220】

### 2) Dashboard KPIs + Snapshot + Aging

**Goal:** Validate dashboard inventory numbers and drill-down navigation align with inventory module data.

- **API assertions:**
  - `dashboard.getKpis` inventory values reflect the same total inventory value used in snapshot stats.【F:server/routers/dashboard.ts†L150-L240】
  - `dashboard.getInventorySnapshot` categories sum to total units and total value.【F:server/routers/dashboard.ts†L700-L760】
  - `inventory.getAgingSummary` counts and values only include sellable inventory and align with seeded aging data.【F:server/routers/inventory.ts†L470-L620】
- **UI assertions:**
  - KPI inventory value matches snapshot total value within rounding tolerance.【F:client/src/components/dashboard/KpiSummaryRow.tsx†L1-L138】
  - Snapshot category click navigates to filtered inventory list and shows matching items.【F:client/src/components/dashboard/widgets-v2/InventorySnapshotWidget.tsx†L1-L151】
  - Aging widget drill-down filters inventory by age bracket and matches seeded aging buckets.【F:client/src/components/dashboard/widgets-v2/AgingInventoryWidget.tsx†L1-L220】

### 3) Sales Sheets Inventory

**Goal:** Ensure sales sheets show the same inventory availability and pricing rules as the core inventory list.

- **API assertions:**
  - `salesSheets.getInventory` returns inventory rows for selected client, including pricing and availability fields.【F:server/routers/salesSheets.ts†L60-L120】
- **UI assertions:**
  - Inventory browser loads after selecting a client and allows adding items to the sales sheet preview.【F:client/src/pages/SalesSheetCreatorPage.tsx†L1-L200】

### 4) Order Creation / Batch Selection

**Goal:** Validate available inventory appears in batch selection and reflects availability calculations from inventory data.

- **API assertions:**
  - `inventory.getAvailableForProduct` only returns LIVE batches with sufficient available quantity and uses correct availability calculation.【F:server/routers/inventory.ts†L800-L930】
- **UI assertions:**
  - Batch selection dialog lists seeded batches with accurate available quantities and cost data.【F:client/src/components/orders/BatchSelectionDialog.tsx†L1-L220】

### 5) Analytics Inventory Metrics

**Goal:** Verify analytics inventory metrics match inventory totals and exports are consistent.

- **UI assertions:**
  - Inventory items metric on Analytics page matches total inventory items from inventory list within expected tolerance.【F:client/src/pages/AnalyticsPage.tsx†L130-L260】
  - Inventory export succeeds and includes seeded inventory data fields.【F:client/src/pages/AnalyticsPage.tsx†L130-L200】

### 6) Spreadsheet View Inventory Grid

**Goal:** Ensure spreadsheet inventory tab shows consistent data when feature flag is enabled.

- **UI assertions:**
  - Inventory tab renders grid rows corresponding to seeded inventory data after enabling `spreadsheet-view` flag.【F:client/src/pages/SpreadsheetViewPage.tsx†L1-L120】

### 7) VIP Portal Live Catalog

**Goal:** Ensure live catalog configuration and inventory visibility reflect expected data exposure rules.

- **UI assertions:**
  - Live catalog configuration toggles and attribute visibility are respected for target VIP client settings.【F:client/src/components/vip-portal/LiveCatalogConfig.tsx†L120-L220】
  - Client-side VIP catalog surfaces the correct inventory subset and attributes (to be verified via existing VIP portal E2E specs).

---

## Standard Work Surface UI Alignment (Global Improvements)

These proposals apply globally to Work Surface-driven inventory surfaces (Inventory Work Surface + Work Surface order creation) to keep the UI consistent with the standard Work Surface specification while minimizing code churn.

1. **Adopt the canonical Work Surface shell everywhere inventory is edited.**
   - Ensure the Inventory Work Surface and Work Surface order creation flows use the standard layout: context header, primary grid, inspector panel, and status bar (single visible shell across inventory-related workflows).【F:docs/specs/ui-ux-strategy/WORK_SURFACE_HANDOFF_REPORT.md†L120-L176】

2. **Normalize keyboard contracts for inventory surfaces.**
   - Inventory Work Surface and order creation grids must adhere to the standard keyboard contract (Tab/Shift+Tab, Enter, Esc, Cmd/Ctrl+K) to avoid inconsistent row entry behavior across surfaces.【F:docs/specs/ui-ux-strategy/WORK_SURFACE_HANDOFF_REPORT.md†L186-L214】

3. **Align save-state and validation timing feedback.**
   - Standardize the save-state indicator and validation timing across inventory-related Work Surfaces (Saved/Saving/Needs attention), so users see consistent feedback regardless of module.【F:docs/specs/ui-ux-strategy/WORK_SURFACE_HANDOFF_REPORT.md†L226-L252】

4. **Treat dashboard widgets as Review Surfaces.**
   - Keep dashboard inventory widgets in the Review Surface model (filter/export + drill-down) so Work Surface edits remain focused on inventory modules, reducing accidental data edits from analytics views.【F:docs/specs/ui-ux-strategy/WORK_SURFACE_HANDOFF_REPORT.md†L158-L182】

---

## Reliability & Robustness Tactics

1. **Deterministic data:** Use fixed seeded inventory data with known timestamps/quantities for predictable aging and value calculations.
2. **Single source of truth:** Tie assertions to API responses (e.g., `inventory.getEnhanced`) and compare UI surfaces against those responses.
3. **Tolerance rules:** Allow minor rounding differences for currency and unit formatting, but ensure totals are consistent within defined tolerance (< 1%).
4. **Retry logic only on network:** Avoid arbitrary waits; use `waitForResponse` and specific selectors for data rendering to reduce flakes.
5. **Isolation:** Clean up or reset test data at suite boundaries to prevent cross-test pollution.

---

## Minimal Code Touches Required

- **Primary expectation:** no production code changes unless issues exist in inventory data services.
- **Allowed changes:** test fixtures and E2E specs (e.g., extending `tests-e2e/inventory-crud.spec.ts` and dashboard workflows).【F:tests-e2e/inventory-crud.spec.ts†L1-L200】【F:tests-e2e/workflows-dashboard.spec.ts†L1-L200】
- **If production fixes are required:** only touch inventory data services and their direct API endpoints (e.g., `server/routers/inventory.ts`, `server/routers/dashboard.ts`).【F:server/routers/inventory.ts†L1-L220】【F:server/routers/dashboard.ts†L150-L240】

---

## Risk Register

- **Risk:** Schema drift or missing columns cause inventory queries to fail in downstream surfaces.
  - **Mitigation:** Ensure schema validation tests run in CI and use deterministic fixtures to catch query failures early.
- **Risk:** Aging widget filters sellable inventory only; other screens may show broader statuses leading to mismatched totals.
  - **Mitigation:** Document and assert which statuses each surface includes; align to `SELLABLE_BATCH_STATUSES` rules where intended.【F:server/routers/inventory.ts†L470-L620】
- **Risk:** Feature flag gating (Spreadsheet view) can hide surfaces and cause missing coverage.
  - **Mitigation:** Ensure feature flags are explicitly enabled for test runs and assert the flag state before assertions.【F:client/src/pages/SpreadsheetViewPage.tsx†L1-L120】

---

## Rollback Plan

If new E2E coverage or fixtures introduce instability:

1. Revert the new E2E spec files and fixture changes (test-only impact).
2. Re-run the baseline inventory and dashboard E2E specs to validate existing coverage still passes.【F:tests-e2e/inventory-crud.spec.ts†L1-L200】【F:tests-e2e/workflows-dashboard.spec.ts†L1-L200】
3. Document the specific instability and reintroduce tests incrementally.

---

## Next Steps

1. Approve this plan and confirm the required inventory surfaces (including any additional modules not listed above).
2. Implement the fixture dataset and augment E2E coverage per the test matrix.
3. Run E2E coverage in a controlled environment and iterate on any surfaced data mismatches.
4. Review the QA Protocol v3.0 audit report for Work Surface alignment: `docs/qa/QA-INFRA-006-work-surface-qa-protocol-v3.md`.
