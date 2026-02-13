/**
 * Inventory Tracker
 *
 * This module provides a stateful tracker for managing inventory quantities
 * during data generation. Ensures that orders don't exceed available inventory
 * and maintains accurate quantity tracking across all generated transactions.
 */

export interface BatchInventory {
  batchId: number;
  productId: number;
  initialQuantity: number;
  availableQuantity: number;
  reservedQuantity: number;
  soldQuantity: number;
  status: string;
}

export class InventoryTracker {
  private batches: Map<number, BatchInventory>;
  private productBatches: Map<number, number[]>; // productId -> batchIds[]

  constructor(
    initialBatches: Array<{
      id: number;
      productId: number;
      quantity: string;
      status: string;
    }>
  ) {
    this.batches = new Map();
    this.productBatches = new Map();

    // Initialize batch inventory
    for (const batch of initialBatches) {
      const quantity = parseFloat(batch.quantity);
      this.batches.set(batch.id, {
        batchId: batch.id,
        productId: batch.productId,
        initialQuantity: quantity,
        availableQuantity: quantity,
        reservedQuantity: 0,
        soldQuantity: 0,
        status: batch.status,
      });

      // Index by product
      let productBatchList = this.productBatches.get(batch.productId);
      if (!productBatchList) {
        productBatchList = [];
        this.productBatches.set(batch.productId, productBatchList);
      }
      productBatchList.push(batch.id);
    }
  }

  /**
   * Get available quantity for a specific batch
   */
  getAvailableQuantity(batchId: number): number {
    const batch = this.batches.get(batchId);
    return batch ? batch.availableQuantity : 0;
  }

  /**
   * Get total available quantity for a product across all batches
   */
  getTotalAvailableForProduct(productId: number): number {
    const batchIds = this.productBatches.get(productId) || [];
    return batchIds.reduce((total, batchId) => {
      const batch = this.batches.get(batchId);
      return total + (batch ? batch.availableQuantity : 0);
    }, 0);
  }

  /**
   * Get all available batches for a product
   */
  getAvailableBatchesForProduct(productId: number): BatchInventory[] {
    const batchIds = this.productBatches.get(productId) || [];
    return batchIds
      .map((id) => this.batches.get(id))
      .filter((batch): batch is BatchInventory => 
        batch !== undefined && batch.availableQuantity > 0 && batch.status === "LIVE"
      );
  }

  /**
   * Reserve inventory for an order (before it's confirmed)
   */
  reserveInventory(batchId: number, quantity: number): boolean {
    const batch = this.batches.get(batchId);
    if (!batch) {
      console.warn(`Batch ${batchId} not found`);
      return false;
    }

    if (batch.availableQuantity < quantity) {
      console.warn(
        `Insufficient inventory for batch ${batchId}: requested ${quantity}, available ${batch.availableQuantity}`
      );
      return false;
    }

    batch.availableQuantity -= quantity;
    batch.reservedQuantity += quantity;
    return true;
  }

  /**
   * Confirm a sale (convert reserved to sold)
   */
  confirmSale(batchId: number, quantity: number): boolean {
    const batch = this.batches.get(batchId);
    if (!batch) {
      console.warn(`Batch ${batchId} not found`);
      return false;
    }

    if (batch.reservedQuantity < quantity) {
      console.warn(
        `Insufficient reserved inventory for batch ${batchId}: requested ${quantity}, reserved ${batch.reservedQuantity}`
      );
      return false;
    }

    batch.reservedQuantity -= quantity;
    batch.soldQuantity += quantity;

    // Update status if sold out
    if (batch.availableQuantity === 0 && batch.reservedQuantity === 0) {
      batch.status = "SOLD_OUT";
    }

    return true;
  }

  /**
   * Sell inventory directly (reserve + confirm in one step)
   */
  sellInventory(batchId: number, quantity: number): boolean {
    const batch = this.batches.get(batchId);
    if (!batch) {
      console.warn(`Batch ${batchId} not found`);
      return false;
    }

    if (batch.availableQuantity < quantity) {
      console.warn(
        `Insufficient inventory for batch ${batchId}: requested ${quantity}, available ${batch.availableQuantity}`
      );
      return false;
    }

    batch.availableQuantity -= quantity;
    batch.soldQuantity += quantity;

    // Update status if sold out
    if (batch.availableQuantity === 0 && batch.reservedQuantity === 0) {
      batch.status = "SOLD_OUT";
    }

    return true;
  }

  /**
   * Release reserved inventory (if order is cancelled)
   */
  releaseReservation(batchId: number, quantity: number): boolean {
    const batch = this.batches.get(batchId);
    if (!batch) {
      console.warn(`Batch ${batchId} not found`);
      return false;
    }

    if (batch.reservedQuantity < quantity) {
      console.warn(
        `Cannot release more than reserved for batch ${batchId}: requested ${quantity}, reserved ${batch.reservedQuantity}`
      );
      return false;
    }

    batch.reservedQuantity -= quantity;
    batch.availableQuantity += quantity;

    // Update status if no longer sold out
    if (batch.status === "SOLD_OUT" && batch.availableQuantity > 0) {
      batch.status = "LIVE";
    }

    return true;
  }

  /**
   * Add new inventory (for intake/receiving)
   */
  addInventory(
    batchId: number,
    productId: number,
    quantity: number,
    status: string = "LIVE"
  ): void {
    const existing = this.batches.get(batchId);
    if (existing) {
      // Add to existing batch
      existing.initialQuantity += quantity;
      existing.availableQuantity += quantity;
    } else {
      // Create new batch
      this.batches.set(batchId, {
        batchId,
        productId,
        initialQuantity: quantity,
        availableQuantity: quantity,
        reservedQuantity: 0,
        soldQuantity: 0,
        status,
      });

      // Index by product
      let productBatchList = this.productBatches.get(productId);
      if (!productBatchList) {
        productBatchList = [];
        this.productBatches.set(productId, productBatchList);
      }
      productBatchList.push(batchId);
    }
  }

  /**
   * Get batch details
   */
  getBatch(batchId: number): BatchInventory | undefined {
    return this.batches.get(batchId);
  }

  /**
   * Get all batches
   */
  getAllBatches(): BatchInventory[] {
    return Array.from(this.batches.values());
  }

  /**
   * Get inventory summary
   */
  getSummary(): {
    totalBatches: number;
    totalInitialQuantity: number;
    totalAvailableQuantity: number;
    totalReservedQuantity: number;
    totalSoldQuantity: number;
    soldOutBatches: number;
  } {
    const batches = Array.from(this.batches.values());
    return {
      totalBatches: batches.length,
      totalInitialQuantity: batches.reduce(
        (sum, b) => sum + b.initialQuantity,
        0
      ),
      totalAvailableQuantity: batches.reduce(
        (sum, b) => sum + b.availableQuantity,
        0
      ),
      totalReservedQuantity: batches.reduce(
        (sum, b) => sum + b.reservedQuantity,
        0
      ),
      totalSoldQuantity: batches.reduce((sum, b) => sum + b.soldQuantity, 0),
      soldOutBatches: batches.filter((b) => b.status === "SOLD_OUT").length,
    };
  }

  /**
   * Validate inventory consistency
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const batch of this.batches.values()) {
      // Check that quantities add up
      const totalAccounted =
        batch.availableQuantity + batch.reservedQuantity + batch.soldQuantity;
      if (Math.abs(totalAccounted - batch.initialQuantity) > 0.01) {
        errors.push(
          `Batch ${batch.batchId}: Quantity mismatch. Initial: ${batch.initialQuantity}, Accounted: ${totalAccounted}`
        );
      }

      // Check that sold out status is correct
      if (batch.status === "SOLD_OUT") {
        if (batch.availableQuantity > 0 || batch.reservedQuantity > 0) {
          errors.push(
            `Batch ${batch.batchId}: Marked as SOLD_OUT but has available (${batch.availableQuantity}) or reserved (${batch.reservedQuantity}) inventory`
          );
        }
      }

      // Check for negative quantities
      if (batch.availableQuantity < 0) {
        errors.push(
          `Batch ${batch.batchId}: Negative available quantity: ${batch.availableQuantity}`
        );
      }
      if (batch.reservedQuantity < 0) {
        errors.push(
          `Batch ${batch.batchId}: Negative reserved quantity: ${batch.reservedQuantity}`
        );
      }
      if (batch.soldQuantity < 0) {
        errors.push(
          `Batch ${batch.batchId}: Negative sold quantity: ${batch.soldQuantity}`
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get batches with low inventory (below threshold)
   */
  getLowInventoryBatches(threshold: number = 10): BatchInventory[] {
    return Array.from(this.batches.values()).filter(
      (batch) =>
        batch.availableQuantity < threshold &&
        batch.availableQuantity > 0 &&
        batch.status === "LIVE"
    );
  }

  /**
   * Get sold out batches
   */
  getSoldOutBatches(): BatchInventory[] {
    return Array.from(this.batches.values()).filter(
      (batch) => batch.status === "SOLD_OUT"
    );
  }
}
