'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

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

    revalidatePath('/quotes');
    
    return {
      success: true,
      quote
    };
  } catch (error) {
    console.error('Error creating quote:', error);
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
    return {
      success: false,
      error: 'Failed to update quote status'
    };
  }
}

export async function convertQuoteToOrder(quoteId: string) {
  try {
    const quote = await prisma.salesQuote.findUnique({
      where: { id: quoteId },
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
      return { success: false, error: 'Quote not found' };
    }

    if (quote.status !== 'ACCEPTED') {
      return { success: false, error: 'Only accepted quotes can be converted to orders' };
    }

    // Generate order number
    const orderCount = await prisma.order.count();
    const orderNumber = `ORD${String(orderCount + 1).padStart(6, '0')}`;

    // Create the order
    const order = await prisma.order.create({
      data: {
        customerId: quote.customerId,
        orderDate: new Date(),
        totalAmount: quote.totalAmount,
        status: 'DRAFT',
        orderItems: {
          create: quote.quoteItems.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            allocationDate: new Date()
          }))
        }
      },
      include: {
        customer: true,
        orderItems: {
          include: {
            product: true
          }
        }
      }
    });

    // Update quote status to indicate it's been converted
    await prisma.salesQuote.update({
      where: { id: quoteId },
      data: { status: 'ACCEPTED' }
    });

    revalidatePath('/quotes');
    revalidatePath('/orders');
    
    return {
      success: true,
      order
    };
  } catch (error) {
    console.error('Error converting quote to order:', error);
    return {
      success: false,
      error: 'Failed to convert quote to order'
    };
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
    // TODO: Implement PDF generation
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
