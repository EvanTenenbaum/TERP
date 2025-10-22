import { createAuditEntry } from "./audit";

export interface InventoryAdjustment {
  id: string;
  inventory_id: string;
  adjustment_type: "add" | "subtract" | "set";
  qty_change: number;
  reason: string;
  reference?: string;
  created_at: string;
  created_by: string;
}

export interface CycleCountResult {
  id: string;
  inventory_id: string;
  expected_qty: number;
  counted_qty: number;
  variance: number;
  counted_at: string;
  counted_by: string;
  notes?: string;
}

/**
 * Create an inventory adjustment
 */
export function createAdjustment(
  inventoryId: string,
  adjustmentType: "add" | "subtract" | "set",
  qtyChange: number,
  reason: string,
  reference?: string
): InventoryAdjustment {
  const adjustment: InventoryAdjustment = {
    id: `ADJ-${Date.now()}`,
    inventory_id: inventoryId,
    adjustment_type: adjustmentType,
    qty_change: qtyChange,
    reason,
    reference,
    created_at: new Date().toISOString(),
    created_by: "U-001",
  };

  createAuditEntry({
    action: "inventory_adjustment",
    entity_type: "inventory",
    entity_id: inventoryId,
    after: adjustment,
    ui_context: "inventory_management",
    module: "inventory",
  });

  return adjustment;
}

/**
 * Record a cycle count
 */
export function recordCycleCount(
  inventoryId: string,
  expectedQty: number,
  countedQty: number,
  notes?: string
): CycleCountResult {
  const result: CycleCountResult = {
    id: `CC-${Date.now()}`,
    inventory_id: inventoryId,
    expected_qty: expectedQty,
    counted_qty: countedQty,
    variance: countedQty - expectedQty,
    counted_at: new Date().toISOString(),
    counted_by: "U-001",
    notes,
  };

  createAuditEntry({
    action: "cycle_count",
    entity_type: "inventory",
    entity_id: inventoryId,
    before: { qty: expectedQty },
    after: { qty: countedQty, variance: result.variance },
    ui_context: "cycle_count",
    module: "inventory",
  });

  // If there's a variance, create an adjustment
  if (result.variance !== 0) {
    createAdjustment(
      inventoryId,
      "set",
      countedQty,
      `Cycle count adjustment - Variance: ${result.variance}`,
      result.id
    );
  }

  return result;
}

/**
 * Reserve inventory for an order
 */
export function reserveInventory(
  orderId: string,
  inventoryId: string,
  qty: number
): boolean {
  createAuditEntry({
    action: "reserve_inventory",
    entity_type: "inventory",
    entity_id: inventoryId,
    after: { order_id: orderId, qty_reserved: qty },
    ui_context: "order_processing",
    module: "inventory",
  });

  return true;
}

/**
 * Release reserved inventory
 */
export function releaseReservation(
  orderId: string,
  inventoryId: string,
  qty: number
): boolean {
  createAuditEntry({
    action: "release_reservation",
    entity_type: "inventory",
    entity_id: inventoryId,
    after: { order_id: orderId, qty_released: qty },
    ui_context: "order_processing",
    module: "inventory",
  });

  return true;
}
