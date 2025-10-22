import { prisma } from '@/lib/prisma';
import { ERPError } from '@/lib/errors';
import { getEffectiveUnitPrice } from '@/lib/pricing';
import { UserRole } from '@/lib/auth';

interface ConvertInput {
  quoteId: string;
  userRole: UserRole;
}

export async function convertQuoteToOrder(input: ConvertInput) {
  const { quoteId, userRole } = input;

  return await prisma.$transaction(async (tx) => {
    // Fetch quote with items
    const quote = await tx.quote.findUnique({
      where: { id: quoteId },
      include: { items: true },
    });

    if (!quote) {
      throw new ERPError('NOT_FOUND', 'quote_not_found');
    }

    if (quote.status !== 'OPEN') {
      throw new ERPError('CONFLICT', 'quote_already_converted');
    }

    // Create order
    const order = await tx.order.create({
      data: {
        customerId: quote.customerId,
        status: 'PENDING',
      },
    });

    // Create order items with pricing
    for (const item of quote.items) {
      const unitPriceCents = await getEffectiveUnitPrice({
        productId: item.productId,
        clientId: quote.customerId,
        role: userRole,
      });

      await tx.orderItem.create({
        data: {
          orderId: order.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPriceCents,
          cogsCents: 0, // COGS would be calculated from inventory lot costs
        },
      });
    }

    // Mark quote as converted
    await tx.quote.update({
      where: { id: quoteId },
      data: { status: 'CONVERTED' },
    });

    return {
      ok: true,
      orderId: order.id,
      quoteId: quote.id,
    };
  });
}
