import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Download, RefreshCw, Archive, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/data/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { FilterDrawer } from "@/components/common/FilterDrawer";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { mockOrders, mockClients } from "@/lib/mockData";
import type { Order } from "@/types/entities";
import { toast } from "sonner";

export default function OrderList() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Record<string, any>>({});

  const handleNewOrder = () => {
    toast.success("Creating new order...");
    navigate("/sales/orders/new");
  };

  const handleExport = () => {
    toast.success("Export generated (expires in 7 days)");
  };

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: "n",
      description: "New Order",
      action: handleNewOrder,
    },
    {
      key: "s",
      ctrl: true,
      description: "Export",
      action: handleExport,
    },
  ]);

  const columns = [
    { key: "id", label: "Order ID" },
    {
      key: "client_id",
      label: "Client",
      render: (order: Order) => {
        const client = mockClients.find(c => c.id === order.client_id);
        return client?.name || order.client_id;
      }
    },
    {
      key: "status",
      label: "Status",
      render: (order: Order) => (
        <StatusBadge
          status={order.status === "Delivered" ? "success" : order.status === "Draft" ? "neutral" : "info"}
          label={order.status}
        />
      )
    },
    { key: "line_count", label: "Lines" },
    {
      key: "total",
      label: "Total",
      render: (order: Order) => `$${order.total.toLocaleString()}`
    },
    {
      key: "balance_due",
      label: "Balance Due",
      render: (order: Order) => `$${order.balance_due.toLocaleString()}`
    },
    {
      key: "updated_at",
      label: "Updated",
      render: (order: Order) => new Date(order.updated_at).toLocaleDateString()
    }
  ];

  const filteredOrders = mockOrders.filter(order => {
    if (!showArchived && order.archived) return false;
    
    // Search filter
    if (searchQuery) {
      const client = mockClients.find(c => c.id === order.client_id);
      const matchesSearch = order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client?.name.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
    }

    // Status filter
    if (filters.status && filters.status.length > 0) {
      if (!filters.status.includes(order.status)) return false;
    }

    // Client filter
    if (filters.client && filters.client.length > 0) {
      if (!filters.client.includes(order.client_id)) return false;
    }

    // Total amount filter
    if (filters.total_min && order.total < parseFloat(filters.total_min)) return false;
    if (filters.total_max && order.total > parseFloat(filters.total_max)) return false;

    // Date filter
    if (filters.date_from) {
      const orderDate = new Date(order.created_at);
      const fromDate = new Date(filters.date_from);
      if (orderDate < fromDate) return false;
    }
    if (filters.date_to) {
      const orderDate = new Date(order.created_at);
      const toDate = new Date(filters.date_to);
      if (orderDate > toDate) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mb-1">Orders</h1>
          <p className="text-sm text-muted-foreground">Manage sales orders and quotes</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {Object.keys(filters).filter(k => filters[k]).length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-primary text-primary-foreground">
                {Object.keys(filters).filter(k => filters[k]).length}
              </span>
            )}
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={() => setShowArchived(!showArchived)}>
            <Archive className="h-4 w-4 mr-2" />
            {showArchived ? "Hide" : "Show"} Archived
          </Button>
          <Button onClick={handleNewOrder}>
            <Plus className="h-4 w-4 mr-2" />
            New Order
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Input
          placeholder="Search orders by ID or client... (or press Ctrl+K)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <DataTable
        columns={columns}
        data={filteredOrders}
        onRowClick={(order) => navigate(`/sales/orders/${order.id}`)}
      />

      <FilterDrawer
        open={showFilters}
        onOpenChange={setShowFilters}
        filters={[
          {
            label: "Status",
            key: "status",
            type: "multiselect",
            options: [
              { label: "Draft", value: "Draft" },
              { label: "Pending", value: "Pending" },
              { label: "Confirmed", value: "Confirmed" },
              { label: "Fulfilled", value: "Fulfilled" },
              { label: "Invoiced", value: "Invoiced" },
              { label: "Closed", value: "Closed" },
              { label: "Cancelled", value: "Cancelled" },
            ],
          },
          {
            label: "Client",
            key: "client",
            type: "multiselect",
            options: mockClients.map(c => ({ label: c.name, value: c.id })),
          },
          {
            label: "Date Range",
            key: "date",
            type: "daterange",
          },
          {
            label: "Total Amount",
            key: "total",
            type: "numberrange",
          },
        ]}
        activeFilters={filters}
        onFilterChange={(key, value) => setFilters({ ...filters, [key]: value })}
        onClearAll={() => setFilters({})}
        onApply={() => {
          setShowFilters(false);
          toast.success("Filters applied");
        }}
      />
    </div>
  );
}
