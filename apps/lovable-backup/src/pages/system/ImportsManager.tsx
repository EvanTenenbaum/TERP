import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Upload, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function ImportsManager() {
  const navigate = useNavigate();
  const [imports] = useState([
    { 
      id: "IMP-001", 
      type: "Orders", 
      file: "orders_jan2025.csv", 
      created: "2025-01-15 11:20", 
      status: "Completed",
      records: 245,
      errors: 0
    },
    { 
      id: "IMP-002", 
      type: "Clients", 
      file: "clients_update.csv", 
      created: "2025-01-14 16:45", 
      status: "Failed",
      records: 0,
      errors: 12
    },
    { 
      id: "IMP-003", 
      type: "Inventory", 
      file: "inventory_batch.csv", 
      created: "2025-01-13 08:30", 
      status: "Completed",
      records: 89,
      errors: 3
    },
  ]);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "Completed": return { status: "success" as const, label: "Completed" };
      case "Failed": return { status: "error" as const, label: "Failed" };
      case "Processing": return { status: "info" as const, label: "Processing" };
      default: return { status: "neutral" as const, label: status };
    }
  };

  const columns = [
    { key: "id", label: "Import ID" },
    { key: "type", label: "Type" },
    { key: "file", label: "File" },
    { key: "created", label: "Created" },
    { key: "records", label: "Records" },
    {
      key: "errors",
      label: "Errors",
      render: (imp: any) => (
        <span className={imp.errors > 0 ? "text-destructive" : "text-muted-foreground"}>
          {imp.errors}
        </span>
      )
    },
    {
      key: "status",
      label: "Status",
      render: (imp: any) => {
        const config = getStatusConfig(imp.status);
        return <StatusBadge status={config.status} label={config.label} />;
      }
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mb-1">Imports Manager</h1>
          <p className="text-sm text-muted-foreground">Import data from CSV files</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => navigate("/admin/imports")}>
            <Upload className="h-4 w-4 mr-2" />
            New Import
          </Button>
        </div>
      </div>

      <Card className="p-6">
        <h3 className="mb-4">Import History</h3>
        <DataTable columns={columns} data={imports} />
      </Card>

      <Card className="p-6">
        <h3 className="mb-4">Supported Import Types</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="p-3 rounded-md bg-panel">
            <p className="font-medium mb-1">Orders</p>
            <p className="text-sm text-muted-foreground">Import sales orders</p>
          </div>
          <div className="p-3 rounded-md bg-panel">
            <p className="font-medium mb-1">Clients</p>
            <p className="text-sm text-muted-foreground">Import client records</p>
          </div>
          <div className="p-3 rounded-md bg-panel">
            <p className="font-medium mb-1">Inventory</p>
            <p className="text-sm text-muted-foreground">Import inventory items</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
