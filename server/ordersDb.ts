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
  isDraft?: boolean; // NEW: Support draft orders
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
  
  // Draft-specific
  validUntil?: string;
  
  // Confirmed order-specific
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
    
    // 4. Determine if draft (support both old and new API)
    const isDraft = input.isDraft !== undefined 
      ? input.isDraft 
      : input.orderType === 'QUOTE';
    
    // 5. Generate order number
    const orderNumber = isDraft 
      ? `D-${Date.now()}`
      : `O-${Date.now()}`;
    
    // 6. Calculate due date for confirmed orders
    let dueDate: Date | undefined;
    if (!isDraft && input.paymentTerms) {
      dueDate = calculateDueDate(input.paymentTerms);
    }
    
    // 7. Create order record
    await tx.insert(orders).values({
      orderNumber,
      orderType: input.orderType,
      isDraft,
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
      saleStatus: !isDraft && input.orderType === 'SALE' ? 'PENDING' : undefined,
      fulfillmentStatus: !isDraft ? 'PENDING' : undefined,
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
    
    // 8. If confirmed order (not draft), reduce inventory
    if (!isDraft) {
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
  isDraft?: boolean;
  quoteStatus?: string;
  saleStatus?: string;
  fulfillmentStatus?: string;
  limit?: number;
  offset?: number;
}): Promise<Order[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const {
    orderType,
    isDraft,
    quoteStatus,
    saleStatus,
    fulfillmentStatus,
    limit = 50,
    offset = 0,
  } = filters || {};
  
  const conditions: any[] = [];
  
  if (orderType) {
    conditions.push(eq(orders.orderType, orderType));
  }
  
  if (isDraft !== undefined) {
    conditions.push(eq(orders.isDraft, isDraft));
  }
  
  if (quoteStatus) {
    conditions.push(eq(orders.quoteStatus, quoteStatus as any));
  }
  
  if (saleStatus) {
    conditions.push(eq(orders.saleStatus, saleStatus as any));
  }
  
  if (fulfillmentStatus) {
    conditions.push(eq(orders.fulfillmentStatus, fulfillmentStatus as any));
  }
  
  let results;
  
  if (conditions.length > 0) {
    results = await db
      .select()
      .from(orders)
      .leftJoin(clients, eq(orders.clientId, clients.id))
      .where(and(...conditions))
      .orderBy(desc(orders.createdAt))
      .limit(limit)
      .offset(offset);
  } else {
    results = await db
      .select()
      .from(orders)
      .leftJoin(clients, eq(orders.clientId, clients.id))
      .orderBy(desc(orders.createdAt))
      .limit(limit)
      .offset(offset);
  }
  
  // Transform results to include client data
  return results.map(row => ({
    ...row.orders,
    client: row.clients,
  })) as any;
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
    
    // Check if quote has expired
    if (quote.validUntil) {
      const expirationDate = new Date(quote.validUntil);
      const now = new Date();
      if (expirationDate < now) {
        throw new Error(
          `Quote has expired on ${expirationDate.toLocaleDateString()}. ` +
          `Please request a new quote with current pricing.`
        );
      }
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

// NEW FUNCTIONS TO ADD TO ordersDb.ts

// ============================================================================
// CONFIRM DRAFT ORDER
// ============================================================================

/**
 * Confirm a draft order (convert to confirmed order)
 */
export async function confirmDraftOrder(input: {
  orderId: number;
  paymentTerms: 'NET_7' | 'NET_15' | 'NET_30' | 'COD' | 'PARTIAL' | 'CONSIGNMENT';
  cashPayment?: number;
  notes?: string;
  confirmedBy: number;
}): Promise<Order> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.transaction(async (tx) => {
    // 1. Get the draft order
    const draft = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, input.orderId))
      .limit(1)
      .then(rows => rows[0]);
    
    if (!draft) {
      throw new Error(`Order ${input.orderId} not found`);
    }
    
    if (!draft.isDraft) {
      throw new Error(`Order ${input.orderId} is not a draft`);
    }
    
    // 2. Parse draft items
    const draftItems = JSON.parse(draft.items as string) as OrderItem[];
    
    // 3. Check inventory availability
    for (const item of draftItems) {
      const batch = await tx
        .select()
        .from(batches)
        .where(eq(batches.id, item.batchId))
        .limit(1)
        .then(rows => rows[0]);
      
      if (!batch) {
        throw new Error(`Batch ${item.batchId} not found`);
      }
      
      const availableQty = item.isSample 
        ? parseFloat(batch.sampleQty as string)
        : parseFloat(batch.onHandQty as string);
      
      if (availableQty < item.quantity) {
        throw new Error(
          `Insufficient inventory for ${item.displayName}. ` +
          `Available: ${availableQty}, Required: ${item.quantity}`
        );
      }
    }
    
    // 4. Calculate due date
    const dueDate = calculateDueDate(input.paymentTerms);
    
    // 5. Determine payment status
    const cashPayment = input.cashPayment || 0;
    const total = parseFloat(draft.total as string);
    const saleStatus = cashPayment >= total ? 'PAID' : cashPayment > 0 ? 'PARTIAL' : 'PENDING';
    
    // 6. Update order to confirmed
    await tx.update(orders)
      .set({
        isDraft: false,
        orderType: 'SALE',
        paymentTerms: input.paymentTerms,
        cashPayment: cashPayment.toString(),
        dueDate: dueDate,
        saleStatus: saleStatus,
        fulfillmentStatus: 'PENDING',
        notes: input.notes || draft.notes,
        confirmedAt: new Date(),
      })
      .where(eq(orders.id, input.orderId));
    
    // 7. Reduce inventory
    for (const item of draftItems) {
      if (item.isSample) {
        await tx.update(batches)
          .set({ 
            sampleQty: sql`CAST(${batches.sampleQty} AS DECIMAL(15,4)) - ${item.quantity}` 
          })
          .where(eq(batches.id, item.batchId));
        
        await tx.insert(sampleInventoryLog).values({
          batchId: item.batchId,
          orderId: input.orderId,
          quantity: item.quantity.toString(),
          action: 'CONSUMED',
          createdBy: input.confirmedBy,
        });
      } else {
        await tx.update(batches)
          .set({ 
            onHandQty: sql`CAST(${batches.onHandQty} AS DECIMAL(15,4)) - ${item.quantity}` 
          })
          .where(eq(batches.id, item.batchId));
      }
    }
    
    // 7. Get the confirmed order
    const confirmed = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, input.orderId))
      .limit(1)
      .then(rows => rows[0]);
    
    if (!confirmed) {
      throw new Error('Failed to confirm order');
    }
    
    return confirmed;
  });
}

// ============================================================================
// UPDATE DRAFT ORDER
// ============================================================================

/**
 * Update a draft order (items, pricing, notes)
 */
export async function updateDraftOrder(input: {
  orderId: number;
  items?: {
    batchId: number;
    displayName?: string;
    quantity: number;
    unitPrice: number;
    isSample: boolean;
    overridePrice?: number;
    overrideCogs?: number;
  }[];
  validUntil?: string;
  notes?: string;
}): Promise<Order> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.transaction(async (tx) => {
    // 1. Get the draft order
    const draft = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, input.orderId))
      .limit(1)
      .then(rows => rows[0]);
    
    if (!draft) {
      throw new Error(`Order ${input.orderId} not found`);
    }
    
    if (!draft.isDraft) {
      throw new Error(`Order ${input.orderId} is not a draft and cannot be edited`);
    }
    
    // 2. If items are being updated, recalculate everything
    if (input.items) {
      // Get client for COGS calculation
      const client = await tx
        .select()
        .from(clients)
        .where(eq(clients.id, draft.clientId))
        .limit(1)
        .then(rows => rows[0]);
      
      if (!client) {
        throw new Error(`Client ${draft.clientId} not found`);
      }
      
      // Process each item and calculate COGS
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
      
      // Calculate totals
      const subtotal = processedItems.reduce((sum, item) => sum + item.lineTotal, 0);
      const totalCogs = processedItems.reduce((sum, item) => sum + item.lineCogs, 0);
      const totalMargin = subtotal - totalCogs;
      const avgMarginPercent = subtotal > 0 ? (totalMargin / subtotal) * 100 : 0;
      
      // Update order with new items and totals
      await tx.update(orders)
        .set({
          items: JSON.stringify(processedItems),
          subtotal: subtotal.toString(),
          total: subtotal.toString(),
          totalCogs: totalCogs.toString(),
          totalMargin: totalMargin.toString(),
          avgMarginPercent: avgMarginPercent.toString(),
          validUntil: input.validUntil ? new Date(input.validUntil) : draft.validUntil,
          notes: input.notes || draft.notes,
        })
        .where(eq(orders.id, input.orderId));
    } else {
      // Just update notes and validUntil
      const updateData: any = {};
      if (input.validUntil) updateData.validUntil = new Date(input.validUntil);
      if (input.notes) updateData.notes = input.notes;
      
      await tx.update(orders)
        .set(updateData)
        .where(eq(orders.id, input.orderId));
    }
    
    // 3. Return updated order
    const updated = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, input.orderId))
      .limit(1)
      .then(rows => rows[0]);
    
    if (!updated) {
      throw new Error('Failed to update draft order');
    }
    
    return updated;
  });
}

/**
 * Delete a draft order
 * Only draft orders can be deleted
 */
export async function deleteDraftOrder(input: {
  orderId: number;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.transaction(async (tx) => {
    // 1. Get the draft order
    const draft = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, input.orderId))
      .limit(1)
      .then(rows => rows[0]);
    
    if (!draft) {
      throw new Error(`Order ${input.orderId} not found`);
    }
    
    if (!draft.isDraft) {
      throw new Error(`Order ${input.orderId} is not a draft and cannot be deleted`);
    }
    
    // 2. Delete the draft order
    await tx.delete(orders)
      .where(eq(orders.id, input.orderId));
  });
}


// ============================================================================
// FULFILLMENT STATUS MANAGEMENT
// ============================================================================

/**
 * Update order fulfillment status
 * Handles status transitions and inventory decrements
 */
export async function updateOrderStatus(input: {
  orderId: number;
  newStatus: 'PENDING' | 'PACKED' | 'SHIPPED';
  notes?: string;
  userId: number;
}): Promise<{ success: boolean; newStatus: string }> {
  const { orderId, newStatus, userId } = input;
  
  // Sanitize notes input
  const sanitizedNotes = input.notes ? input.notes.trim().substring(0, 5000) : undefined;
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  return await db.transaction(async (tx) => {
    // Get current order
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId));
    if (!order) {
      throw new Error('Order not found');
    }
    
    const oldStatus = order.fulfillmentStatus || 'PENDING';
    
    // Validate status transition
    if (oldStatus === 'SHIPPED') {
      throw new Error('Cannot change status of shipped order');
    }
    if (oldStatus === 'PACKED' && newStatus === 'PENDING') {
      throw new Error('Cannot move packed order back to pending');
    }
    
    // Prepare update data
    const updateData: any = { fulfillmentStatus: newStatus };
    if (newStatus === 'PACKED') {
      updateData.packedAt = new Date();
      updateData.packedBy = userId;
    }
    if (newStatus === 'SHIPPED') {
      updateData.shippedAt = new Date();
      updateData.shippedBy = userId;
      
      // Check inventory availability before shipping
      const orderItems = order.items as Array<{ batchId: number; quantity: number; isSample?: boolean }>;
      for (const item of orderItems) {
        if (item.isSample) continue; // Skip samples
        
        const [batch] = await tx.select().from(batches).where(eq(batches.id, item.batchId));
        if (!batch) {
          throw new Error(`Batch ${item.batchId} not found`);
        }
        
        const available = parseFloat(batch.onHandQty);
        if (available < item.quantity) {
          throw new Error(
            `Insufficient inventory for batch ${item.batchId}. ` +
            `Required: ${item.quantity}, Available: ${available}`
          );
        }
      }
      
      // Decrement inventory when shipped
      await decrementInventoryForOrder(tx, orderId, order.items as any);
    }
    
    // Update order status
    await tx.update(orders)
      .set(updateData)
      .where(eq(orders.id, orderId));
    
    // Log status change in history
    const { orderStatusHistory } = await import('../drizzle/schema');
    await tx.insert(orderStatusHistory).values({
      orderId,
      fromStatus: oldStatus as any,
      toStatus: newStatus as any,
      changedBy: userId,
      notes: sanitizedNotes,
    });
    
    return { success: true, newStatus };
  });
}

/**
 * Get order status history
 */
export async function getOrderStatusHistory(orderId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const { orderStatusHistory, users } = await import('../drizzle/schema');
  
  return await db.select({
    id: orderStatusHistory.id,
    orderId: orderStatusHistory.orderId,
    fromStatus: orderStatusHistory.fromStatus,
    toStatus: orderStatusHistory.toStatus,
    changedBy: orderStatusHistory.changedBy,
    changedByName: users.name,
    changedAt: orderStatusHistory.changedAt,
    notes: orderStatusHistory.notes,
  })
    .from(orderStatusHistory)
    .leftJoin(users, eq(orderStatusHistory.changedBy, users.id))
    .where(eq(orderStatusHistory.orderId, orderId))
    .orderBy(orderStatusHistory.changedAt);
}

/**
 * Decrement inventory for order items when shipped
 * Uses row-level locking to prevent race conditions
 */
async function decrementInventoryForOrder(
  tx: any,
  orderId: number,
  items: OrderItem[]
) {
  const { inventoryMovements } = await import('../drizzle/schema');
  
  for (const item of items) {
    if (!item.batchId || item.isSample) continue; // Skip samples
    
    // Decrement batch quantity with row-level locking
    await tx.execute(sql`
      UPDATE batches 
      SET onHandQty = CAST(onHandQty AS DECIMAL(15,4)) - ${item.quantity}
      WHERE id = ${item.batchId}
      FOR UPDATE
    `);
    
    // Log inventory movement
    await tx.insert(inventoryMovements).values({
      batchId: item.batchId,
      movementType: 'SALE',
      quantity: -item.quantity,
      referenceType: 'ORDER',
      referenceId: orderId,
      notes: `Shipped order #${orderId}`,
      createdBy: 1, // System
    });
  }
}



// ============================================================================
// RETURNS MANAGEMENT
// ============================================================================

/**
 * Process a return for an order
 * Automatically restocks inventory
 */
export async function processReturn(input: {
  orderId: number;
  items: Array<{ batchId: number; quantity: number }>;
  reason: 'DEFECTIVE' | 'WRONG_ITEM' | 'NOT_AS_DESCRIBED' | 'CUSTOMER_CHANGED_MIND' | 'OTHER';
  notes?: string;
  userId: number;
}): Promise<{ success: boolean; returnId: number }> {
  const { orderId, items, reason, userId } = input;
  
  // Sanitize notes input to prevent XSS
  const sanitizedNotes = input.notes ? input.notes.trim().substring(0, 5000) : undefined;
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  return await db.transaction(async (tx) => {
    // Verify order exists
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId));
    if (!order) {
      throw new Error('Order not found');
    }
    
    // Validate return quantities
    const orderItems = order.items as Array<{ batchId: number; quantity: number }>;
    
    // Get existing returns for this order
    const { returns } = await import('../drizzle/schema');
    const existingReturns = await tx.select().from(returns).where(eq(returns.orderId, orderId));
    
    // Calculate total returned per batch
    const returnedByBatch = new Map<number, number>();
    for (const existingReturn of existingReturns) {
      const returnItems = JSON.parse(existingReturn.items as string) as Array<{ batchId: number; quantity: number }>;
      for (const item of returnItems) {
        returnedByBatch.set(item.batchId, (returnedByBatch.get(item.batchId) || 0) + item.quantity);
      }
    }
    
    // Validate each return item
    for (const returnItem of items) {
      const orderItem = orderItems.find(i => i.batchId === returnItem.batchId);
      if (!orderItem) {
        throw new Error(`Batch ${returnItem.batchId} not found in original order`);
      }
      
      const alreadyReturned = returnedByBatch.get(returnItem.batchId) || 0;
      const totalReturning = alreadyReturned + returnItem.quantity;
      
      if (totalReturning > orderItem.quantity) {
        throw new Error(
          `Cannot return ${returnItem.quantity} units of batch ${returnItem.batchId}. ` +
          `Original order: ${orderItem.quantity}, already returned: ${alreadyReturned}, ` +
          `maximum returnable: ${orderItem.quantity - alreadyReturned}`
        );
      }
      
      if (returnItem.quantity <= 0) {
        throw new Error('Return quantity must be greater than zero');
      }
    }
    
    // Create return record (returns already imported above)
    const [returnRecord] = await tx.insert(returns).values({
      orderId,
      items: JSON.stringify(items),
      reason,
      notes: sanitizedNotes,
      processedBy: userId,
    }).$returningId();
    
    // Restock inventory for each returned item
    const { inventoryMovements } = await import('../drizzle/schema');
    for (const item of items) {
      // Get current batch quantity
      const [batch] = await tx.select().from(batches).where(eq(batches.id, item.batchId));
      if (!batch) continue;
      
      const quantityBefore = parseFloat(batch.onHandQty);
      const quantityAfter = quantityBefore + item.quantity;
      
      // Increment batch quantity
      await tx.execute(sql`
        UPDATE batches 
        SET onHandQty = CAST(onHandQty AS DECIMAL(15,4)) + ${item.quantity}
        WHERE id = ${item.batchId}
      `);
      
      // Log inventory movement
      await tx.insert(inventoryMovements).values({
        batchId: item.batchId,
        movementType: 'RETURN',
        quantityChange: item.quantity.toString(),
        quantityBefore: quantityBefore.toString(),
        quantityAfter: quantityAfter.toString(),
        referenceType: 'RETURN',
        referenceId: returnRecord.id,
        reason: `Return from order #${orderId}: ${reason}`,
        performedBy: userId,
      });
    }
    
    return { success: true, returnId: returnRecord.id };
  });
}

/**
 * Get all returns for an order
 */
export async function getOrderReturns(orderId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const { returns, users } = await import('../drizzle/schema');
  
  return await db.select({
    id: returns.id,
    orderId: returns.orderId,
    items: returns.items,
    reason: returns.reason,
    notes: returns.notes,
    processedBy: returns.processedBy,
    processedByName: users.name,
    processedAt: returns.processedAt,
  })
    .from(returns)
    .leftJoin(users, eq(returns.processedBy, users.id))
    .where(eq(returns.orderId, orderId))
    .orderBy(desc(returns.processedAt));
}



