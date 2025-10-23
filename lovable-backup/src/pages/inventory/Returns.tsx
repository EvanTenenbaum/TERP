import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/data/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useNavigate } from "react-router-dom";

interface Return {
  id: string;
  rmaNumber: string;
  customer: string;
  sku: string;
  quantity: number;
  reason: string;
  status: "pending" | "approved" | "rejected" | "restocked";
  createdAt: string;
}

export default function Returns() {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  
  const [returns] = useState<Return[]>([
    { id: "1", rmaNumber: "RMA-1001", customer: "Acme Corp", sku: "WGT-001", quantity: 5, reason: "Defective", status: "pending", createdAt: "2025-01-14" },
    { id: "2", rmaNumber: "RMA-1002", customer: "TechStart Inc", sku: "WGT-002", quantity: 2, reason: "Wrong item", status: "approved", createdAt: "2025-01-13" },
    { id: "3", rmaNumber: "RMA-1003", customer: "Global Industries", sku: "WGT-003", quantity: 10, reason: "Customer request", status: "restocked", createdAt: "2025-01-12" },
  ]);

  const filteredReturns = returns.filter(
    (ret) =>
      ret.rmaNumber.toLowerCase().includes(search.toLowerCase()) ||
      ret.customer.toLowerCase().includes(search.toLowerCase()) ||
      ret.sku.toLowerCase().includes(search.toLowerCase())
  );

  const statusMap = {
    pending: { status: "warning" as const, label: "PENDING" },
    approved: { status: "info" as const, label: "APPROVED" },
    rejected: { status: "error" as const, label: "REJECTED" },
    restocked: { status: "success" as const, label: "RESTOCKED" },
  };

  const columns = [
    { key: "rmaNumber", label: "RMA #" },
    { key: "customer", label: "Customer" },
    { key: "sku", label: "SKU" },
    { key: "quantity", label: "Qty", className: "text-right" },
    { key: "reason", label: "Reason" },
    { 
      key: "status", 
      label: "Status",
      render: (ret: Return) => {
        const config = statusMap[ret.status];
        return <StatusBadge status={config.status} label={config.label} />;
      }
    },
    { key: "createdAt", label: "Date" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mb-2">Returns (RMA)</h1>
          <p className="text-muted-foreground">Manage customer returns and restocking</p>
        </div>
        <Button onClick={() => navigate("/inventory/returns/new")}>
          <Plus className="h-4 w-4 mr-2" />
          New Return
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search returns..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredReturns}
        onRowClick={(ret) => navigate(`/inventory/returns/${ret.id}`)}
        emptyMessage="No returns found"
      />
    </div>
  );
}
