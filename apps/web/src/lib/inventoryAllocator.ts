import { prisma } from './prisma';
import { ERPError } from './errors';
import { getCurrentUserId } from './auth';

interface AllocateInput {
  orderId: string;
  orderItemId: string;
  productId: string;
  quantity: number;
}

interface AllocateResult {
  ok: boolean;
  allocated: Array<{
    lotId: string;
    quantity: number;
  }>;
  shortfall: number;
}

/**
 * Allocate inventory using FIFO (First In, First Out) method
 * Oldest lots are allocated first
 */
export async function allocateFIFO(input: AllocateInput): Promise<AllocateResult> {
  const { orderId, orderItemId, productId, quantity } = input;
  const userId = getCurrentUserId();

  return await prisma.$transaction(
    async (tx) => {
      // Fetch available lots (FIFO order - oldest first)
      const lots = await tx.inventoryLot.findMany({
        where: {
          productId,
          availableQty: { gt: 0 },
        },
        orderBy: { batchCreatedAt: 'asc' },
      });

      let remaining = quantity;
      const allocated: Array<{ lotId: string; quantity: number }> = [];

      for (const lot of lots) {
        if (remaining <= 0) break;

        const toAllocate = Math.min(remaining, lot.availableQty);

        // Update lot quantities
        await tx.inventoryLot.update({
          where: { id: lot.id },
          data: {
            allocatedQty: { increment: toAllocate },
            availableQty: { decrement: toAllocate },
          },
        });

        // Create reservation record (if you have a Reservation model)
        // For now, we'll just track the allocation
        allocated.push({
          lotId: lot.id,
          quantity: toAllocate,
        });

        remaining -= toAllocate;
      }

      const shortfall = remaining;

      if (shortfall > 0) {
        throw new ERPError('UNPROCESSABLE', `Insufficient inventory: ${shortfall} units short`);
      }

      return {
        ok: true,
        allocated,
        shortfall,
      };
    },
    { isolationLevel: 'Serializable' }
  );
}

/**
 * Release allocated inventory back to available
 */
export async function releaseAllocation(productId: string, lotId: string, quantity: number) {
  await prisma.inventoryLot.update({
    where: { id: lotId },
    data: {
      allocatedQty: { decrement: quantity },
      availableQty: { increment: quantity },
    },
  });
}
