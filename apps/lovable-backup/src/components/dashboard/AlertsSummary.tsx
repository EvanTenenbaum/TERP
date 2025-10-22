import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Info, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Alert } from "@/types/entities";

interface AlertsSummaryProps {
  alerts: Alert[];
}

export function AlertsSummary({ alerts }: AlertsSummaryProps) {
  const navigate = useNavigate();
  
  const activeAlerts = alerts.filter((a) => a.status === "active");
  const criticalCount = activeAlerts.filter((a) => a.severity === "critical").length;
  const warningCount = activeAlerts.filter((a) => a.severity === "warning").length;
  const infoCount = activeAlerts.filter((a) => a.severity === "info").length;

  const recentAlerts = activeAlerts.slice(0, 3);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>System Alerts</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate("/alerts")}>
            View All
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-4">
            {criticalCount > 0 && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {criticalCount} Critical
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge variant="outline" className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {warningCount} Warning
              </Badge>
            )}
            {infoCount > 0 && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Info className="h-3 w-3" />
                {infoCount} Info
              </Badge>
            )}
          </div>

          {recentAlerts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active alerts</p>
          ) : (
            <div className="space-y-2">
              {recentAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-start gap-2 p-2 rounded-lg border"
                >
                  <AlertCircle className={`h-4 w-4 mt-0.5 ${
                    alert.severity === "critical" ? "text-destructive" :
                    alert.severity === "warning" ? "text-warning" :
                    "text-info"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{alert.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(alert.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
