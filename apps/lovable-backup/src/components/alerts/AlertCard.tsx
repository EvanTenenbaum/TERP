import { Alert } from "@/types/entities";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { acknowledgeAlert } from "@/lib/alertEngine";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, CheckCircle, Info } from "lucide-react";

interface AlertCardProps {
  alert: Alert;
  onAcknowledge?: () => void;
}

export function AlertCard({ alert, onAcknowledge }: AlertCardProps) {
  const { toast } = useToast();

  const handleAcknowledge = () => {
    acknowledgeAlert(alert.id, "U-001");
    toast({
      title: "Alert Acknowledged",
      description: "Alert has been marked as acknowledged",
    });
    onAcknowledge?.();
  };

  const severityConfig = {
    info: { color: "bg-blue-500", icon: Info, label: "Info" },
    warning: { color: "bg-yellow-500", icon: AlertCircle, label: "Warning" },
    critical: { color: "bg-red-500", icon: AlertCircle, label: "Critical" },
  };

  const config = severityConfig[alert.severity];
  const Icon = config.icon;

  return (
    <Card className={`p-4 border-l-4 ${config.color}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <Icon className={`h-5 w-5 mt-0.5 ${config.color.replace('bg-', 'text-')}`} />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant={alert.severity === "critical" ? "destructive" : "outline"}>
                {config.label}
              </Badge>
              {alert.status === "acknowledged" && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Acknowledged
                </Badge>
              )}
            </div>
            <p className="font-medium mb-1">{alert.message}</p>
            <p className="text-sm text-muted-foreground">
              Created: {new Date(alert.created_at).toLocaleString()}
            </p>
          </div>
        </div>
        {alert.status !== "acknowledged" && (
          <Button variant="outline" size="sm" onClick={handleAcknowledge}>
            Acknowledge
          </Button>
        )}
      </div>
    </Card>
  );
}
