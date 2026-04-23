# Baseline excerpt for `OrderCreatorPage`

**Route:** `/sales?tab=create-order` — Depth: **full**

## From FUNCTIONAL_BASELINE.md

### Page: `OrderCreatorPage`

* **Route:** Rendered inside Sales Workspace via `SalesOrderSurface` in classic mode; legacy standalone route redirects into the sales workspace (`/orders/create` → `/sales?tab=create-order`).
* **Purpose:** Full-featured sales-order/quote creation with COGS visibility, margin management, credit enforcement, and draft/finalize workflow.
* **Major sections:**
  * `ClientCombobox` + `QuickCreateClient` for client selection.
  * `ClientCommitContextCard` — active commit context (linked need, sales-sheet portable cut).
  * `CreditLimitBanner` + `CreditStatusCard` + `CreditLimitWidget` — visualize credit available; hard/soft/warning enforcement.
  * `CreditWarningDialog` / `CreditOverrideRequest` — override flow when over-limit.
  * `InventoryBrowser` — add batches as line items; quick-add quantity.
  * `LineItemTable` / `OrdersDocumentLineItemsGrid` — editable line items: batch, product name, qty, unit COGS (fixed or range with LOW/MID/HIGH/MANUAL basis), below-vendor-range flag + reason, isCogsOverridden + override reason, margin %/$ (manual / customer-profile / default), retail price, applied pricing rules, is-sample flag, line total.
  * `OrderAdjustmentPanel` + `OrderTotalsPanel` + `FloatingOrderPreview` — discounts/fees/show-on-document toggle, live totals, preview doc.
  * `PricingConfigTab` + `PricingContextPanel` — show/apply pricing rules & profile defaults.
  * `ReferredBySelector` + `ReferralCreditsPanel` — referral crediting.
  * `ProfileQuickPanel` — inline quick panel for the selected client (overview / money / sales-pricing sections).
  * `KeyboardHintBar` + `WorkSurfaceStatusBar` — save indicator, keyboard hints.
* **Order type:** SALE or QUOTE (`mode=quote` URL flag drives labels/copy).
* **States:** Draft save (debounced), autosave, finalize, convert quote→order, send, cancel, clone.
* **Validation:** Zod schema `orderValidationSchema`; credit-check enforcement modes `WARNING` / `SOFT_BLOCK` / `HARD_BLOCK`.
* **Keyboard:** Custom hotkeys via `useWorkSurfaceKeyboard` (add line, save, confirm, navigate).
* **tRPC:** `orders.*` (draft/confirm/void/get), `orderEnhancements.*`, `pricing.*`, `credit.*`, `credits.*`, `clients.*`, `inventory.*`, `referrals.*`, `cogs.*`.

---

## Runtime supplement (if any)

(no runtime supplement match)
