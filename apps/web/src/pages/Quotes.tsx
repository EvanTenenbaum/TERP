import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/data/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useNavigate } from "react-router-dom";

interface Quote {
  id: string;
  quoteNumber: string;
  client: string;
  total: string;
  status: "open" | "closed" | "converted";
  date: string;
}

const mockQuotes: Quote[] = [
  { id: "1", quoteNumber: "Q-1234", client: "Acme Corp", total: "$45,000", status: "open", date: "2025-01-10" },
  { id: "2", quoteNumber: "Q-1233", client: "TechStart Inc", total: "$12,500", status: "open", date: "2025-01-09" },
  { id: "3", quoteNumber: "Q-1232", client: "Global Industries", total: "$78,900", status: "converted", date: "2025-01-08" },
  { id: "4", quoteNumber: "Q-1231", client: "Smith & Co", total: "$23,400", status: "closed", date: "2025-01-07" },
];

export default function Quotes() {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const filteredQuotes = mockQuotes.filter(
    (quote) =>
      quote.quoteNumber.toLowerCase().includes(search.toLowerCase()) ||
      quote.client.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    { key: "quoteNumber", label: "Quote #" },
    { key: "client", label: "Client" },
    { key: "total", label: "Total", className: "text-right" },
    { 
      key: "status", 
      label: "Status",
      render: (quote: Quote) => {
        const statusMap = {
          open: { status: "info" as const, label: "OPEN" },
          closed: { status: "neutral" as const, label: "CLOSED" },
          converted: { status: "success" as const, label: "CONVERTED" },
        };
        const config = statusMap[quote.status];
        return <StatusBadge status={config.status} label={config.label} />;
      }
    },
    { key: "date", label: "Date" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mb-2">Quotes</h1>
          <p className="text-muted-foreground">Manage and track your sales quotes</p>
        </div>
        <Button onClick={() => navigate("/quotes/new")}>
          <Plus className="h-4 w-4 mr-2" />
          New Quote
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search quotes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredQuotes}
        onRowClick={(quote) => navigate(`/quotes/${quote.id}`)}
        emptyMessage="No quotes found"
      />
    </div>
  );
}
