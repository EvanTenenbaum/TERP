// @jest-environment node
import { allocateFIFO } from '@/lib/inventoryAllocator';

jest.mock('@/lib/auth', () => ({
  getCurrentUserId: jest.fn().mockReturnValue('test-user'),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: (fn: any) => fn({
      inventoryLot: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'L1', availableQty: 2 },
          { id: 'L2', availableQty: 3 },
        ]),
        update: jest.fn().mockResolvedValue({})
      },
      reservation: {
        create: jest.fn().mockResolvedValue({})
      }
    }, { isolationLevel: 'Serializable' }),
  },
}));

describe('allocateFIFO', () => {
  it('allocates across lots', async () => {
    const res = await allocateFIFO({ orderId: 'O1', orderItemId: 'OI1', productId: 'P1', quantity: 5 });
    expect(res.ok).toBe(true);
  });
});
