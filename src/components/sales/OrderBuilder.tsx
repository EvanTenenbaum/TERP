import { useState } from "react";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ValidatedLineItem } from "./ValidatedLineItem";
import { AddLineModal } from "./AddLineModal";
import { createAuditEntry } from "@/lib/audit";

export interface OrderLine {
  id: string;
  inventory_id: string;
  inventory_name: string;
  qty: number;
  unit_price: number;
  line_total: number;
}

interface OrderBuilderProps {
  clientId: string;
  orderId?: string;
  lines: OrderLine[];
  onLinesChange: (lines: OrderLine[]) => void;
}

export function OrderBuilder({ clientId, orderId, lines, onLinesChange }: OrderBuilderProps) {
  const [showAddModal, setShowAddModal] = useState(false);

  const handleAddLine = (line: any) => {
    const newLine: OrderLine = {
      id: `LINE-${Date.now()}`,
      inventory_id: line.inventory_id,
      inventory_name: line.inventory_name,
      qty: line.qty,
      unit_price: line.unit_price,
      line_total: line.qty * line.unit_price,
    };

    const updatedLines = [...lines, newLine];
    onLinesChange(updatedLines);

    if (orderId) {
      createAuditEntry({
        action: "order_line_added",
        entity_type: "order",
        entity_id: orderId,
        after: newLine,
        ui_context: "order_builder",
        module: "sales",
      });
    }

    setShowAddModal(false);
  };

  const handleRemoveLine = (id: string) => {
    const updatedLines = lines.filter((line) => line.id !== id);
    onLinesChange(updatedLines);

    if (orderId) {
      createAuditEntry({
        action: "order_line_removed",
        entity_type: "order",
        entity_id: orderId,
        before: lines.find((l) => l.id === id),
        ui_context: "order_builder",
        module: "sales",
      });
    }
  };

  const handleUpdateQty = (id: string, qty: number) => {
    const updatedLines = lines.map((line) => {
      if (line.id === id) {
        const newLine = {
          ...line,
          qty,
          line_total: qty * line.unit_price,
        };

        if (orderId) {
          createAuditEntry({
            action: "order_line_updated",
            entity_type: "order",
            entity_id: orderId,
            before: line,
            after: newLine,
            ui_context: "order_builder",
            module: "sales",
          });
        }

        return newLine;
      }
      return line;
    });
    onLinesChange(updatedLines);
  };

  const total = lines.reduce((sum, line) => sum + line.line_total, 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Line Items</h3>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Line
        </Button>
      </div>

      {lines.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No line items added yet. Click "Add Line" to get started.
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Unit Price</TableHead>
                <TableHead>Total</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line) => (
                <ValidatedLineItem
                  key={line.id}
                  line={line}
                  onUpdate={handleUpdateQty}
                  onRemove={handleRemoveLine}
                />
              ))}
            </TableBody>
          </Table>

          <div className="flex justify-end">
            <div className="text-right">
              <div className="text-2xl font-bold">Total: ${total.toFixed(2)}</div>
            </div>
          </div>
        </>
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
