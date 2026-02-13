import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { CheckCircle2, AlertCircle } from 'lucide-react';

interface ConfirmDraftModalProps {
  orderId: number;
  orderNumber: string;
  totalAmount: number;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ConfirmDraftModal({ 
  orderId, 
  orderNumber,
  totalAmount,
  open, 
  onClose, 
  onSuccess 
}: ConfirmDraftModalProps) {
  const [paymentTerms, setPaymentTerms] = useState<'CASH' | 'NET_30' | 'NET_60' | 'PARTIAL'>('CASH');
  const [cashPayment, setCashPayment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const confirmMutation = trpc.orders.confirmDraftOrder.useMutation();

  const handleConfirm = async () => {
    // Validation
    if (paymentTerms === 'PARTIAL') {
      const cashAmount = parseFloat(cashPayment);
      if (isNaN(cashAmount) || cashAmount <= 0) {
        toast.error('Please enter a valid cash payment amount');
        return;
      }
      if (cashAmount >= totalAmount) {
        toast.error('Cash payment must be less than total amount for partial payment');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await confirmMutation.mutateAsync({
        orderId,
        paymentTerms: paymentTerms as "COD" | "NET_7" | "NET_15" | "NET_30" | "CONSIGNMENT" | "PARTIAL",
        cashPayment: paymentTerms === 'PARTIAL' ? parseFloat(cashPayment) : undefined,
      });

      toast.success(`Order ${orderNumber} confirmed successfully!`, {
        description: 'Inventory has been reduced and the order is now active.',
      });
      
      onSuccess();
      onClose();
    } catch (error: unknown) {
      toast.error('Failed to confirm order', {
        description: error instanceof Error ? error.message : 'Please try again',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Confirm Draft Order
          </DialogTitle>
          <DialogDescription>
            Convert this draft to a confirmed order. Inventory will be reduced and the order will become active.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Order Summary */}
          <div className="rounded-lg border p-4 space-y-2 bg-muted/50">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Order Number:</span>
              <span className="font-medium">{orderNumber}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Amount:</span>
              <span className="font-semibold text-lg">{formatCurrency(totalAmount)}</span>
            </div>
          </div>

          {/* Payment Terms */}
          <div className="space-y-2">
            <Label htmlFor="payment-terms">Payment Terms *</Label>
            <Select value={paymentTerms} onValueChange={(value: 'CASH' | 'NET_30' | 'NET_60' | 'PARTIAL') => setPaymentTerms(value)}>
              <SelectTrigger id="payment-terms">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CASH">Cash (Full Payment)</SelectItem>
                <SelectItem value="NET_30">Net 30 Days</SelectItem>
                <SelectItem value="NET_60">Net 60 Days</SelectItem>
                <SelectItem value="PARTIAL">Partial Payment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Cash Payment for Partial */}
          {paymentTerms === 'PARTIAL' && (
            <div className="space-y-2">
              <Label htmlFor="cash-payment">Cash Payment Amount *</Label>
              <Input
                id="cash-payment"
                type="number"
                step="0.01"
                min="0"
                max={totalAmount}
                value={cashPayment}
                onChange={(e) => setCashPayment(e.target.value)}
                placeholder="0.00"
              />
              {cashPayment && parseFloat(cashPayment) > 0 && (
                <p className="text-sm text-muted-foreground">
                  Remaining balance: {formatCurrency(totalAmount - parseFloat(cashPayment))}
                </p>
              )}
            </div>
          )}

          {/* Warning */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">This action cannot be undone</p>
              <p className="text-xs mt-1">
                Confirming this draft will reduce inventory quantities and create an active order.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isSubmitting}>
            {isSubmitting ? 'Confirming...' : 'Confirm Order'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
