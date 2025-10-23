import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Download, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function ExportsManager() {
  const [exports] = useState([
    { 
      id: "EXP-001", 
      type: "Orders", 
      format: "CSV", 
      created: "2025-01-15 10:30", 
      status: "Ready",
      expires: "2025-01-22",
      size: "2.4 MB"
    },
    { 
      id: "EXP-002", 
      type: "Invoices", 
      format: "PDF", 
      created: "2025-01-14 14:15", 
      status: "Ready",
      expires: "2025-01-21",
      size: "5.1 MB"
    },
    { 
      id: "EXP-003", 
      type: "Inventory", 
      format: "CSV", 
      created: "2025-01-13 09:00", 
      status: "Expired",
      expires: "2025-01-20",
      size: "1.8 MB"
    },
  ]);

  const columns = [
    { key: "id", label: "Export ID" },
    { key: "type", label: "Type" },
    { key: "format", label: "Format" },
    { key: "created", label: "Created" },
    { key: "expires", label: "Expires" },
    { key: "size", label: "Size" },
    {
      key: "status",
      label: "Status",
      render: (exp: any) => (
        <StatusBadge
          status={exp.status === "Ready" ? "success" : "neutral"}
          label={exp.status}
        />
      )
    },
    {
      key: "actions",
      label: "",
      render: (exp: any) => (
        exp.status === "Ready" && (
          <Button size="sm" variant="outline" onClick={() => toast.success("Download started")}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        )
      )
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mb-1">Exports Manager</h1>
          <p className="text-sm text-muted-foreground">Manage and download data exports</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => toast.success("New export created (ready in a few moments)")}>
            <Download className="h-4 w-4 mr-2" />
            New Export
          </Button>
        </div>
      </div>

      <Card className="p-6">
        <h3 className="mb-4">Recent Exports</h3>
        <DataTable columns={columns} data={exports} />
      </Card>

      <Card className="p-6">
        <h3 className="mb-4">Export Information</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>• Exports are available for 7 days after creation</p>
          <p>• Maximum export size is 50 MB</p>
          <p>• Exports run in the background and you'll be notified when ready</p>
        </div>
      </Card>
    </div>
  );
}
