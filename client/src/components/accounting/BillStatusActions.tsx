/**
 * BillStatusActions - ARCH-004 Bill Status State Machine UI
 *
 * Shows valid next status transitions for a bill based on
 * the state machine defined in server/services/billStateMachine.ts
 */

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import React, { useState } from "react";
import {
  ChevronDown,
  Send,
  DollarSign,
  CheckCircle,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type BillStatus =
  | "DRAFT"
  | "PENDING"
  | "APPROVED"
  | "PARTIAL"
  | "PAID"
  | "OVERDUE"
  | "VOID";

/**
 * ARCH-004: Valid bill status transitions
 * Must match server/services/billStateMachine.ts
 */
const BILL_STATUS_TRANSITIONS: Record<BillStatus, BillStatus[]> = {
  DRAFT: ["PENDING", "VOID"],
  PENDING: ["APPROVED", "PARTIAL", "PAID", "OVERDUE", "VOID"],
  APPROVED: ["PARTIAL", "PAID", "OVERDUE", "VOID"],
  PARTIAL: ["PAID", "OVERDUE", "VOID"],
  OVERDUE: ["PARTIAL", "PAID", "VOID"],
  PAID: [], // Terminal state
  VOID: [], // Terminal state
};

const STATUS_LABELS: Record<BillStatus, string> = {
  DRAFT: "Draft",
  PENDING: "Pending Approval",
  APPROVED: "Approved",
  PARTIAL: "Partial Payment",
  PAID: "Paid",
  OVERDUE: "Overdue",
  VOID: "Void",
};

const STATUS_ICONS: Record<BillStatus, React.ReactNode> = {
  DRAFT: null,
  PENDING: <Send className="h-4 w-4" />,
  APPROVED: <CheckCircle className="h-4 w-4" />,
  PARTIAL: <DollarSign className="h-4 w-4" />,
  PAID: <CheckCircle className="h-4 w-4" />,
  OVERDUE: <AlertTriangle className="h-4 w-4" />,
  VOID: <XCircle className="h-4 w-4" />,
};

interface BillStatusActionsProps {
  currentStatus: BillStatus;
  billNumber: string;
  onStatusChange: (newStatus: BillStatus) => void;
  isUpdating?: boolean;
  disabled?: boolean;
}

export function BillStatusActions({
  currentStatus,
  billNumber,
  onStatusChange,
  isUpdating = false,
  disabled = false,
}: BillStatusActionsProps) {
  const [confirmStatus, setConfirmStatus] = useState<BillStatus | null>(null);

  const validNextStatuses = BILL_STATUS_TRANSITIONS[currentStatus] || [];
  const isTerminal = validNextStatuses.length === 0;

  const handleStatusSelect = (status: BillStatus) => {
    // Show confirmation for destructive actions
    if (status === "VOID" || status === "PAID") {
      setConfirmStatus(status);
    } else {
      onStatusChange(status);
    }
  };

  const handleConfirm = () => {
    if (confirmStatus) {
      onStatusChange(confirmStatus);
      setConfirmStatus(null);
    }
  };

  if (isTerminal) {
    return (
      <Badge variant="outline" className="text-xs text-muted-foreground">
        {currentStatus === "PAID" ? "Fully Paid" : "Voided"} (No further
        actions)
      </Badge>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled || isUpdating}
            className="gap-2"
          >
            Change Status
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {validNextStatuses.map(status => (
            <DropdownMenuItem
              key={status}
              onClick={() => handleStatusSelect(status)}
              className={cn(
                "gap-2 cursor-pointer",
                status === "VOID" && "text-red-600",
                status === "PAID" && "text-green-600"
              )}
            >
              {STATUS_ICONS[status]}
              <span>{STATUS_LABELS[status]}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Confirmation Dialog */}
      <AlertDialog
        open={!!confirmStatus}
        onOpenChange={() => setConfirmStatus(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmStatus === "VOID"
                ? "Void this bill?"
                : "Mark bill as paid?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmStatus === "VOID" ? (
                <>
                  <p>
                    You are about to void bill <strong>{billNumber}</strong>.
                  </p>
                  <p className="text-red-600 mt-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    This action cannot be undone. The bill will be marked as
                    void and no further payments can be recorded.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    You are about to mark bill <strong>{billNumber}</strong> as
                    fully paid.
                  </p>
                  <p className="text-amber-600 mt-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    This will mark the bill as complete. Ensure all payments
                    have been recorded.
                  </p>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className={cn(
                confirmStatus === "VOID" && "bg-red-600 hover:bg-red-700",
                confirmStatus === "PAID" && "bg-green-600 hover:bg-green-700"
              )}
            >
              {confirmStatus === "VOID" ? "Void Bill" : "Mark as Paid"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/**
 * BillStatusTimeline - Visual timeline of bill status progression
 */
interface BillStatusTimelineProps {
  currentStatus: BillStatus;
  className?: string;
}

const STATUS_ORDER: BillStatus[] = [
  "DRAFT",
  "PENDING",
  "APPROVED",
  "PARTIAL",
  "PAID",
];

export function BillStatusTimeline({
  currentStatus,
  className,
}: BillStatusTimelineProps) {
  // Handle special cases
  if (currentStatus === "VOID") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Badge variant="outline" className="bg-gray-100 text-gray-500">
          Voided
        </Badge>
      </div>
    );
  }

  if (currentStatus === "OVERDUE") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Badge variant="outline" className="bg-red-100 text-red-700">
          Overdue
        </Badge>
        <span className="text-xs text-muted-foreground">- Payment pending</span>
      </div>
    );
  }

  const currentIndex = STATUS_ORDER.indexOf(currentStatus);

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {STATUS_ORDER.map((status, index) => {
        const isPast = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isFuture = index > currentIndex;

        return (
          <div key={status} className="flex items-center">
            <div
              className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
                isPast && "bg-green-500 text-white",
                isCurrent && "bg-blue-500 text-white",
                isFuture && "bg-gray-200 text-gray-500"
              )}
            >
              {isPast ? "✓" : index + 1}
            </div>
            {index < STATUS_ORDER.length - 1 && (
              <div
                className={cn(
                  "w-8 h-0.5",
                  isPast ? "bg-green-500" : "bg-gray-200"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Get human-readable description of valid transitions
 */
export function getValidTransitionsDescription(
  currentStatus: BillStatus
): string {
  const valid = BILL_STATUS_TRANSITIONS[currentStatus];
  if (valid.length === 0) {
    return `${STATUS_LABELS[currentStatus]} is a terminal state - no further transitions allowed`;
  }
  return `From ${STATUS_LABELS[currentStatus]}, you can transition to: ${valid.map(s => STATUS_LABELS[s]).join(", ")}`;
}
