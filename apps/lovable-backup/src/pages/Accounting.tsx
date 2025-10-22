import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KPICard } from "@/components/data/KPICard";
import { DollarSign, CreditCard, Clock, Users } from "lucide-react";

export default function Accounting() {
  const navigate = useNavigate();

  const kpiData = [
    { title: "Outstanding AR", value: "$245K", trend: { value: "12%", direction: "up" as const }, variant: "warning" as const },
    { title: "Due in 30 Days", value: "$89K", trend: { value: "5%", direction: "up" as const }, variant: "default" as const },
    { title: "Overdue", value: "$23K", trend: { value: "8%", direction: "down" as const }, variant: "success" as const },
  ];

  const accountingModules = [
    {
      title: "Finance Dashboard",
      description: "Overview of financial metrics and cash flow",
      icon: DollarSign,
      route: "/finance",
      color: "text-brand",
    },
    {
      title: "Payments",
      description: "Process and track payment transactions",
      icon: CreditCard,
      route: "/finance/payments",
      color: "text-success",
    },
    {
      title: "AP Aging",
      description: "Accounts payable aging analysis",
      icon: Clock,
      route: "/finance/aging",
      color: "text-warning",
    },
    {
      title: "Vendors",
      description: "Vendor management and payment history",
      icon: Users,
      route: "/finance/aging",
      color: "text-accent",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Accounting</h1>
        <p className="text-sm text-muted-foreground mt-1">Financial operations and vendor management</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {kpiData.map((kpi, idx) => (
          <KPICard key={idx} {...kpi} />
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {accountingModules.map((module) => (
          <Card key={module.route} className="p-6 hover:bg-elevated transition-fast cursor-pointer" onClick={() => navigate(module.route)}>
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-lg bg-panel ${module.color}`}>
                <module.icon className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-1">{module.title}</h3>
                <p className="text-sm text-muted-foreground">{module.description}</p>
              </div>
              <Button variant="ghost" size="sm">Open</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
