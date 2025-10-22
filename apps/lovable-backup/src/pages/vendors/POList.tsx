import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, RefreshCw, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/data/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { FilterDrawer } from "@/components/common/FilterDrawer";
import { mockPurchaseOrders, mockVendors } from "@/lib/mockData";

export default function POList() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: [] as string[],
    vendor: [] as string[]
  });

  const columns = [
    { key: "id", label: "PO #" },
    {
      key: "vendor_id",
      label: "Vendor",
      render: (po: any) => {
        const vendor = mockVendors.find(v => v.id === po.vendor_id);
        return vendor?.name || po.vendor_id;
      }
    },
    {
      key: "status",
      label: "Status",
      render: (po: any) => (
        <StatusBadge
          status={po.status === "Received" ? "success" : "info"}
          label={po.status}
        />
      )
    },
    { key: "created_at", label: "Created" },
    { key: "expected_delivery", label: "Expected" },
    {
      key: "total",
      label: "Total",
      render: (po: any) => `$${po.total.toLocaleString()}`
    }
  ];

  const filteredPOs = mockPurchaseOrders.filter(po => {
    const matchesSearch = po.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filters.status.length === 0 || filters.status.includes(po.status);
    const matchesVendor = filters.vendor.length === 0 || filters.vendor.includes(po.vendor_id);
    
    return matchesSearch && matchesStatus && matchesVendor;
  });

  const filterOptions = [
    {
      key: "status",
      label: "Status",
      type: "multiselect" as const,
      options: ["Draft", "Confirmed", "Received", "Cancelled"].map(s => ({ value: s, label: s }))
    },
    {
      key: "vendor",
      label: "Vendor",
      type: "multiselect" as const,
      options: mockVendors.map(v => ({ value: v.id, label: v.name }))
    }
  ];

  const handleApplyFilters = () => {
    setShowFilters(false);
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setFilters({ status: [], vendor: [] });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mb-1">Purchase Orders</h1>
          <p className="text-sm text-muted-foreground">
            Manage vendor purchase orders
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => navigate("/vendors/po/new")}>
            <Plus className="h-4 w-4 mr-2" />
            New PO
          </Button>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <Input
            placeholder="Search purchase orders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(true)}
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
          {(filters.status.length + filters.vendor.length) > 0 && (
            <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-primary text-primary-foreground">
              {filters.status.length + filters.vendor.length}
            </span>
          )}
        </Button>
      </div>

      <DataTable
        data={filteredPOs}
        columns={columns}
        onRowClick={(po) => navigate(`/vendors/po/${po.id}`)}
      />

      <FilterDrawer
        open={showFilters}
        onOpenChange={setShowFilters}
        filters={filterOptions}
        activeFilters={filters}
        onFilterChange={handleFilterChange}
        onClearAll={handleClearFilters}
        onApply={handleApplyFilters}
      />
    </div>
  );
}
