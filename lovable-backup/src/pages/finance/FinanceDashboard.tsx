import { Card } from "@/components/ui/card";
import { KPICard } from "@/components/data/KPICard";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowRight, TrendingUp, TrendingDown } from "lucide-react";
import { mockInvoices, mockBills } from "@/lib/mockData";

export default function FinanceDashboard() {
  const navigate = useNavigate();

  const arTotal = mockInvoices.reduce((sum, inv) => sum + inv.balance, 0);
  const arOverdue = mockInvoices.filter(inv => {
    const dueDate = new Date(inv.due_date);
    return dueDate < new Date() && inv.balance > 0;
  }).reduce((sum, inv) => sum + inv.balance, 0);

  const apTotal = mockBills.reduce((sum, bill) => sum + bill.balance, 0);
  const apOverdue = mockBills.filter(bill => {
    const dueDate = new Date(bill.due_date);
    return dueDate < new Date() && bill.balance > 0;
  }).reduce((sum, bill) => sum + bill.balance, 0);

  const dueIn7Days = mockInvoices.filter(inv => {
    const dueDate = new Date(inv.due_date);
    const today = new Date();
    const diff = (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    return diff > 0 && diff <= 7 && inv.balance > 0;
  }).reduce((sum, inv) => sum + inv.balance, 0);

  const dueIn30Days = mockInvoices.filter(inv => {
    const dueDate = new Date(inv.due_date);
    const today = new Date();
    const diff = (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    return diff > 7 && diff <= 30 && inv.balance > 0;
  }).reduce((sum, inv) => sum + inv.balance, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-1">Finance Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of accounts receivable and payable</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <KPICard
          title="AR Total"
          value={`$${arTotal.toLocaleString()}`}
          trend={{ value: "+12%", direction: "up" }}
          onClick={() => navigate("/finance/ar")}
        />
        <KPICard
          title="AR Overdue"
          value={`$${arOverdue.toLocaleString()}`}
          trend={{ value: "-5%", direction: "down" }}
          onClick={() => navigate("/finance/ar")}
        />
        <KPICard
          title="AP Total"
          value={`$${apTotal.toLocaleString()}`}
          onClick={() => navigate("/finance/ap")}
        />
        <KPICard
          title="AP Overdue"
          value={`$${apOverdue.toLocaleString()}`}
          trend={{ value: "+8%", direction: "up" }}
          onClick={() => navigate("/finance/ap")}
        />
        <KPICard
          title="Due in 7 Days"
          value={`$${dueIn7Days.toLocaleString()}`}
          onClick={() => navigate("/finance/ar")}
        />
        <KPICard
          title="Due in 30 Days"
          value={`$${dueIn30Days.toLocaleString()}`}
          onClick={() => navigate("/finance/ar")}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-6 cursor-pointer hover:bg-card/80 transition-fast" onClick={() => navigate("/finance/ar")}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Accounts Receivable</h3>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Manage invoices and customer payments
          </p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">{mockInvoices.length}</p>
              <p className="text-xs text-muted-foreground">Open Invoices</p>
            </div>
            <div className="flex items-center gap-1 text-success">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm font-medium">12%</span>
            </div>
          </div>
        </Card>

        <Card className="p-6 cursor-pointer hover:bg-card/80 transition-fast" onClick={() => navigate("/finance/ap")}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Accounts Payable</h3>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Manage bills and vendor payments
          </p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">{mockBills.length}</p>
              <p className="text-xs text-muted-foreground">Open Bills</p>
            </div>
            <div className="flex items-center gap-1 text-destructive">
              <TrendingDown className="h-4 w-4" />
              <span className="text-sm font-medium">3%</span>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Quick Actions</h3>
        </div>
        <div className="grid gap-2 md:grid-cols-3">
          <Button variant="outline" onClick={() => navigate("/finance/ar")}>
            View AR Table
          </Button>
          <Button variant="outline" onClick={() => navigate("/finance/ap")}>
            View AP Table
          </Button>
          <Button variant="outline" onClick={() => navigate("/finance/aging")}>
            View Aging Report
          </Button>
        </div>
      </Card>
    </div>
  );
}
