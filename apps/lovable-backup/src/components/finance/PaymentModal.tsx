import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { recordPayment, PaymentAllocation } from "@/lib/financeOperations";
import { useToast } from "@/hooks/use-toast";

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  invoices: Array<{ id: string; invoice_number: string; balance: number }>;
}

export function PaymentModal({
  open,
  onClose,
  clientId,
  clientName,
  invoices,
}: PaymentModalProps) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<string>("");
  const [reference, setReference] = useState("");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const { toast } = useToast();

  const handleSubmit = () => {
    const paymentAmount = parseFloat(amount);
    
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid payment amount",
        variant: "destructive",
      });
      return;
    }

    if (!method) {
      toast({
        title: "Payment Method Required",
        description: "Please select a payment method",
        variant: "destructive",
      });
      return;
    }

    if (!selectedInvoiceId) {
      toast({
        title: "Invoice Required",
        description: "Please select an invoice to apply payment",
        variant: "destructive",
      });
      return;
    }

    const allocations: PaymentAllocation[] = [
      { invoice_id: selectedInvoiceId, amount: paymentAmount }
    ];

    const payment = recordPayment(clientId, paymentAmount, method, allocations, reference || undefined);

    toast({
      title: "Payment Recorded",
      description: `Payment ${payment.id} of $${paymentAmount.toFixed(2)} recorded successfully`,
    });

    onClose();
    setAmount("");
    setMethod("");
    setReference("");
    setSelectedInvoiceId("");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Payment - {clientName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Invoice *</Label>
            <Select value={selectedInvoiceId} onValueChange={setSelectedInvoiceId}>
              <SelectTrigger>
                <SelectValue placeholder="Select invoice" />
              </SelectTrigger>
              <SelectContent>
                {invoices.map((inv) => (
                  <SelectItem key={inv.id} value={inv.id}>
                    {inv.invoice_number} - Balance: ${inv.balance.toFixed(2)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Payment Amount *</Label>
            <Input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div>
            <Label>Payment Method *</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger>
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="Check">Check</SelectItem>
                <SelectItem value="Credit Card">Credit Card</SelectItem>
                <SelectItem value="ACH">ACH</SelectItem>
                <SelectItem value="Wire">Wire Transfer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Reference Number (Optional)</Label>
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Check #, confirmation #, etc."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Record Payment</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
