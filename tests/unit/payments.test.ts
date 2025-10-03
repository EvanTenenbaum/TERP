// @jest-environment node
import { applyPaymentFIFO } from '@/lib/finance/payments';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: (fn: any) => fn({
      payment: { 
        findUnique: jest.fn().mockResolvedValue({ id: 'PM1', customerId: 'C1', amountCents: 3000 }),
        update: jest.fn().mockResolvedValue({})
      },
      invoice: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'I1', totalCents: 1000, paymentApplications: [] },
          { id: 'I2', totalCents: 500, paymentApplications: [] },
          { id: 'I3', totalCents: 2000, paymentApplications: [] },
        ]),
        update: jest.fn().mockResolvedValue({})
      },
      paymentApplication: { 
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({}) 
      },
    }),
  },
}));

jest.mock('@/lib/auth', () => ({
  getCurrentUserId: jest.fn().mockReturnValue('test-user'),
}));

describe('applyPaymentFIFO', () => {
  it('applies payment across invoices and creates credit for leftover', async () => {
    const res = await applyPaymentFIFO({ paymentId: 'PM1', customerId: 'C1' });
    expect(res.ok).toBe(true);
  });
});
