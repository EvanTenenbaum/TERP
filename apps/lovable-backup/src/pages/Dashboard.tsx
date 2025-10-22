import { DollarSign, Package, FileText, AlertCircle } from "lucide-react";
import { KPICard } from "@/components/data/KPICard";
import { QuickActions } from "@/components/common/QuickActions";
import { AlertsSummary } from "@/components/dashboard/AlertsSummary";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/StatusBadge";
import { mockRules } from "@/lib/mockData";
import { evaluateInventoryRules } from "@/lib/alertEngine";
import { mockInventory } from "@/lib/mockData";

export default function Dashboard() {
  // Generate alerts from inventory rules
  const alerts = mockInventory.flatMap(item => evaluateInventoryRules(item, mockRules));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to TERP - Your enterprise resource planning system
        </p>
      </div>

      <QuickActions />

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-3">
        <KPICard
          title="Outstanding AR"
          value="$247,500"
          icon={DollarSign}
          trend={{ value: "8.2% from last month", direction: "down" }}
          variant="warning"
        />
        <KPICard
          title="Active Quotes"
          value="34"
          icon={FileText}
          trend={{ value: "12 new this week", direction: "up" }}
        />
        <KPICard
          title="Low Stock Items"
          value="7"
          icon={Package}
          variant="error"
        />
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <AlertsSummary alerts={alerts} />
        
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3>Recent Quotes</h3>
            <Button variant="ghost" size="sm">View All</Button>
          </div>
          <div className="space-y-3">
            {[
              { id: "Q-1234", client: "Acme Corp", amount: "$45,000", status: "open" },
              { id: "Q-1233", client: "TechStart Inc", amount: "$12,500", status: "open" },
              { id: "Q-1232", client: "Global Industries", amount: "$78,900", status: "closed" },
            ].map((quote) => (
              <div key={quote.id} className="flex items-center justify-between p-3 rounded-md bg-panel hover:bg-elevated transition-fast cursor-pointer">
                <div className="space-y-1">
                  <p className="text-sm font-medium">{quote.id}</p>
                  <p className="text-xs text-muted-foreground">{quote.client}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold">{quote.amount}</span>
                  <StatusBadge 
                    status={quote.status === "open" ? "info" : "neutral"} 
                    label={quote.status.toUpperCase()} 
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
