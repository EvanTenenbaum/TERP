/**
 * OrderFulfillment Component
 * Comprehensive order fulfillment workflow management
 *
 * Wave 5A: Sales Workflow Completion
 * - Order confirmation
 * - Pick/pack fulfillment
 * - Shipping with tracking
 * - Delivery confirmation
 */

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  CheckCircle,
  Package,
  Truck,
  MapPin,
  Loader2,
  ClipboardCheck,
} from "lucide-react";

interface OrderItem {
  batchId: number;
  displayName: string;
  quantity: number;
  unitPrice: number;
  isSample?: boolean;
  pickedQuantity?: number;
  pickedAt?: string;
}

interface Order {
  id: number;
  orderNumber: string;
  orderType: "QUOTE" | "SALE";
  clientId: number;
  items: OrderItem[] | string;
  total: string;
  fulfillmentStatus?: "PENDING" | "PACKED" | "SHIPPED";
  saleStatus?: "PENDING" | "PARTIAL" | "PAID" | "OVERDUE" | "CANCELLED";
  notes?: string;
  confirmedAt?: Date | null;
  packedAt?: Date | null;
  shippedAt?: Date | null;
}

interface OrderFulfillmentProps {
  order: Order;
  onUpdate: () => void;
}

type FulfillmentStep = "confirm" | "fulfill" | "ship" | "deliver";

export function OrderFulfillment({ order, onUpdate }: OrderFulfillmentProps) {
  const [activeDialog, setActiveDialog] = useState<FulfillmentStep | null>(
    null
  );

  // Parse items
  const items: OrderItem[] =
    typeof order.items === "string" ? JSON.parse(order.items) : order.items;

  // Determine current step
  const getCurrentStep = (): FulfillmentStep => {
    if (order.fulfillmentStatus === "SHIPPED") return "deliver";
    if (order.fulfillmentStatus === "PACKED") return "ship";
    if (order.confirmedAt) return "fulfill";
    return "confirm";
  };

  const currentStep = getCurrentStep();

  // Status badge helper
  const getStatusBadge = () => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      PENDING: { label: "Pending", className: "bg-yellow-100 text-yellow-800" },
      PACKED: { label: "Packed", className: "bg-blue-100 text-blue-800" },
      SHIPPED: { label: "Shipped", className: "bg-green-100 text-green-800" },
    };

    const config = statusConfig[order.fulfillmentStatus || "PENDING"];
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Fulfillment Status
            </CardTitle>
            <CardDescription>Order #{order.orderNumber}</CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent>
        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6">
          <StepIndicator
            icon={<CheckCircle className="h-5 w-5" />}
            label="Confirm"
            active={currentStep === "confirm"}
            completed={!!order.confirmedAt}
          />
          <StepConnector completed={!!order.confirmedAt} />
          <StepIndicator
            icon={<Package className="h-5 w-5" />}
            label="Pack"
            active={currentStep === "fulfill"}
            completed={
              order.fulfillmentStatus === "PACKED" ||
              order.fulfillmentStatus === "SHIPPED"
            }
          />
          <StepConnector
            completed={
              order.fulfillmentStatus === "PACKED" ||
              order.fulfillmentStatus === "SHIPPED"
            }
          />
          <StepIndicator
            icon={<Truck className="h-5 w-5" />}
            label="Ship"
            active={currentStep === "ship"}
            completed={order.fulfillmentStatus === "SHIPPED"}
          />
          <StepConnector completed={order.fulfillmentStatus === "SHIPPED"} />
          <StepIndicator
            icon={<MapPin className="h-5 w-5" />}
            label="Deliver"
            active={currentStep === "deliver"}
            completed={false}
          />
        </div>

        <Separator className="my-4" />

        {/* Action Buttons */}
        <div className="flex gap-2 flex-wrap">
          {currentStep === "confirm" && (
            <Button onClick={() => setActiveDialog("confirm")}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirm Order
            </Button>
          )}
          {currentStep === "fulfill" && (
            <Button onClick={() => setActiveDialog("fulfill")}>
              <Package className="h-4 w-4 mr-2" />
              Pick & Pack
            </Button>
          )}
          {currentStep === "ship" && (
            <Button onClick={() => setActiveDialog("ship")}>
              <Truck className="h-4 w-4 mr-2" />
              Ship Order
            </Button>
          )}
          {currentStep === "deliver" && (
            <Button onClick={() => setActiveDialog("deliver")}>
              <MapPin className="h-4 w-4 mr-2" />
              Mark Delivered
            </Button>
          )}
        </div>

        {/* Items Summary */}
        <div className="mt-4">
          <h4 className="text-sm font-medium mb-2">Items ({items.length})</h4>
          <div className="space-y-2">
            {items.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded"
              >
                <div>
                  <span className="font-medium">{item.displayName}</span>
                  {item.isSample && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      Sample
                    </Badge>
                  )}
                </div>
                <div className="text-muted-foreground">
                  {item.pickedQuantity !== undefined ? (
                    <span>
                      {item.pickedQuantity}/{item.quantity} picked
                    </span>
                  ) : (
                    <span>Qty: {item.quantity}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>

      {/* Confirm Dialog */}
      <ConfirmOrderDialog
        open={activeDialog === "confirm"}
        onClose={() => setActiveDialog(null)}
        orderId={order.id}
        onSuccess={onUpdate}
      />

      {/* Fulfill Dialog */}
      <FulfillOrderDialog
        open={activeDialog === "fulfill"}
        onClose={() => setActiveDialog(null)}
        orderId={order.id}
        items={items}
        onSuccess={onUpdate}
      />

      {/* Ship Dialog */}
      <ShipOrderDialog
        open={activeDialog === "ship"}
        onClose={() => setActiveDialog(null)}
        orderId={order.id}
        onSuccess={onUpdate}
      />

      {/* Deliver Dialog */}
      <DeliverOrderDialog
        open={activeDialog === "deliver"}
        onClose={() => setActiveDialog(null)}
        orderId={order.id}
        onSuccess={onUpdate}
      />
    </Card>
  );
}

// Step indicator component
function StepIndicator({
  icon,
  label,
  active,
  completed,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  completed: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center ${active ? "text-primary" : completed ? "text-green-600" : "text-muted-foreground"}`}
    >
      <div
        className={`p-2 rounded-full ${active ? "bg-primary/10" : completed ? "bg-green-100" : "bg-muted"}`}
      >
        {icon}
      </div>
      <span className="text-xs mt-1">{label}</span>
    </div>
  );
}

// Connector line between steps
function StepConnector({ completed }: { completed: boolean }) {
  return (
    <div
      className={`flex-1 h-0.5 mx-2 ${completed ? "bg-green-500" : "bg-muted"}`}
    />
  );
}

// Confirm Order Dialog
function ConfirmOrderDialog({
  open,
  onClose,
  orderId,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  orderId: number;
  onSuccess: () => void;
}) {
  const [notes, setNotes] = useState("");
  const confirmMutation = trpc.orders.confirmOrder.useMutation();

  const handleSubmit = async () => {
    try {
      await confirmMutation.mutateAsync({
        id: orderId,
        notes: notes || undefined,
      });
      toast.success("Order confirmed successfully");
      setNotes("");
      onSuccess();
      onClose();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to confirm order";
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Order</DialogTitle>
          <DialogDescription>
            Confirm this order to proceed with fulfillment. This will verify
            inventory availability.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="confirm-notes">Notes (optional)</Label>
            <Textarea
              id="confirm-notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add confirmation notes..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={confirmMutation.isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={confirmMutation.isPending}>
            {confirmMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Confirming...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Confirm Order
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Fulfill Order Dialog
function FulfillOrderDialog({
  open,
  onClose,
  orderId,
  items,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  orderId: number;
  items: OrderItem[];
  onSuccess: () => void;
}) {
  const [pickedItems, setPickedItems] = useState<Record<number, number>>(() => {
    const initial: Record<number, number> = {};
    items.forEach(item => {
      initial[item.batchId] = item.quantity;
    });
    return initial;
  });

  const fulfillMutation = trpc.orders.fulfillOrder.useMutation();

  const handleSubmit = async () => {
    try {
      const itemsToFulfill = items.map(item => ({
        batchId: item.batchId,
        pickedQuantity: pickedItems[item.batchId] || 0,
      }));

      await fulfillMutation.mutateAsync({ id: orderId, items: itemsToFulfill });
      toast.success("Order fulfilled successfully");
      onSuccess();
      onClose();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to fulfill order";
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Pick & Pack Order</DialogTitle>
          <DialogDescription>
            Enter the picked quantities for each item.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {items.map(item => (
            <div
              key={item.batchId}
              className="flex items-center justify-between p-3 border rounded"
            >
              <div>
                <p className="font-medium">{item.displayName}</p>
                <p className="text-sm text-muted-foreground">
                  Ordered: {item.quantity}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor={`pick-${item.batchId}`} className="sr-only">
                  Picked Quantity
                </Label>
                <Input
                  id={`pick-${item.batchId}`}
                  type="number"
                  min={0}
                  max={item.quantity}
                  value={pickedItems[item.batchId] || 0}
                  onChange={e =>
                    setPickedItems(prev => ({
                      ...prev,
                      [item.batchId]: parseInt(e.target.value) || 0,
                    }))
                  }
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">
                  / {item.quantity}
                </span>
              </div>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={fulfillMutation.isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={fulfillMutation.isPending}>
            {fulfillMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Package className="h-4 w-4 mr-2" />
                Complete Picking
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Ship Order Dialog
function ShipOrderDialog({
  open,
  onClose,
  orderId,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  orderId: number;
  onSuccess: () => void;
}) {
  const [trackingNumber, setTrackingNumber] = useState("");
  const [carrier, setCarrier] = useState("");
  const [notes, setNotes] = useState("");

  const shipMutation = trpc.orders.shipOrder.useMutation();

  const handleSubmit = async () => {
    try {
      await shipMutation.mutateAsync({
        id: orderId,
        trackingNumber: trackingNumber || undefined,
        carrier: carrier || undefined,
        notes: notes || undefined,
      });
      toast.success("Order shipped successfully");
      setTrackingNumber("");
      setCarrier("");
      setNotes("");
      onSuccess();
      onClose();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to ship order";
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ship Order</DialogTitle>
          <DialogDescription>
            Enter shipping details for this order.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="carrier">Carrier</Label>
            <Select value={carrier} onValueChange={setCarrier}>
              <SelectTrigger>
                <SelectValue placeholder="Select carrier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fedex">FedEx</SelectItem>
                <SelectItem value="ups">UPS</SelectItem>
                <SelectItem value="usps">USPS</SelectItem>
                <SelectItem value="dhl">DHL</SelectItem>
                <SelectItem value="local">Local Delivery</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="tracking">Tracking Number</Label>
            <Input
              id="tracking"
              value={trackingNumber}
              onChange={e => setTrackingNumber(e.target.value)}
              placeholder="Enter tracking number"
            />
          </div>
          <div>
            <Label htmlFor="ship-notes">Notes (optional)</Label>
            <Textarea
              id="ship-notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add shipping notes..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={shipMutation.isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={shipMutation.isPending}>
            {shipMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Shipping...
              </>
            ) : (
              <>
                <Truck className="h-4 w-4 mr-2" />
                Ship Order
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Deliver Order Dialog
function DeliverOrderDialog({
  open,
  onClose,
  orderId,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  orderId: number;
  onSuccess: () => void;
}) {
  const [signature, setSignature] = useState("");
  const [notes, setNotes] = useState("");

  const deliverMutation = trpc.orders.deliverOrder.useMutation();

  const handleSubmit = async () => {
    try {
      await deliverMutation.mutateAsync({
        id: orderId,
        signature: signature || undefined,
        notes: notes || undefined,
      });
      toast.success("Order marked as delivered");
      setSignature("");
      setNotes("");
      onSuccess();
      onClose();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to mark as delivered";
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Delivery</DialogTitle>
          <DialogDescription>
            Record delivery confirmation for this order.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="signature">Received By (Signature)</Label>
            <Input
              id="signature"
              value={signature}
              onChange={e => setSignature(e.target.value)}
              placeholder="Name of person who received the order"
            />
          </div>
          <div>
            <Label htmlFor="deliver-notes">Delivery Notes</Label>
            <Textarea
              id="deliver-notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add delivery notes..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={deliverMutation.isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={deliverMutation.isPending}>
            {deliverMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Confirming...
              </>
            ) : (
              <>
                <MapPin className="h-4 w-4 mr-2" />
                Confirm Delivery
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
