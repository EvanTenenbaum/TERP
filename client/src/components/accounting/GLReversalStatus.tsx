/**
 * GLReversalStatus Component
 * Shows the reversal status of GL entries for voided/returned transactions
 * Part of TERP-0012 Phase 2: GL Reversal Visibility
 */

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  ChevronDown,
  ChevronRight,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  XCircle,
  BookOpen,
} from "lucide-react";
import { GLEntriesViewer } from "./GLEntriesViewer";

type TransactionStatus =
  | "ACTIVE"
  | "VOIDED"
  | "REVERSED"
  | "PARTIALLY_REVERSED";
type ReferenceType =
  | "ORDER"
  | "INVOICE"
  | "PAYMENT"
  | "RETURN"
  | "CREDIT_MEMO"
  | "BILL";

interface GLReversalStatusProps {
  referenceType: ReferenceType;
  referenceId: number;
  referenceNumber?: string;
  status: TransactionStatus;
  voidedAt?: Date | null;
  voidedBy?: string | null;
  voidReason?: string | null;
  originalAmount?: number;
  reversedAmount?: number;
  showEntries?: boolean;
}

const STATUS_CONFIG = {
  ACTIVE: {
    icon: CheckCircle,
    color: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-950/20",
    badge: "default" as const,
    label: "Active",
    description: "Transaction is active and posted to the general ledger.",
  },
  VOIDED: {
    icon: XCircle,
    color: "text-red-600",
    bgColor: "bg-red-50 dark:bg-red-950/20",
    badge: "destructive" as const,
    label: "Voided",
    description: "Transaction has been voided with reversing entries created.",
  },
  REVERSED: {
    icon: RotateCcw,
    color: "text-orange-600",
    bgColor: "bg-orange-50 dark:bg-orange-950/20",
    badge: "secondary" as const,
    label: "Reversed",
    description: "All GL entries have been reversed.",
  },
  PARTIALLY_REVERSED: {
    icon: AlertTriangle,
    color: "text-yellow-600",
    bgColor: "bg-yellow-50 dark:bg-yellow-950/20",
    badge: "outline" as const,
    label: "Partially Reversed",
    description: "Some GL entries have been reversed, but not all.",
  },
};

export function GLReversalStatus({
  referenceType,
  referenceId,
  referenceNumber,
  status,
  voidedAt,
  voidedBy,
  voidReason,
  originalAmount,
  reversedAmount,
  showEntries = true,
}: GLReversalStatusProps) {
  const [isEntriesOpen, setIsEntriesOpen] = React.useState(false);
  const config = STATUS_CONFIG[status];
  const StatusIcon = config.icon;

  const formatCurrency = (value: number | undefined) => {
    if (value === undefined) return "-";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return "-";
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(date));
  };

  return (
    <Card className={config.bgColor}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <StatusIcon className={`h-5 w-5 ${config.color}`} />
            GL Status
            {referenceNumber && (
              <Badge variant="outline" className="ml-2 font-mono text-xs">
                {referenceNumber}
              </Badge>
            )}
          </CardTitle>
          <Badge variant={config.badge}>{config.label}</Badge>
        </div>
        <CardDescription>{config.description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Voided Transaction Details */}
        {(status === "VOIDED" || status === "REVERSED") && (
          <Alert>
            <RotateCcw className="h-4 w-4" />
            <AlertTitle>Reversal Information</AlertTitle>
            <AlertDescription>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                {voidedAt && (
                  <>
                    <span className="text-muted-foreground">Voided:</span>
                    <span>{formatDate(voidedAt)}</span>
                  </>
                )}
                {voidedBy && (
                  <>
                    <span className="text-muted-foreground">By:</span>
                    <span>{voidedBy}</span>
                  </>
                )}
                {voidReason && (
                  <>
                    <span className="text-muted-foreground">Reason:</span>
                    <span>{voidReason}</span>
                  </>
                )}
                {originalAmount !== undefined && (
                  <>
                    <span className="text-muted-foreground">
                      Original Amount:
                    </span>
                    <span>{formatCurrency(originalAmount)}</span>
                  </>
                )}
                {reversedAmount !== undefined && (
                  <>
                    <span className="text-muted-foreground">
                      Reversed Amount:
                    </span>
                    <span className="text-red-600">
                      {formatCurrency(reversedAmount)}
                    </span>
                  </>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* GL Entries Section */}
        {showEntries && (
          <Collapsible open={isEntriesOpen} onOpenChange={setIsEntriesOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full flex items-center justify-between p-3 hover:bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  <span className="font-medium">View GL Entries</span>
                </div>
                {isEntriesOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <GLEntriesViewer
                referenceType={referenceType}
                referenceId={referenceId}
                title={
                  status === "VOIDED" || status === "REVERSED"
                    ? "Original & Reversing Entries"
                    : "Ledger Entries"
                }
                showTitle={false}
              />
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * InvoiceGLStatus - Specialized version for invoices
 */
interface InvoiceGLStatusProps {
  invoiceId: number;
  invoiceNumber: string;
  status: "DRAFT" | "SENT" | "PARTIAL" | "PAID" | "VOID" | "OVERDUE";
  voidedAt?: Date | null;
  voidedBy?: string | null;
  voidReason?: string | null;
  amount?: number;
}

export function InvoiceGLStatus({
  invoiceId,
  invoiceNumber,
  status,
  voidedAt,
  voidedBy,
  voidReason,
  amount,
}: InvoiceGLStatusProps) {
  const transactionStatus: TransactionStatus =
    status === "VOID" ? "VOIDED" : "ACTIVE";

  return (
    <GLReversalStatus
      referenceType="INVOICE"
      referenceId={invoiceId}
      referenceNumber={invoiceNumber}
      status={transactionStatus}
      voidedAt={voidedAt}
      voidedBy={voidedBy}
      voidReason={voidReason}
      originalAmount={amount}
      reversedAmount={status === "VOID" ? amount : undefined}
    />
  );
}

/**
 * ReturnGLStatus - Specialized version for returns/credit memos
 */
interface ReturnGLStatusProps {
  returnId: number;
  returnNumber?: string;
  status: "PENDING" | "APPROVED" | "PROCESSED" | "CANCELLED";
  processedAt?: Date | null;
  processedBy?: string | null;
  reason?: string | null;
  creditAmount?: number;
}

export function ReturnGLStatus({
  returnId,
  returnNumber,
  status,
  processedAt,
  processedBy,
  reason,
  creditAmount,
}: ReturnGLStatusProps) {
  const transactionStatus: TransactionStatus =
    status === "PROCESSED" ? "REVERSED" : "ACTIVE";

  return (
    <GLReversalStatus
      referenceType="RETURN"
      referenceId={returnId}
      referenceNumber={returnNumber}
      status={transactionStatus}
      voidedAt={processedAt}
      voidedBy={processedBy}
      voidReason={reason}
      reversedAmount={creditAmount}
    />
  );
}

export default GLReversalStatus;
