import { useState } from "react";
import { Download, RefreshCw, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/data/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { mockInvoices, mockClients } from "@/lib/mockData";
import type { Invoice } from "@/types/entities";
import { toast } from "sonner";

export default function ARTable() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const columns = [
    { key: "id", label: "Invoice ID" },
    {
      key: "client_id",
      label: "Client",
      render: (invoice: Invoice) => {
        const client = mockClients.find(c => c.id === invoice.client_id);
        return client?.name || invoice.client_id;
      }
    },
    { key: "issue_date", label: "Issue Date" },
    { key: "due_date", label: "Due Date" },
    {
      key: "status",
      label: "Status",
      render: (invoice: Invoice) => (
        <StatusBadge
          status={invoice.status === "Paid" ? "success" : invoice.status === "Overdue" ? "error" : "warning"}
          label={invoice.status}
        />
      )
    },
    {
      key: "grand_total",
      label: "Grand Total",
      render: (invoice: Invoice) => `$${invoice.grand_total.toLocaleString()}`
    },
    {
      key: "balance",
      label: "Balance",
      render: (invoice: Invoice) => `$${invoice.balance.toLocaleString()}`
    }
  ];

  const filteredInvoices = mockInvoices.filter(invoice => {
    if (!showArchived && invoice.archived) return false;
    if (searchQuery) {
      return invoice.id.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mb-1">Accounts Receivable</h1>
          <p className="text-sm text-muted-foreground">Manage invoices and payments</p>
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
        </div>
      </div>

      <Input
        placeholder="Search invoices..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="max-w-sm"
      />

      <DataTable columns={columns} data={filteredInvoices} onRowClick={(inv) => window.location.href = `/finance/invoices/${inv.id}`} />
    </div>
  );
}
