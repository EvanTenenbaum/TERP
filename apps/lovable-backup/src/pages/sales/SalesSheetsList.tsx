import { Plus, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/data/DataTable";
import { Badge } from "@/components/ui/badge";
import { mockSalesSheets } from "@/lib/mockData";

export default function SalesSheetsList() {
  const columns = [
    { key: "id", label: "ID" },
    {
      key: "client_id",
      label: "Client",
      format: (val: string) => val || "All Clients"
    },
    {
      key: "format",
      label: "Format",
      format: (val: string) => (
        <Badge variant="outline" className="uppercase">
          {val}
        </Badge>
      )
    },
    {
      key: "created_at",
      label: "Created",
      format: (val: string) => new Date(val).toLocaleDateString()
    },
    {
      key: "expires_at",
      label: "Expires",
      format: (val: string) => new Date(val).toLocaleDateString()
    },
    {
      key: "actions",
      label: "Actions",
      format: (_: any, row: any) => (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost">
            <Download className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost">
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      )
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mb-1">Sales Sheets</h1>
          <p className="text-sm text-muted-foreground">
            Generate and manage customer-specific product sheets
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Generate New Sheet
        </Button>
      </div>

      <Card>
        <DataTable columns={columns} data={mockSalesSheets} />
      </Card>
    </div>
  );
}
