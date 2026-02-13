/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";


import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Trash2,
  Save,
  ShoppingCart,
  Calendar,
  DollarSign,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { OrderItemCard } from "./OrderItemCard";
import { CogsAdjustmentModal } from "./CogsAdjustmentModal";

interface OrderItem {
  batchId: number;
  displayName: string;
  quantity: number;
  unitPrice: number;
  unitCogs?: number;
  cogsSource?: string;
  isSample: boolean;
  originalName: string;
  cogsMode?: string;
  unitCogsMin?: string;
  unitCogsMax?: string;
  // Computed properties used in this component
  lineTotal: number;
  lineCogs: number;
  // Properties used in mutation
  overridePrice?: number;
  overrideCogs?: number;
}

interface OrderPreviewProps {
  orderType: "QUOTE" | "SALE";
  isDraft?: boolean;
  clientId: number;
  items: OrderItem[];
  onRemoveItem: (batchId: number) => void;
  onClearAll: () => void;
  onUpdateItem: (batchId: number, updates: Partial<OrderItem>) => void;
  _clientDetails?: Record<string, unknown>;
}

export function OrderPreview({
  orderType,
  isDraft = true,
  clientId,
  items,
  onRemoveItem,
  onClearAll,
  onUpdateItem,
  _clientDetails,
}: OrderPreviewProps) {
  const [, setLocation] = useLocation();
  const [validUntil, setValidUntil] = useState<string>("");
  const [paymentTerms, setPaymentTerms] = useState<"COD" | "NET_7" | "NET_15" | "NET_30" | "CONSIGNMENT" | "PARTIAL">("NET_30");
  const [cashPayment, setCashPayment] = useState<number>(0);
  const [notes, setNotes] = useState<string>("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedItemForCogs, setSelectedItemForCogs] = useState<any>(null);
  const [showTotalsBreakdown, setShowTotalsBreakdown] = useState(false);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);

  const createOrderMutation = trpc.orders.create.useMutation({
    onSuccess: (data) => {
      toast.success(
        orderType === "QUOTE"
          ? `Quote ${data.orderNumber} created successfully!`
          : `Sale ${data.orderNumber} created successfully!`
      );
      // Reset form
      onClearAll();
      setNotes("");
      setValidUntil("");
      setCashPayment(0);
    },
    onError: (error) => {
      toast.error(`Failed to create ${orderType.toLowerCase()}: ${error.message}`);
    },
  });

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + (item as any).lineTotal, 0);
  const totalCogs = items.reduce((sum, item) => sum + (item as any).lineCogs, 0);
  const totalMargin = subtotal - totalCogs;
  const avgMarginPercent = subtotal > 0 ? (totalMargin / subtotal) * 100 : 0;

  // Get margin color
  const getMarginColor = (percent: number) => {
    if (percent >= 70) return "text-green-600";
    if (percent >= 50) return "text-green-500";
    if (percent >= 30) return "text-yellow-600";
    if (percent >= 15) return "text-orange-600";
    return "text-red-600";
  };

  const handleSave = () => {
    if (items.length === 0) {
      toast.error("Please add at least one item");
      return;
    }

    if (orderType === "QUOTE" && !validUntil) {
      toast.error("Please set a valid until date for the quote");
      return;
    }

    createOrderMutation.mutate({
      orderType,
      isDraft,
      clientId,
      items: items.map((item) => ({
        batchId: item.batchId,
        displayName: item.displayName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        isSample: item.isSample,
        overridePrice: (item as any).overridePrice,
        overrideCogs: (item as any).overrideCogs,
        lineTotal: (item as any).lineTotal,
        lineCogs: (item as any).lineCogs,
      })),
      validUntil: orderType === "QUOTE" ? validUntil : undefined,
      paymentTerms: !isDraft && orderType === "SALE" ? (paymentTerms as "COD" | "NET_7" | "NET_15" | "NET_30" | "CONSIGNMENT" | "PARTIAL") : undefined,
      cashPayment: !isDraft && orderType === "SALE" && paymentTerms === "PARTIAL" ? cashPayment : undefined,
      notes,
    });
  };

  return (
    <Card className="sticky top-4">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{orderType === "QUOTE" ? "Quote" : "Sale"} Preview</span>
          {items.length > 0 && (
            <Badge variant="secondary">{items.length} items</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No items added yet</p>
            <p className="text-sm">Browse inventory to add items</p>
          </div>
        ) : (
          <>
            {/* Items List */}
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-3">
                {items.map((item) => (
                  <OrderItemCard
                    key={item.batchId}
                    item={item}
                    onRemove={() => onRemoveItem(item.batchId)}
                    onUpdate={(updates) => onUpdateItem(item.batchId, updates)}
                    onAdjustCogs={() => setSelectedItemForCogs(item as any)}
                  />
                ))}
              </div>
            </ScrollArea>

            <Separator />

            {/* Totals Panel with Progressive Disclosure */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">Total</span>
                <span className="text-xl font-bold">${subtotal.toFixed(2)}</span>
              </div>
              
              {/* Level 1: Just show margin (default) */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setShowTotalsBreakdown(!showTotalsBreakdown)}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <TrendingUp className="h-4 w-4" />
                  <span>Profit Margin</span>
                </button>
                <span className={`text-lg font-semibold ${getMarginColor(avgMarginPercent)}`}>
                  {avgMarginPercent.toFixed(1)}%
                </span>
              </div>

              {/* Level 2: Show breakdown on click */}
              {showTotalsBreakdown && (
                <div className="pl-6 space-y-1 text-sm border-l-2 border-muted">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">COGS</span>
                    <span>${totalCogs.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Margin</span>
                    <span className="text-green-600">${totalMargin.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Items</span>
                    <span>{items.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Samples</span>
                    <span>{items.filter(i => i.isSample).length}</span>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Quote-specific fields */}
            {orderType === "QUOTE" && (
              <div className="space-y-2">
                <Label htmlFor="valid-until" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Valid Until
                </Label>
                <Input
                  id="valid-until"
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
            )}

            {/* Sale-specific fields */}
            {orderType === "SALE" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="payment-terms" className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Payment Terms
                  </Label>
                  <Select value={paymentTerms} onValueChange={(v) => setPaymentTerms(v as any)}>
                    <SelectTrigger id="payment-terms">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="COD">Cash on Delivery</SelectItem>
                      <SelectItem value="NET_7">Net 7 Days</SelectItem>
                      <SelectItem value="NET_15">Net 15 Days</SelectItem>
                      <SelectItem value="NET_30">Net 30 Days</SelectItem>
                      <SelectItem value="PARTIAL">Partial Payment</SelectItem>
                      <SelectItem value="CONSIGNMENT">Consignment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {paymentTerms === "PARTIAL" && (
                  <div className="space-y-2">
                    <Label htmlFor="cash-payment">Cash Payment Amount</Label>
                    <Input
                      id="cash-payment"
                      type="number"
                      min="0"
                      max={subtotal}
                      step="0.01"
                      value={cashPayment}
                      onChange={(e) => setCashPayment(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                    {cashPayment > 0 && (
                      <p className="text-sm text-muted-foreground">
                        Remaining: ${(subtotal - cashPayment).toFixed(2)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional notes..."
                rows={3}
              />
            </div>

            <Separator />

            {/* Actions */}
            <div className="space-y-2">
              <Button
                onClick={handleSave}
                disabled={createOrderMutation.isPending}
                className="w-full"
                size="lg"
              >
                {createOrderMutation.isPending ? (
                  "Creating..."
                ) : isDraft ? (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save as Draft
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Confirm & Create Order
                  </>
                )}
              </Button>

              <Button
                onClick={() => {
                  setShowClearAllConfirm(true);
                  // TODO: Implement clear all confirmation dialog
                }}
                variant="outline"
                className="w-full"
                disabled={createOrderMutation.isPending}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            </div>
          </>
        )}
      </CardContent>

      {/* COGS Adjustment Modal */}
      {selectedItemForCogs && (
        <CogsAdjustmentModal
          item={selectedItemForCogs}
          clientDetails={_clientDetails}
          onClose={() => setSelectedItemForCogs(null)}
          onSave={(updates: any) => {
            onUpdateItem(selectedItemForCogs.batchId as number, updates);
            setSelectedItemForCogs(null);
          }}
        />
      )}
    </Card>
  );
}

