'use server';

import { PrismaClient } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createBatchCost, parseCostToCents } from '@/lib/cogs';
import { isVendorCodeUnique } from '@/lib/vendorDisplay';

const prisma = new PrismaClient();

// Product Actions
export async function createProduct(formData: FormData) {
  try {
    const sku = formData.get('sku') as string;
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const category = formData.get('category') as string;
    const defaultPriceStr = formData.get('defaultPrice') as string;
    const unit = formData.get('unit') as string;
    const isActive = formData.get('isActive') === 'on';

    // Validate required fields
    if (!sku || !name || !category) {
      throw new Error('SKU, name, and category are required');
    }

    // Check if SKU already exists
    const existingProduct = await prisma.product.findUnique({
      where: { sku }
    });

    if (existingProduct) {
      throw new Error('A product with this SKU already exists');
    }

    // Parse default price to cents
    let defaultPrice = null;
    if (defaultPriceStr && defaultPriceStr.trim() !== '') {
      defaultPrice = parseCostToCents(defaultPriceStr);
    }

    const product = await prisma.product.create({
      data: {
        sku,
        name,
        description: description || null,
        category,
        defaultPrice,
        unit,
        isActive
      }
    });

    revalidatePath('/inventory/products');
    return { success: true, product };
  } catch (error) {
    console.error('Error creating product:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create product' 
    };
  }
}

export async function getProducts() {
  try {
    const products = await prisma.product.findMany({
      orderBy: { name: 'asc' }
    });
    return products;
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
}

export async function getProduct(id: string) {
  try {
    const product = await prisma.product.findUnique({
      where: { id }
    });
    return product;
  } catch (error) {
    console.error('Error fetching product:', error);
    return null;
  }
}

// Batch Actions
export async function createBatch(formData: FormData) {
  try {
    const batchNumber = formData.get('batchNumber') as string;
    const productId = formData.get('productId') as string;
    const vendorId = formData.get('vendorId') as string;
    const quantityStr = formData.get('quantity') as string;
    const receivedDateStr = formData.get('receivedDate') as string;
    const expirationDateStr = formData.get('expirationDate') as string;
    const initialCostStr = formData.get('initialCost') as string;
    const notes = formData.get('notes') as string;

    // Validate required fields
    if (!batchNumber || !productId || !vendorId || !quantityStr || !receivedDateStr || !initialCostStr) {
      throw new Error('Batch number, product, vendor, quantity, received date, and initial cost are required');
    }

    // Check if batch number already exists
    const existingBatch = await prisma.batch.findUnique({
      where: { batchNumber }
    });

    if (existingBatch) {
      throw new Error('A batch with this number already exists');
    }

    const quantity = parseFloat(quantityStr);
    const receivedDate = new Date(receivedDateStr);
    const expirationDate = expirationDateStr ? new Date(expirationDateStr) : null;
    const initialCostCents = parseCostToCents(initialCostStr);

    // Create batch and initial cost in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the batch
      const batch = await tx.batch.create({
        data: {
          batchNumber,
          productId,
          vendorId,
          quantity,
          receivedDate,
          expirationDate,
          notes: notes || null
        }
      });

      // Create initial BatchCost record
      const batchCost = await tx.batchCost.create({
        data: {
          batchId: batch.id,
          unitCost: initialCostCents,
          effectiveFrom: receivedDate
        }
      });

      return { batch, batchCost };
    });

    revalidatePath('/inventory/batches');
    return { success: true, batch: result.batch, batchCost: result.batchCost };
  } catch (error) {
    console.error('Error creating batch:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create batch' 
    };
  }
}

export async function getBatches() {
  try {
    const batches = await prisma.batch.findMany({
      include: {
        product: {
          select: { name: true, sku: true }
        },
        vendor: {
          select: { vendorCode: true }
        },
        batchCosts: {
          orderBy: { effectiveFrom: 'desc' },
          take: 1
        }
      },
      orderBy: { receivedDate: 'desc' }
    });
    return batches;
  } catch (error) {
    console.error('Error fetching batches:', error);
    return [];
  }
}

export async function getBatch(id: string) {
  try {
    const batch = await prisma.batch.findUnique({
      where: { id },
      include: {
        product: true,
        vendor: true,
        batchCosts: {
          orderBy: { effectiveFrom: 'desc' }
        }
      }
    });
    return batch;
  } catch (error) {
    console.error('Error fetching batch:', error);
    return null;
  }
}

export async function addBatchCostChange(batchId: string, unitCost: number, effectiveFrom: Date) {
  try {
    const batchCost = await createBatchCost(batchId, unitCost, effectiveFrom);
    revalidatePath(`/inventory/batches/${batchId}`);
    return { success: true, batchCost };
  } catch (error) {
    console.error('Error adding batch cost change:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to add cost change' 
    };
  }
}

// Inventory Lot Actions
export async function createInventoryLot(formData: FormData) {
  try {
    const batchId = formData.get('batchId') as string;
    const location = formData.get('location') as string;
    const qtyOnHandStr = formData.get('qtyOnHand') as string;
    const qtyAllocatedStr = formData.get('qtyAllocated') as string;
    const reorderPointStr = formData.get('reorderPoint') as string;

    // Validate required fields
    if (!batchId || !location || !qtyOnHandStr) {
      throw new Error('Batch, location, and quantity on hand are required');
    }

    const qtyOnHand = parseFloat(qtyOnHandStr);
    const qtyAllocated = qtyAllocatedStr ? parseFloat(qtyAllocatedStr) : 0;
    const reorderPoint = reorderPointStr ? parseFloat(reorderPointStr) : 0;

    const inventoryLot = await prisma.inventoryLot.create({
      data: {
        batchId,
        location,
        qtyOnHand,
        qtyAllocated,
        reorderPoint
      }
    });

    revalidatePath('/inventory/lots');
    return { success: true, inventoryLot };
  } catch (error) {
    console.error('Error creating inventory lot:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create inventory lot' 
    };
  }
}

export async function getInventoryLots() {
  try {
    const lots = await prisma.inventoryLot.findMany({
      include: {
        batch: {
          include: {
            product: {
              select: { name: true, sku: true }
            },
            batchCosts: {
              orderBy: { effectiveFrom: 'desc' },
              take: 1
            }
          }
        }
      },
      orderBy: { location: 'asc' }
    });
    return lots;
  } catch (error) {
    console.error('Error fetching inventory lots:', error);
    return [];
  }
}

export async function getLowStockItems() {
  try {
    const lowStockLots = await prisma.inventoryLot.findMany({
      where: {
        qtyOnHand: {
          lt: prisma.inventoryLot.fields.reorderPoint
        }
      },
      include: {
        batch: {
          include: {
            product: {
              select: { name: true, sku: true, category: true }
            },
            batchCosts: {
              orderBy: { effectiveFrom: 'desc' },
              take: 1
            }
          }
        }
      },
      orderBy: [
        { qtyOnHand: 'asc' },
        { location: 'asc' }
      ]
    });
    return lowStockLots;
  } catch (error) {
    console.error('Error fetching low stock items:', error);
    return [];
  }
}

// Vendor Actions (for dropdowns)
export async function getVendorsForSelect() {
  try {
    const vendors = await prisma.vendor.findMany({
      select: {
        id: true,
        vendorCode: true
      },
      orderBy: { vendorCode: 'asc' }
    });
    return vendors;
  } catch (error) {
    console.error('Error fetching vendors:', error);
    return [];
  }
}

// Utility Actions
export async function getInventoryStats() {
  try {
    const [productCount, batchCount, lotCount, lowStockCount] = await Promise.all([
      prisma.product.count({ where: { isActive: true } }),
      prisma.batch.count(),
      prisma.inventoryLot.count(),
      prisma.inventoryLot.count({
        where: {
          qtyOnHand: {
            lt: prisma.inventoryLot.fields.reorderPoint
          }
        }
      })
    ]);

    return {
      products: productCount,
      batches: batchCount,
      lots: lotCount,
      lowStock: lowStockCount
    };
  } catch (error) {
    console.error('Error fetching inventory stats:', error);
    return {
      products: 0,
      batches: 0,
      lots: 0,
      lowStock: 0
    };
  }
}

