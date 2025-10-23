import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Archive, Trash2, Plus, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ConfirmModal } from "@/components/common/ConfirmModal";
import { RecordPaymentModal } from "@/components/modals/CommonModals";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { mockOrders, mockClients } from "@/lib/mockData";
import { OrderWorkflowActions } from "@/components/sales/OrderWorkflowActions";
import { InvoiceGenerator } from "@/components/finance/InvoiceGenerator";
import { OrderStatus } from "@/types/entities";
import { toast } from "sonner";

export default function OrderDetail() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [activeTab, setActiveTab] = useState("lines");
  
  const order = mockOrders.find(o => o.id === orderId);
  const client = order ? mockClients.find(c => c.id === order.client_id) : null;

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: "s",
      ctrl: true,
      description: "Save Order",
      action: () => handleSave(),
    },
    {
      key: "Escape",
      description: "Back to List",
      action: () => navigate("/sales/orders"),
    },
  ]);

  if (!order) {
    return <div>Order not found</div>;
  }

  const handleSave = () => {
    toast.success("Order saved");
  };

  const handleArchive = () => {
    toast.success("Order archived");
    navigate("/sales/orders");
  };

  const [orderStatus, setOrderStatus] = useState<OrderStatus>(order.status);

  const handleStatusChange = (newStatus: string) => {
    setOrderStatus(newStatus as OrderStatus);
    toast.success(`Order status changed to ${newStatus}`);
  };

  const handleCancelOrder = () => {
    setShowCancelDialog(true);
  };

  const confirmCancel = () => {
    toast.success("Order cancelled");
    setShowCancelDialog(false);
    navigate("/sales/orders");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/sales/orders")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="mb-1">{order.id}</h1>
            <StatusBadge
              status={orderStatus === "Delivered" ? "success" : orderStatus === "Cancelled" ? "error" : "info"}
              label={orderStatus}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Created {new Date(order.created_at).toLocaleDateString()} • 
            Updated {new Date(order.updated_at).toLocaleDateString()}
          </p>
        </div>
        
        {order.balance_due > 0 && (
          <Button variant="outline" onClick={() => setShowPaymentModal(true)}>
            <DollarSign className="h-4 w-4 mr-2" />
            Record Payment
          </Button>
        )}
        
        {order.status !== "Cancelled" && (
          <Button variant="outline" onClick={handleCancelOrder}>
            <Trash2 className="h-4 w-4 mr-2" />
            Cancel Order
          </Button>
        )}
        
        <Button variant="outline" onClick={handleArchive}>
          <Archive className="h-4 w-4 mr-2" />
          Archive
        </Button>
        
        <Button onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          Save
        </Button>
      </div>

      {/* Workflow Actions */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold mb-1">Order Actions</h3>
            <p className="text-sm text-muted-foreground">Execute workflow actions based on current status</p>
          </div>
          <div className="flex gap-2">
            <OrderWorkflowActions
              order={{ ...order, status: orderStatus }}
              onStatusChange={handleStatusChange}
            />
            <InvoiceGenerator
              orderId={order.id}
              clientId={order.client_id}
              lines={[]}
              disabled={orderStatus !== "Shipped"}
            />
          </div>
        </div>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="p-6 hover-scale">
          <h3 className="text-sm text-muted-foreground mb-2">Client</h3>
          <p className="font-semibold text-lg">{client?.name || order.client_id}</p>
          <p className="text-sm text-muted-foreground mt-1">{client?.contact_email}</p>
          <Button
            variant="link"
            className="px-0 mt-2"
            onClick={() => navigate(`/clients/${order.client_id}`)}
          >
            View Client Profile →
          </Button>
        </Card>

        <Card className="p-6 hover-scale">
          <h3 className="text-sm text-muted-foreground mb-2">Order Total</h3>
          <p className="font-semibold text-2xl">${order.total.toLocaleString()}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-muted-foreground">{order.line_count || 0} line items</span>
            {order.has_discounts && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-warning/10 text-warning">
                Discounts applied
              </span>
            )}
          </div>
        </Card>

        <Card className="p-6 hover-scale">
          <h3 className="text-sm text-muted-foreground mb-2">Balance Due</h3>
          <p className="font-semibold text-2xl">${order.balance_due.toLocaleString()}</p>
          {order.balance_due === 0 ? (
            <p className="text-xs text-success mt-2">Paid in full</p>
          ) : (
            <p className="text-xs text-warning mt-2">
              {((order.balance_due / order.total) * 100).toFixed(0)}% remaining
            </p>
          )}
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="lines">Line Items</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="lines" className="space-y-4">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Order Lines</h3>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Line
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Line items for this order will be displayed here
            </p>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Payment History</h3>
              <Button variant="outline" size="sm" onClick={() => setShowPaymentModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Record Payment
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Payment history will be displayed here
            </p>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Audit Trail</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3 pb-3 border-b border-border">
                <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Order created</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(order.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 pb-3 border-b border-border">
                <div className="w-2 h-2 rounded-full bg-success mt-1.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Status changed to {order.status}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(order.updated_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <ConfirmModal
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        title="Cancel Order?"
        description="Are you sure you want to cancel this order? This action can be undone within 20 seconds by restoring the order."
        onConfirm={confirmCancel}
        onCancel={() => setShowCancelDialog(false)}
        confirmLabel="Cancel Order"
        cancelLabel="Keep Order"
        variant="destructive"
      />

      <RecordPaymentModal
        open={showPaymentModal}
        onOpenChange={setShowPaymentModal}
        invoiceId={order.id}
        maxAmount={order.balance_due}
      />
    </div>
  );
}
