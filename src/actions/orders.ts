'use server';

import prisma from '@/lib/prisma';

export async function getOrders() {
  try {
    const orders = await prisma.order.findMany({
      include: {
        customer: true,
        orderItems: { include: { product: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return { success: true, orders }
  } catch (e) {
    console.error('Error fetching orders', e)
    return { success: false, orders: [] }
  }
}
