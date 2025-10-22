import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Send, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmModal } from "@/components/common/ConfirmModal";
import { mockVendors, mockInventory } from "@/lib/mockData";
import { toast } from "sonner";

interface POLine {
  id: string;
  inventory_id: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export default function NewPO() {
  const navigate = useNavigate();
  const [vendor, setVendor] = useState("");
  const [expectedDelivery, setExpectedDelivery] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<POLine[]>([]);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const addLine = () => {
    setLines([...lines, {
      id: `line-${Date.now()}`,
      inventory_id: "",
      quantity: 0,
      unit_price: 0,
      line_total: 0
    }]);
  };

  const removeLine = (id: string) => {
    setLines(lines.filter(l => l.id !== id));
  };

  const updateLine = (id: string, field: keyof POLine, value: any) => {
    setLines(lines.map(line => {
      if (line.id === id) {
        const updated = { ...line, [field]: value };
        
        if (field === "inventory_id") {
          const item = mockInventory.find(i => i.id === value);
          if (item) {
            updated.unit_price = item.unit_price;
          }
        }
        
        updated.line_total = updated.quantity * updated.unit_price;
        return updated;
      }
      return line;
    }));
  };

  const calculateSubtotal = () => {
    return lines.reduce((sum, line) => sum + line.line_total, 0);
  };

  const handleSaveDraft = () => {
    if (!vendor) {
      toast.error("Please select a vendor");
      return;
    }
    toast.success("PO saved as draft");
    navigate("/vendors");
  };

  const handleSubmit = () => {
    if (!vendor) {
      toast.error("Please select a vendor");
      return;
    }
    if (lines.length === 0) {
      toast.error("Please add at least one line item");
      return;
    }
    toast.success("PO submitted");
    navigate("/vendors");
  };

  const handleCancel = () => {
    setShowCancelDialog(true);
  };

  const confirmCancel = () => {
    toast.info("PO discarded");
    navigate("/vendors");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCancel}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="mb-1">New Purchase Order</h1>
          <p className="text-sm text-muted-foreground">Create a new PO for inventory</p>
        </div>
        <Button variant="outline" onClick={handleSaveDraft}>
          <Save className="h-4 w-4 mr-2" />
          Save Draft
        </Button>
        <Button onClick={handleSubmit}>
          <Send className="h-4 w-4 mr-2" />
          Submit PO
        </Button>
      </div>

      <Card className="p-6">
        <h3 className="font-semibold mb-4">PO Details</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium mb-2 block">Vendor</label>
            <Select value={vendor} onValueChange={setVendor}>
              <SelectTrigger>
                <SelectValue placeholder="Select vendor" />
              </SelectTrigger>
              <SelectContent>
                {mockVendors.map(v => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Expected Delivery</label>
            <Input
              type="date"
              value={expectedDelivery}
              onChange={(e) => setExpectedDelivery(e.target.value)}
            />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Line Items</h3>
          <Button variant="outline" size="sm" onClick={addLine}>
            <Plus className="h-4 w-4 mr-2" />
            Add Line
          </Button>
        </div>
        
        <div className="space-y-3">
          {lines.map((line, idx) => (
            <div key={line.id} className="flex gap-3 items-start p-3 border rounded-lg">
              <div className="flex-1 grid gap-3 md:grid-cols-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Item</label>
                  <Select
                    value={line.inventory_id}
                    onValueChange={(val) => updateLine(line.id, "inventory_id", val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select item" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockInventory.map(item => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.strain_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Quantity</label>
                  <Input
                    type="number"
                    value={line.quantity || ""}
                    onChange={(e) => updateLine(line.id, "quantity", parseFloat(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Unit Price</label>
                  <Input
                    type="number"
                    value={line.unit_price || ""}
                    onChange={(e) => updateLine(line.id, "unit_price", parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Total</label>
                  <Input
                    value={`$${line.line_total.toLocaleString()}`}
                    disabled
                  />
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeLine(line.id)}
                className="mt-6"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          
          {lines.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No line items yet. Click "Add Line" to get started.
            </p>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <label className="text-sm font-medium mb-2 block">Notes</label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add any notes or special instructions..."
          rows={3}
        />
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Subtotal</h3>
          <p className="text-2xl font-bold">${calculateSubtotal().toLocaleString()}</p>
        </div>
      </Card>

      <ConfirmModal
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        title="Discard Purchase Order?"
        description="Are you sure you want to discard this purchase order? All unsaved changes will be lost."
        onConfirm={confirmCancel}
        onCancel={() => setShowCancelDialog(false)}
        confirmLabel="Discard"
        cancelLabel="Keep Editing"
        variant="destructive"
      />
    </div>
  );
}
