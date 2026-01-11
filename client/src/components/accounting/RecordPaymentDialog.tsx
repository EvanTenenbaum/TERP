/**
 * FEAT-007: Record Payment Dialog
 * Allows recording payments against invoices with partial payment support
 */

import React, { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { DollarSign, CreditCard, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

interface RecordPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: {
    id: number;
    invoiceNumber: string;
    totalAmount: string;
    amountPaid: string;
    amountDue: string;
    status: string;
  } | null;
  onSuccess?: () => void;
}

const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "CHECK", label: "Check" },
  { value: "WIRE", label: "Wire Transfer" },
  { value: "ACH", label: "ACH" },
  { value: "CREDIT_CARD", label: "Credit Card" },
  { value: "DEBIT_CARD", label: "Debit Card" },
  { value: "OTHER", label: "Other" },
] as const;

export function RecordPaymentDialog({
  open,
  onOpenChange,
  invoice,
  onSuccess,
}: RecordPaymentDialogProps) {
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("CASH");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentDate, setPaymentDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const utils = trpc.useUtils();

  // Reset form when dialog opens with new invoice
  useEffect(() => {
    if (open && invoice) {
      const dueAmount = parseFloat(invoice.amountDue);
      setAmount(dueAmount > 0 ? dueAmount.toFixed(2) : "");
      setPaymentMethod("CASH");
      setReferenceNumber("");
      setNotes("");
      setPaymentDate(format(new Date(), "yyyy-MM-dd"));
    }
  }, [open, invoice]);

  const recordPaymentMutation = trpc.payments.recordPayment.useMutation({
    onSuccess: (data) => {
      toast.success(
        <div className="flex flex-col gap-1">
          <span className="font-medium">Payment Recorded</span>
          <span className="text-sm">
            Payment #{data.paymentNumber} - ${data.amount.toFixed(2)}
          </span>
          <span className="text-sm text-muted-foreground">
            Invoice status: {data.invoiceStatus}
            {data.amountDue > 0 && ` (${formatCurrency(data.amountDue)} remaining)`}
          </span>
        </div>
      );
      utils.accounting.invoices.list.invalidate();
      utils.payments.list.invalidate();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to record payment");
    },
  });

  const formatCurrency = (value: number | string) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(num);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!invoice) return;

    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }

    const amountDue = parseFloat(invoice.amountDue);
    if (paymentAmount > amountDue) {
      toast.error(`Payment amount cannot exceed amount due (${formatCurrency(amountDue)})`);
      return;
    }

    recordPaymentMutation.mutate({
      invoiceId: invoice.id,
      amount: paymentAmount,
      paymentMethod: paymentMethod as "CASH" | "CHECK" | "WIRE" | "ACH" | "CREDIT_CARD" | "DEBIT_CARD" | "OTHER",
      referenceNumber: referenceNumber || undefined,
      notes: notes || undefined,
      paymentDate: paymentDate,
    });
  };

  if (!invoice) return null;

  const amountDue = parseFloat(invoice.amountDue);
  const amountPaid = parseFloat(invoice.amountPaid);
  const totalAmount = parseFloat(invoice.totalAmount);
  const paymentAmount = parseFloat(amount) || 0;
  const remainingAfterPayment = Math.max(0, amountDue - paymentAmount);
  const isFullPayment = paymentAmount >= amountDue;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Record Payment
          </DialogTitle>
          <DialogDescription>
            Record a payment for invoice {invoice.invoiceNumber}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Invoice Summary */}
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Invoice Total:</span>
              <span className="font-medium">{formatCurrency(totalAmount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Already Paid:</span>
              <span className="font-medium text-green-600">
                {formatCurrency(amountPaid)}
              </span>
            </div>
            <div className="flex justify-between text-sm border-t pt-2 mt-2">
              <span className="font-medium">Amount Due:</span>
              <span className="font-bold text-destructive">
                {formatCurrency(amountDue)}
              </span>
            </div>
          </div>

          {/* Payment Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Payment Amount *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                max={amountDue}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-7"
                placeholder="0.00"
                required
              />
            </div>
            {paymentAmount > 0 && (
              <div className="flex items-center gap-2 text-sm">
                {isFullPayment ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-green-600">Full payment - invoice will be marked as paid</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <span className="text-amber-600">
                      Partial payment - {formatCurrency(remainingAfterPayment)} will remain due
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Payment Method *</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((method) => (
                  <SelectItem key={method.value} value={method.value}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Payment Date */}
          <div className="space-y-2">
            <Label htmlFor="paymentDate">Payment Date</Label>
            <Input
              id="paymentDate"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
            />
          </div>

          {/* Reference Number */}
          <div className="space-y-2">
            <Label htmlFor="referenceNumber">Reference Number</Label>
            <Input
              id="referenceNumber"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="Check #, Transaction ID, etc."
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes about this payment..."
              rows={2}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={recordPaymentMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={recordPaymentMutation.isPending || !amount || parseFloat(amount) <= 0}
            >
              {recordPaymentMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Recording...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Record Payment
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default RecordPaymentDialog;
