# Baseline excerpt for `SalesWorkspacePage.sales-sheets`

**Route:** `/sales?tab=sales-sheets` — Depth: **lightweight**

## From FUNCTIONAL_BASELINE.md

### Page: `SalesWorkspacePage`

* **Route:** `/sales` (canonical home for sales).
* **Access:** All authenticated users.
* **Purpose:** "Sell" workspace — the primary queue for orders, quotes, returns, catalogues, live shopping, and the new-order drawer.
* **Shell:** `LinearWorkspaceShell` (title "Sales", section "Sell", compact density, meta strip, command strip showing a `SheetModeToggle` when applicable).
* **Tabs:**

  #### Sub-tab: Orders (`tab=orders`) — default
  * Renders `OrdersWorkSurface` (classic) **or** lazy `OrdersSheetPilotSurface` (spreadsheet-native pilot when feature-flagged).
  * Mode toggle in command strip (`SheetModeToggle`) — classic ⇄ sheet-native.
  * "New Order" button in classic opens a right-side `Sheet` drawer embedding `SalesOrderSurface`.
  * Deep-link flags `ordersView=document`, `draftId`, `quoteId`, `needId`, `fromSalesSheet` force the sheet-native document view (or fall back to classic `/sales?tab=create-order` if pilot disabled).

  #### Sub-tab: Pick List (`tab=pick-list`)
  * Embeds `ShippingPickListPage` — filterable pick list with CSV export.

  #### Sub-tab: Quotes (`tab=quotes`)
  * `QuotesWorkSurface` (classic) or `QuotesPilotSurface` (sheet-native pilot) with mode toggle.

  #### Sub-tab: Returns (`tab=returns`)
  * `ReturnsPage` (embedded) or `ReturnsPilotSurface` (sheet-native pilot) with mode toggle.

  #### Sub-tab: Sales Catalogues (`tab=sales-sheets`)
  * `SalesCatalogueSurface` (sheet-native). Build/share sales sheets.
  * Any document-intent deep-link on this tab is redirected to the sheet-native orders document path.

  #### Sub-tab: Live Shopping (`tab=live-shopping`)
  * `LiveShoppingPage` — operator-side session manager (start/pause/end, room code, clients joined).

  #### Sub-tab: Create Order / New Quote (`tab=create-order`)
  * `SalesOrderSurface` (sheet-native). When `mode=quote` in the URL the tab label becomes "New Quote".

* **Key business rules:**
  * Legacy `tab=pick-pack` is hard-redirected to `/inventory?tab=shipping`.
  * `shouldForceSheetNativeOrdersSurface` gates the pilot: if pilot disabled + sheet-native intent present, redirect back to classic with the same params.
  * Right-side drawer preserves orders-queue context when creating a new order.
* **Telemetry:** `useWorkspaceHomeTelemetry("sales", activeTab)`.
* **tRPC touched via children:** `orders.*`, `quotes.*`, `salesSheets.*`, `returns.*`, `liveShopping.*`, `pickPack.*` (see §7).

---

## Runtime supplement (if any)

(no runtime supplement match)
