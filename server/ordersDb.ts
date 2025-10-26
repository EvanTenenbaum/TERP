/**
 * Orders Data Access Layer
 * Handles all database operations for the unified Quote/Sales system
 */

import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { getDb } from "./db";
import {
  orders,
  batches,
  clients,
  sampleInventoryLog,
  InsertOrder,
  type Order,
} from "../drizzle/schema";
import { calculateCogs, calculateDueDate, type CogsCalculationInput } from "./cogsCalculator";

// ============================================================================
// TYPES
// ============================================================================

export interface OrderItem {
  batchId: number;
  displayName: string;
  originalName: string;
  quantity: number;
  unitPrice: number;
  isSample: boolean;
  
  // COGS
  unitCogs: number;
  cogsMode: 'FIXED' | 'RANGE';
  cogsSource: 'FIXED' | 'MIDPOINT' | 'CLIENT_ADJUSTMENT' | 'RULE' | 'MANUAL';
  appliedRule?: string;
  
  // Profit
  unitMargin: number;
  marginPercent: number;
  
  // Totals
  lineTotal: number;
  lineCogs: number;
  lineMargin: number;
  
  // Overrides
  overridePrice?: number;
  overrideCogs?: number;
}

export interface CreateOrderInput {
  orderType: 'QUOTE' | 'SALE';
  clientId: number;
  items: {
    batchId: number;
    displayName?: string;
    quantity: number;
    unitPrice: number;
    isSample: boolean;
    overridePrice?: number;
    overrideCogs?: number;
  }[];
  
  // Quote-specific
  validUntil?: string;
  
  // Sale-specific
  paymentTerms?: 'NET_7' | 'NET_15' | 'NET_30' | 'COD' | 'PARTIAL' | 'CONSIGNMENT';
  cashPayment?: number;
  
  notes?: string;
  createdBy: number;
}

export interface ConvertQuoteToSaleInput {
  quoteId: number;
  paymentTerms: 'NET_7' | 'NET_15' | 'NET_30' | 'COD' | 'PARTIAL' | 'CONSIGNMENT';
  cashPayment?: number;
  notes?: string;
}

// ============================================================================
// CREATE ORDER
// ============================================================================

/**
 * Create a new order (quote or sale)
 */
export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.transaction(async (tx) => {
    // 1. Get client for COGS calculation
    const client = await tx
      .select()
      .from(clients)
      .where(eq(clients.id, input.clientId))
      .limit(1)
      .then(rows => rows[0]);
    
    if (!client) {
      throw new Error(`Client ${input.clientId} not found`);
    }
    
    // 2. Process each item and calculate COGS
    const processedItems: OrderItem[] = [];
    
    for (const item of input.items) {
      // Get batch details
      const batch = await tx
        .select()
        .from(batches)
        .where(eq(batches.id, item.batchId))
        .limit(1)
        .then(rows => rows[0]);
      
      if (!batch) {
        throw new Error(`Batch ${item.batchId} not found`);
      }
      
      // Calculate COGS (unless overridden)
      let cogsResult;
      if (item.overrideCogs !== undefined) {
        // Manual override
        const finalPrice = item.overridePrice || item.unitPrice;
        const unitMargin = finalPrice - item.overrideCogs;
        const marginPercent = finalPrice > 0 ? (unitMargin / finalPrice) * 100 : 0;
        
        cogsResult = {
          unitCogs: item.overrideCogs,
          cogsSource: 'MANUAL' as const,
          unitMargin,
          marginPercent,
        };
      } else {
        // Calculate using COGS calculator
        cogsResult = calculateCogs({
          batch: {
            id: batch.id,
            cogsMode: batch.cogsMode,
            unitCogs: batch.unitCogs,
            unitCogsMin: batch.unitCogsMin,
            unitCogsMax: batch.unitCogsMax,
          },
          client: {
            id: client.id,
            cogsAdjustmentType: client.cogsAdjustmentType || 'NONE',
            cogsAdjustmentValue: client.cogsAdjustmentValue || '0',
          },
          context: {
            quantity: item.quantity,
            salePrice: item.overridePrice || item.unitPrice,
            paymentTerms: input.paymentTerms,
          },
        });
      }
      
      const finalPrice = item.overridePrice || item.unitPrice;
      const lineTotal = item.quantity * finalPrice;
      const lineCogs = item.quantity * cogsResult.unitCogs;
      const lineMargin = lineTotal - lineCogs;
      
      processedItems.push({
        batchId: item.batchId,
        displayName: item.displayName || batch.sku,
        originalName: batch.sku,
        quantity: item.quantity,
        unitPrice: finalPrice,
        isSample: item.isSample,
        unitCogs: cogsResult.unitCogs,
        cogsMode: batch.cogsMode,
        cogsSource: cogsResult.cogsSource,
        appliedRule: cogsResult.appliedRule,
        unitMargin: cogsResult.unitMargin,
        marginPercent: cogsResult.marginPercent,
        lineTotal,
        lineCogs,
        lineMargin,
        overridePrice: item.overridePrice,
        overrideCogs: item.overrideCogs,
      });
    }
    
    // 3. Calculate totals
    const subtotal = processedItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const totalCogs = processedItems.reduce((sum, item) => sum + item.lineCogs, 0);
    const totalMargin = subtotal - totalCogs;
    const avgMarginPercent = subtotal > 0 ? (totalMargin / subtotal) * 100 : 0;
    
    // 4. Generate order number
    const orderNumber = input.orderType === 'QUOTE' 
      ? `Q-${Date.now()}`
      : `S-${Date.now()}`;
    
    // 5. Calculate due date for sales
    let dueDate: Date | undefined;
    if (input.orderType === 'SALE' && input.paymentTerms) {
      dueDate = calculateDueDate(input.paymentTerms);
    }
    
    // 6. Create order record
    await tx.insert(orders).values({
      orderNumber,
      orderType: input.orderType,
      clientId: input.clientId,
      items: JSON.stringify(processedItems),
      subtotal: subtotal.toString(),
      tax: '0',
      discount: '0',
      total: subtotal.toString(),
      totalCogs: totalCogs.toString(),
      totalMargin: totalMargin.toString(),
      avgMarginPercent: avgMarginPercent.toString(),
      validUntil: input.validUntil ? new Date(input.validUntil) : undefined,
      quoteStatus: input.orderType === 'QUOTE' ? 'DRAFT' : undefined,
      paymentTerms: input.paymentTerms,
      cashPayment: input.cashPayment?.toString() || '0',
      dueDate: dueDate,
      saleStatus: input.orderType === 'SALE' ? 'PENDING' : undefined,
      notes: input.notes,
      createdBy: input.createdBy,
    });
    
    // Get the created order by orderNumber
    const order = await tx
      .select()
      .from(orders)
      .where(eq(orders.orderNumber, orderNumber))
      .limit(1)
      .then(rows => rows[0]);
    
    // 7. If SALE, reduce inventory
    if (input.orderType === 'SALE') {
      for (const item of processedItems) {
        if (item.isSample) {
          // Reduce sample_qty
          await tx.update(batches)
            .set({ 
              sampleQty: sql`CAST(${batches.sampleQty} AS DECIMAL(15,4)) - ${item.quantity}` 
            })
            .where(eq(batches.id, item.batchId));
          
          // Log sample consumption
          await tx.insert(sampleInventoryLog).values({
            batchId: item.batchId,
            orderId: order.id,
            quantity: item.quantity.toString(),
            action: 'CONSUMED',
            createdBy: input.createdBy,
          });
        } else {
          // Reduce onHandQty
          await tx.update(batches)
            .set({ 
              onHandQty: sql`CAST(${batches.onHandQty} AS DECIMAL(15,4)) - ${item.quantity}` 
            })
            .where(eq(batches.id, item.batchId));
        }
      }
      
      // TODO: Create invoice (accounting integration)
      // TODO: Record cash payment (accounting integration)
      // TODO: Update credit exposure (credit intelligence integration)
    }
    
    // 8. Return the created order
    if (!order) {
      throw new Error('Failed to create order');
    }
    
    return order;
  });
}

// ============================================================================
// READ ORDERS
// ============================================================================

/**
 * Get order by ID
 */
export async function getOrderById(id: number): Promise<Order | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const order = await db
    .select()
    .from(orders)
    .where(eq(orders.id, id))
    .limit(1)
    .then(rows => rows[0] || null);
  
  return order;
}

/**
 * Get orders by client
 */
export async function getOrdersByClient(
  clientId: number,
  orderType?: 'QUOTE' | 'SALE'
): Promise<Order[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const conditions: any[] = [eq(orders.clientId, clientId)];
  
  if (orderType) {
    conditions.push(eq(orders.orderType, orderType));
  }
  
  const results = await db
    .select()
    .from(orders)
    .where(and(...conditions))
    .orderBy(desc(orders.createdAt));
  return results;
}

/**
 * Get all orders with optional filters
 */
export async function getAllOrders(filters?: {
  orderType?: 'QUOTE' | 'SALE';
  quoteStatus?: string;
  saleStatus?: string;
  limit?: number;
  offset?: number;
}): Promise<Order[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const {
    orderType,
    quoteStatus,
    saleStatus,
    limit = 50,
    offset = 0,
  } = filters || {};
  
  const conditions: any[] = [];
  
  if (orderType) {
    conditions.push(eq(orders.orderType, orderType));
  }
  
  if (quoteStatus) {
    conditions.push(eq(orders.quoteStatus, quoteStatus as any));
  }
  
  if (saleStatus) {
    conditions.push(eq(orders.saleStatus, saleStatus as any));
  }
  
  let results;
  
  if (conditions.length > 0) {
    results = await db
      .select()
      .from(orders)
      .where(and(...conditions))
      .orderBy(desc(orders.createdAt))
      .limit(limit)
      .offset(offset);
  } else {
    results = await db
      .select()
      .from(orders)
      .orderBy(desc(orders.createdAt))
      .limit(limit)
      .offset(offset);
  }
  
  return results;
}

// ============================================================================
// UPDATE ORDER
// ============================================================================

/**
 * Update an existing order
 */
export async function updateOrder(
  id: number,
  updates: Partial<CreateOrderInput>
): Promise<Order> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Get existing order
  const existingOrder = await getOrderById(id);
  if (!existingOrder) {
    throw new Error(`Order ${id} not found`);
  }
  
  // If it's a SALE, don't allow modifications (business rule)
  if (existingOrder.orderType === 'SALE') {
    throw new Error("Cannot modify a sale order. Create a new sale or cancel this one.");
  }
  
  // For quotes, allow updates
  const updateData: any = {};
  
  if (updates.notes !== undefined) {
    updateData.notes = updates.notes;
  }
  
  if (updates.validUntil !== undefined) {
    updateData.validUntil = updates.validUntil;
  }
  
  // TODO: Handle items updates (would require recalculating COGS, totals, etc.)
  
  await db
    .update(orders)
    .set(updateData)
    .where(eq(orders.id, id));
  
  const updatedOrder = await getOrderById(id);
  if (!updatedOrder) {
    throw new Error(`Failed to retrieve updated order ${id}`);
  }
  
  return updatedOrder;
}

// ============================================================================
// DELETE ORDER
// ============================================================================

/**
 * Delete/cancel an order
 */
export async function deleteOrder(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const order = await getOrderById(id);
  if (!order) {
    throw new Error(`Order ${id} not found`);
  }
  
  // If it's a SALE, mark as cancelled instead of deleting
  if (order.orderType === 'SALE') {
    await db
      .update(orders)
      .set({ saleStatus: 'CANCELLED' })
      .where(eq(orders.id, id));
    
    // TODO: Restore inventory
    // TODO: Reverse accounting entries
  } else {
    // For quotes, can delete
    await db
      .delete(orders)
      .where(eq(orders.id, id));
  }
}

// ============================================================================
// CONVERT QUOTE TO SALE
// ============================================================================

/**
 * Convert a quote to a sale
 */
export async function convertQuoteToSale(
  input: ConvertQuoteToSaleInput
): Promise<Order> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.transaction(async (tx) => {
    // 1. Get the quote
    const quote = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, input.quoteId))
      .limit(1)
      .then(rows => rows[0]);
    
    if (!quote) {
      throw new Error(`Quote ${input.quoteId} not found`);
    }
    
    if (quote.orderType !== 'QUOTE') {
      throw new Error(`Order ${input.quoteId} is not a quote`);
    }
    
    // 2. Parse quote items
    const quoteItems = JSON.parse(quote.items as string) as OrderItem[];
    
    // 3. Calculate due date
    const dueDate = calculateDueDate(input.paymentTerms);
    
    // 4. Generate sale number
    const saleNumber = `S-${Date.now()}`;
    
    // 5. Create sale order
    await tx.insert(orders).values({
      orderNumber: saleNumber,
      orderType: 'SALE',
      clientId: quote.clientId,
      items: quote.items,
      subtotal: quote.subtotal,
      tax: quote.tax,
      discount: quote.discount,
      total: quote.total,
      totalCogs: quote.totalCogs,
      totalMargin: quote.totalMargin,
      avgMarginPercent: quote.avgMarginPercent,
      paymentTerms: input.paymentTerms,
      cashPayment: input.cashPayment?.toString() || '0',
      dueDate: dueDate,
      saleStatus: 'PENDING',
      notes: input.notes || quote.notes,
      createdBy: quote.createdBy,
      convertedFromOrderId: quote.id,
    });
    
    // Get the created sale by orderNumber
    const sale = await tx
      .select()
      .from(orders)
      .where(eq(orders.orderNumber, saleNumber))
      .limit(1)
      .then(rows => rows[0]);
    
    // 6. Reduce inventory
    for (const item of quoteItems) {
      if (item.isSample) {
        await tx.update(batches)
          .set({ 
            sampleQty: sql`CAST(${batches.sampleQty} AS DECIMAL(15,4)) - ${item.quantity}` 
          })
          .where(eq(batches.id, item.batchId));
        
          await tx.insert(sampleInventoryLog).values({
            batchId: item.batchId,
            orderId: sale?.id,
          quantity: item.quantity.toString(),
          action: 'CONSUMED',
          createdBy: quote.createdBy,
        });
      } else {
        await tx.update(batches)
          .set({ 
            onHandQty: sql`CAST(${batches.onHandQty} AS DECIMAL(15,4)) - ${item.quantity}` 
          })
          .where(eq(batches.id, item.batchId));
      }
    }
    
    // 7. Update quote status
    await tx.update(orders)
      .set({ 
        quoteStatus: 'CONVERTED',
        convertedAt: new Date(),
      })
      .where(eq(orders.id, input.quoteId));
    
    // 8. TODO: Create invoice, record payment, update credit
    
    // 9. Return the sale
    if (!sale) {
      throw new Error('Failed to create sale order');
    }
    
    return sale;
  });
}

// ============================================================================
// EXPORT ORDER
// ============================================================================

/**
 * Export order to various formats
 * TODO: Implement actual export logic
 */
export async function exportOrder(
  id: number,
  format: 'pdf' | 'clipboard' | 'image'
): Promise<string> {
  const order = await getOrderById(id);
  if (!order) {
    throw new Error(`Order ${id} not found`);
  }
  
  // TODO: Implement export logic
  // For now, return a placeholder
  return `Export ${format} for order ${order.orderNumber}`;
}

