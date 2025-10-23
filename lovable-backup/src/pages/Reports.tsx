import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, BarChart3, TrendingUp, FileText } from "lucide-react";

export default function Reports() {
  const navigate = useNavigate();

  const dashboards = [
    { 
      id: "sales-overview", 
      name: "Sales Overview", 
      description: "Revenue, quotes, and conversion metrics",
      widgets: 6,
      lastUpdated: "2 hours ago"
    },
    { 
      id: "inventory-health", 
      name: "Inventory Health", 
      description: "Stock levels, turnover, and discrepancies",
      widgets: 8,
      lastUpdated: "1 day ago"
    },
    { 
      id: "financial-summary", 
      name: "Financial Summary", 
      description: "Cash flow, AR/AP, and profitability",
      widgets: 5,
      lastUpdated: "3 hours ago"
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">Analytics dashboards and custom reports</p>
        </div>
        <Button onClick={() => navigate("/analytics/dashboards")}>
          <Plus className="h-4 w-4 mr-2" />
          New Dashboard
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {dashboards.map((dashboard) => (
          <Card 
            key={dashboard.id} 
            className="p-6 hover:bg-elevated transition-fast cursor-pointer"
            onClick={() => navigate(`/analytics/dashboards/${dashboard.id}`)}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-panel text-brand">
                  <BarChart3 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1">{dashboard.name}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{dashboard.description}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {dashboard.widgets} widgets
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      Updated {dashboard.lastUpdated}
                    </span>
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="sm">View</Button>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-6 border-dashed">
        <div className="text-center py-8">
          <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Create Custom Dashboard</h3>
          <p className="text-sm text-muted-foreground mb-4">Build custom analytics with widgets and filters</p>
          <Button onClick={() => navigate("/analytics/dashboards")}>
            <Plus className="h-4 w-4 mr-2" />
            Get Started
          </Button>
        </div>
      </Card>
    </div>
  );
}
