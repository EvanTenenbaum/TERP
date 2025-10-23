import { Plus, BarChart3, Grid3x3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/common/EmptyState";
import { useNavigate } from "react-router-dom";

interface Dashboard {
  id: string;
  name: string;
  description: string;
  widgetCount: number;
  lastModified: string;
}

export default function DashboardsIndex() {
  const navigate = useNavigate();
  
  const dashboards: Dashboard[] = [
    { id: "1", name: "Executive Overview", description: "High-level KPIs and trends", widgetCount: 8, lastModified: "2 hours ago" },
    { id: "2", name: "Sales Performance", description: "Quote conversion and revenue tracking", widgetCount: 6, lastModified: "1 day ago" },
    { id: "3", name: "Inventory Health", description: "Stock levels and turnover rates", widgetCount: 5, lastModified: "3 days ago" },
  ];

  if (dashboards.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="mb-2">Analytics Dashboards</h1>
            <p className="text-muted-foreground">Create custom dashboards with widgets</p>
          </div>
        </div>
        <EmptyState
          icon={BarChart3}
          title="No Dashboards Yet"
          description="Create your first analytics dashboard to visualize your data"
          action={{
            label: "Create Dashboard",
            onClick: () => navigate("/analytics/dashboards/new")
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mb-2">Analytics Dashboards</h1>
          <p className="text-muted-foreground">Create and manage custom dashboards</p>
        </div>
        <Button onClick={() => navigate("/analytics/dashboards/new")}>
          <Plus className="h-4 w-4 mr-2" />
          New Dashboard
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {dashboards.map((dashboard) => (
          <Card
            key={dashboard.id}
            className="p-6 hover:shadow-card transition-fast cursor-pointer"
            onClick={() => navigate(`/analytics/dashboards/${dashboard.id}`)}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-brand/10">
                <BarChart3 className="h-6 w-6 text-brand" />
              </div>
              <Grid3x3 className="h-4 w-4 text-muted-foreground" />
            </div>
            <h3 className="mb-2">{dashboard.name}</h3>
            <p className="text-sm text-muted-foreground mb-4">{dashboard.description}</p>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{dashboard.widgetCount} widgets</span>
              <span>{dashboard.lastModified}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
