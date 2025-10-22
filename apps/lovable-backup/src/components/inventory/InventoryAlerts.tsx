import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/types/entities";
import { AlertCard } from "@/components/alerts/AlertCard";
import { evaluateInventoryRules } from "@/lib/alertEngine";
import { mockInventory, mockRules } from "@/lib/mockData";

export function InventoryAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    // Evaluate all inventory items against rules
    const allAlerts: Alert[] = [];
    mockInventory.forEach((item) => {
      const itemAlerts = evaluateInventoryRules(item, mockRules);
      allAlerts.push(...itemAlerts);
    });
    setAlerts(allAlerts);
  }, []);

  const activeAlerts = alerts.filter((a) => a.status === "active");

  if (activeAlerts.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inventory Alerts</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activeAlerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onAcknowledge={() => {
                setAlerts(alerts.map((a) => 
                  a.id === alert.id ? { ...a, status: "acknowledged" as const } : a
                ));
              }}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
