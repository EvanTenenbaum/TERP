'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import * as Sentry from '@sentry/nextjs'
import { requireRole } from '@/lib/auth'
import { getActiveBatchCostDb } from '@/lib/cogs'

export interface CreateProductData {
  name: string;
  sku: string;
  category: string;
  unit: string;
  defaultPrice: number; // in cents
  location?: string;
}

export interface CreateBatchData {
  productId: string;
  vendorId: string;
  lotNumber: string;
  receivedDate: Date;
  expirationDate?: Date;
  quantityReceived: number;
  initialCost: number; // in cents
}

export interface CreateInventoryLotData {
  batchId: string;
  quantityOnHand: number;
  quantityAllocated?: number;
}

// Product operations
export async function getProducts() {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: {
        batches: {
          include: {
            vendor: true,
            batchCosts: {
              orderBy: { effectiveFrom: 'desc' },
              take: 1
            },
            inventoryLot: true
          }
        },
        photos: true
      },
      orderBy: { name: 'asc' }
    });

    return {
      success: true,
      products
    };
  } catch (error) {
    console.error('Error fetching products:', error);
    return {
      success: false,
      error: 'Failed to fetch products'
    };
  }
}

export async function createProduct(data: CreateProductData) {
  try {
    if (!data?.name || !data?.sku || !data?.category || !data?.unit) {
      return { success: false, error: 'missing_fields' }
    }
    const price = Math.round(Number(data.defaultPrice))
    if (!Number.isFinite(price) || price < 0) return { success: false, error: 'invalid_price' }
    const product = await prisma.product.create({
      data: {
        name: String(data.name).trim().slice(0,128),
        sku: String(data.sku).trim().slice(0,64),
        category: String(data.category).trim().slice(0,64),
        unit: String(data.unit).trim().slice(0,32),
        defaultPrice: price,
        location: data.location?.toString().slice(0,128),
        isActive: true
      }
    });

    revalidatePath('/inventory/products');
    
    return {
      success: true,
      product
    };
  } catch (error) {
    console.error('Error creating product:', error);
    return {
      success: false,
      error: 'Failed to create product'
    };
  }
}

// Batch operations
export async function getBatches() {
  try {
    const batches = await prisma.batch.findMany({
      include: {
        product: true,
        vendor: true,
        batchCosts: {
          orderBy: { effectiveFrom: 'desc' }
        },
        inventoryLot: true
      },
      orderBy: { receivedDate: 'desc' }
    });

    return {
      success: true,
      batches
    };
  } catch (error) {
    console.error('Error fetching batches:', error);
    return {
      success: false,
      error: 'Failed to fetch batches'
    };
  }
}

import { normalizeFlowerProductName } from '@/lib/normalization';

export async function createBatch(data: CreateBatchData) {
  try {
    if (!data?.productId || !data?.vendorId || !data?.lotNumber) return { success: false, error: 'missing_fields' }
    const qty = Math.round(Number(data.quantityReceived))
    const cost = Math.round(Number(data.initialCost))
    if (!Number.isFinite(qty) || qty <= 0) return { success: false, error: 'invalid_quantity' }
    if (!Number.isFinite(cost) || cost < 0) return { success: false, error: 'invalid_cost' }
    const recv = new Date(data.receivedDate)
    const exp = data.expirationDate ? new Date(data.expirationDate) : undefined
    const batch = await prisma.batch.create({
      data: {
        productId: data.productId,
        vendorId: data.vendorId,
        lotNumber: String(data.lotNumber).trim().slice(0,64),
        receivedDate: recv,
        expirationDate: exp,
        quantityReceived: qty,
        quantityAvailable: qty,
        batchCosts: {
          create: {
            effectiveFrom: recv,
            unitCost: cost
          }
        }
      },
      include: {
        product: true,
        vendor: true,
        batchCosts: true
      }
    });

    // Normalize name for flower category products: "[vendorCode] - [strainName]"
    try {
      const product = await prisma.product.findUnique({ where: { id: batch.productId }, include: { variety: true } });
      if (product && /flower/i.test(product.category) && product.variety) {
        const vendor = await prisma.vendor.findUnique({ where: { id: batch.vendorId }, select: { vendorCode: true } });
        const newName = vendor?.vendorCode && product.variety?.name
          ? normalizeFlowerProductName(vendor.vendorCode, product.variety.name)
          : null;
        if (newName && newName !== product.name) {
          await prisma.product.update({ where: { id: product.id }, data: { name: newName, retailName: product.variety.name, standardStrainName: product.variety.name, customerFacingName: newName } });
        }
      }
    } catch (e) {
      console.warn('Name normalization skipped:', e);
    }

    revalidatePath('/inventory/products');

    return {
      success: true,
      batch
    };
  } catch (error) {
    console.error('Error creating batch:', error);
    return {
      success: false,
      error: 'Failed to create batch'
    };
  }
}

// Inventory Lot operations
export async function getInventoryLots() {
  try {
    const lots = await prisma.inventoryLot.findMany({
      include: {
        batch: {
          include: {
            product: true,
            vendor: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return {
      success: true,
      lots
    };
  } catch (error) {
    console.error('Error fetching inventory lots:', error);
    return {
      success: false,
      error: 'Failed to fetch inventory lots'
    };
  }
}

export async function createInventoryLot(data: CreateInventoryLotData) {
  try {
    if (!data?.batchId) return { success: false, error: 'missing_batch' }
    const qoh = Math.round(Number(data.quantityOnHand))
    const qalloc = Math.round(Number(data.quantityAllocated || 0))
    if (!Number.isFinite(qoh) || qoh < 0) return { success: false, error: 'invalid_quantity_on_hand' }
    if (!Number.isFinite(qalloc) || qalloc < 0) return { success: false, error: 'invalid_quantity_allocated' }
    const lot = await prisma.inventoryLot.create({
      data: {
        batchId: data.batchId,
        quantityOnHand: qoh,
        quantityAllocated: qalloc,
        quantityAvailable: Math.max(0, qoh - qalloc),
        lastMovementDate: new Date()
      },
      include: {
        batch: {
          include: {
            product: true,
            vendor: true
          }
        }
      }
    });

    revalidatePath('/inventory/products');
    
    return {
      success: true,
      lot
    };
  } catch (error) {
    console.error('Error creating inventory lot:', error);
    return {
      success: false,
      error: 'Failed to create inventory lot'
    };
  }
}

// Low stock check
export async function getLowStockItems() {
  try {
    const lowStockLots = await prisma.inventoryLot.findMany({
      where: {
        quantityAvailable: {
          lte: 10 // Simple threshold
        }
      },
      include: {
        batch: {
          include: {
            product: true,
            vendor: true
          }
        }
      },
      orderBy: { quantityAvailable: 'asc' }
    });

    return {
      success: true,
      lowStockLots
    };
  } catch (error) {
    console.error('Error fetching low stock items:', error);
    return {
      success: false,
      error: 'Failed to fetch low stock items'
    };
  }
}

// Add batch cost change
export async function addBatchCostChange(batchId: string, newCost: number, effectiveDate: Date) {
  try {
    if (!batchId) return { success: false, error: 'missing_batch' }
    const cost = Math.round(Number(newCost))
    if (!Number.isFinite(cost) || cost < 0) return { success: false, error: 'invalid_cost' }
    const when = new Date(effectiveDate)
    const batchCost = await prisma.batchCost.create({
      data: {
        batchId,
        effectiveFrom: when,
        unitCost: cost
      }
    });

    revalidatePath('/inventory/products');
    
    return {
      success: true,
      batchCost
    };
  } catch (error) {
    console.error('Error adding batch cost change:', error);
    return {
      success: false,
      error: 'Failed to add batch cost change'
    };
  }
}

export async function getLotsForDropdown() {
  try {
    const lots = await prisma.inventoryLot.findMany({
      select: { id: true, batch: { select: { lotNumber: true, product: { select: { name: true } } } } },
      orderBy: { createdAt: 'desc' }
    })
    return { success: true, lots: lots.map(l => ({ id: l.id, label: `${l.batch.product.name} — Lot ${l.batch.lotNumber}` })) }
  } catch (e) {
    console.error('Error fetching lots for dropdown:', e)
    return { success: false, error: 'Failed to fetch lots' }
  }
}

export async function customerReturn(lotId: string, quantity: number, customerId: string, notes?: string) {
  try { requireRole(['SUPER_ADMIN','ACCOUNTING']) } catch { return { success: false, error: 'forbidden' } }
  try {
    if (!lotId || !customerId || !quantity || quantity <= 0) return { success: false, error: 'invalid_input' }
    const result = await prisma.$transaction(async (tx) => {
      const lot = await tx.inventoryLot.findUnique({ where: { id: lotId }, include: { batch: { include: { product: true } } } })
      if (!lot) throw new Error('lot_not_found')
      const newOnHand = lot.quantityOnHand + quantity
      const newAvailable = Math.max(0, newOnHand - lot.quantityAllocated)
      await tx.inventoryLot.update({ where: { id: lot.id }, data: { quantityOnHand: newOnHand, quantityAvailable: newAvailable, lastMovementDate: new Date() } })
      const cost = await getActiveBatchCostDb(tx, lot.batchId, new Date())
      await tx.sampleTransaction.create({
        data: {
          productId: lot.batch.product.id,
          batchId: lot.batchId,
          customerId,
          transactionType: 'CLIENT_RETURN',
          quantity,
          unitCostSnapshot: cost?.unitCost ?? 0,
          transactionDate: new Date(),
          notes: notes || undefined,
        }
      })
      return { lotId: lot.id, newOnHand, newAvailable }
    })
    revalidatePath('/inventory/lots')
    return { success: true, result }
  } catch (e) {
    Sentry.captureException(e)
    return { success: false, error: 'failed_customer_return' }
  }
}

export async function vendorReturn(lotId: string, quantity: number, vendorId: string, notes?: string) {
  try { requireRole(['SUPER_ADMIN','ACCOUNTING']) } catch { return { success: false, error: 'forbidden' } }
  try {
    if (!lotId || !vendorId || !quantity || quantity <= 0) return { success: false, error: 'invalid_input' }
    const result = await prisma.$transaction(async (tx) => {
      const lot = await tx.inventoryLot.findUnique({ where: { id: lotId }, include: { batch: { include: { product: true, vendor: true } } } })
      if (!lot) throw new Error('lot_not_found')
      if (lot.quantityOnHand < quantity) throw new Error('insufficient_on_hand')
      const newOnHand = lot.quantityOnHand - quantity
      const newAvailable = Math.max(0, newOnHand - lot.quantityAllocated)
      await tx.inventoryLot.update({ where: { id: lot.id }, data: { quantityOnHand: newOnHand, quantityAvailable: newAvailable, lastMovementDate: new Date() } })
      const cost = await getActiveBatchCostDb(tx, lot.batchId, new Date())
      await tx.sampleTransaction.create({
        data: {
          productId: lot.batch.product.id,
          batchId: lot.batchId,
          vendorId,
          transactionType: 'VENDOR_RETURN',
          quantity,
          unitCostSnapshot: cost?.unitCost ?? 0,
          transactionDate: new Date(),
          notes: notes || undefined,
        }
      })
      return { lotId: lot.id, newOnHand, newAvailable }
    })
    revalidatePath('/inventory/lots')
    return { success: true, result }
  } catch (e) {
    Sentry.captureException(e)
    return { success: false, error: 'failed_vendor_return' }
  }
}

// Get vendors for dropdowns
export async function getVendors() {
  try {
    const vendors = await prisma.vendor.findMany({
      where: { isActive: true },
      select: {
        id: true,
        vendorCode: true,
        companyName: true
      },
      orderBy: { vendorCode: 'asc' }
    });

    return {
      success: true,
      vendors
    };
  } catch (error) {
    console.error('Error fetching vendors:', error);
    return {
      success: false,
      error: 'Failed to fetch vendors'
    };
  }
}
