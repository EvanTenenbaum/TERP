import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Invoice status types
export type InvoiceStatus =
  | "DRAFT"
  | "SENT"
  | "VIEWED"
  | "PARTIAL"
  | "PAID"
  | "OVERDUE"
  | "VOID";

// Bill status types
export type BillStatus =
  | "DRAFT"
  | "PENDING"
  | "APPROVED"
  | "PARTIAL"
  | "PAID"
  | "OVERDUE"
  | "VOID";

// Payment type
export type PaymentType = "RECEIVED" | "SENT";

// Payment method
export type PaymentMethod =
  | "CASH"
  | "CHECK"
  | "WIRE"
  | "ACH"
  | "CREDIT_CARD"
  | "DEBIT_CARD"
  | "OTHER";

interface StatusBadgeProps {
  status: InvoiceStatus | BillStatus | PaymentType | PaymentMethod | string;
  type?: "invoice" | "bill" | "payment" | "paymentMethod";
  className?: string;
}

/**
 * StatusBadge - Colored badge for displaying status indicators
 *
 * Features:
 * - Color-coded based on status type
 * - Supports invoice, bill, payment, and payment method statuses
 * - Consistent with TERP design system
 */
export function StatusBadge({
  status,
  type = "invoice",
  className,
}: StatusBadgeProps) {
  const getStatusConfig = () => {
    const upperStatus = status.toUpperCase();

    // Invoice statuses
    if (type === "invoice") {
      switch (upperStatus as InvoiceStatus) {
        case "DRAFT":
          return {
            label: "Draft",
            className: "bg-gray-100 text-gray-700 border-gray-200",
          };
        case "SENT":
          return {
            label: "Sent",
            className: "bg-blue-100 text-blue-700 border-blue-200",
          };
        case "VIEWED":
          return {
            label: "Viewed",
            className: "bg-cyan-100 text-cyan-700 border-cyan-200",
          };
        case "PARTIAL":
          return {
            label: "Partial",
            className: "bg-yellow-100 text-yellow-700 border-yellow-200",
          };
        case "PAID":
          return {
            label: "Paid",
            className: "bg-green-100 text-green-700 border-green-200",
          };
        case "OVERDUE":
          return {
            label: "Overdue",
            className: "bg-red-100 text-red-700 border-red-200",
          };
        case "VOID":
          return {
            label: "Void",
            className: "bg-gray-100 text-gray-500 border-gray-200 line-through",
          };
        default:
          return {
            label: status,
            className: "bg-gray-100 text-gray-700 border-gray-200",
          };
      }
    }

    // Bill statuses
    if (type === "bill") {
      switch (upperStatus as BillStatus) {
        case "DRAFT":
          return {
            label: "Draft",
            className: "bg-gray-100 text-gray-700 border-gray-200",
          };
        case "PENDING":
          return {
            label: "Pending",
            className: "bg-blue-100 text-blue-700 border-blue-200",
          };
        case "APPROVED":
          return {
            label: "Approved",
            className: "bg-emerald-100 text-emerald-700 border-emerald-200",
          };
        case "PARTIAL":
          return {
            label: "Partial",
            className: "bg-yellow-100 text-yellow-700 border-yellow-200",
          };
        case "PAID":
          return {
            label: "Paid",
            className: "bg-green-100 text-green-700 border-green-200",
          };
        case "OVERDUE":
          return {
            label: "Overdue",
            className: "bg-red-100 text-red-700 border-red-200",
          };
        case "VOID":
          return {
            label: "Void",
            className: "bg-gray-100 text-gray-500 border-gray-200 line-through",
          };
        default:
          return {
            label: status,
            className: "bg-gray-100 text-gray-700 border-gray-200",
          };
      }
    }

    // Payment type
    if (type === "payment") {
      switch (upperStatus as PaymentType) {
        case "RECEIVED":
          return {
            label: "Received",
            className: "bg-green-100 text-green-700 border-green-200",
          };
        case "SENT":
          return {
            label: "Sent",
            className: "bg-blue-100 text-blue-700 border-blue-200",
          };
        default:
          return {
            label: status,
            className: "bg-gray-100 text-gray-700 border-gray-200",
          };
      }
    }

    // Payment method
    if (type === "paymentMethod") {
      switch (upperStatus as PaymentMethod) {
        case "CASH":
          return {
            label: "Cash",
            className: "bg-green-100 text-green-700 border-green-200",
          };
        case "CHECK":
          return {
            label: "Check",
            className: "bg-blue-100 text-blue-700 border-blue-200",
          };
        case "WIRE":
          return {
            label: "Wire",
            className: "bg-purple-100 text-purple-700 border-purple-200",
          };
        case "ACH":
          return {
            label: "ACH",
            className: "bg-indigo-100 text-indigo-700 border-indigo-200",
          };
        case "CREDIT_CARD":
          return {
            label: "Credit Card",
            className: "bg-orange-100 text-orange-700 border-orange-200",
          };
        case "DEBIT_CARD":
          return {
            label: "Debit Card",
            className: "bg-pink-100 text-pink-700 border-pink-200",
          };
        case "OTHER":
          return {
            label: "Other",
            className: "bg-gray-100 text-gray-700 border-gray-200",
          };
        default:
          return {
            label: status,
            className: "bg-gray-100 text-gray-700 border-gray-200",
          };
      }
    }

    return {
      label: status,
      className: "bg-gray-100 text-gray-700 border-gray-200",
    };
  };

  const config = getStatusConfig();

  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}
