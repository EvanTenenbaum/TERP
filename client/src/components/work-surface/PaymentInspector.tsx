/**
 * PaymentInspector (UXS-601)
 *
 * Work Surface inspector panel replacement for RecordPaymentDialog.
 * Allows recording payments while maintaining invoice context visibility.
 *
 * Benefits over modal:
 * - Invoice remains visible in main panel
 * - Keyboard navigation preserved
 * - Consistent with Work Surface patterns
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  DollarSign,
  CreditCard,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Calendar,
  FileText,
  X,
  Hash,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  InspectorPanel,
  InspectorSection,
  InspectorField,
} from './InspectorPanel';

// ============================================================================
// Types
// ============================================================================

interface Invoice {
  id: number;
  invoiceNumber: string;
  totalAmount: string;
  amountPaid: string;
  amountDue: string;
  status: string;
  clientName?: string;
  dueDate?: string;
}

interface PaymentInspectorProps {
  invoice: Invoice | null;
  onClose: () => void;
  onSuccess?: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'CHECK', label: 'Check' },
  { value: 'WIRE', label: 'Wire Transfer' },
  { value: 'ACH', label: 'ACH' },
  { value: 'CREDIT_CARD', label: 'Credit Card' },
  { value: 'DEBIT_CARD', label: 'Debit Card' },
  { value: 'OTHER', label: 'Other' },
] as const;

type PaymentMethod = typeof PAYMENT_METHODS[number]['value'];

// ============================================================================
// Helpers
// ============================================================================

const formatCurrency = (value: number | string) => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(num);
};

// ============================================================================
// Main Component
// ============================================================================

export function PaymentInspector({
  invoice,
  onClose,
  onSuccess,
}: PaymentInspectorProps) {
  // Form state
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Refs
  const amountInputRef = useRef<HTMLInputElement>(null);

  // Reset form when invoice changes
  useEffect(() => {
    if (invoice) {
      const dueAmount = parseFloat(invoice.amountDue);
      setAmount(dueAmount > 0 ? dueAmount.toFixed(2) : '');
      setPaymentMethod('CASH');
      setReferenceNumber('');
      setNotes('');
      setPaymentDate(format(new Date(), 'yyyy-MM-dd'));
      // Focus amount input
      setTimeout(() => amountInputRef.current?.focus(), 100);
    }
  }, [invoice]);

  // Mutation
  const utils = trpc.useUtils();
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
      onClose();
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to record payment');
    },
  });

  // Handlers
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();

    if (!invoice) return;

    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      toast.error('Please enter a valid payment amount');
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
      paymentMethod: paymentMethod,
      referenceNumber: referenceNumber || undefined,
      notes: notes || undefined,
      paymentDate: paymentDate,
    });
  }, [invoice, amount, paymentMethod, referenceNumber, notes, paymentDate, recordPaymentMutation]);

  // Keyboard handler
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && e.metaKey) {
      handleSubmit(e as unknown as React.FormEvent);
    }
  }, [onClose, handleSubmit]);

  if (!invoice) {
    return (
      <InspectorPanel title="Record Payment" onClose={onClose}>
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <CreditCard className="h-12 w-12 mb-4 opacity-50" />
          <p>Select an invoice to record a payment</p>
        </div>
      </InspectorPanel>
    );
  }

  const amountDue = parseFloat(invoice.amountDue);
  const amountPaid = parseFloat(invoice.amountPaid);
  const totalAmount = parseFloat(invoice.totalAmount);
  const paymentAmount = parseFloat(amount) || 0;
  const remainingAfterPayment = Math.max(0, amountDue - paymentAmount);
  const isFullPayment = paymentAmount >= amountDue;

  return (
    <InspectorPanel
      title="Record Payment"
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-6">
        {/* Invoice Context */}
        <InspectorSection title="Invoice" defaultOpen>
          <div className="bg-muted/50 p-4 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">{invoice.invoiceNumber}</span>
              </div>
              <Badge variant="outline" className={cn(
                invoice.status === 'PAID' && 'bg-green-100 text-green-700',
                invoice.status === 'PARTIALLY_PAID' && 'bg-yellow-100 text-yellow-700',
                invoice.status === 'UNPAID' && 'bg-red-100 text-red-700'
              )}>
                {invoice.status}
              </Badge>
            </div>

            {invoice.clientName && (
              <div className="flex items-center gap-2 text-sm">
                <User className="h-3 w-3 text-muted-foreground" />
                <span>{invoice.clientName}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 pt-2 border-t">
              <div>
                <p className="text-xs text-muted-foreground">Invoice Total</p>
                <p className="font-semibold">{formatCurrency(totalAmount)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Already Paid</p>
                <p className="font-semibold text-green-600">{formatCurrency(amountPaid)}</p>
              </div>
            </div>

            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">Amount Due</p>
              <p className="text-xl font-bold text-destructive">{formatCurrency(amountDue)}</p>
            </div>
          </div>
        </InspectorSection>

        {/* Payment Form */}
        <InspectorSection title="Payment Details" defaultOpen>
          <div className="space-y-4">
            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Payment Amount *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={amountInputRef}
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={amountDue}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-9"
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
              <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
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
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="paymentDate"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Reference Number */}
            <div className="space-y-2">
              <Label htmlFor="referenceNumber">Reference Number</Label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="referenceNumber"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="Check #, Transaction ID, etc."
                  className="pl-9"
                />
              </div>
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
          </div>
        </InspectorSection>

        {/* Actions */}
        <InspectorSection title="Actions" defaultOpen>
          <div className="flex flex-col gap-2">
            <Button
              type="submit"
              disabled={recordPaymentMutation.isPending || !amount || parseFloat(amount) <= 0}
              className="w-full"
            >
              {recordPaymentMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Recording...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Record Payment (Cmd+Enter)
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={recordPaymentMutation.isPending}
              className="w-full"
            >
              Cancel (Esc)
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3 text-center">
            Tip: Press Cmd+Enter to submit, Esc to cancel
          </p>
        </InspectorSection>
      </form>
    </InspectorPanel>
  );
}

export default PaymentInspector;
