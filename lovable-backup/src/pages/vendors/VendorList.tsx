import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Download, RefreshCw, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/data/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { mockVendors } from "@/lib/mockData";
import type { Vendor } from "@/types/entities";
import { toast } from "sonner";

export default function VendorList() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const columns = [
    { key: "id", label: "Vendor ID" },
    { key: "name", label: "Name" },
    { key: "license_number", label: "License" },
    { key: "credit_terms", label: "Credit Terms" },
    {
      key: "status",
      label: "Status",
      render: (vendor: Vendor) => (
        <StatusBadge status={vendor.status === "Active" ? "success" : "neutral"} label={vendor.status} />
      )
    }
  ];

  const filteredVendors = mockVendors.filter(vendor => {
    if (!showArchived && vendor.archived) return false;
    if (searchQuery) {
      return vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vendor.id.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mb-1">Vendors</h1>
          <p className="text-sm text-muted-foreground">Manage vendor accounts</p>
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
          <Button onClick={() => toast.success("New vendor modal would open")}>
            <Plus className="h-4 w-4 mr-2" />
            New Vendor
          </Button>
        </div>
      </div>

      <Input
        placeholder="Search vendors..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="max-w-sm"
      />

      <DataTable
        columns={columns}
        data={filteredVendors}
        onRowClick={(vendor) => navigate(`/vendors/${vendor.id}`)}
      />
    </div>
  );
}
