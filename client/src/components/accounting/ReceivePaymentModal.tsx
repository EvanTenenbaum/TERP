/**
 * WS-001: Quick Action - Receive Client Payment Modal
 * 
 * A streamlined 3-click flow for recording client cash drop-offs:
 * 1. Select Client
 * 2. Enter Amount
 * 3. Confirm & Generate Receipt
 * 
 * WS-006: Integrated ReceiptPreview for post-payment receipt viewing
 */

import { useState, useEffect } from "react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  DollarSign, 
  User, 
  CreditCard, 
  FileText,
  AlertTriangle,
  CheckCircle,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ReceiptPreview } from "@/components/receipts/ReceiptPreview";

interface ReceivePaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedClientId?: number;
  onSuccess?: (result: {
    paymentId: number;
    paymentNumber: string;
    previousBalance: number;
    newBalance: number;
    receiptId?: number;
  }) => void;
}

export function ReceivePaymentModal({
  open,
  onOpenChange,
  preselectedClientId,
  onSuccess,
}: ReceivePaymentModalProps) {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  // Form state
  const [clientId, setClientId] = useState<number | null>(preselectedClientId || null);
  const [amount, setAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CHECK" | "WIRE" | "ACH" | "OTHER">("CASH");
  const [note, setNote] = useState<string>("");
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Receipt preview state (WS-006)
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const [receiptId, setReceiptId] = useState<number | null>(null);
  const [clientEmail, setClientEmail] = useState<string | undefined>();
  const [clientPhone, setClientPhone] = useState<string | undefined>();

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      setClientId(preselectedClientId || null);
      setAmount("");
      setPaymentMethod("CASH");
      setNote("");
      setStep(preselectedClientId ? 2 : 1);
      setShowReceiptPreview(false);
      setReceiptId(null);
    }
  }, [open, preselectedClientId]);

  // Fetch recent clients for quick selection
  const { data: recentClients, isLoading: loadingClients } = trpc.accounting.quickActions.getRecentClients.useQuery(
    { limit: 10 },
    { enabled: open && step === 1 }
  );

  // Preview balance calculation
  const { data: balancePreview, isLoading: loadingPreview } = trpc.accounting.quickActions.previewPaymentBalance.useQuery(
    { clientId: clientId!, amount: parseFloat(amount) || 0 },
    { enabled: !!clientId && parseFloat(amount) > 0 && step >= 2 }
  );

  // Submit mutation
  const receivePayment = trpc.accounting.quickActions.receiveClientPayment.useMutation({
    onSuccess: (result) => {
      toast({
        title: "Payment Recorded",
        description: `${result.paymentNumber}: $${result.paymentAmount.toLocaleString()} received from ${result.clientName}`,
      });
      utils.accounting.payments.list.invalidate();
      utils.accounting.quickActions.getRecentClients.invalidate();
      
      // Show receipt preview if receipt was generated (WS-006)
      // Note: Backend returns receiptUrl, not receiptId. Future enhancement may add
      // receiptId, clientEmail, clientPhone for receipt preview functionality.
      const extendedResult = result as typeof result & {
        receiptId?: number;
        clientEmail?: string;
        clientPhone?: string;
      };
      
      if (extendedResult.receiptId) {
        setReceiptId(extendedResult.receiptId);
        setClientEmail(extendedResult.clientEmail);
        setClientPhone(extendedResult.clientPhone);
        setShowReceiptPreview(true);
      } else {
        onSuccess?.(result);
        onOpenChange(false);
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!clientId || !amount || parseFloat(amount) <= 0) {
      toast({
        title: "Validation Error",
        description: "Please select a client and enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    receivePayment.mutate({
      clientId,
      amount: parseFloat(amount),
      paymentMethod,
      note: note || undefined,
      generateReceipt: true,
    });
  };

  const handleReceiptPreviewClose = () => {
    setShowReceiptPreview(false);
    onSuccess?.({
      paymentId: receivePayment.data?.paymentId || 0,
      paymentNumber: receivePayment.data?.paymentNumber || "",
      previousBalance: receivePayment.data?.previousBalance || 0,
      newBalance: receivePayment.data?.newBalance || 0,
      receiptId: receiptId || undefined,
    });
    onOpenChange(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  // If showing receipt preview, render that instead
  if (showReceiptPreview && receiptId) {
    return (
      <ReceiptPreview
        isOpen={true}
        onClose={handleReceiptPreviewClose}
        receiptId={receiptId}
        clientEmail={clientEmail}
        clientPhone={clientPhone}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Receive Client Payment
          </DialogTitle>
          <DialogDescription>
            Quick action for recording client cash drop-offs
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Step 1: Select Client */}
          <div className="space-y-2">
            <Label htmlFor="client" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Client
            </Label>
            {loadingClients ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading clients...
              </div>
            ) : (
              <Select
                value={clientId?.toString() || ""}
                onValueChange={(value) => {
                  setClientId(parseInt(value));
                  if (step === 1) setStep(2);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {recentClients?.map((client) => (
                    <SelectItem key={client.id} value={client.id.toString()}>
                      <div className="flex items-center justify-between w-full">
                        <span>{client.name}</span>
                        {Number(client.totalOwed) > 0 && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            (Owes: {formatCurrency(Number(client.totalOwed))})
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Step 2: Enter Amount */}
          {clientId && (
            <div className="space-y-2">
              <Label htmlFor="amount" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Amount
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  className="pl-7 text-lg font-mono"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    if (step === 2 && parseFloat(e.target.value) > 0) setStep(3);
                  }}
                  autoFocus={step === 2}
                />
              </div>
            </div>
          )}

          {/* Balance Preview */}
          {balancePreview && parseFloat(amount) > 0 && (
            <div className="rounded-lg border p-4 space-y-2 bg-muted/50">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Current Balance:</span>
                <span className="font-mono">{formatCurrency(balancePreview.currentBalance)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Payment Amount:</span>
                <span className="font-mono text-green-600">- {formatCurrency(balancePreview.paymentAmount)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-medium">
                <span>New Balance:</span>
                <span className={`font-mono ${balancePreview.projectedBalance < 0 ? "text-blue-600" : ""}`}>
                  {formatCurrency(balancePreview.projectedBalance)}
                </span>
              </div>
              
              {balancePreview.willCreateCredit && (
                <Alert className="mt-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    This payment exceeds the current balance. The client will have a credit of {formatCurrency(Math.abs(balancePreview.projectedBalance))}.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Payment Method */}
          {parseFloat(amount) > 0 && (
            <div className="space-y-2">
              <Label htmlFor="paymentMethod" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Payment Method
              </Label>
              <Select
                value={paymentMethod}
                onValueChange={(value) => setPaymentMethod(value as typeof paymentMethod)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="CHECK">Check</SelectItem>
                  <SelectItem value="WIRE">Wire Transfer</SelectItem>
                  <SelectItem value="ACH">ACH</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Note (Optional) */}
          {parseFloat(amount) > 0 && (
            <div className="space-y-2">
              <Label htmlFor="note" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Note (Optional)
              </Label>
              <Textarea
                id="note"
                placeholder="Add a note about this payment..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!clientId || !amount || parseFloat(amount) <= 0 || receivePayment.isPending}
            className="gap-2"
          >
            {receivePayment.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                Record Payment & Generate Receipt
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ReceivePaymentModal;
