import { Order } from "@/types/entities";
import { createAuditEntry } from "./audit";
import { reserveInventory, releaseReservation } from "./inventoryOperations";
import { generateInvoice } from "./financeOperations";

export type OrderAction = "submit" | "confirm" | "pick" | "pack" | "ship" | "deliver" | "cancel";

export interface WorkflowResult {
  success: boolean;
  newStatus: string;
  message: string;
}

/**
 * Valid status transitions for orders
 */
const STATUS_TRANSITIONS: Record<string, string[]> = {
  "Draft": ["Confirmed", "Cancelled"],
  "Confirmed": ["Shipped", "Cancelled"],
  "Shipped": ["Delivered"],
  "Delivered": [],
  "Cancelled": [],
};

/**
 * Execute a workflow action on an order
 */
export function executeOrderAction(
  order: Order,
  action: OrderAction,
  lines?: Array<{ inventory_id: string; qty: number }>
): WorkflowResult {
  const currentStatus = order.status;
  let newStatus: string;

  switch (action) {
    case "submit":
      if (!canTransition(currentStatus, "Confirmed")) {
        return { success: false, newStatus: currentStatus, message: "Cannot submit order in current status" };
      }
      newStatus = "Confirmed";
      
      // Reserve inventory
      if (lines) {
        lines.forEach((line) => {
          reserveInventory(order.id, line.inventory_id, line.qty);
        });
      }
      break;

    case "confirm":
      if (!canTransition(currentStatus, "Confirmed")) {
        return { success: false, newStatus: currentStatus, message: "Cannot confirm order in current status" };
      }
      newStatus = "Confirmed";
      
      // Reserve inventory
      if (lines) {
        lines.forEach((line) => {
          reserveInventory(order.id, line.inventory_id, line.qty);
        });
      }
      break;

    case "pick":
    case "pack":
      if (!canTransition(currentStatus, "Shipped")) {
        return { success: false, newStatus: currentStatus, message: "Cannot process order in current status" };
      }
      newStatus = "Shipped";
      
      // Generate invoice on shipment
      if (lines) {
        const lineItems = lines.map((line) => ({
          description: line.inventory_id,
          qty: line.qty,
          price: 0,
          total: 0,
        }));
        generateInvoice(order.id, order.client_id, lineItems);
      }
      break;

    case "ship":
      if (!canTransition(currentStatus, "Shipped")) {
        return { success: false, newStatus: currentStatus, message: "Cannot ship order in current status" };
      }
      newStatus = "Shipped";
      
      // Generate invoice on shipment
      if (lines) {
        const lineItems = lines.map((line) => ({
          description: line.inventory_id,
          qty: line.qty,
          price: 0,
          total: 0,
        }));
        generateInvoice(order.id, order.client_id, lineItems);
      }
      break;

    case "deliver":
      if (!canTransition(currentStatus, "Delivered")) {
        return { success: false, newStatus: currentStatus, message: "Cannot deliver order in current status" };
      }
      newStatus = "Delivered";
      break;

    case "cancel":
      if (!canTransition(currentStatus, "Cancelled")) {
        return { success: false, newStatus: currentStatus, message: "Cannot cancel order in current status" };
      }
      newStatus = "Cancelled";
      
      // Release reserved inventory
      if (lines && currentStatus === "Confirmed") {
        lines.forEach((line) => {
          releaseReservation(order.id, line.inventory_id, line.qty);
        });
      }
      break;

    default:
      return { success: false, newStatus: currentStatus, message: "Invalid action" };
  }

  // Create audit entry
  createAuditEntry({
    action: `order_${action}`,
    entity_type: "order",
    entity_id: order.id,
    before: { status: currentStatus },
    after: { status: newStatus },
    ui_context: "order_workflow",
    module: "sales",
  });

  return {
    success: true,
    newStatus,
    message: `Order ${action}ed successfully`,
  };
}

/**
 * Check if status transition is valid
 */
function canTransition(currentStatus: string, targetStatus: string): boolean {
  const allowedTransitions = STATUS_TRANSITIONS[currentStatus] || [];
  return allowedTransitions.includes(targetStatus);
}

/**
 * Get available actions for an order in current status
 */
export function getAvailableActions(status: string): OrderAction[] {
  const actions: Record<string, OrderAction[]> = {
    "Draft": ["submit", "cancel"],
    "Confirmed": ["ship", "cancel"],
    "Shipped": ["deliver"],
    "Delivered": [],
    "Cancelled": [],
  };

  return actions[status] || [];
}
