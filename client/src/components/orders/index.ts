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
export { OrderTotalsPanel } from "./OrderTotalsPanel";
export { OrderPreview } from "./OrderPreview";
export { OrderItemCard } from "./OrderItemCard";
export { OrderAdjustmentPanel } from "./OrderAdjustmentPanel";

// Line item components
export { LineItemRow } from "./LineItemRow";
export { LineItemTable } from "./LineItemTable";

// Fulfillment components
export { OrderFulfillment } from "./OrderFulfillment";
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
export { ConfirmDraftModal } from "./ConfirmDraftModal";
export { DeleteDraftModal } from "./DeleteDraftModal";
export { EditInvoiceDialog } from "./EditInvoiceDialog";

// Floating components
export { FloatingOrderPreview } from "./FloatingOrderPreview";

// Referral components
export { ReferralCreditsPanel } from "./ReferralCreditsPanel";
export { ReferredBySelector } from "./ReferredBySelector";
