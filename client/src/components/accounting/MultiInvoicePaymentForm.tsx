/**
 * FEAT-007: Multi-Invoice Payment Form
 *
 * Enables recording payments against one or more invoices:
 * - Invoice selection (multi-select for batch payment)
 * - Payment method selection (Cash, Check, Wire, Crypto)
 * - Amount allocation per invoice
 * - Confirmation and receipt generation
 */

import { useState, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DollarSign, CheckCircle, Loader2, FileText, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface InvoiceAllocation {
  invoiceId: number;
  invoiceNumber: string;
  totalAmount: number;
  amountDue: number;
  allocatedAmount: number;
  isOverdue: boolean;
  selected: boolean;
}

interface MultiInvoicePaymentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedClientId?: number;
  onSuccess?: (result: {
    paymentId: number;
    paymentNumber: string;
    totalAmount: number;
    invoiceCount: number;
  }) => void;
}

export function MultiInvoicePaymentForm({
  open,
  onOpenChange,
  preselectedClientId,
  onSuccess,
}: MultiInvoicePaymentFormProps) {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  // Form state
  const [clientId, setClientId] = useState<number | null>(
    preselectedClientId || null
  );
  const [paymentMethod, setPaymentMethod] = useState<string>("CASH");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [allocations, setAllocations] = useState<InvoiceAllocation[]>([]);
  const [step, setStep] = useState<"select-client" | "allocate" | "confirm">(
    preselectedClientId ? "allocate" : "select-client"
  );

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      setClientId(preselectedClientId || null);
      setPaymentMethod("CASH");
      setReferenceNumber("");
      setNotes("");
      setAllocations([]);
      setStep(preselectedClientId ? "allocate" : "select-client");
    }
  }, [open, preselectedClientId]);

  // Fetch clients for selection
  const { data: clients, isLoading: loadingClients } =
    trpc.clients.list.useQuery(
      { limit: 50, offset: 0 },
      { enabled: open && step === "select-client" }
    );

  // Fetch outstanding invoices for selected client
  // LINT-007: Avoid non-null assertion by using -1 as fallback (query is disabled when clientId is null)
  const { data: outstandingInvoices, isLoading: loadingInvoices } =
    trpc.payments.getClientOutstandingInvoices.useQuery(
      { clientId: clientId ?? -1 },
      { enabled: open && clientId !== null && step === "allocate" }
    );

  // Initialize allocations when invoices are loaded
  useEffect(() => {
    if (outstandingInvoices) {
      setAllocations(
        outstandingInvoices.map(inv => ({
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber,
          totalAmount: inv.totalAmount,
          amountDue: inv.amountDue,
          allocatedAmount: 0,
          isOverdue: inv.isOverdue || false,
          selected: false,
        }))
      );
    }
  }, [outstandingInvoices]);

  // Record multi-invoice payment mutation
  const recordPayment = trpc.payments.recordMultiInvoicePayment.useMutation({
    onSuccess: result => {
      toast({
        title: "Payment recorded successfully",
        description: `Payment ${result.paymentNumber} for ${formatCurrency(
          result.totalAmount
        )} has been recorded against ${
          result.invoiceAllocations.length
        } invoice(s).`,
      });
      utils.payments.list.invalidate();
      utils.invoices.list.invalidate();
      utils.payments.getClientOutstandingInvoices.invalidate();
      onSuccess?.({
        paymentId: result.paymentId,
        paymentNumber: result.paymentNumber,
        totalAmount: result.totalAmount,
        invoiceCount: result.invoiceAllocations.length,
      });
      onOpenChange(false);
    },
    onError: error => {
      toast({
        variant: "destructive",
        title: "Failed to record payment",
        description: error.message,
      });
    },
  });

  // Calculated values
  const totalAllocated = useMemo(() => {
    return allocations
      .filter(a => a.selected)
      .reduce((sum, a) => sum + a.allocatedAmount, 0);
  }, [allocations]);

  const totalDue = useMemo(() => {
    return allocations
      .filter(a => a.selected)
      .reduce((sum, a) => sum + a.amountDue, 0);
  }, [allocations]);

  const selectedInvoiceCount = allocations.filter(a => a.selected).length;

  // Handlers
  const handleSelectAll = (selected: boolean) => {
    setAllocations(prev =>
      prev.map(a => ({
        ...a,
        selected,
        allocatedAmount: selected ? a.amountDue : 0,
      }))
    );
  };

  const handleToggleInvoice = (invoiceId: number, selected: boolean) => {
    setAllocations(prev =>
      prev.map(a =>
        a.invoiceId === invoiceId
          ? { ...a, selected, allocatedAmount: selected ? a.amountDue : 0 }
          : a
      )
    );
  };

  const handleAllocationChange = (invoiceId: number, amount: string) => {
    const numAmount = parseFloat(amount) || 0;
    setAllocations(prev =>
      prev.map(a =>
        a.invoiceId === invoiceId
          ? {
              ...a,
              allocatedAmount: Math.min(numAmount, a.amountDue),
              selected: numAmount > 0,
            }
          : a
      )
    );
  };

  const handlePayFullAmount = () => {
    setAllocations(prev =>
      prev.map(a => (a.selected ? { ...a, allocatedAmount: a.amountDue } : a))
    );
  };

  const handleSubmit = async () => {
    if (!clientId) return;

    const selectedAllocations = allocations
      .filter(a => a.selected && a.allocatedAmount > 0)
      .map(a => ({
        invoiceId: a.invoiceId,
        amount: a.allocatedAmount,
      }));

    if (selectedAllocations.length === 0) {
      toast({
        variant: "destructive",
        title: "No invoices selected",
        description: "Please select at least one invoice and enter an amount.",
      });
      return;
    }

    // LINT-005: Use specific payment method type instead of any
    type PaymentMethodType =
      | "CASH"
      | "CHECK"
      | "ACH"
      | "WIRE"
      | "CREDIT_CARD"
      | "OTHER";
    await recordPayment.mutateAsync({
      clientId,
      totalAmount: totalAllocated,
      allocations: selectedAllocations,
      paymentMethod: paymentMethod as PaymentMethodType,
      referenceNumber: referenceNumber || undefined,
      notes: notes || undefined,
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const selectedClient = clients?.items?.find(c => c.id === clientId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Record Payment
          </DialogTitle>
          <DialogDescription>
            Record a payment against one or more invoices
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Select Client */}
        {step === "select-client" && (
          <div className="space-y-4">
            <Label>Select Client</Label>
            {loadingClients ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="grid gap-2 max-h-[400px] overflow-y-auto">
                {clients?.items?.map(client => (
                  <div
                    key={client.id}
                    className={cn(
                      "p-3 border rounded-lg cursor-pointer hover:bg-accent transition-colors",
                      clientId === client.id && "border-primary bg-accent"
                    )}
                    onClick={() => setClientId(client.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{client.name}</span>
                      </div>
                      <Badge variant="outline">
                        Owes:{" "}
                        {formatCurrency(parseFloat(client.totalOwed || "0"))}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={() => setStep("allocate")} disabled={!clientId}>
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Allocate Payment */}
        {step === "allocate" && (
          <div className="space-y-4">
            {selectedClient && (
              <div className="flex items-center gap-2 p-2 bg-muted rounded">
                <User className="h-4 w-4" />
                <span className="font-medium">{selectedClient.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStep("select-client");
                    setAllocations([]);
                  }}
                >
                  Change
                </Button>
              </div>
            )}

            {/* Payment Method */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="CHECK">Check</SelectItem>
                    <SelectItem value="WIRE">Wire Transfer</SelectItem>
                    <SelectItem value="ACH">ACH</SelectItem>
                    <SelectItem value="CREDIT_CARD">Credit Card</SelectItem>
                    <SelectItem value="CRYPTO">Crypto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Reference Number (Optional)</Label>
                <Input
                  value={referenceNumber}
                  onChange={e => setReferenceNumber(e.target.value)}
                  placeholder="Check #, Wire ID, etc."
                />
              </div>
            </div>

            {/* Invoice Selection Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Select Invoices</Label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSelectAll(true)}
                  >
                    Select All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePayFullAmount}
                    disabled={selectedInvoiceCount === 0}
                  >
                    Pay Full Amount
                  </Button>
                </div>
              </div>

              {loadingInvoices ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : allocations.length === 0 ? (
                <Alert>
                  <AlertDescription>
                    No outstanding invoices for this client.
                  </AlertDescription>
                </Alert>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={
                            allocations.length > 0 &&
                            allocations.every(a => a.selected)
                          }
                          onCheckedChange={checked =>
                            handleSelectAll(!!checked)
                          }
                        />
                      </TableHead>
                      <TableHead>Invoice #</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Due</TableHead>
                      <TableHead className="text-right w-40">
                        Allocation
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allocations.map(allocation => (
                      <TableRow
                        key={allocation.invoiceId}
                        className={cn(
                          allocation.isOverdue && "bg-red-50 dark:bg-red-950/20"
                        )}
                      >
                        <TableCell>
                          <Checkbox
                            checked={allocation.selected}
                            onCheckedChange={checked =>
                              handleToggleInvoice(
                                allocation.invoiceId,
                                !!checked
                              )
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            {allocation.invoiceNumber}
                            {allocation.isOverdue && (
                              <Badge variant="destructive" className="text-xs">
                                Overdue
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(allocation.totalAmount)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(allocation.amountDue)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">$</span>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              max={allocation.amountDue}
                              value={allocation.allocatedAmount || ""}
                              onChange={e =>
                                handleAllocationChange(
                                  allocation.invoiceId,
                                  e.target.value
                                )
                              }
                              className="w-28 text-right"
                              disabled={!allocation.selected}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Add any notes about this payment..."
                rows={2}
              />
            </div>

            {/* Summary Card */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-base">Payment Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Selected Invoices
                  </span>
                  <span>{selectedInvoiceCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Due</span>
                  <span>{formatCurrency(totalDue)}</span>
                </div>
                <div className="flex justify-between font-medium text-lg border-t pt-2">
                  <span>Total Payment</span>
                  <span className="text-green-600">
                    {formatCurrency(totalAllocated)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  if (preselectedClientId) {
                    onOpenChange(false);
                  } else {
                    setStep("select-client");
                    setAllocations([]);
                  }
                }}
              >
                {preselectedClientId ? "Cancel" : "Back"}
              </Button>
              <Button
                onClick={() => setStep("confirm")}
                disabled={selectedInvoiceCount === 0 || totalAllocated <= 0}
              >
                Review Payment
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === "confirm" && (
          <div className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Please review the payment details before confirming.
              </AlertDescription>
            </Alert>

            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Client:</span>
                    <p className="font-medium">{selectedClient?.name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      Payment Method:
                    </span>
                    <p className="font-medium">{paymentMethod}</p>
                  </div>
                  {referenceNumber && (
                    <div>
                      <span className="text-muted-foreground">Reference:</span>
                      <p className="font-medium">{referenceNumber}</p>
                    </div>
                  )}
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Invoice Allocations:</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allocations
                        .filter(a => a.selected && a.allocatedAmount > 0)
                        .map(a => (
                          <TableRow key={a.invoiceId}>
                            <TableCell>{a.invoiceNumber}</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(a.allocatedAmount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      <TableRow className="font-medium">
                        <TableCell>Total</TableCell>
                        <TableCell className="text-right text-green-600">
                          {formatCurrency(totalAllocated)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                {notes && (
                  <div className="border-t pt-4">
                    <span className="text-muted-foreground text-sm">
                      Notes:
                    </span>
                    <p className="text-sm">{notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("allocate")}>
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={recordPayment.isPending}>
                {recordPayment.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Recording...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Confirm Payment
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
