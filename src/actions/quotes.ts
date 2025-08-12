'use server';

import { PrismaClient } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import crypto from 'crypto';

const prisma = new PrismaClient();

export interface QuoteItem {
  productId: string;
  batchId: string;
  inventoryLotId: string;
  quantity: number;
  unitPrice: number; // in cents
}

export interface CreateQuoteData {
  customerId: string;
  items: QuoteItem[];
  notes?: string;
  validUntil?: Date;
}

export async function createQuote(data: CreateQuoteData) {
  try {
    const { customerId, items, notes, validUntil } = data;

    // Validate customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    });

    if (!customer) {
      return { success: false, error: 'Customer not found' };
    }

    // Validate all items exist and are available
    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId }
      });

      if (!product) {
        return { success: false, error: `Product not found: ${item.productId}` };
      }

      const batch = await prisma.batch.findUnique({
        where: { id: item.batchId }
      });

      if (!batch) {
        return { success: false, error: `Batch not found: ${item.batchId}` };
      }

      const inventoryLot = await prisma.inventoryLot.findUnique({
        where: { id: item.inventoryLotId }
      });

      if (!inventoryLot) {
        return { success: false, error: `Inventory lot not found: ${item.inventoryLotId}` };
      }

      // Check availability (quotes don't reserve stock, but we should warn if insufficient)
      const availableQty = inventoryLot.qtyOnHand - inventoryLot.qtyAllocated;
      if (item.quantity > availableQty) {
        console.warn(`Warning: Quote quantity (${item.quantity}) exceeds available stock (${availableQty}) for product ${product.sku}`);
      }
    }

    // Generate quote number
    const quoteNumber = await generateQuoteNumber();

    // Generate share token
    const shareToken = crypto.randomBytes(32).toString('hex');

    // Calculate total amount
    const totalAmount = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);

    // Create the quote
    const quote = await prisma.salesQuote.create({
      data: {
        quoteNumber,
        customerId,
        totalAmount,
        status: 'draft',
        shareToken,
        notes,
        validUntil,
        items: {
          create: items.map(item => ({
            productId: item.productId,
            batchId: item.batchId,
            inventoryLotId: item.inventoryLotId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.unitPrice * item.quantity
          }))
        }
      },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
            batch: {
              include: {
                vendor: true
              }
            },
            inventoryLot: true
          }
        }
      }
    });

    revalidatePath('/quotes');
    return { success: true, quote };
  } catch (error) {
    console.error('Error creating quote:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create quote'
    };
  }
}

export async function getQuotes() {
  try {
    const quotes = await prisma.salesQuote.findMany({
      include: {
        customer: true,
        items: {
          include: {
            product: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return quotes;
  } catch (error) {
    console.error('Error fetching quotes:', error);
    return [];
  }
}

export async function getQuote(id: string) {
  try {
    const quote = await prisma.salesQuote.findUnique({
      where: { id },
      include: {
        customer: {
          include: {
            role: true
          }
        },
        items: {
          include: {
            product: true,
            batch: {
              include: {
                vendor: true
              }
            },
            inventoryLot: true
          }
        }
      }
    });

    return quote;
  } catch (error) {
    console.error('Error fetching quote:', error);
    return null;
  }
}

export async function getQuoteByToken(token: string) {
  try {
    const quote = await prisma.salesQuote.findUnique({
      where: { shareToken: token },
      include: {
        customer: {
          include: {
            role: true
          }
        },
        items: {
          include: {
            product: true,
            batch: {
              include: {
                vendor: true
              }
            },
            inventoryLot: true
          }
        }
      }
    });

    return quote;
  } catch (error) {
    console.error('Error fetching quote by token:', error);
    return null;
  }
}

export async function updateQuoteStatus(id: string, status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired') {
  try {
    const quote = await prisma.salesQuote.update({
      where: { id },
      data: { status },
      include: {
        customer: true,
        items: {
          include: {
            product: true
          }
        }
      }
    });

    revalidatePath('/quotes');
    revalidatePath(`/quotes/${id}`);
    return { success: true, quote };
  } catch (error) {
    console.error('Error updating quote status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update quote status'
    };
  }
}

export async function convertQuoteToOrder(quoteId: string) {
  try {
    const quote = await prisma.salesQuote.findUnique({
      where: { id: quoteId },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
            batch: true,
            inventoryLot: true
          }
        }
      }
    });

    if (!quote) {
      return { success: false, error: 'Quote not found' };
    }

    if (quote.status !== 'accepted') {
      return { success: false, error: 'Only accepted quotes can be converted to orders' };
    }

    // Re-validate prices and stock availability
    for (const item of quote.items) {
      const currentLot = await prisma.inventoryLot.findUnique({
        where: { id: item.inventoryLotId }
      });

      if (!currentLot) {
        return { success: false, error: `Inventory lot no longer exists for ${item.product.sku}` };
      }

      const availableQty = currentLot.qtyOnHand - currentLot.qtyAllocated;
      if (item.quantity > availableQty) {
        return { 
          success: false, 
          error: `Insufficient stock for ${item.product.sku}. Available: ${availableQty}, Required: ${item.quantity}` 
        };
      }
    }

    // Generate order number
    const orderNumber = await generateOrderNumber();

    // Create the order
    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerId: quote.customerId,
        totalAmount: quote.totalAmount,
        status: 'pending',
        allocationDate: new Date(),
        items: {
          create: quote.items.map(item => ({
            productId: item.productId,
            batchId: item.batchId,
            inventoryLotId: item.inventoryLotId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            allocationDate: new Date()
          }))
        }
      },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
            batch: true,
            inventoryLot: true
          }
        }
      }
    });

    // Update inventory allocations
    for (const item of quote.items) {
      await prisma.inventoryLot.update({
        where: { id: item.inventoryLotId },
        data: {
          qtyAllocated: {
            increment: item.quantity
          }
        }
      });
    }

    // Update quote status
    await prisma.salesQuote.update({
      where: { id: quoteId },
      data: { status: 'accepted' }
    });

    revalidatePath('/quotes');
    revalidatePath(`/quotes/${quoteId}`);
    revalidatePath('/orders');

    return { success: true, order };
  } catch (error) {
    console.error('Error converting quote to order:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to convert quote to order'
    };
  }
}

async function generateQuoteNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `Q${year}`;
  
  // Find the highest quote number for this year
  const lastQuote = await prisma.salesQuote.findFirst({
    where: {
      quoteNumber: {
        startsWith: prefix
      }
    },
    orderBy: {
      quoteNumber: 'desc'
    }
  });

  let nextNumber = 1;
  if (lastQuote) {
    const lastNumber = parseInt(lastQuote.quoteNumber.replace(prefix, ''));
    nextNumber = lastNumber + 1;
  }

  return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
}

async function generateOrderNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `O${year}`;
  
  // Find the highest order number for this year
  const lastOrder = await prisma.order.findFirst({
    where: {
      orderNumber: {
        startsWith: prefix
      }
    },
    orderBy: {
      orderNumber: 'desc'
    }
  });

  let nextNumber = 1;
  if (lastOrder) {
    const lastNumber = parseInt(lastOrder.orderNumber.replace(prefix, ''));
    nextNumber = lastNumber + 1;
  }

  return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
}

export async function getCustomers() {
  try {
    const customers = await prisma.customer.findMany({
      where: { isActive: true },
      select: {
        id: true,
        companyName: true,
        contactName: true,
        email: true
      },
      orderBy: { companyName: 'asc' }
    });

    return customers;
  } catch (error) {
    console.error('Error fetching customers:', error);
    return [];
  }
}

