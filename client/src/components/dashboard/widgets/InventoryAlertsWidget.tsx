import { WidgetContainer } from "../WidgetContainer";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface InventoryAlert {
  id: string;
  product: string;
  currentStock: number;
  minStock: number;
  severity: "low" | "critical";
}

// Mock data - in production, this would come from tRPC
const mockAlerts: InventoryAlert[] = [
  { id: "1", product: "Blue Dream - 1oz", currentStock: 5, minStock: 20, severity: "critical" },
  { id: "2", product: "OG Kush - 1oz", currentStock: 15, minStock: 25, severity: "low" },
  { id: "3", product: "Gelato #41 - 1oz", currentStock: 18, minStock: 30, severity: "low" },
];

export function InventoryAlertsWidget() {
  return (
    <WidgetContainer title="Low Stock Alerts">
      <div className="space-y-3">
        {mockAlerts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No low stock alerts</p>
          </div>
        ) : (
          mockAlerts.map((alert) => (
            <div
              key={alert.id}
              className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  alert.severity === "critical" 
                    ? "bg-red-100 text-red-600" 
                    : "bg-yellow-100 text-yellow-600"
                }`}>
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium text-sm">{alert.product}</p>
                  <p className="text-xs text-muted-foreground">
                    {alert.currentStock} units remaining
                  </p>
                </div>
              </div>
              <Badge 
                variant="secondary" 
                className={
                  alert.severity === "critical"
                    ? "bg-red-100 text-red-800"
                    : "bg-yellow-100 text-yellow-800"
                }
              >
                {alert.severity}
              </Badge>
            </div>
          ))
        )}
      </div>
    </WidgetContainer>
  );
}

