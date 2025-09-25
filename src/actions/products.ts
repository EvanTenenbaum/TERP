"use server";

import prisma from '@/lib/prisma';

export async function getProductsForDropdown() {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    })
    return { success: true, products }
  } catch (e) {
    console.error('Error fetching products for dropdown', e)
    return { success: false, products: [] }
  }
}
