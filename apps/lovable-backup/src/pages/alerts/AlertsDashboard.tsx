import { useState } from "react";
import { Bell, CheckCircle, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mockAlerts } from "@/lib/mockData";
import { toast } from "sonner";

export default function AlertsDashboard() {
  const [alerts, setAlerts] = useState(mockAlerts);

  const handleAcknowledge = (id: string) => {
    setAlerts(alerts.map(a => a.id === id ? { ...a, status: "acknowledged" } : a));
    toast.success("Alert acknowledged");
  };

  const unacknowledgedCount = alerts.filter(a => a.status !== "acknowledged").length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mb-1">Alerts</h1>
          <p className="text-sm text-muted-foreground">
            {unacknowledgedCount} unacknowledged alert{unacknowledgedCount !== 1 ? 's' : ''}
          </p>
        </div>
        <Button variant="outline" size="sm">
          <Bell className="h-4 w-4 mr-2" />
          Configure
        </Button>
      </div>

      <div className="space-y-3">
        {alerts.map(alert => (
          <Card key={alert.id} className={`p-4 ${alert.status === "acknowledged" ? 'opacity-60' : ''}`}>
            <div className="flex items-start gap-4">
              <div className={`p-2 rounded-full ${
                alert.severity === 'critical' ? 'bg-destructive/10' :
                alert.severity === 'warning' ? 'bg-warning/10' : 'bg-muted'
              }`}>
                <AlertTriangle className={`h-5 w-5 ${
                  alert.severity === 'critical' ? 'text-destructive' :
                  alert.severity === 'warning' ? 'text-warning' : 'text-muted-foreground'
                }`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold">{alert.type}</h3>
                  <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}>
                    {alert.severity}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{alert.message}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(alert.created_at).toLocaleString()}
                </p>
              </div>
              {alert.status !== "acknowledged" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAcknowledge(alert.id)}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Acknowledge
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
