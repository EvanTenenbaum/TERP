import { getDb } from "./db";
import {
  sampleRequests,
  sampleAllocations,
  sampleLocationHistory,
  batches,
  orders,
  inventoryMovements,
  type InsertSampleRequest,
  type InsertSampleAllocation,
  type SampleRequest,
  type SampleLocationHistory,
  type InsertSampleLocationHistory
} from "../drizzle/schema";
import { eq, and, gte, lte, desc, sql, or, isNull } from "drizzle-orm";

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
      products: products as { productId: number; quantity: string }[],
      sampleRequestStatus: "PENDING",
      notes
    });

    const newRequest = await db.select()
      .from(sampleRequests)
      .where(eq(sampleRequests.id, request.insertId))
      .limit(1);

    return newRequest[0];
  } catch (error) {
    throw new Error(`Failed to create sample request: ${error instanceof Error ? error.message : String(error)}`);
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

    if (request.sampleRequestStatus !== "PENDING") {
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
        inventoryMovementType: "SAMPLE",
        quantityChange: `-${product.quantity}`,
        quantityBefore,
        quantityAfter,
        referenceType: "SAMPLE_REQUEST",
        referenceId: requestId,
        notes: `Sample request #${requestId}`,
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
        sampleRequestStatus: "FULFILLED",
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
  } catch (error) {
    throw new Error(`Failed to fulfill sample request: ${error instanceof Error ? error.message : String(error)}`);
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
        sampleRequestStatus: "CANCELLED",
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
  } catch (error) {
    throw new Error(`Failed to cancel sample request: ${error instanceof Error ? error.message : String(error)}`);
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
  } catch (error) {
    throw new Error(`Failed to link order to sample: ${error instanceof Error ? error.message : String(error)}`);
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
  } catch (error) {
    throw new Error(`Failed to check monthly allocation: ${error instanceof Error ? error.message : String(error)}`);
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
  } catch (error) {
    throw new Error(`Failed to update monthly allocation: ${error instanceof Error ? error.message : String(error)}`);
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
  } catch (error) {
    throw new Error(`Failed to get sample requests: ${error instanceof Error ? error.message : String(error)}`);
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
      .where(eq(sampleRequests.sampleRequestStatus, "PENDING"))
      .orderBy(desc(sampleRequests.requestDate));

    return requests;
  } catch (error) {
    throw new Error(`Failed to get pending sample requests: ${error instanceof Error ? error.message : String(error)}`);
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
  } catch (error) {
    throw new Error(`Failed to get monthly allocation: ${error instanceof Error ? error.message : String(error)}`);
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
  } catch (error) {
    throw new Error(`Failed to set monthly allocation: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// ============================================================================
// SAMPLE RETURN WORKFLOW (SAMPLE-006)
// ============================================================================

/**
 * Request a sample return
 */
export async function requestSampleReturn(
  requestId: number,
  requestedBy: number,
  reason: string,
  condition: string,
  returnDate?: Date
): Promise<SampleRequest> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const [request] = await db.select()
      .from(sampleRequests)
      .where(eq(sampleRequests.id, requestId))
      .limit(1);

    if (!request) {
      throw new Error("Sample request not found");
    }

    if (request.sampleRequestStatus !== "FULFILLED") {
      throw new Error("Only fulfilled samples can be returned");
    }

    await db.update(sampleRequests)
      .set({
        sampleRequestStatus: "RETURN_REQUESTED",
        returnRequestedDate: new Date(),
        returnRequestedBy: requestedBy,
        returnReason: reason,
        returnCondition: condition,
        returnDate: returnDate || null,
        updatedAt: new Date()
      })
      .where(eq(sampleRequests.id, requestId));

    const [updated] = await db.select()
      .from(sampleRequests)
      .where(eq(sampleRequests.id, requestId))
      .limit(1);

    return updated;
  } catch (error) {
    throw new Error(`Failed to request sample return: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Approve a sample return request
 */
export async function approveSampleReturn(
  requestId: number,
  approvedBy: number
): Promise<SampleRequest> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const [request] = await db.select()
      .from(sampleRequests)
      .where(eq(sampleRequests.id, requestId))
      .limit(1);

    if (!request) {
      throw new Error("Sample request not found");
    }

    if (request.sampleRequestStatus !== "RETURN_REQUESTED") {
      throw new Error("Sample is not in return requested status");
    }

    await db.update(sampleRequests)
      .set({
        sampleRequestStatus: "RETURN_APPROVED",
        returnApprovedDate: new Date(),
        returnApprovedBy: approvedBy,
        updatedAt: new Date()
      })
      .where(eq(sampleRequests.id, requestId));

    const [updated] = await db.select()
      .from(sampleRequests)
      .where(eq(sampleRequests.id, requestId))
      .limit(1);

    return updated;
  } catch (error) {
    throw new Error(`Failed to approve sample return: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Complete a sample return
 */
export async function completeSampleReturn(
  requestId: number,
  completedBy: number
): Promise<SampleRequest> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const [request] = await db.select()
      .from(sampleRequests)
      .where(eq(sampleRequests.id, requestId))
      .limit(1);

    if (!request) {
      throw new Error("Sample request not found");
    }

    if (request.sampleRequestStatus !== "RETURN_APPROVED") {
      throw new Error("Sample return is not approved");
    }

    await db.update(sampleRequests)
      .set({
        sampleRequestStatus: "RETURNED",
        returnDate: new Date(),
        location: "RETURNED",
        updatedAt: new Date()
      })
      .where(eq(sampleRequests.id, requestId));

    // Log location change
    await db.insert(sampleLocationHistory).values({
      sampleRequestId: requestId,
      fromLocation: request.location || "WITH_CLIENT",
      toLocation: "RETURNED",
      changedBy: completedBy,
      notes: "Sample returned"
    });

    const [updated] = await db.select()
      .from(sampleRequests)
      .where(eq(sampleRequests.id, requestId))
      .limit(1);

    return updated;
  } catch (error) {
    throw new Error(`Failed to complete sample return: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// ============================================================================
// VENDOR RETURN WORKFLOW (SAMPLE-007)
// ============================================================================

/**
 * Request a vendor return
 */
export async function requestVendorReturn(
  requestId: number,
  requestedBy: number,
  reason: string
): Promise<SampleRequest> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const [request] = await db.select()
      .from(sampleRequests)
      .where(eq(sampleRequests.id, requestId))
      .limit(1);

    if (!request) {
      throw new Error("Sample request not found");
    }

    // Can initiate vendor return from RETURNED status or FULFILLED status
    if (request.sampleRequestStatus !== "RETURNED" && request.sampleRequestStatus !== "FULFILLED") {
      throw new Error("Sample must be returned or fulfilled to initiate vendor return");
    }

    await db.update(sampleRequests)
      .set({
        sampleRequestStatus: "VENDOR_RETURN_REQUESTED",
        returnReason: reason,
        returnRequestedBy: requestedBy,
        returnRequestedDate: new Date(),
        updatedAt: new Date()
      })
      .where(eq(sampleRequests.id, requestId));

    const [updated] = await db.select()
      .from(sampleRequests)
      .where(eq(sampleRequests.id, requestId))
      .limit(1);

    return updated;
  } catch (error) {
    throw new Error(`Failed to request vendor return: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Ship sample to vendor
 */
export async function shipToVendor(
  requestId: number,
  shippedBy: number,
  trackingNumber: string
): Promise<SampleRequest> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const [request] = await db.select()
      .from(sampleRequests)
      .where(eq(sampleRequests.id, requestId))
      .limit(1);

    if (!request) {
      throw new Error("Sample request not found");
    }

    if (request.sampleRequestStatus !== "VENDOR_RETURN_REQUESTED") {
      throw new Error("Sample is not in vendor return requested status");
    }

    await db.update(sampleRequests)
      .set({
        sampleRequestStatus: "SHIPPED_TO_VENDOR",
        vendorReturnTrackingNumber: trackingNumber,
        vendorShippedDate: new Date(),
        updatedAt: new Date()
      })
      .where(eq(sampleRequests.id, requestId));

    const [updated] = await db.select()
      .from(sampleRequests)
      .where(eq(sampleRequests.id, requestId))
      .limit(1);

    return updated;
  } catch (error) {
    throw new Error(`Failed to ship to vendor: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Confirm vendor received the sample
 */
export async function confirmVendorReturn(
  requestId: number,
  confirmedBy: number
): Promise<SampleRequest> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const [request] = await db.select()
      .from(sampleRequests)
      .where(eq(sampleRequests.id, requestId))
      .limit(1);

    if (!request) {
      throw new Error("Sample request not found");
    }

    if (request.sampleRequestStatus !== "SHIPPED_TO_VENDOR") {
      throw new Error("Sample is not shipped to vendor");
    }

    await db.update(sampleRequests)
      .set({
        sampleRequestStatus: "VENDOR_CONFIRMED",
        vendorConfirmedDate: new Date(),
        updatedAt: new Date()
      })
      .where(eq(sampleRequests.id, requestId));

    const [updated] = await db.select()
      .from(sampleRequests)
      .where(eq(sampleRequests.id, requestId))
      .limit(1);

    return updated;
  } catch (error) {
    throw new Error(`Failed to confirm vendor return: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// ============================================================================
// LOCATION TRACKING (SAMPLE-008)
// ============================================================================

type SampleLocation = "WAREHOUSE" | "WITH_CLIENT" | "WITH_SALES_REP" | "RETURNED" | "LOST";

/**
 * Update sample location
 */
export async function updateSampleLocation(
  requestId: number,
  newLocation: SampleLocation,
  changedBy: number,
  notes?: string
): Promise<SampleRequest> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const [request] = await db.select()
      .from(sampleRequests)
      .where(eq(sampleRequests.id, requestId))
      .limit(1);

    if (!request) {
      throw new Error("Sample request not found");
    }

    const oldLocation = request.location;

    await db.update(sampleRequests)
      .set({
        location: newLocation,
        updatedAt: new Date()
      })
      .where(eq(sampleRequests.id, requestId));

    // Log location change
    await db.insert(sampleLocationHistory).values({
      sampleRequestId: requestId,
      fromLocation: oldLocation,
      toLocation: newLocation,
      changedBy,
      notes
    });

    const [updated] = await db.select()
      .from(sampleRequests)
      .where(eq(sampleRequests.id, requestId))
      .limit(1);

    return updated;
  } catch (error) {
    throw new Error(`Failed to update sample location: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get location history for a sample
 */
export async function getSampleLocationHistory(
  requestId: number
): Promise<SampleLocationHistory[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const history = await db.select()
      .from(sampleLocationHistory)
      .where(eq(sampleLocationHistory.sampleRequestId, requestId))
      .orderBy(desc(sampleLocationHistory.changedAt));

    return history;
  } catch (error) {
    throw new Error(`Failed to get location history: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// ============================================================================
// EXPIRATION TRACKING (SAMPLE-009)
// ============================================================================

/**
 * Get samples expiring within the next N days
 */
export async function getExpiringSamples(
  daysAhead: number = 30
): Promise<SampleRequest[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const now = new Date();
    const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    const samples = await db.select()
      .from(sampleRequests)
      .where(and(
        // Has expiration date
        sql`${sampleRequests.expirationDate} IS NOT NULL`,
        // Not already fully returned or vendor confirmed
        sql`${sampleRequests.sampleRequestStatus} NOT IN ('RETURNED', 'VENDOR_CONFIRMED', 'CANCELLED')`,
        // Expiring within the specified days
        lte(sampleRequests.expirationDate, futureDate)
      ))
      .orderBy(sampleRequests.expirationDate);

    return samples;
  } catch (error) {
    throw new Error(`Failed to get expiring samples: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Set expiration date for a sample
 */
export async function setSampleExpirationDate(
  requestId: number,
  expirationDate: Date
): Promise<SampleRequest> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    await db.update(sampleRequests)
      .set({
        expirationDate,
        updatedAt: new Date()
      })
      .where(eq(sampleRequests.id, requestId));

    const [updated] = await db.select()
      .from(sampleRequests)
      .where(eq(sampleRequests.id, requestId))
      .limit(1);

    return updated;
  } catch (error) {
    throw new Error(`Failed to set expiration date: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get all sample requests (not just pending)
 */
export async function getAllSampleRequests(
  limit: number = 100
): Promise<SampleRequest[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const requests = await db.select()
      .from(sampleRequests)
      .orderBy(desc(sampleRequests.requestDate))
      .limit(limit);

    return requests;
  } catch (error) {
    throw new Error(`Failed to get all sample requests: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get sample request by ID
 */
export async function getSampleRequestById(
  requestId: number
): Promise<SampleRequest | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const [request] = await db.select()
      .from(sampleRequests)
      .where(eq(sampleRequests.id, requestId))
      .limit(1);

    return request || null;
  } catch (error) {
    throw new Error(`Failed to get sample request: ${error instanceof Error ? error.message : String(error)}`);
  }
}

