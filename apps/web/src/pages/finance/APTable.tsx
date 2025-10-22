import { useState } from "react";
import { Download, RefreshCw, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/data/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { mockBills, mockVendors } from "@/lib/mockData";
import type { Bill } from "@/types/entities";
import { toast } from "sonner";

export default function APTable() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const columns = [
    { key: "id", label: "Bill ID" },
    {
      key: "vendor_id",
      label: "Vendor",
      render: (bill: Bill) => {
        const vendor = mockVendors.find(v => v.id === bill.vendor_id);
        return vendor?.name || bill.vendor_id;
      }
    },
    { key: "issue_date", label: "Issue Date" },
    { key: "due_date", label: "Due Date" },
    {
      key: "status",
      label: "Status",
      render: (bill: Bill) => (
        <StatusBadge
          status={bill.status === "Paid" ? "success" : bill.status === "Overdue" ? "error" : "warning"}
          label={bill.status}
        />
      )
    },
    {
      key: "grand_total",
      label: "Grand Total",
      render: (bill: Bill) => `$${bill.grand_total.toLocaleString()}`
    },
    {
      key: "balance",
      label: "Balance",
      render: (bill: Bill) => `$${bill.balance.toLocaleString()}`
    }
  ];

  const filteredBills = mockBills.filter(bill => {
    if (!showArchived && bill.archived) return false;
    if (searchQuery) {
      return bill.id.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mb-1">Accounts Payable</h1>
          <p className="text-sm text-muted-foreground">Manage bills and payments</p>
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
        placeholder="Search bills..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="max-w-sm"
      />

      <DataTable columns={columns} data={filteredBills} onRowClick={(bill) => window.location.href = `/finance/bills/${bill.id}`} />
    </div>
  );
}
