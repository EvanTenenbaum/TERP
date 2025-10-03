import { api } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const Input = z.object({
  items: z.array(z.object({ productId: z.string().uuid(), quantity: z.number().int().positive() })).min(1),
  vendorId: z.string().uuid().optional(),
});

export const POST = api(Input, async ({ items, vendorId }) => {
  const vendor = vendorId ? await prisma.vendor.findUniqueOrThrow({ where: { id: vendorId } }) : await prisma.vendor.findFirstOrThrow();
  
  // In a real implementation, this would create a PurchaseOrder
  // For now, just return the items that need to be ordered
  return { 
    ok: true, 
    vendor: vendor.vendorCode,
    items: items.map(i => ({ productId: i.productId, quantity: i.quantity })),
    message: 'Replenishment request created (PurchaseOrder model not yet implemented)'
  };
}, ['SUPER_ADMIN','ACCOUNTING']);
