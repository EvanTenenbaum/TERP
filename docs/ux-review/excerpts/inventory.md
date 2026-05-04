# Baseline excerpt for `InventoryWorkspacePage.inventory`

**Route:** `/inventory?tab=inventory` — Depth: **full**

## From FUNCTIONAL_BASELINE.md

### Page: `InventoryWorkspacePage`

* **Route:** `/inventory` (canonical Operations home).
* **Access:** All authenticated users.
* **Tabs** (from `INVENTORY_WORKSPACE`):

  #### Inventory (`tab=inventory`) — default
  * `InventoryManagementSurface` — sheet-native inventory browser with lot/batch rows, locations, adjust quantity, shrinkage, images. Deep-link param `batchId` focuses a row.

  #### Direct Intake (`tab=intake`)
  * Pilot-gated: `IntakePilotSurface` (sheet-native) with `onOpenClassic` escape hatch to `DirectIntakeWorkSurface`.
  * Creates inventory without a PO.

  #### Product Intake / Receiving (`tab=receiving`)
  * If `draftId` is present → lazy `ProductIntakeSlicePage` (receiving draft editor).
  * Otherwise → `PurchaseOrderSurface` pre-filtered to `CONFIRMED`/`RECEIVING`, with `autoLaunchReceivingOnRowClick`.

  #### Shipping / Fulfillment (`tab=shipping`)
  * Pilot-gated: `FulfillmentPilotSurface` (sheet-native) or `PickPackWorkSurface` (classic). Mode toggle in command strip.

  #### Photography (`tab=photography`)
  * Embedded `PhotographyPage` — queue of batches needing photos, upload dialog, status chips.

  #### Samples (`tab=samples`)
  * Pilot-gated: `SamplesPilotSurface` (sheet-native) or `SampleManagement` (classic) embedded.

* **Command strip:** `SheetModeToggle` appears for `intake` and `shipping` tabs.
* **Telemetry:** `useWorkspaceHomeTelemetry("inventory", activeTab)`.

---

## Runtime supplement (if any)

(no runtime supplement match)
