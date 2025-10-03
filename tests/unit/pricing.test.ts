// @jest-environment node
import * as pricing from '@/lib/pricing';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    priceBookEntry: { findMany: jest.fn() },
    product: { findUniqueOrThrow: jest.fn() },
  },
}));

const { prisma } = jest.requireMock('@/lib/prisma');

describe('getEffectiveUnitPrice', () => {
  it('prefers customer over role and global', async () => {
    prisma.priceBookEntry.findMany.mockResolvedValue([
      { scope: 'GLOBAL', unitPriceCents: 1200 },
      { scope: 'ROLE', role: 'SALES', unitPriceCents: 1100 },
      { scope: 'CUSTOMER', customerId: 'C1', unitPriceCents: 1000 },
    ]);
    const cents = await pricing.getEffectiveUnitPrice({ productId: 'P1', clientId: 'C1', role: 'SALES' as any });
    expect(cents).toBe(1000);
  });
  it('falls back to product default', async () => {
    prisma.priceBookEntry.findMany.mockResolvedValue([]);
    prisma.product.findUniqueOrThrow.mockResolvedValue({ defaultUnitPriceCents: 1500 });
    const cents = await pricing.getEffectiveUnitPrice({ productId: 'P1' });
    expect(cents).toBe(1500);
  });
});
