/**
 * Accounting Module Components
 *
 * Reusable UI components for the accounting module
 */

export { AmountInput } from "./AmountInput";
export { StatusBadge } from "./StatusBadge";
export { AgingBadge } from "./AgingBadge";
export { AccountSelector } from "./AccountSelector";
export { FiscalPeriodSelector } from "./FiscalPeriodSelector";
export { JournalEntryForm } from "./JournalEntryForm";
export { ReceivePaymentModal } from "./ReceivePaymentModal";
export { PayVendorModal } from "./PayVendorModal";
export { RecordPaymentDialog } from "./RecordPaymentDialog"; // FEAT-007
export { MultiInvoicePaymentForm } from "./MultiInvoicePaymentForm"; // FEAT-007
export { InvoicePaymentHistory } from "./InvoicePaymentHistory"; // FEAT-007
export { BillStatusActions, BillStatusTimeline } from "./BillStatusActions"; // ARCH-004
export {
  ClientBalanceCard,
  ClientBalanceDiscrepancyAlert,
} from "./ClientBalanceCard"; // ARCH-002
export { GLEntriesViewer } from "./GLEntriesViewer"; // TERP-0012
export {
  GLReversalStatus,
  InvoiceGLStatus,
  ReturnGLStatus,
} from "./GLReversalStatus"; // TERP-0012 Phase 2

// Re-export types
export type {
  InvoiceStatus,
  BillStatus,
  PaymentType,
  PaymentMethod,
} from "./StatusBadge";
export type { AgingBucket } from "./AgingBadge";
export type { AccountType } from "./AccountSelector";
export type { FiscalPeriodStatus } from "./FiscalPeriodSelector";
