import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Download, RefreshCw, Archive, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/data/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { NewBatchModal } from "@/components/modals/CommonModals";
import { InventoryAlerts } from "@/components/inventory/InventoryAlerts";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { mockInventory, mockVendors } from "@/lib/mockData";
import type { InventoryItem } from "@/types/entities";
import { toast } from "sonner";

export default function InventoryGrid() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showAlerts, setShowAlerts] = useState(true);

  const columns = [
    { key: "id", label: "Item ID" },
    { key: "strain_name", label: "Strain" },
    { key: "type", label: "Type" },
    {
      key: "vendor_id",
      label: "Vendor",
      render: (item: InventoryItem) => {
        const vendor = mockVendors.find(v => v.id === item.vendor_id);
        return vendor?.name || item.vendor_id;
      }
    },
    { key: "qty_available", label: "Available" },
    { key: "qty_reserved", label: "Reserved" },
    {
      key: "unit_price",
      label: "Unit Price",
      render: (item: InventoryItem) => `$${item.unit_price.toLocaleString()}`
    },
    {
      key: "archived",
      label: "Status",
      render: (item: InventoryItem) => (
        <StatusBadge status={item.archived ? "neutral" : "success"} label={item.archived ? "Archived" : "Active"} />
      )
    }
  ];

  const filteredItems = mockInventory.filter(item => {
    if (!showArchived && item.archived) return false;
    if (searchQuery) {
      return item.strain_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.id.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mb-1">Inventory</h1>
          <p className="text-sm text-muted-foreground">Manage inventory and batches</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => toast.success("Export generated")}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={() => setShowArchived(!showArchived)}>
            <Archive className="h-4 w-4 mr-2" />
            {showArchived ? "Hide" : "Show"} Archived
          </Button>
          <Button onClick={() => setShowNewModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Batch
          </Button>
        </div>
      </div>

      <Collapsible open={showAlerts} onOpenChange={setShowAlerts}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Inventory Alerts
            </span>
            <span className="text-xs text-muted-foreground">
              {showAlerts ? "Hide" : "Show"}
            </span>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4">
          <InventoryAlerts />
        </CollapsibleContent>
      </Collapsible>

      <Input
        placeholder="Search inventory..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="max-w-sm"
      />

      <DataTable columns={columns} data={filteredItems} />

      <NewBatchModal
        open={showNewModal}
        onOpenChange={setShowNewModal}
        onSuccess={() => window.location.reload()}
      />
    </div>
  );
}
