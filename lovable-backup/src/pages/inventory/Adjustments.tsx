import { useState } from "react";
import { Plus, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/data/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { AdjustmentModal } from "@/components/inventory/AdjustmentModal";

interface Adjustment {
  id: string;
  sku: string;
  location: string;
  type: "increase" | "decrease";
  quantity: number;
  reason: string;
  createdAt: string;
  createdBy: string;
}

export default function Adjustments() {
  const [search, setSearch] = useState("");
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [selectedInventory, setSelectedInventory] = useState<{ id: string; name: string; qty: number } | null>(null);
  const [adjustments] = useState<Adjustment[]>([
    { id: "1", sku: "WGT-001", location: "A-12-3", type: "decrease", quantity: 5, reason: "Damaged", createdAt: "2025-01-14", createdBy: "John Doe" },
    { id: "2", sku: "WGT-002", location: "A-12-4", type: "increase", quantity: 10, reason: "Found during count", createdAt: "2025-01-14", createdBy: "Jane Smith" },
    { id: "3", sku: "WGT-003", location: "B-05-1", type: "decrease", quantity: 3, reason: "Customer return defective", createdAt: "2025-01-13", createdBy: "John Doe" },
  ]);

  const filteredAdjustments = adjustments.filter(
    (adj) =>
      adj.sku.toLowerCase().includes(search.toLowerCase()) ||
      adj.location.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    { key: "sku", label: "SKU" },
    { key: "location", label: "Location" },
    { 
      key: "type", 
      label: "Type",
      render: (adj: Adjustment) => (
        <StatusBadge 
          status={adj.type === "increase" ? "success" : "warning"} 
          label={adj.type.toUpperCase()} 
        />
      )
    },
    { 
      key: "quantity", 
      label: "Quantity",
      render: (adj: Adjustment) => (
        <span className={adj.type === "increase" ? "text-success" : "text-warning"}>
          {adj.type === "increase" ? "+" : "-"}{adj.quantity}
        </span>
      )
    },
    { key: "reason", label: "Reason" },
    { key: "createdAt", label: "Date" },
    { key: "createdBy", label: "By" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mb-2">Inventory Adjustments</h1>
          <p className="text-muted-foreground">Track manual inventory changes</p>
        </div>
        <Button onClick={() => {
          setSelectedInventory({ id: "INV-001", name: "Sample Item", qty: 100 });
          setShowAdjustmentModal(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          New Adjustment
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search adjustments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="icon">
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={filteredAdjustments}
        emptyMessage="No adjustments found"
      />

      {selectedInventory && (
        <AdjustmentModal
          open={showAdjustmentModal}
          onClose={() => {
            setShowAdjustmentModal(false);
            setSelectedInventory(null);
          }}
          inventoryId={selectedInventory.id}
          inventoryName={selectedInventory.name}
          currentQty={selectedInventory.qty}
        />
      )}
    </div>
  );
}
