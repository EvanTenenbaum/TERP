import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KPICard } from "@/components/data/KPICard";
import { DataTable } from "@/components/data/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Plus, Search } from "lucide-react";

export default function Sales() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const kpiData = [
    { title: "Open Quotes", value: "23", trend: { value: "12%", direction: "up" as const }, variant: "default" as const },
    { title: "Monthly Revenue", value: "$142K", trend: { value: "8%", direction: "up" as const }, variant: "success" as const },
    { title: "Avg Quote Value", value: "$6,174", trend: { value: "3%", direction: "down" as const }, variant: "warning" as const },
  ];

  const quotes = [
    { id: "Q-1234", client: "Acme Corp", amount: "$14,500", status: "open", date: "2025-01-12" },
    { id: "Q-1235", client: "TechStart Inc", amount: "$8,200", status: "open", date: "2025-01-14" },
    { id: "Q-1236", client: "BuildCo", amount: "$22,100", status: "closed", date: "2025-01-15" },
  ];

  const columns = [
    { key: "id", label: "Quote ID" },
    { key: "client", label: "Client" },
    { key: "amount", label: "Amount" },
    { 
      key: "status", 
      label: "Status",
      render: (row: any) => <StatusBadge status={row.status === "open" ? "info" : "success"} label={row.status === "open" ? "Open" : "Closed"} />
    },
    { key: "date", label: "Date" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Sales</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage quotes and sales pipeline</p>
        </div>
        <Button onClick={() => navigate("/quotes/new")}>
          <Plus className="h-4 w-4 mr-2" />
          New Quote
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {kpiData.map((kpi, idx) => (
          <KPICard key={idx} {...kpi} />
        ))}
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Recent Quotes</h2>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search quotes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <DataTable
          columns={columns}
          data={quotes}
          onRowClick={(row) => navigate(`/quotes/${row.id}`)}
        />
        <div className="mt-4 flex justify-end">
          <Button variant="outline" onClick={() => navigate("/quotes")}>
            View All Quotes
          </Button>
        </div>
      </Card>
    </div>
  );
}
