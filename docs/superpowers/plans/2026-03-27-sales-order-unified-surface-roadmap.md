# Sales Order Unified Surface — Atomic Execution Roadmap

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `OrderCreatorPage` (2206-line monolith) + `OrdersSheetPilotSurface` document mode with one unified `SalesOrderSurface` following the directional mockup: left inventory grid, right editable order document, invoice bottom, order adjustments bar.

**Architecture:** Extract `useOrderDraft()` hook from OrderCreatorPage (state + mutations + auto-save + fingerprinting). Build `SalesOrderSurface` composing: left InventoryBrowserGrid (PowersheetGrid), right OrdersDocumentLineItemsGrid (reused), InvoiceBottom, OrderAdjustmentsBar. Wire into SalesWorkspacePage + OrdersSheetPilotSurface. Retire OrderCreatorPage.

**Tech Stack:** React 19, TypeScript, AG Grid via PowersheetGrid, tRPC, Tailwind 4, shadcn/ui

**Source spec:** `docs/superpowers/specs/2026-03-27-unified-sheet-native-sales-surfaces-design.md` (Phase 2)

**Prerequisite:** Phase 1 (Sales Catalogue) must be shipped first. It validates the layout pattern.

**CRITICAL: Read OrderCreatorPage.tsx before implementing.** This plan extracts from a 2206-line monolith. The implementing agent MUST read the source file to understand the exact code being extracted. Line numbers reference the file as of commit `ecda0579`.

---

## File Structure

| Action | Path | Responsibility |
|--------|------|---------------|
| Create | `client/src/hooks/useOrderDraft.ts` | Order draft lifecycle: state, mutations, auto-save, fingerprinting, credit check, seed import |
| Create | `client/src/hooks/useOrderDraft.test.ts` | Hook tests |
| Create | `client/src/components/orders/types.ts` | Shared `LineItem`, `OrderAdjustment`, and related reusable order types extracted before cleanup |
| Create | `client/src/components/spreadsheet-native/SalesOrderSurface.tsx` | Main unified surface — toolbar, action bar, split grids, invoice bottom, adjustments, status bar |
| Create | `client/src/components/spreadsheet-native/SalesOrderSurface.test.tsx` | Component tests |
| Create | `client/src/components/orders/InvoiceBottom.tsx` | Invoice-bottom pattern: subtotal, discount, freight, total, terms, credit info |
| Create | `client/src/components/orders/OrderAdjustmentsBar.tsx` | Referral, notes, draft status — full-width bar below split |
| Modify | `client/src/pages/SalesWorkspacePage.tsx` | Replace create-order panel, remove SheetModeToggle for create-order |
| Modify | `client/src/components/spreadsheet-native/OrdersSheetPilotSurface.tsx` | Document mode renders SalesOrderSurface instead of OrderCreatorPage |
| Delete | (deferred) | OrderCreatorPage, FloatingOrderPreview, OrderAdjustmentPanel, OrderTotalsPanel, ReferralCreditsPanel, LineItemTable |

### QA Review Notes — Intentional Descopes

- **FloatingOrderPreview** — replaced by InvoiceBottom. No collapsible preview panel.
- **OrderAdjustmentPanel** — Discount row moves to InvoiceBottom. No separate toggle panel.
- **OrderTotalsPanel** — Totals move to InvoiceBottom. No separate card.
- **ReferralCreditsPanel** — Referral becomes a compact cell in OrderAdjustmentsBar.
- **LineItemTable** — Fully replaced by OrdersDocumentLineItemsGrid (already the sheet-native standard).
- **Gallery/preview editing** — No inline qty/price editing in a floating preview. Grid IS the editor.
- **Payment Terms** — Reuse the existing payment-terms stack instead of inventing a placeholder. There is already server support in `server/routers/paymentTerms.ts` and existing order UI in `ConfirmDraftModal.tsx` / `OrderPreview.tsx`.
- **Margin warnings** — Informational only. Never block any action.

---

## Wave 1: useOrderDraft Hook

Extract the state management core from OrderCreatorPage into a reusable hook. This is the highest-risk task — it must preserve ALL draft lifecycle behavior.

### Task 1: useOrderDraft test file

**Files:** Create `client/src/hooks/useOrderDraft.test.ts`
**Deliverable:** Test file with core behavior tests
**Source:** Model after `client/src/hooks/useCatalogueDraft.test.ts` (Phase 1 pattern)

- [ ] Create test file with tests for:
  - Initial state (no draft, empty items, SALE order type)
  - Dirty tracking (fingerprint changes mark dirty)
  - Save gating (requires clientId + items)
  - Order type switching (SALE ↔ QUOTE)
  - Seed import from sessionStorage (`salesSheetToQuote`)
- [ ] Run test → FAIL (module not found)
- [ ] Verify: `pnpm vitest run client/src/hooks/useOrderDraft.test.ts`

### Task 2: useOrderDraft implementation

**Files:** Create `client/src/hooks/useOrderDraft.ts`
**Deliverable:** Hook that extracts ALL state + mutations + effects from OrderCreatorPage
**Source:** Read `client/src/pages/OrderCreatorPage.tsx` and extract these sections:

**State to extract (lines 444-496):**
- `clientId`, `linkedNeedId`, `items`, `adjustment`, `showAdjustmentOnDocument`, `orderType`
- `showFinalizeConfirm`, `showCreditWarning`, `creditCheckResult`, `pendingOverrideReason`
- `referredByClientId`, `activeDraftId`, `activeDraftVersion`
- Add new: `notes: string` (for order-level notes in OrderAdjustmentsBar)

**Refs to extract (lines 500-580):**
- `isInitialLoad`, `isFinalizingRef`, `hydratedRouteKeyRef`, `seededRouteKeyRef`
- `persistedFingerprintRef`, `pendingPersistFingerprintRef`, `currentOrderFingerprintRef`, `itemsRef`

**Fingerprinting (lines 258-331):**
- `normalizeFingerprintNumber`, `buildOrderFingerprint`, `EMPTY_ORDER_FINGERPRINT`
- `currentOrderFingerprint` useMemo + `applyPersistedFingerprint` callback

**Mutations (lines 1103-1218):**
- `createDraftMutation` (orders.createDraftEnhanced)
- `updateDraftMutation` (orders.updateDraftEnhanced)
- `finalizeMutation` (orders.finalizeDraft)
- `creditCheckMutation` (credit.checkOrderCredit)
- `autoSaveMutation` (orders.updateDraftEnhanced — silent)
- `performAutoSave` + `debouncedAutoSave` + auto-save trigger effect

**Handlers (lines 1240-1400):**
- `validateOrderMetadata`, `handleSaveDraft`, `handlePreviewAndFinalize`
- `handleCreditProceed`, `handleCreditCancel`, `confirmFinalize`
- `buildDraftMutationPayload`, `invalidateOrdersSheetQueries`, `resetComposerState`

**Route hydration effects (lines 687-845):**
- Draft/quote loading, sales sheet import, route seeding

**Utility functions to co-locate (lines 192-414):**
- `resolveInventoryPricingContext`, `resolveRouteSeedOrderType`, `shouldSeedComposerFromRoute`
- `resolveOrderCostVisibility`, `parseRouteEntityId`, `mapDraftLineItemsToEditorState`
- `shouldBypassWorkSurfaceKeyboardForSpreadsheetTarget`

**Types to co-locate:**
- `CreditCheckResult` (line 105), `InventoryItemForOrder` (line 117)
- `LineItemMarginSource` (line 139), `DraftLineItemPayload` (line 148), `OrderDraftSnapshot` (line 182)

**Critical behaviors to preserve:**
1. Two-step finalization: save draft → on success → finalize (BUG-093)
2. `isFinalizingRef` prevents form reset before finalization completes
3. Fingerprint comparison prevents unnecessary auto-saves
4. `hydratedRouteKeyRef` and `seededRouteKeyRef` prevent duplicate loads
5. Sales sheet import reads `sessionStorage("salesSheetToQuote")` and clears after import
6. Credit check runs for SALE orders only, result is informational

- [ ] Create `client/src/components/orders/types.ts` and move shared `LineItem` / `OrderAdjustment` types there before new components depend on them
- [ ] Read OrderCreatorPage.tsx fully to understand extraction scope
- [ ] Create useOrderDraft.ts extracting all above
- [ ] Run tests → PASS
- [ ] `pnpm check` → zero errors
- [ ] Commit: `feat(sales-order): extract useOrderDraft hook from OrderCreatorPage`

---

## Wave 2: InvoiceBottom + OrderAdjustmentsBar

### Task 3: InvoiceBottom component

**Files:** Create `client/src/components/orders/InvoiceBottom.tsx` + test
**Deliverable:** Right-aligned invoice summary: Subtotal → Discount → Freight → Total, Payment Terms, Credit info
**Props:** subtotal, adjustment, freight, total, paymentTerms, credit info (all typed)
**Layout:** Mimics bottom of a physical invoice. Right-aligned rows. Payment terms selector with "Save default" button. Credit info is subtle/informational.
**Reuse:** Pull option values and default/save behavior from the existing payment-terms flow (`server/routers/paymentTerms.ts`, `ConfirmDraftModal.tsx`, `OrderPreview.tsx`) instead of inventing new terms.

- [ ] Create InvoiceBottom.tsx
- [ ] Create InvoiceBottom.test.tsx
- [ ] `pnpm check` → zero errors
- [ ] Commit: `feat(sales-order): add InvoiceBottom component`

### Task 4: OrderAdjustmentsBar component

**Files:** Create `client/src/components/orders/OrderAdjustmentsBar.tsx` + test
**Deliverable:** Full-width 3-column bar: Referral | Notes | Draft status
**Props:** referral state, notes, draft status, save/finalize actions, context badges

- [ ] Create OrderAdjustmentsBar.tsx
- [ ] Create OrderAdjustmentsBar.test.tsx
- [ ] `pnpm check` → zero errors
- [ ] Commit: `feat(sales-order): add OrderAdjustmentsBar component`

### Task 5: Commit Wave 2

- [ ] Verify both components pass: `pnpm check && pnpm vitest run client/src/components/orders/InvoiceBottom.test.tsx client/src/components/orders/OrderAdjustmentsBar.test.tsx`

---

## Wave 3: SalesOrderSurface Component

### Task 6: SalesOrderSurface test file

**Files:** Create `client/src/components/spreadsheet-native/SalesOrderSurface.test.tsx`

- [ ] Create test file mocking PowersheetGrid, OrdersDocumentLineItemsGrid, tRPC, wouter
- [ ] Tests: toolbar renders, empty state without client, split grids render, invoice bottom renders
- [ ] Run → FAIL

### Task 7: SalesOrderSurface — full component

**Files:** Create `client/src/components/spreadsheet-native/SalesOrderSurface.tsx`
**Deliverable:** All 6 layout zones composing useOrderDraft + sub-components

**Zone 1 — Toolbar:** Back to Queue, seed badge, ClientCombobox, Document Mode (SALE/QUOTE), draft #, autosave badge, Save Draft, Finalize
**Zone 2 — Action Bar:** Add Rows, Duplicate, Del, Filters, Saved Views, running total + referral
**Zone 3 — Split Grids:** Left (2fr) inventory PowersheetGrid, Right (3fr) OrdersDocumentLineItemsGrid
**Zone 4 — Invoice Bottom:** Inside right grid card, below rows
**Zone 5 — Order Adjustments:** Full-width bar below split
**Zone 6 — Status Bar:** WorkSurfaceStatusBar + KeyboardHintBar

**Key wiring:**
- `useOrderDraft()` → all state + actions
- Left grid: `salesSheets.getInventory(clientId)` → PowersheetGrid (read-only, SKU/Product/Batch/Avail/Action)
- Right grid: `OrdersDocumentLineItemsGrid` with items from useOrderDraft
- InvoiceBottom: subtotal from `useOrderCalculations`, adjustment/terms from useOrderDraft
- OrderAdjustmentsBar: referral/notes/draft status from useOrderDraft
- Customer Drawer: Drawer with ProfileQuickPanel, CreditLimitWidget, PricingConfigTab
- CreditWarningDialog: informational credit check result
- ConfirmDialog: finalize confirmation

- [ ] Create SalesOrderSurface.tsx with all 6 zones
- [ ] Wire useOrderDraft, useOrderCalculations, inventory query
- [ ] Wire Customer Drawer, CreditWarningDialog, ConfirmDialog
- [ ] Wire keyboard shortcuts
- [ ] Run tests → PASS
- [ ] `pnpm check` → zero errors
- [ ] Commit: `feat(sales-order): add SalesOrderSurface unified component`

---

## Wave 4: Wire Inventory Browser + Filters

### Task 8: Inventory browser with order-specific columns + filters

- [ ] Add inventory column defs (SKU, Product, Batch, Avail, Action)
- [ ] Add `handleAddItem` using `convertInventoryToLineItems` logic from OrderCreatorPage
- [ ] Wire AdvancedFilters + QuickViewSelector (same pattern as SalesCatalogueSurface)
- [ ] Wire default view auto-load on client change
- [ ] `pnpm check` → zero errors
- [ ] Commit: `feat(sales-order): wire inventory browser with filters and saved views`

---

## Wave 5: Route Wiring

### Task 9: OrdersSheetPilotSurface — document mode

- [ ] Replace `<OrderCreatorPage surfaceVariant="sheet-native-orders" />` with `<SalesOrderSurface />`
- [ ] Update imports
- [ ] `pnpm check` → zero errors

### Task 10: SalesWorkspacePage — create-order tab

- [ ] Replace create-order panel with `<Suspense><SalesOrderSurface /></Suspense>`
- [ ] Remove SheetModeToggle for create-order tab from commandStrip
- [ ] Remove unused OrderCreatorPage import
- [ ] `pnpm check` + `pnpm lint` → zero errors

### Task 11: Update tests

- [ ] Update SalesWorkspacePage.test.tsx mocks
- [ ] Update OrdersSheetPilotSurface.test.tsx mocks
- [ ] `pnpm test` → all pass

### Task 12: Commit Wave 5

- [ ] `git add -A && git commit -m "feat(sales-order): wire SalesOrderSurface into routing"`

---

## Wave 6: Cleanup + Verification

### Task 13: Verify no remaining imports

- [ ] Grep for OrderCreatorPage, FloatingOrderPreview, OrderAdjustmentPanel, OrderTotalsPanel, ReferralCreditsPanel, LineItemTable
- [ ] Fix any external references

### Task 14: Delete retired components

- [ ] Delete OrderCreatorPage.tsx and other retired components (only if grep confirms safe)
- [ ] DO NOT delete: OrdersDocumentLineItemsGrid, CreditWarningDialog, CreditLimitBanner, ReferredBySelector

### Task 15: Full verification

- [ ] `pnpm check && pnpm lint && pnpm test && pnpm build` → all pass

### Task 16: Commit

- [ ] `git add -A && git commit -m "chore(sales-order): retire OrderCreatorPage and replaced components"`

---

## Wave 7: Final Verification

### Task 17: Success criteria check

- [ ] No SheetModeToggle for create-order tab
- [ ] OrdersSheetPilotSurface document mode renders SalesOrderSurface
- [ ] Handoff from Catalogue works (fromSalesSheet + sessionStorage)
- [ ] Draft lifecycle (create, auto-save 2s, restore, finalize)
- [ ] Credit check runs for SALE orders, informational only
- [ ] Filters + saved views work in inventory browser
- [ ] Invoice bottom renders (subtotal, discount, freight, total, terms, credit)
- [ ] Order adjustments bar renders (referral, notes, draft status)
- [ ] Keyboard shortcuts (⌘S, ⌘Enter, ⌘Z)

### Task 18: Fix issues + final commit

- [ ] Fix any failing criteria
- [ ] `pnpm check && pnpm lint && pnpm test && pnpm build` → all pass
- [ ] Final commit if needed

---

## Summary

| Wave | Tasks | What ships |
|------|-------|-----------|
| 1 | 1-2 | `useOrderDraft` hook (state extraction from OrderCreatorPage) |
| 2 | 3-5 | `InvoiceBottom` + `OrderAdjustmentsBar` components |
| 3 | 6-7 | `SalesOrderSurface` layout shell with all 6 zones |
| 4 | 8 | Inventory browser with order-specific columns + filters |
| 5 | 9-12 | Routing changes (OrdersSheetPilotSurface + SalesWorkspacePage) |
| 6 | 13-16 | Dead code cleanup + full verification |
| 7 | 17-18 | Success criteria check + final fixes |

**18 atomic tasks across 7 waves.**

## Appendix: tRPC Schemas for Orders

| Procedure | Input | Return |
|-----------|-------|--------|
| `orders.createDraftEnhanced` | `{ orderType, clientId, clientNeedId?, referredByClientId?, lineItems[], orderLevelAdjustment?, showAdjustmentOnDocument }` | `{ orderId: number, version: number }` |
| `orders.updateDraftEnhanced` | `{ orderId, version, ...same as create }` | `{ orderId: number, version: number }` |
| `orders.finalizeDraft` | `{ orderId, version }` | `{ orderId: number, orderNumber: string }` |
| `credit.checkOrderCredit` | `{ clientId, orderTotal, overrideReason? }` | `CreditCheckResult` |
| `salesSheets.getInventory` | `{ clientId: number }` | `PricedInventoryItem[]` |
| `organizationSettings.getDisplaySettings` | `{}` | `{ display: { canViewCogsData, showCogsInOrders, showMarginInOrders } }` |

## Appendix: Key Types

```typescript
interface CreditCheckResult {
  allowed: boolean;
  warning?: string;
  requiresOverride: boolean;
  creditLimit: number;
  currentExposure: number;
  newExposure: number;
  availableCredit: number;
  utilizationPercent: number;
  enforcementMode: "WARNING" | "SOFT_BLOCK" | "HARD_BLOCK";
}

type LineItemMarginSource = "CUSTOMER_PROFILE" | "DEFAULT" | "MANUAL";

interface OrderDraftSnapshot {
  clientId: number | null;
  linkedNeedId: number | null;
  orderType: "QUOTE" | "SALE";
  referredByClientId: number | null;
  adjustment: OrderAdjustment | null;
  showAdjustmentOnDocument: boolean;
  items: LineItem[];
}
```

Note: `LineItem` type is imported from `@/components/orders/LineItemTable`. Before deleting LineItemTable, move the type export to a shared file or re-export from `OrdersDocumentLineItemsGrid`.
