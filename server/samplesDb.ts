import { getDb } from "./db";
import { 
  sampleRequests, 
  sampleAllocations, 
  batches, 
  orders,
  inventoryMovements,
  type InsertSampleRequest,
  type InsertSampleAllocation,
  type SampleRequest
} from "../drizzle/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";

/**
 * Create a new sample request
 * Validates monthly allocation before creating
 */
export async function createSampleRequest(
  clientId: number,
  requestedBy: number,
  products: Array<{productId: number, quantity: string}>,
  notes?: string
): Promise<SampleRequest> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Check monthly allocation
    const currentMonth = new Date().toISOString().slice(0, 7); // "2025-10"
    const totalRequested = products.reduce((sum, p) => sum + parseFloat(p.quantity), 0);
    
    const canAllocate = await checkMonthlyAllocation(clientId, totalRequested.toString());
    if (!canAllocate) {
      throw new Error("Monthly sample allocation exceeded");
    }

    // Create sample request
    const [request] = await db.insert(sampleRequests).values({
      clientId,
      requestedBy,
      requestDate: new Date(),
      products: products as any,
      status: "PENDING",
      notes
    });

    const newRequest = await db.select()
      .from(sampleRequests)
      .where(eq(sampleRequests.id, request.insertId))
      .limit(1);

    return newRequest[0];
  } catch (error: any) {
    throw new Error(`Failed to create sample request: ${error.message}`);
  }
}

/**
 * Fulfill a sample request
 * Allocates inventory from sample-designated batches
 * Updates monthly allocation
 * Creates inventory movements
 */
export async function fulfillSampleRequest(
  requestId: number,
  fulfilledBy: number
): Promise<SampleRequest> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Get sample request
    const [request] = await db.select()
      .from(sampleRequests)
      .where(eq(sampleRequests.id, requestId))
      .limit(1);

    if (!request) {
      throw new Error("Sample request not found");
    }

    if (request.status !== "PENDING") {
      throw new Error("Sample request is not pending");
    }

    const products = JSON.parse(request.products as any) as Array<{productId: number, quantity: string}>;
    let totalCost = 0;

    // Allocate inventory for each product
    for (const product of products) {
      // Find sample-available batches for this product
      const availableBatches = await db.select()
        .from(batches)
        .where(and(
          eq(batches.productId, product.productId),
          sql`${batches.sampleAvailable} = 1 OR ${batches.sampleOnly} = 1`,
          sql`CAST(${batches.sampleQty} AS DECIMAL(15,4)) >= ${product.quantity}`
        ))
        .orderBy(desc(batches.sampleOnly)) // Prefer sample-only batches first
        .limit(1);

      if (availableBatches.length === 0) {
        throw new Error(`Insufficient sample inventory for product ${product.productId}`);
      }

      const batch = availableBatches[0];
      const quantityBefore = batch.sampleQty;
      const quantityAfter = (parseFloat(batch.sampleQty) - parseFloat(product.quantity)).toString();

      // Reduce sample quantity
      await db.update(batches)
        .set({ 
          sampleQty: quantityAfter,
          updatedAt: new Date()
        })
        .where(eq(batches.id, batch.id));

      // Create inventory movement
      await db.insert(inventoryMovements).values({
        batchId: batch.id,
        movementType: "SAMPLE",
        quantityChange: `-${product.quantity}`,
        quantityBefore,
        quantityAfter,
        referenceType: "SAMPLE_REQUEST",
        referenceId: requestId,
        reason: `Sample request #${requestId}`,
        performedBy: fulfilledBy
      });

      // Calculate cost (use batch COGS)
      const unitCogs = batch.cogsMode === "FIXED" 
        ? parseFloat(batch.unitCogs || "0")
        : (parseFloat(batch.unitCogsMin || "0") + parseFloat(batch.unitCogsMax || "0")) / 2;
      
      totalCost += unitCogs * parseFloat(product.quantity);
    }

    // Update sample request
    await db.update(sampleRequests)
      .set({
        status: "FULFILLED",
        fulfilledDate: new Date(),
        fulfilledBy,
        totalCost: totalCost.toFixed(2),
        updatedAt: new Date()
      })
      .where(eq(sampleRequests.id, requestId));

    // Update monthly allocation
    const currentMonth = new Date().toISOString().slice(0, 7);
    const totalQuantity = products.reduce((sum, p) => sum + parseFloat(p.quantity), 0);
    await updateMonthlyAllocation(request.clientId, currentMonth, totalQuantity.toString());

    // Return updated request
    const [updated] = await db.select()
      .from(sampleRequests)
      .where(eq(sampleRequests.id, requestId))
      .limit(1);

    return updated;
  } catch (error: any) {
    throw new Error(`Failed to fulfill sample request: ${error.message}`);
  }
}

/**
 * Cancel a sample request
 */
export async function cancelSampleRequest(
  requestId: number,
  cancelledBy: number,
  reason: string
): Promise<SampleRequest> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    await db.update(sampleRequests)
      .set({
        status: "CANCELLED",
        cancelledDate: new Date(),
        cancelledBy,
        cancellationReason: reason,
        updatedAt: new Date()
      })
      .where(eq(sampleRequests.id, requestId));

    const [updated] = await db.select()
      .from(sampleRequests)
      .where(eq(sampleRequests.id, requestId))
      .limit(1);

    return updated;
  } catch (error: any) {
    throw new Error(`Failed to cancel sample request: ${error.message}`);
  }
}

/**
 * Link an order to a sample request (conversion tracking)
 */
export async function linkOrderToSample(
  orderId: number,
  sampleRequestId: number
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Update order
    await db.update(orders)
      .set({ relatedSampleRequestId: sampleRequestId })
      .where(eq(orders.id, orderId));

    // Update sample request
    await db.update(sampleRequests)
      .set({
        relatedOrderId: orderId,
        conversionDate: new Date(),
        updatedAt: new Date()
      })
      .where(eq(sampleRequests.id, sampleRequestId));
  } catch (error: any) {
    throw new Error(`Failed to link order to sample: ${error.message}`);
  }
}

/**
 * Check if client can request more samples this month
 */
export async function checkMonthlyAllocation(
  clientId: number,
  requestedQuantity: string
): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    // Get or create allocation for this month
    const [allocation] = await db.select()
      .from(sampleAllocations)
      .where(and(
        eq(sampleAllocations.clientId, clientId),
        eq(sampleAllocations.monthYear, currentMonth)
      ))
      .limit(1);

    if (!allocation) {
      // No allocation set, create default (7g per month)
      await db.insert(sampleAllocations).values({
        clientId,
        monthYear: currentMonth,
        allocatedQuantity: "7.0",
        usedQuantity: "0",
        remainingQuantity: "7.0"
      });
      return parseFloat(requestedQuantity) <= 7.0;
    }

    const remaining = parseFloat(allocation.remainingQuantity);
    const requested = parseFloat(requestedQuantity);

    return requested <= remaining;
  } catch (error: any) {
    throw new Error(`Failed to check monthly allocation: ${error.message}`);
  }
}

/**
 * Update monthly allocation after fulfilling samples
 */
async function updateMonthlyAllocation(
  clientId: number,
  monthYear: string,
  usedQuantity: string
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const [allocation] = await db.select()
      .from(sampleAllocations)
      .where(and(
        eq(sampleAllocations.clientId, clientId),
        eq(sampleAllocations.monthYear, monthYear)
      ))
      .limit(1);

    if (!allocation) {
      // Create new allocation
      await db.insert(sampleAllocations).values({
        clientId,
        monthYear,
        allocatedQuantity: "7.0",
        usedQuantity,
        remainingQuantity: (7.0 - parseFloat(usedQuantity)).toString()
      });
    } else {
      // Update existing allocation
      const newUsed = parseFloat(allocation.usedQuantity) + parseFloat(usedQuantity);
      const newRemaining = parseFloat(allocation.allocatedQuantity) - newUsed;

      await db.update(sampleAllocations)
        .set({
          usedQuantity: newUsed.toString(),
          remainingQuantity: newRemaining.toString(),
          updatedAt: new Date()
        })
        .where(eq(sampleAllocations.id, allocation.id));
    }
  } catch (error: any) {
    throw new Error(`Failed to update monthly allocation: ${error.message}`);
  }
}

/**
 * Get sample requests for a client
 */
export async function getSampleRequestsByClient(
  clientId: number,
  limit: number = 50
): Promise<SampleRequest[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const requests = await db.select()
      .from(sampleRequests)
      .where(eq(sampleRequests.clientId, clientId))
      .orderBy(desc(sampleRequests.requestDate))
      .limit(limit);

    return requests;
  } catch (error: any) {
    throw new Error(`Failed to get sample requests: ${error.message}`);
  }
}

/**
 * Get all pending sample requests
 */
export async function getPendingSampleRequests(): Promise<SampleRequest[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const requests = await db.select()
      .from(sampleRequests)
      .where(eq(sampleRequests.status, "PENDING"))
      .orderBy(desc(sampleRequests.requestDate));

    return requests;
  } catch (error: any) {
    throw new Error(`Failed to get pending sample requests: ${error.message}`);
  }
}

/**
 * Get monthly allocation for a client
 */
export async function getMonthlyAllocation(
  clientId: number,
  monthYear?: string
): Promise<any> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const month = monthYear || new Date().toISOString().slice(0, 7);
    
    const [allocation] = await db.select()
      .from(sampleAllocations)
      .where(and(
        eq(sampleAllocations.clientId, clientId),
        eq(sampleAllocations.monthYear, month)
      ))
      .limit(1);

    if (!allocation) {
      // Return default allocation
      return {
        clientId,
        monthYear: month,
        allocatedQuantity: "7.0",
        usedQuantity: "0",
        remainingQuantity: "7.0"
      };
    }

    return allocation;
  } catch (error: any) {
    throw new Error(`Failed to get monthly allocation: ${error.message}`);
  }
}

/**
 * Set monthly allocation for a client
 */
export async function setMonthlyAllocation(
  clientId: number,
  monthYear: string,
  allocatedQuantity: string
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const [existing] = await db.select()
      .from(sampleAllocations)
      .where(and(
        eq(sampleAllocations.clientId, clientId),
        eq(sampleAllocations.monthYear, monthYear)
      ))
      .limit(1);

    if (existing) {
      // Update existing
      const newRemaining = parseFloat(allocatedQuantity) - parseFloat(existing.usedQuantity);
      await db.update(sampleAllocations)
        .set({
          allocatedQuantity,
          remainingQuantity: newRemaining.toString(),
          updatedAt: new Date()
        })
        .where(eq(sampleAllocations.id, existing.id));
    } else {
      // Create new
      await db.insert(sampleAllocations).values({
        clientId,
        monthYear,
        allocatedQuantity,
        usedQuantity: "0",
        remainingQuantity: allocatedQuantity
      });
    }
  } catch (error: any) {
    throw new Error(`Failed to set monthly allocation: ${error.message}`);
  }
}

