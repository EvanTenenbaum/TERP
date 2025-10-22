import { ArrowLeft, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useNavigate, useParams } from "react-router-dom";
import { DataTable } from "@/components/data/DataTable";

interface Invoice {
  id: string;
  number: string;
  amount: number;
  dueDate: string;
  status: "paid" | "pending" | "overdue";
  age: number;
}

export default function VendorDetail() {
  const navigate = useNavigate();
  const { id } = useParams();

  const vendor = {
    id,
    name: "Acme Supplies",
    contact: "John Smith",
    email: "john@acmesupplies.com",
    phone: "(555) 123-4567",
    totalOutstanding: 65000,
    invoices: [
      { id: "1", number: "INV-1001", amount: 15400, dueDate: "2025-01-18", status: "pending" as const, age: 12 },
      { id: "2", number: "INV-0995", amount: 12800, dueDate: "2025-01-05", status: "paid" as const, age: 28 },
      { id: "3", number: "INV-0987", amount: 8900, dueDate: "2024-12-20", status: "overdue" as const, age: 45 },
    ],
  };

  const statusMap = {
    pending: { status: "warning" as const, label: "PENDING" },
    paid: { status: "neutral" as const, label: "PAID" },
    overdue: { status: "error" as const, label: "OVERDUE" },
  };

  const columns = [
    { key: "number", label: "Invoice #" },
    { 
      key: "amount", 
      label: "Amount", 
      className: "text-right",
      render: (inv: Invoice) => `$${inv.amount.toLocaleString()}`
    },
    { key: "dueDate", label: "Due Date" },
    { 
      key: "age", 
      label: "Age",
      render: (inv: Invoice) => `${inv.age} days`
    },
    { 
      key: "status", 
      label: "Status",
      render: (inv: Invoice) => {
        const config = statusMap[inv.status];
        return <StatusBadge status={config.status} label={config.label} />;
      }
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/finance/aging")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="mb-1">{vendor.name}</h1>
          <p className="text-sm text-muted-foreground">{vendor.contact}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6">
          <p className="text-sm text-muted-foreground mb-1">Total Outstanding</p>
          <p className="text-2xl font-semibold">${vendor.totalOutstanding.toLocaleString()}</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground mb-1">Contact</p>
          <div className="space-y-2 mt-2">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{vendor.email}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{vendor.phone}</span>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground mb-1">Open Invoices</p>
          <p className="text-2xl font-semibold">{vendor.invoices.filter(i => i.status !== "paid").length}</p>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="mb-4">Invoice History</h3>
        <DataTable
          columns={columns}
          data={vendor.invoices}
          emptyMessage="No invoices found"
        />
      </Card>
    </div>
  );
}
