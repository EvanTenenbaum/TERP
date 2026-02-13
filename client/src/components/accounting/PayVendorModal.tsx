/**
 * WS-002: Quick Action - Pay Vendor Modal
 * 
 * A streamlined flow for recording vendor payments:
 * 1. Select Vendor
 * 2. Enter Amount
 * 3. Optionally link to Bill
 * 4. Confirm
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
import { 
  DollarSign, 
  Building2, 
  CreditCard, 
  FileText,
  CheckCircle,
  Loader2,
  Send
} from "lucide-react";
import { toast } from "sonner";

interface PayVendorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedVendorId?: number;
  preselectedBillId?: number;
  onSuccess?: (result: {
    paymentId: number;
    paymentNumber: string;
    paymentAmount: number;
  }) => void;
}

export function PayVendorModal({
  open,
  onOpenChange,
  preselectedVendorId,
  preselectedBillId,
  onSuccess,
}: PayVendorModalProps) {

  const utils = trpc.useUtils();

  // Form state
  const [vendorId, setVendorId] = useState<number | null>(preselectedVendorId || null);
  const [amount, setAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CHECK" | "WIRE" | "ACH" | "OTHER">("CASH");
  const [note, setNote] = useState<string>("");
  const [billId, setBillId] = useState<number | null>(preselectedBillId || null);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      setVendorId(preselectedVendorId || null);
      setAmount("");
      setPaymentMethod("CASH");
      setNote("");
      setBillId(preselectedBillId || null);
    }
  }, [open, preselectedVendorId, preselectedBillId]);

  // Fetch recent vendors for quick selection
  const { data: recentVendors, isLoading: loadingVendors } = trpc.accounting.quickActions.getRecentVendors.useQuery(
    { limit: 10 },
    { enabled: open }
  );

  // Fetch outstanding bills for selected vendor
  const { data: vendorBills } = trpc.accounting.bills.list.useQuery(
    { vendorId: vendorId ?? 0, status: "PENDING", limit: 10 },
    { enabled: !!vendorId }
  );

  // Submit mutation
  const payVendor = trpc.accounting.quickActions.payVendor.useMutation({
    onSuccess: (result) => {
      toast.success(`Payment Sent: ${result.paymentNumber}: $${result.paymentAmount.toLocaleString()} paid to ${result.vendorName}`);
      utils.accounting.payments.list.invalidate();
      utils.accounting.bills.list.invalidate();
      utils.accounting.quickActions.getRecentVendors.invalidate();
      onSuccess?.(result);
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const handleSubmit = () => {
    if (!vendorId || !amount || parseFloat(amount) <= 0) {
      toast.error("Validation Error: Please select a vendor and enter a valid amount");
      return;
    }

    payVendor.mutate({
      vendorId,
      amount: parseFloat(amount),
      paymentMethod,
      note: note || undefined,
      billId: billId || undefined,
    });
  };

  const formatCurrency = (value: number | string) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(num);
  };

  const billsList = vendorBills?.items || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-red-600" />
            Pay Vendor
          </DialogTitle>
          <DialogDescription>
            Quick action for recording vendor payments
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Select Vendor */}
          <div className="space-y-2">
            <Label htmlFor="vendor" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Vendor
            </Label>
            {loadingVendors ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading vendors...
              </div>
            ) : (
              <Select
                value={vendorId?.toString() || ""}
                onValueChange={(value) => {
                  setVendorId(parseInt(value));
                  setBillId(null); // Reset bill selection when vendor changes
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a vendor" />
                </SelectTrigger>
                <SelectContent>
                  {recentVendors?.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id.toString()}>
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Link to Bill (Optional) */}
          {vendorId && billsList.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="bill" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Link to Bill (Optional)
              </Label>
              <Select
                value={billId?.toString() || "none"}
                onValueChange={(value) => {
                  if (value === "none") {
                    setBillId(null);
                  } else {
                    setBillId(parseInt(value));
                    // Auto-fill amount from bill
                    interface Bill {
                      id: number;
                      amountDue?: string;
                      totalAmount: string;
                    }
                    const selectedBill = billsList.find((b: Bill) => b.id === parseInt(value));
                    if (selectedBill) {
                      setAmount(selectedBill.amountDue || selectedBill.totalAmount);
                    }
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a bill to pay" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No bill - standalone payment</SelectItem>
                  {billsList.map((bill: { id: number; billNumber: string; amountDue?: string; totalAmount: string }) => (
                    <SelectItem key={bill.id} value={bill.id.toString()}>
                      <div className="flex items-center justify-between w-full">
                        <span>{bill.billNumber}</span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          (Due: {formatCurrency(bill.amountDue || bill.totalAmount)})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Enter Amount */}
          {vendorId && (
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
                  onChange={(e) => setAmount(e.target.value)}
                  autoFocus
                />
              </div>
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

          {/* Payment Summary */}
          {vendorId && parseFloat(amount) > 0 && (
            <div className="rounded-lg border p-4 space-y-2 bg-muted/50">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Payment Amount:</span>
                <span className="font-mono font-medium text-red-600">
                  {formatCurrency(parseFloat(amount))}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Method:</span>
                <span>{paymentMethod}</span>
              </div>
              {billId && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Applied to Bill:</span>
                  <span>{billsList.find((b: { id: number; billNumber: string }) => b.id === billId)?.billNumber}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!vendorId || !amount || parseFloat(amount) <= 0 || payVendor.isPending}
            className="gap-2"
            variant="destructive"
          >
            {payVendor.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                Record Payment
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default PayVendorModal;
