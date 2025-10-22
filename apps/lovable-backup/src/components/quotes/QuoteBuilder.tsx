import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AddLineModal } from "@/components/sales/AddLineModal";
import { mockInventory } from "@/lib/mockData";
import { createAuditEntry } from "@/lib/audit";

export interface QuoteLine {
  id: string;
  inventory_id: string;
  inventory_name: string;
  qty: number;
  unit_price: number;
  line_total: number;
}

interface QuoteBuilderProps {
  clientId: string;
  lines: QuoteLine[];
  onLinesChange: (lines: QuoteLine[]) => void;
}

export function QuoteBuilder({ clientId, lines, onLinesChange }: QuoteBuilderProps) {
  const [showAddModal, setShowAddModal] = useState(false);

  const handleAddLine = (line: any) => {
    onLinesChange([...lines, line]);
    createAuditEntry({
      action: "add_quote_line",
      entity_type: "quote",
      entity_id: clientId,
      after: line,
      ui_context: "QuoteBuilder"
    });
  };

  const handleRemoveLine = (id: string) => {
    const line = lines.find(l => l.id === id);
    onLinesChange(lines.filter(l => l.id !== id));
    createAuditEntry({
      action: "remove_quote_line",
      entity_type: "quote",
      entity_id: clientId,
      before: line,
      ui_context: "QuoteBuilder"
    });
  };

  const handleUpdateQty = (id: string, qty: number) => {
    const before = lines.find(l => l.id === id);
    const after = { ...before, qty, line_total: qty * (before?.unit_price || 0) };
    onLinesChange(lines.map(l => l.id === id ? after : l));
    createAuditEntry({
      action: "update_quote_line_qty",
      entity_type: "quote",
      entity_id: clientId,
      before,
      after,
      ui_context: "QuoteBuilder"
    });
  };

  const totalAmount = lines.reduce((sum, l) => sum + l.line_total, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3>Quote Lines</h3>
        <Button variant="outline" size="sm" onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Line
        </Button>
      </div>

      {lines.length === 0 ? (
        <div className="p-8 text-center border border-dashed rounded-lg">
          <p className="text-muted-foreground">No line items yet. Click "Add Line" to begin.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {lines.map((line) => (
            <div key={line.id} className="grid grid-cols-12 gap-4 items-center p-4 rounded-lg bg-panel">
              <div className="col-span-5">
                <p className="font-medium">{line.inventory_name}</p>
                <p className="text-xs text-muted-foreground">{line.inventory_id}</p>
              </div>
              <div className="col-span-2">
                <Input
                  type="number"
                  value={line.qty}
                  onChange={(e) => handleUpdateQty(line.id, parseFloat(e.target.value) || 0)}
                  className="h-8"
                />
              </div>
              <div className="col-span-2 text-right">
                <p className="font-medium">${line.unit_price.toFixed(2)}</p>
              </div>
              <div className="col-span-2 text-right">
                <p className="font-semibold">${line.line_total.toFixed(2)}</p>
              </div>
              <div className="col-span-1 text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveLine(line.id)}
                  className="h-8 w-8"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}

          <div className="pt-4 border-t">
            <div className="flex justify-end">
              <div className="space-y-2 w-64">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span>${totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <AddLineModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onAdd={handleAddLine}
        clientId={clientId}
      />
    </div>
  );
}
