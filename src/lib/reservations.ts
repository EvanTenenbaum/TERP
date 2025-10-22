import { OrderLine, ReserveHold, InventoryItem } from "@/types/entities";
import { mockInventory } from "@/lib/mockData";
import { createAuditEntry } from "@/lib/audit";

let reserveHolds: ReserveHold[] = [];

/**
 * Reserve stock for order lines
 */
export function reserveStock(orderLines: OrderLine[], orderId: string): void {
  orderLines.forEach((line) => {
    const inventoryItem = mockInventory.find((item) => item.id === line.inventory_id);
    
    if (!inventoryItem) {
      throw new Error(`Inventory item ${line.inventory_id} not found`);
    }

    if (inventoryItem.qty_available < line.qty) {
      throw new Error(
        `Insufficient stock for ${line.inventory_name}. Available: ${inventoryItem.qty_available}, Requested: ${line.qty}`
      );
    }

    // Move from available to reserved
    inventoryItem.qty_available -= line.qty;
    inventoryItem.qty_reserved += line.qty;

    // Create reserve hold record
    const hold: ReserveHold = {
      id: `RH-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      order_line_id: line.id,
      qty: line.qty,
      created_at: new Date().toISOString(),
    };

    reserveHolds.push(hold);

    createAuditEntry({
      action: "reserve_stock",
      entity_type: "inventory",
      entity_id: line.inventory_id,
      before: { qty_available: inventoryItem.qty_available + line.qty, qty_reserved: inventoryItem.qty_reserved - line.qty },
      after: { qty_available: inventoryItem.qty_available, qty_reserved: inventoryItem.qty_reserved },
      ui_context: `Order ${orderId}`,
    });
  });
}

/**
 * Release reservation for order lines
 */
export function releaseReservation(orderLines: OrderLine[], orderId: string): void {
  orderLines.forEach((line) => {
    const inventoryItem = mockInventory.find((item) => item.id === line.inventory_id);
    
    if (!inventoryItem) return;

    // Move from reserved back to available
    inventoryItem.qty_reserved -= line.qty;
    inventoryItem.qty_available += line.qty;

    // Mark hold as released
    const hold = reserveHolds.find((h) => h.order_line_id === line.id);
    if (hold) {
      hold.released_at = new Date().toISOString();
    }

    createAuditEntry({
      action: "release_reservation",
      entity_type: "inventory",
      entity_id: line.inventory_id,
      before: { qty_available: inventoryItem.qty_available - line.qty, qty_reserved: inventoryItem.qty_reserved + line.qty },
      after: { qty_available: inventoryItem.qty_available, qty_reserved: inventoryItem.qty_reserved },
      ui_context: `Order ${orderId} cancelled`,
    });
  });
}

/**
 * Get all reserve holds
 */
export function getReserveHolds(): ReserveHold[] {
  return [...reserveHolds];
}

/**
 * Get reserve holds for an order
 */
export function getOrderReserveHolds(orderLineIds: string[]): ReserveHold[] {
  return reserveHolds.filter((h) => orderLineIds.includes(h.order_line_id) && !h.released_at);
}
