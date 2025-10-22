import { Alert, Rule, InventoryItem } from "@/types/entities";
import { createAuditEntry } from "./audit";

export interface AlertTrigger {
  ruleId: string;
  entityType: string;
  entityId: string;
  triggeredValue: any;
  threshold: any;
}

/**
 * Evaluate inventory rules and create alerts if needed
 */
export function evaluateInventoryRules(
  item: InventoryItem,
  rules: Rule[]
): Alert[] {
  const alerts: Alert[] = [];

  rules.forEach((rule) => {
    let shouldAlert = false;
    let message = "";

    switch (rule.field) {
      case "qty_available":
        const threshold = parseFloat(rule.value);
        if (item.qty_available <= threshold) {
          shouldAlert = true;
          message = `Low stock: ${item.strain_name} has only ${item.qty_available} units available`;
        }
        break;

      case "qty_reserved":
        const totalQty = item.qty_available + item.qty_reserved;
        const reservedPercentage = totalQty > 0 ? (item.qty_reserved / totalQty) * 100 : 0;
        const pctThreshold = parseFloat(rule.value);
        if (reservedPercentage >= pctThreshold) {
          shouldAlert = true;
          message = `High reservation: ${item.strain_name} has ${reservedPercentage.toFixed(1)}% reserved`;
        }
        break;
    }

    if (shouldAlert) {
      const alert = createAlert({
        ruleId: rule.id,
        entityType: "inventory",
        entityId: item.id,
        severity: rule.severity,
        message,
      });
      alerts.push(alert);
    }
  });

  return alerts;
}

/**
 * Create an alert
 */
export function createAlert(params: {
  ruleId: string;
  entityType: string;
  entityId: string;
  severity: "info" | "warning" | "critical";
  message: string;
}): Alert {
  const alert: Alert = {
    id: `ALT-${Date.now()}`,
    severity: params.severity,
    type: params.ruleId,
    context_type: params.entityType,
    context_id: params.entityId,
    message: params.message,
    status: "active",
    created_at: new Date().toISOString(),
  };

  createAuditEntry({
    action: "alert_created",
    entity_type: params.entityType,
    entity_id: params.entityId,
    after: alert,
    ui_context: "alert_system",
    module: "alerts",
  });

  return alert;
}

/**
 * Acknowledge an alert
 */
export function acknowledgeAlert(alertId: string, userId: string): void {
  createAuditEntry({
    action: "alert_acknowledged",
    entity_type: "alert",
    entity_id: alertId,
    after: { acknowledged_by: userId, acknowledged_at: new Date().toISOString() },
    ui_context: "alert_management",
    module: "alerts",
  });
}
