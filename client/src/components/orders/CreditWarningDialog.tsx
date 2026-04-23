/**
 * CreditWarningDialog - Shows when order exceeds credit limit
 * Allows user to proceed with override reason or cancel
 */

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  ArrowRightCircle,
  CreditCard,
  FileClock,
  Info,
  XCircle,
} from "lucide-react";

interface CreditCheckResult {
  allowed: boolean;
  warning?: string;
  requiresOverride: boolean;
  creditLimit: number;
  currentExposure: number;
  newExposure: number;
  availableCredit: number;
  utilizationPercent: number;
  enforcementMode: "WARNING" | "SOFT_BLOCK" | "HARD_BLOCK";
}

interface CreditWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creditCheck: CreditCheckResult | null;
  orderTotal: number;
  clientName: string;
  onProceed: (overrideReason?: string) => void;
  onRequestOverride?: (overrideReason?: string) => void | Promise<void>;
  requestOverrideLabel?: string;
  requestOverrideBusy?: boolean;
  onViewPaymentHistory?: () => void;
  onRecordPayment?: () => void;
  onCancel: () => void;
}

export function CreditWarningDialog({
  open,
  onOpenChange,
  creditCheck,
  orderTotal,
  clientName,
  onProceed,
  onRequestOverride,
  requestOverrideLabel = "Request Credit Override",
  requestOverrideBusy = false,
  onViewPaymentHistory,
  onRecordPayment,
  onCancel,
}: CreditWarningDialogProps) {
  const [overrideReason, setOverrideReason] = useState("");

  if (!creditCheck) return null;

  const isHardBlock = creditCheck.enforcementMode === "HARD_BLOCK";
  const requiresReason =
    creditCheck.requiresOverride ||
    creditCheck.enforcementMode === "SOFT_BLOCK";
  const supportsOverrideRequest = Boolean(onRequestOverride);
  const showReasonField = requiresReason || supportsOverrideRequest;
  const canProceed =
    !isHardBlock && (!requiresReason || overrideReason.length >= 10);

  const handleProceed = () => {
    onProceed(requiresReason ? overrideReason : undefined);
    setOverrideReason("");
  };

  const handleCancel = () => {
    onCancel();
    setOverrideReason("");
  };

  const handleRequestOverride = async () => {
    await onRequestOverride?.(overrideReason);
  };

  const formatCurrency = (value: number) =>
    value.toLocaleString(undefined, { style: "currency", currency: "USD" });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isHardBlock ? (
              <XCircle className="h-5 w-5 text-destructive" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-[var(--warning)]" />
            )}
            {isHardBlock ? "Order Blocked" : "Credit Limit Warning"}
          </DialogTitle>
          <DialogDescription>
            {isHardBlock
              ? "This order cannot proceed due to credit limit restrictions."
              : "This order will exceed the client's credit limit."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Client Info */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <span className="text-sm font-medium">{clientName}</span>
            <Badge variant={isHardBlock ? "destructive" : "outline"}>
              {creditCheck.utilizationPercent.toFixed(0)}% Utilized
            </Badge>
          </div>

          {/* Warning Message */}
          {creditCheck.warning && (
            <div className="flex gap-2 p-3 bg-[var(--warning-bg)] dark:bg-[var(--warning)] rounded-lg border border-yellow-200 dark:border-yellow-800">
              <AlertTriangle className="h-4 w-4 text-[var(--warning)] flex-shrink-0 mt-0.5" />
              <p className="text-sm text-[var(--warning)] dark:text-yellow-200">
                {creditCheck.warning}
              </p>
            </div>
          )}

          {/* Credit Details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <p className="text-muted-foreground">Credit Limit</p>
              <p className="font-semibold">
                {formatCurrency(creditCheck.creditLimit)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Current Exposure</p>
              <p className="font-semibold">
                {formatCurrency(creditCheck.currentExposure)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Order Total</p>
              <p className="font-semibold">{formatCurrency(orderTotal)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">New Exposure</p>
              <p
                className={`font-semibold ${creditCheck.newExposure > creditCheck.creditLimit ? "text-destructive" : ""}`}
              >
                {formatCurrency(creditCheck.newExposure)}
              </p>
            </div>
          </div>

          {showReasonField && (
            <div className="space-y-2">
              <Label htmlFor="override-reason">
                Override / Credit Request Reason{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="override-reason"
                placeholder="Explain the payment plan, approval context, or why this order should move forward (min 10 characters)..."
                value={overrideReason}
                onChange={e => setOverrideReason(e.target.value)}
                className="min-h-[80px]"
              />
              <p className="text-xs text-muted-foreground">
                {overrideReason.length}/10 characters minimum
              </p>
            </div>
          )}

          {/* Info for WARNING mode */}
          {creditCheck.enforcementMode === "WARNING" && !isHardBlock && (
            <div className="flex gap-2 p-3 bg-[var(--info-bg)] dark:bg-[var(--info)] rounded-lg border border-blue-200 dark:border-blue-800">
              <Info className="h-4 w-4 text-[var(--info)] flex-shrink-0 mt-0.5" />
              <p className="text-sm text-[var(--info)] dark:text-blue-200">
                You can proceed with this order. The warning is for your
                awareness.
              </p>
            </div>
          )}

          {/* Hard Block Message */}
          {isHardBlock && (
            <div className="flex gap-2 p-3 bg-destructive/10 dark:bg-destructive rounded-lg border border-red-200 dark:border-red-800">
              <XCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive dark:text-red-200">
                Credit enforcement is set to Hard Block. Contact an
                administrator to adjust the client's credit limit or change
                enforcement settings.
              </p>
            </div>
          )}

          {(supportsOverrideRequest ||
            onViewPaymentHistory ||
            onRecordPayment) && (
            <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
              <div>
                <p className="text-sm font-medium">Next steps</p>
                <p className="text-xs text-muted-foreground">
                  Resolve the credit issue without losing your place in the
                  order flow.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {supportsOverrideRequest ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      void handleRequestOverride();
                    }}
                    disabled={
                      requestOverrideBusy || overrideReason.trim().length < 10
                    }
                  >
                    <ArrowRightCircle className="mr-2 h-4 w-4" />
                    {requestOverrideBusy
                      ? "Submitting..."
                      : requestOverrideLabel}
                  </Button>
                ) : null}
                {onViewPaymentHistory ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onViewPaymentHistory}
                  >
                    <FileClock className="mr-2 h-4 w-4" />
                    View Payment History
                  </Button>
                ) : null}
                {onRecordPayment ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onRecordPayment}
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    Record Payment
                  </Button>
                ) : null}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          {!isHardBlock && (
            <Button
              onClick={handleProceed}
              disabled={!canProceed}
              variant={requiresReason ? "default" : "default"}
            >
              {requiresReason ? "Proceed with Override" : "Proceed Anyway"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
