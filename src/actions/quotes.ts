'use server';

import prisma from '@/lib/prisma';
import * as Sentry from '@sentry/nextjs'
import { requireRole } from '@/lib/auth'
import { revalidatePath } from 'next/cache';
import { getEffectiveUnitPrice } from '@/lib/pricing';
import { ensurePostingUnlocked } from '@/lib/system'

export interface CreateQuoteData {
  customerId: string;
  items: {
    productId: string;
    quantity: number;
    unitPrice: number;
  }[];
  validUntil?: Date;
}

export interface QuoteItem {
  productId: string;
  quantity: number;
  unitPrice: number;
}

// Generate a random share token
function generateShareToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function getQuotes() {
  try {
    const quotes = await prisma.salesQuote.findMany({
      include: {
        customer: true,
        quoteItems: {
          include: {
            product: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return {
      success: true,
      quotes
    };
  } catch (error) {
    console.error('Error fetching quotes:', error);
    return {
      success: false,
      error: 'Failed to fetch quotes'
    };
  }
}

export async function createQuote(data: CreateQuoteData) {
  try { requireRole(['SUPER_ADMIN','SALES']) } catch (e) { return { success: false, error: 'forbidden' } }
  try { await ensurePostingUnlocked(['SUPER_ADMIN','SALES']) } catch { return { success: false, error: 'posting_locked' } }
  try {
    const { customerId, items, validUntil } = data;

    // Generate quote number
    const quoteCount = await prisma.salesQuote.count();
    const quoteNumber = `Q${String(quoteCount + 1).padStart(6, '0')}`;

    // Generate share token
    const shareToken = generateShareToken();

    // Calculate total amount
    const totalAmount = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);

    // Create the quote
    const quote = await prisma.salesQuote.create({
      data: {
        quoteNumber,
        customerId,
        totalAmount,
        status: 'DRAFT',
        shareToken,
        quoteDate: new Date(),
        expirationDate: validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days
        quoteItems: {
          create: items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.unitPrice * item.quantity
          }))
        }
      },
      include: {
        customer: true,
        quoteItems: {
          include: {
            product: true
          }
        }
      }
    });

    // Audit overrides: compare provided price vs effective
    try {
      for (const qi of quote.quoteItems) {
        const eff = await getEffectiveUnitPrice(prisma as any, qi.productId, { customerId: quote.customerId })
        if (qi.unitPrice !== eff) {
          const { getCurrentUserId } = await import('@/lib/auth')
          await prisma.overrideAudit.create({ data: { userId: getCurrentUserId(), quoteId: quote.id, lineItemId: qi.id, oldPrice: eff, newPrice: qi.unitPrice, reason: 'QUOTE_PRICE_OVERRIDE', overrideType: 'LINE' } })
        }
      }
    } catch {}

    revalidatePath('/quotes');

    return {
      success: true,
      quote
    };
  } catch (error) {
    console.error('Error creating quote:', error);
    Sentry.captureException(error)
    return {
      success: false,
      error: 'Failed to create quote'
    };
  }
}

export async function getQuote(id: string) {
  try {
    const quote = await prisma.salesQuote.findUnique({
      where: { id },
      include: {
        customer: true,
        quoteItems: {
          include: {
            product: true
          }
        }
      }
    });

    if (!quote) {
      return {
        success: false,
        error: 'Quote not found'
      };
    }

    return {
      success: true,
      quote
    };
  } catch (error) {
    console.error('Error fetching quote:', error);
    return {
      success: false,
      error: 'Failed to fetch quote'
    };
  }
}

export async function getQuoteByToken(token: string) {
  try {
    return await prisma.salesQuote.findUnique({
      where: { shareToken: token },
      include: {
        customer: true,
        quoteItems: {
          include: {
            product: true
          }
        }
      }
    });
  } catch (error) {
    console.error('Error fetching quote by token:', error);
    return null;
  }
}

export async function updateQuoteStatus(id: string, status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'EXPIRED' | 'CANCELLED') {
  try { requireRole(['SUPER_ADMIN','SALES']) } catch (e) { return { success: false, error: 'forbidden' } }
  try { await ensurePostingUnlocked(['SUPER_ADMIN','SALES']) } catch { return { success: false, error: 'posting_locked' } }
  try {
    const quote = await prisma.salesQuote.update({
      where: { id },
      data: { status },
      include: {
        customer: true,
        quoteItems: {
          include: {
            product: true
          }
        }
      }
    });

    revalidatePath('/quotes');
    revalidatePath(`/quotes/${id}`);
    
    return {
      success: true,
      quote
    };
  } catch (error) {
    console.error('Error updating quote status:', error);
    Sentry.captureException(error)
    return {
      success: false,
      error: 'Failed to update quote status'
    };
  }
}

export async function convertQuoteToOrder(quoteId: string) {
  try { requireRole(['SUPER_ADMIN','SALES']) } catch (e) { return { success: false, error: 'forbidden' } }
  try { await ensurePostingUnlocked(['SUPER_ADMIN','SALES']) } catch { return { success: false, error: 'posting_locked' } }
  try {
    const quote = await prisma.salesQuote.findUnique({
      where: { id: quoteId },
      include: {
        customer: true,
        quoteItems: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!quote) return { success: false, error: 'Quote not found' };
    if (quote.status !== 'ACCEPTED') {
      return { success: false, error: 'Only accepted quotes can be converted to orders' };
    }

    const result = await prisma.$transaction(async (tx) => {
      // Generate order number
      const orderCount = await tx.order.count();
      const orderNumber = `ORD${String(orderCount + 1).padStart(6, '0')}`;

      const allocationDate = new Date();
      let computedTotal = 0;
      const itemsToCreate: any[] = [];

      for (const qi of quote.quoteItems) {
        const unitPrice = await getEffectiveUnitPrice(tx as any, qi.productId, { customerId: quote.customerId });
        const qty = qi.quantity;

        const { allocateFIFOByProduct } = await import('@/lib/inventoryAllocator')
        const allocations = await allocateFIFOByProduct(tx as any, qi.productId, qty)

        for (const alloc of allocations) {
          const { getActiveBatchCostDb } = await import('@/lib/cogs')
          const activeCost = await getActiveBatchCostDb(tx as any, alloc.batchId, allocationDate)
          const cogsUnitCents = activeCost?.unitCost ?? null
          const cogsTotalCents = cogsUnitCents != null ? cogsUnitCents * alloc.qty : null

          itemsToCreate.push({
            productId: qi.productId,
            batchId: alloc.batchId,
            quantity: alloc.qty,
            unitPrice,
            allocationDate,
            cogsUnitCents: cogsUnitCents ?? undefined,
            cogsTotalCents: cogsTotalCents ?? undefined,
          })
          computedTotal += unitPrice * alloc.qty
        }
      }

      const order = await tx.order.create({
        data: {
          customerId: quote.customerId,
          orderDate: new Date(),
          totalAmount: computedTotal,
          status: 'DRAFT',
          orderItems: { create: itemsToCreate },
        },
        include: {
          customer: true,
          orderItems: { include: { product: true, batch: { include: { vendor: true } } } },
        },
      });

      // Consignment vendor payables accrue on sale
      const consignByVendor = new Map<string, number>()
      for (const it of order.orderItems) {
        if (it.batch && (it.batch as any).isConsignment && it.cogsTotalCents) {
          // accrue vendor payable by COGS
          consignByVendor.set(it.batch.vendorId, (consignByVendor.get(it.batch.vendorId) || 0) + (it.cogsTotalCents || 0))
        }
      }
      for (const [vendorId, amount] of consignByVendor) {
        const apCount = await tx.accountsPayable.count({})
        const apNumber = `CONS-${new Date().getFullYear()}-${String(apCount + 1).padStart(4, '0')}`
        const now = new Date()
        await tx.accountsPayable.create({ data: { vendorId, invoiceNumber: apNumber, invoiceDate: now, dueDate: now, terms: 'Consignment', amount, balanceRemaining: amount } })
      }

      // Credit limit enforcement
      const cust = await tx.customer.findUnique({ where: { id: quote.customerId } })
      if (cust?.creditLimit && cust.creditLimit > 0) {
        const openAR = await tx.accountsReceivable.aggregate({ _sum: { balanceRemaining: true }, where: { customerId: quote.customerId, balanceRemaining: { gt: 0 } } })
        const projected = (openAR._sum.balanceRemaining || 0) + computedTotal
        if (projected > cust.creditLimit) {
          throw new Error('credit_limit_exceeded')
        }
      }

      // Create AR invoice
      const arCount = await tx.accountsReceivable.count();
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(arCount + 1).padStart(4, '0')}`;
      const invoiceDate = new Date();
      const terms = cust?.paymentTerms || 'Net 30';
      const daysMatch = /Net\s+(\d+)/i.exec(terms);
      const days = daysMatch ? parseInt(daysMatch[1], 10) : 30;
      const dueDate = new Date(invoiceDate.getTime() + days * 24 * 60 * 60 * 1000);
      await tx.accountsReceivable.create({
        data: {
          customerId: order.customerId,
          orderId: order.id,
          invoiceNumber,
          invoiceDate,
          dueDate,
          terms,
          amount: order.totalAmount,
          balanceRemaining: order.totalAmount,
        },
      });

      // Keep quote as ACCEPTED; it has been converted
      return order;
    });

    revalidatePath('/quotes');
    revalidatePath('/orders');
    return { success: true, order: result };
  } catch (error) {
    console.error('Error converting quote to order:', error);
    Sentry.captureException(error)
    const msg = (error as Error)?.message
    const message = msg === 'insufficient_stock' ? 'Insufficient stock to allocate' : msg === 'credit_limit_exceeded' ? 'Credit limit exceeded; admin override required' : 'Failed to convert quote to order';
    return { success: false, error: message };
  }
}

export async function deleteQuote(id: string) {
  try {
    await prisma.salesQuote.delete({
      where: { id }
    });

    revalidatePath('/quotes');
    
    return {
      success: true
    };
  } catch (error) {
    console.error('Error deleting quote:', error);
    return {
      success: false,
      error: 'Failed to delete quote'
    };
  }
}



export async function generateQuotePDF(quoteId: string) {
  try {
    return {
      success: true,
      pdfUrl: `/api/quotes/${quoteId}/pdf`
    };
  } catch (error) {
    console.error('Error generating PDF:', error);
    return {
      success: false,
      error: 'Failed to generate PDF'
    };
  }
}

export async function shareQuote(quoteId: string) {
  try {
    // Reuse existing token if present to keep links stable
    const existing = await prisma.salesQuote.findUnique({
      where: { id: quoteId },
      select: { shareToken: true },
    });

    let shareToken = existing?.shareToken || '';
    if (!shareToken) {
      // Cryptographically strong token
      shareToken = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      await prisma.salesQuote.update({ where: { id: quoteId }, data: { shareToken } });
    }

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const shareUrl = `${baseUrl}/quotes/share/${shareToken}`;

    return { success: true, shareUrl, shareToken };
  } catch (error) {
    console.error('Error creating share link:', error);
    return { success: false, error: 'Failed to create share link' };
  }
}
