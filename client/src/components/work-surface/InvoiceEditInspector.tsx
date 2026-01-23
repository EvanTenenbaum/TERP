/**
 * InvoiceEditInspector (UXS-601)
 *
 * Work Surface inspector panel replacement for EditInvoiceDialog.
 * Allows editing invoice details while maintaining order/invoice context visibility.
 *
 * Benefits over modal:
 * - Invoice list remains visible in main panel
 * - Keyboard navigation preserved
 * - Consistent with Work Surface patterns
 */

import React, { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  FileText,
  Loader2,
  Calendar,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Save,
  FileWarning,
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

type InvoiceStatus = 'DRAFT' | 'SENT' | 'VIEWED' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'VOID';

interface InvoiceEditInspectorProps {
  invoiceId: number | null;
  onClose: () => void;
  onSuccess?: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const PAYMENT_TERMS_OPTIONS = [
  { value: 'NET_7', label: 'Net 7 Days' },
  { value: 'NET_15', label: 'Net 15 Days' },
  { value: 'NET_30', label: 'Net 30 Days' },
  { value: 'NET_45', label: 'Net 45 Days' },
  { value: 'NET_60', label: 'Net 60 Days' },
  { value: 'DUE_ON_RECEIPT', label: 'Due on Receipt' },
  { value: 'CUSTOM', label: 'Custom' },
] as const;

const STATUS_CONFIG: Record<InvoiceStatus, { icon: React.ElementType; color: string; label: string }> = {
  DRAFT: { icon: FileText, color: 'bg-gray-100 text-gray-700', label: 'Draft' },
  SENT: { icon: Clock, color: 'bg-blue-100 text-blue-700', label: 'Sent' },
  VIEWED: { icon: FileText, color: 'bg-purple-100 text-purple-700', label: 'Viewed' },
  PARTIAL: { icon: Clock, color: 'bg-yellow-100 text-yellow-700', label: 'Partial' },
  PAID: { icon: CheckCircle, color: 'bg-green-100 text-green-700', label: 'Paid' },
  OVERDUE: { icon: AlertCircle, color: 'bg-red-100 text-red-700', label: 'Overdue' },
  VOID: { icon: XCircle, color: 'bg-gray-100 text-gray-500', label: 'Void' },
};

// ============================================================================
// Helpers
// ============================================================================

const formatCurrency = (value: string | number) => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(num);
};

// ============================================================================
// Status Badge
// ============================================================================

function StatusBadge({ status }: { status: InvoiceStatus }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;
  const Icon = config.icon;
  return (
    <Badge variant="outline" className={cn('flex items-center gap-1', config.color)}>
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function InvoiceEditInspector({
  invoiceId,
  onClose,
  onSuccess,
}: InvoiceEditInspectorProps) {
  // Form state
  const [formData, setFormData] = useState({
    dueDate: '',
    notes: '',
    paymentTerms: 'NET_30',
  });

  const utils = trpc.useUtils();

  // Fetch invoice details
  const { data: invoice, isLoading: fetchingInvoice } = trpc.accounting.invoices.getById.useQuery(
    { id: invoiceId || 0 },
    { enabled: !!invoiceId }
  );

  // Update form when invoice data loads
  useEffect(() => {
    if (invoice) {
      let dueDateStr = '';
      if (invoice.dueDate) {
        const dateValue = invoice.dueDate as unknown;
        if (typeof dateValue === 'string') {
          dueDateStr = dateValue.split('T')[0];
        } else if (dateValue instanceof Date) {
          dueDateStr = format(dateValue, 'yyyy-MM-dd');
        }
      }

      setFormData({
        dueDate: dueDateStr,
        notes: (invoice.notes as string) || '',
        paymentTerms: (invoice.paymentTerms as string) || 'NET_30',
      });
    }
  }, [invoice]);

  // Update mutation
  const updateInvoiceMutation = trpc.accounting.invoices.update.useMutation({
    onSuccess: () => {
      toast.success('Invoice updated successfully');
      utils.accounting.invoices.list.invalidate();
      utils.accounting.invoices.getById.invalidate({ id: invoiceId || 0 });
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update invoice');
    },
  });

  // Handlers
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();

    if (!invoiceId || !invoice) return;

    if (invoice.status === 'PAID' || invoice.status === 'VOID') {
      toast.error(`Cannot edit ${(invoice.status as string).toLowerCase()} invoices`);
      return;
    }

    updateInvoiceMutation.mutate({
      id: invoiceId,
      dueDate: formData.dueDate ? new Date(formData.dueDate) : undefined,
      notes: formData.notes || undefined,
      paymentTerms: formData.paymentTerms || undefined,
    });
  }, [invoiceId, invoice, formData, updateInvoiceMutation]);

  // Keyboard handler
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && e.metaKey) {
      handleSubmit(e as unknown as React.FormEvent);
    }
  }, [onClose, handleSubmit]);

  // Empty state
  if (!invoiceId) {
    return (
      <InspectorPanel title="Edit Invoice" onClose={onClose}>
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <FileText className="h-12 w-12 mb-4 opacity-50" />
          <p>Select an invoice to edit</p>
        </div>
      </InspectorPanel>
    );
  }

  // Loading state
  if (fetchingInvoice) {
    return (
      <InspectorPanel title="Edit Invoice" onClose={onClose}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </InspectorPanel>
    );
  }

  // Invoice not found
  if (!invoice) {
    return (
      <InspectorPanel title="Edit Invoice" onClose={onClose}>
        <div className="text-center py-8 text-muted-foreground">
          Invoice not found
        </div>
      </InspectorPanel>
    );
  }

  const isEditable = invoice.status !== 'PAID' && invoice.status !== 'VOID';
  const statusMessage = invoice.status === 'PAID'
    ? 'This invoice has been paid and cannot be edited.'
    : invoice.status === 'VOID'
    ? 'This invoice has been voided and cannot be edited.'
    : null;

  return (
    <InspectorPanel
      title="Edit Invoice"
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-6">
        {/* Restriction Warning */}
        {statusMessage && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
            <FileWarning className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-amber-900">Editing Restricted</p>
              <p className="text-sm text-amber-700 mt-1">{statusMessage}</p>
            </div>
          </div>
        )}

        {/* Invoice Summary */}
        <InspectorSection title="Invoice Summary" defaultOpen>
          <div className="bg-muted/50 p-4 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono font-semibold">{invoice.invoiceNumber}</span>
              <StatusBadge status={invoice.status as InvoiceStatus} />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t">
              <div>
                <p className="text-xs text-muted-foreground">Invoice Date</p>
                <p className="font-medium">
                  {format(
                    typeof invoice.invoiceDate === 'string'
                      ? new Date(invoice.invoiceDate)
                      : invoice.invoiceDate,
                    'MMM dd, yyyy'
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Amount</p>
                <p className="font-semibold">{formatCurrency(invoice.totalAmount)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t">
              <div>
                <p className="text-xs text-muted-foreground">Amount Paid</p>
                <p className="font-semibold text-green-600">{formatCurrency(invoice.amountPaid)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Amount Due</p>
                <p className="font-bold text-destructive">{formatCurrency(invoice.amountDue)}</p>
              </div>
            </div>
          </div>
        </InspectorSection>

        {/* Editable Fields */}
        <InspectorSection title="Edit Details" defaultOpen>
          <div className="space-y-4">
            {/* Due Date */}
            <div className="space-y-2">
              <Label htmlFor="dueDate" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Due Date
              </Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                disabled={!isEditable}
              />
            </div>

            {/* Payment Terms */}
            <div className="space-y-2">
              <Label htmlFor="paymentTerms">Payment Terms</Label>
              <Select
                value={formData.paymentTerms}
                onValueChange={(value) => setFormData({ ...formData, paymentTerms: value })}
                disabled={!isEditable}
              >
                <SelectTrigger disabled={!isEditable}>
                  <SelectValue placeholder="Select payment terms" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_TERMS_OPTIONS.map((term) => (
                    <SelectItem key={term.value} value={term.value}>
                      {term.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Internal Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Add internal notes about this invoice..."
                rows={3}
                disabled={!isEditable}
              />
            </div>
          </div>
        </InspectorSection>

        {/* Actions */}
        <InspectorSection title="Actions" defaultOpen>
          <div className="flex flex-col gap-2">
            {isEditable && (
              <Button
                type="submit"
                disabled={updateInvoiceMutation.isPending}
                className="w-full"
              >
                {updateInvoiceMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes (Cmd+Enter)
                  </>
                )}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={updateInvoiceMutation.isPending}
              className="w-full"
            >
              {isEditable ? 'Cancel (Esc)' : 'Close (Esc)'}
            </Button>
          </div>
          {isEditable && (
            <p className="text-xs text-muted-foreground mt-3 text-center">
              Tip: Press Cmd+Enter to save, Esc to cancel
            </p>
          )}
        </InspectorSection>
      </form>
    </InspectorPanel>
  );
}

export default InvoiceEditInspector;
