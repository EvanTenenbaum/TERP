import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KPICard } from "@/components/data/KPICard";
import { Package, RotateCcw, AlertTriangle, ClipboardList } from "lucide-react";

export default function Intake() {
  const navigate = useNavigate();

  const kpiData = [
    { title: "Active Count Sessions", value: "3", trend: { value: "1", direction: "up" as const }, variant: "default" as const },
    { title: "Pending Returns", value: "12", trend: { value: "4", direction: "up" as const }, variant: "warning" as const },
    { title: "Discrepancies", value: "7", trend: { value: "2", direction: "down" as const }, variant: "success" as const },
  ];

  const intakeModules = [
    {
      title: "Cycle Count",
      description: "Physical inventory counting and verification",
      icon: ClipboardList,
      route: "/inventory/cycle-count",
      color: "text-brand",
    },
    {
      title: "Adjustments",
      description: "Inventory quantity and value adjustments",
      icon: Package,
      route: "/inventory/adjustments",
      color: "text-success",
    },
    {
      title: "Returns",
      description: "Customer and vendor return processing",
      icon: RotateCcw,
      route: "/inventory/returns",
      color: "text-warning",
    },
    {
      title: "Discrepancies",
      description: "Resolve inventory count discrepancies",
      icon: AlertTriangle,
      route: "/inventory/discrepancies",
      color: "text-destructive",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Intake</h1>
        <p className="text-sm text-muted-foreground mt-1">Inventory intake and reconciliation workflows</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {kpiData.map((kpi, idx) => (
          <KPICard key={idx} {...kpi} />
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {intakeModules.map((module) => (
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
