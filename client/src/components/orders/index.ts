/**
 * Orders Module Components
 *
 * Reusable UI components for the orders module
 */

// Status components
export { OrderStatusBadge } from "./OrderStatusBadge";
export { OrderStatusActions } from "./OrderStatusActions";
export { OrderStatusTimeline } from "./OrderStatusTimeline";

// COGS and pricing components
export { COGSInput } from "./COGSInput";
export { MarginInput } from "./MarginInput";
export { CogsAdjustmentModal } from "./CogsAdjustmentModal";
export { OrderCOGSDetails } from "./OrderCOGSDetails"; // TERP-0012 Phase 5

// Order totals and summary
export { OrderPreview } from "./OrderPreview";
export { OrderItemCard } from "./OrderItemCard";
export { InvoiceBottom } from "./InvoiceBottom";
export { OrderAdjustmentsBar } from "./OrderAdjustmentsBar";
export type {
  AppliedPricingRule,
  LineItem,
  LineItemMarginSource,
  OrderAdjustment,
  PaymentTerms,
} from "./types";

export { LineItemRow } from "./LineItemRow";
export { OrdersDocumentLineItemsGrid } from "./OrdersDocumentLineItemsGrid";

// Fulfillment components
export { ShipOrderModal } from "./ShipOrderModal";
export { ProcessReturnModal } from "./ProcessReturnModal";
export { ReturnHistorySection } from "./ReturnHistorySection";

// Client components
export { ClientPreview } from "./ClientPreview";
export { AddCustomerOverlay } from "./AddCustomerOverlay";
export { CreditLimitBanner } from "./CreditLimitBanner";
export { CreditWarningDialog } from "./CreditWarningDialog";

// Batch and inventory
export { BatchSelectionDialog } from "./BatchSelectionDialog";

// Order modals
export { DeleteDraftModal } from "./DeleteDraftModal";
export { EditInvoiceDialog } from "./EditInvoiceDialog";

// Referral components
export { ReferredBySelector } from "./ReferredBySelector";
