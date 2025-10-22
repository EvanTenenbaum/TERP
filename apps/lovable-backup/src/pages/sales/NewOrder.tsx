import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmModal } from "@/components/common/ConfirmModal";
import { OrderBuilder } from "@/components/sales/OrderBuilder";
import { mockClients } from "@/lib/mockData";
import { createAuditEntry } from "@/lib/audit";
import { toast } from "sonner";

export default function NewOrder() {
  const navigate = useNavigate();
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [clientId, setClientId] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<any[]>([]);

  const total = lines.reduce((sum, line) => sum + line.line_total, 0);

  const handleSaveDraft = () => {
    if (!clientId) {
      toast.error("Please select a client");
      return;
    }
    if (lines.length === 0) {
      toast.error("Please add at least one line item");
      return;
    }

    const orderId = `ORD-${Date.now()}`;
    createAuditEntry({
      action: "create_order_draft",
      entity_type: "order",
      entity_id: orderId,
      after: { client_id: clientId, lines, notes, total, status: "Draft" },
      ui_context: "NewOrder"
    });

    toast.success("Order saved as draft");
    navigate("/sales/orders");
  };

  const handleSubmit = () => {
    if (!clientId) {
      toast.error("Please select a client");
      return;
    }
    if (lines.length === 0) {
      toast.error("Please add at least one line item");
      return;
    }

    const orderId = `ORD-${Date.now()}`;
    createAuditEntry({
      action: "create_order",
      entity_type: "order",
      entity_id: orderId,
      after: { client_id: clientId, lines, notes, total, status: "Confirmed" },
      ui_context: "NewOrder"
    });

    toast.success("Order confirmed");
    navigate("/sales/orders");
  };

  const handleCancel = () => {
    setShowCancelDialog(true);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={handleCancel}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="mb-1">New Order</h1>
          <p className="text-sm text-muted-foreground">Create a new sales order</p>
        </div>
        <Button variant="outline" onClick={handleCancel}>
          Cancel
        </Button>
        <Button variant="outline" onClick={handleSaveDraft}>
          <Save className="h-4 w-4 mr-2" />
          Save Draft
        </Button>
        <Button onClick={handleSubmit}>Submit Order</Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6 space-y-4">
          <div className="space-y-2">
            <Label>Client *</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Select client..." />
              </SelectTrigger>
              <SelectContent>
                {mockClients.filter(c => !c.archived).map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>

        <Card className="p-6">
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes or terms..."
              rows={5}
            />
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <OrderBuilder
          clientId={clientId}
          lines={lines}
          onLinesChange={setLines}
        />
        
        {lines.length > 0 && (
          <div className="flex justify-end pt-4 border-t mt-4">
            <div className="space-y-2 min-w-[200px]">
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
      </Card>

      <ConfirmModal
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        title="Discard Order?"
        description="You have unsaved changes. Are you sure you want to discard this order? This action cannot be undone."
        onConfirm={() => navigate("/sales/orders")}
        onCancel={() => setShowCancelDialog(false)}
        confirmLabel="Discard"
        cancelLabel="Continue Editing"
        variant="destructive"
      />
    </div>
  );
}
