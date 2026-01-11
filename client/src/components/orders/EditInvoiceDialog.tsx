/**
 * FEAT-008: Edit Invoice Dialog
 * Allows editing invoice details directly from order view
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
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { FileText, Loader2, Calendar, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface InvoiceData {
  id: number;
  invoiceNumber: string;
  invoiceDate: string | Date;
  dueDate: string | Date;
  totalAmount: string;
  amountPaid: string;
  amountDue: string;
  status: "DRAFT" | "SENT" | "VIEWED" | "PARTIAL" | "PAID" | "OVERDUE" | "VOID";
  notes?: string;
  paymentTerms?: string;
}

interface EditInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: number | null;
  onSuccess?: () => void;
}

const PAYMENT_TERMS_OPTIONS = [
  { value: "NET_7", label: "Net 7 Days" },
  { value: "NET_15", label: "Net 15 Days" },
  { value: "NET_30", label: "Net 30 Days" },
  { value: "NET_45", label: "Net 45 Days" },
  { value: "NET_60", label: "Net 60 Days" },
  { value: "DUE_ON_RECEIPT", label: "Due on Receipt" },
  { value: "CUSTOM", label: "Custom" },
] as const;

const INVOICE_STATUSES = [
  { value: "DRAFT", label: "Draft" },
  { value: "SENT", label: "Sent" },
  { value: "VIEWED", label: "Viewed" },
  { value: "PARTIAL", label: "Partial Payment" },
  { value: "PAID", label: "Paid" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "VOID", label: "Void" },
] as const;

export function EditInvoiceDialog({
  open,
  onOpenChange,
  invoiceId,
  onSuccess,
}: EditInvoiceDialogProps) {
  const [formData, setFormData] = useState({
    dueDate: "",
    notes: "",
    paymentTerms: "NET_30",
    status: "DRAFT" as InvoiceData["status"],
  });
  const [_isLoading, _setIsLoading] = useState(false);

  const utils = trpc.useUtils();

  // Fetch invoice details
  const { data: invoice, isLoading: fetchingInvoice } = trpc.accounting.invoices.getById.useQuery(
    { id: invoiceId || 0 },
    { enabled: !!invoiceId && open }
  );

  // Update form when invoice data loads
  useEffect(() => {
    if (invoice) {
      const dueDate = typeof invoice.dueDate === "string"
        ? invoice.dueDate.split("T")[0]
        : format(new Date(invoice.dueDate), "yyyy-MM-dd");

      setFormData({
        dueDate,
        notes: invoice.notes || "",
        paymentTerms: invoice.paymentTerms || "NET_30",
        status: invoice.status,
      });
    }
  }, [invoice]);

  // Update invoice mutation
  const updateInvoiceMutation = trpc.accounting.invoices.update.useMutation({
    onSuccess: () => {
      toast.success("Invoice updated successfully");
      utils.accounting.invoices.list.invalidate();
      utils.accounting.invoices.getById.invalidate({ id: invoiceId || 0 });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update invoice");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!invoiceId) return;

    updateInvoiceMutation.mutate({
      id: invoiceId,
      dueDate: formData.dueDate,
      notes: formData.notes || undefined,
      paymentTerms: formData.paymentTerms || undefined,
      status: formData.status,
    });
  };

  const formatCurrency = (value: string | number) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(num);
  };

  if (!invoiceId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Edit Invoice
          </DialogTitle>
          <DialogDescription>
            {invoice ? `Edit invoice ${invoice.invoiceNumber}` : "Loading invoice details..."}
          </DialogDescription>
        </DialogHeader>

        {fetchingInvoice ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : invoice ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Invoice Summary (Read-only) */}
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Invoice Number:</span>
                <span className="font-mono font-medium">{invoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Invoice Date:</span>
                <span>
                  {format(
                    typeof invoice.invoiceDate === "string"
                      ? new Date(invoice.invoiceDate)
                      : invoice.invoiceDate,
                    "MMM dd, yyyy"
                  )}
                </span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Amount:</span>
                <span className="font-medium">{formatCurrency(invoice.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount Paid:</span>
                <span className="font-medium text-green-600">
                  {formatCurrency(invoice.amountPaid)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-medium">Amount Due:</span>
                <span className="font-bold text-destructive">
                  {formatCurrency(invoice.amountDue)}
                </span>
              </div>
            </div>

            {/* Editable Fields */}
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
                  onChange={(e) =>
                    setFormData({ ...formData, dueDate: e.target.value })
                  }
                />
              </div>

              {/* Payment Terms */}
              <div className="space-y-2">
                <Label htmlFor="paymentTerms">Payment Terms</Label>
                <Select
                  value={formData.paymentTerms}
                  onValueChange={(value) =>
                    setFormData({ ...formData, paymentTerms: value })
                  }
                >
                  <SelectTrigger>
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

              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="status">Invoice Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: InvoiceData["status"]) =>
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {INVOICE_STATUSES.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.status === "VOID" && (
                  <div className="flex items-center gap-2 text-sm text-amber-600">
                    <AlertCircle className="h-4 w-4" />
                    <span>Voiding an invoice cannot be undone</span>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Internal Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Add internal notes about this invoice..."
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={updateInvoiceMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateInvoiceMutation.isPending}
              >
                {updateInvoiceMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Invoice not found
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default EditInvoiceDialog;
