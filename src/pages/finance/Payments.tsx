import { useState } from "react";
import { Search, Filter, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/data/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";

interface Payment {
  id: string;
  invoiceNumber: string;
  vendor: string;
  amount: string;
  dueDate: string;
  status: "pending" | "scheduled" | "paid" | "overdue";
}

export default function Payments() {
  const [search, setSearch] = useState("");
  const [payments] = useState<Payment[]>([
    { id: "1", invoiceNumber: "INV-1001", vendor: "Acme Supplies", amount: "$15,400", dueDate: "2025-01-18", status: "scheduled" },
    { id: "2", invoiceNumber: "INV-1002", vendor: "TechParts Inc", amount: "$8,900", dueDate: "2025-01-20", status: "scheduled" },
    { id: "3", invoiceNumber: "INV-1003", vendor: "Global Logistics", amount: "$21,500", dueDate: "2025-01-22", status: "pending" },
    { id: "4", invoiceNumber: "INV-0998", vendor: "Office Depot", amount: "$3,200", dueDate: "2025-01-10", status: "overdue" },
    { id: "5", invoiceNumber: "INV-0995", vendor: "Acme Supplies", amount: "$12,800", dueDate: "2025-01-05", status: "paid" },
  ]);

  const filteredPayments = payments.filter(
    (payment) =>
      payment.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      payment.vendor.toLowerCase().includes(search.toLowerCase())
  );

  const statusMap = {
    pending: { status: "warning" as const, label: "PENDING" },
    scheduled: { status: "success" as const, label: "SCHEDULED" },
    paid: { status: "neutral" as const, label: "PAID" },
    overdue: { status: "error" as const, label: "OVERDUE" },
  };

  const columns = [
    { key: "invoiceNumber", label: "Invoice #" },
    { key: "vendor", label: "Vendor" },
    { key: "amount", label: "Amount", className: "text-right" },
    { key: "dueDate", label: "Due Date" },
    { 
      key: "status", 
      label: "Status",
      render: (payment: Payment) => {
        const config = statusMap[payment.status];
        return <StatusBadge status={config.status} label={config.label} />;
      }
    },
    {
      key: "actions",
      label: "",
      render: (payment: Payment) => (
        payment.status === "pending" || payment.status === "overdue" ? (
          <Button size="sm" variant="outline">
            <CreditCard className="h-4 w-4 mr-2" />
            Pay Now
          </Button>
        ) : null
      )
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mb-2">Payments</h1>
          <p className="text-muted-foreground">Manage vendor payments</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search payments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="icon">
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={filteredPayments}
        emptyMessage="No payments found"
      />
    </div>
  );
}
