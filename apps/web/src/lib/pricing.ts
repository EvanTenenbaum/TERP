import prisma from './prisma';
import { UserRole } from './auth';

interface PricingInput {
  productId: string;
  clientId?: string; // customer ID
  role?: UserRole;
}

/**
 * Get effective unit price for a product based on pricing hierarchy:
 * 1. Customer-specific price (highest priority)
 * 2. Role-specific price
 * 3. Global price
 * 4. Product default price (fallback)
 */
export async function getEffectiveUnitPrice(input: PricingInput): Promise<number> {
  const { productId, clientId, role } = input;

  // Fetch all applicable price book entries
  const entries = await prisma.priceBookEntry.findMany({
    where: {
      productId,
      OR: [
        { scope: 'GLOBAL' },
        ...(clientId ? [{ scope: 'CUSTOMER', customerId: clientId }] : []),
      ],
    },
    orderBy: { createdAt: 'desc' },
  });

  // Apply pricing hierarchy
  let price: number | null = null;

  // 1. Customer-specific
  if (clientId) {
    const customerEntry = entries.find(
      (e: any) => e.scope === 'CUSTOMER' && e.customerId === clientId
    );
    if (customerEntry) {
      price = customerEntry.unitPriceCents;
    }
  }

  // 2. Global
  if (price === null) {
    const globalEntry = entries.find((e: any) => e.scope === 'GLOBAL');
    if (globalEntry) {
      price = globalEntry.unitPriceCents;
    }
  }

  // 4. Product default (fallback)
  if (price === null) {
    const product = await prisma.product.findUniqueOrThrow({
      where: { id: productId },
    });
    price = product.defaultUnitPriceCents;
  }

  return price ?? 0;
}

/**
 * Calculate line item total
 */
export function calculateLineTotal(unitPriceCents: number, quantity: number): number {
  return unitPriceCents * quantity;
}

/**
 * Calculate order total from line items
 */
export function calculateOrderTotal(
  items: Array<{ unitPriceCents: number; quantity: number }>
): number {
  return items.reduce((sum, item) => sum + calculateLineTotal(item.unitPriceCents, item.quantity), 0);
}
