/**
 * Work Surface Components
 *
 * Re-exports all Work Surface UI components and patterns.
 *
 * @see ATOMIC_UX_STRATEGY.md - UX doctrine
 * @see ATOMIC_ROADMAP.md - Implementation tasks
 */

// Inspector Panel - UXS-103
export {
  InspectorPanel,
  InspectorSection,
  InspectorField,
  InspectorActions,
  useInspectorPanel,
  type InspectorPanelProps,
} from "./InspectorPanel";

// Direct Intake Work Surface - UXS-201
export { DirectIntakeWorkSurface } from "./DirectIntakeWorkSurface";

// Purchase Orders Work Surface - UXS-202
export { PurchaseOrdersWorkSurface } from "./PurchaseOrdersWorkSurface";

// Clients Work Surface - UXS-203
export { ClientsWorkSurface } from "./ClientsWorkSurface";

// Orders Work Surface - UXS-301
export { OrdersWorkSurface } from "./OrdersWorkSurface";

// Inventory Work Surface - UXS-401
export { InventoryWorkSurface } from "./InventoryWorkSurface";

// Invoices Work Surface - UXS-501
export { InvoicesWorkSurface } from "./InvoicesWorkSurface";

// Quotes Work Surface - UXS-302
export { QuotesWorkSurface } from "./QuotesWorkSurface";

// Pick & Pack Work Surface - UXS-402
export { PickPackWorkSurface } from "./PickPackWorkSurface";

// Client Ledger Work Surface - UXS-502
export { ClientLedgerWorkSurface } from "./ClientLedgerWorkSurface";

// Golden Flows - UXS-601, UXS-602, UXS-603
export {
  OrderCreationFlow,
  OrderToInvoiceFlow,
  InvoiceToPaymentFlow,
} from "./golden-flows";

// Status Bar
export { WorkSurfaceStatusBar } from "./WorkSurfaceStatusBar";
