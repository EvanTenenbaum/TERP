'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export type PriceBookType = 'GLOBAL' | 'ROLE' | 'CUSTOMER'

export interface CreatePriceBookData {
  name: string;
  type: PriceBookType;
  effectiveDate?: Date;
  isActive?: boolean;
  customerId?: string;
  roleId?: string;
}

export interface CreatePriceBookEntryData {
  priceBookId: string;
  productId: string;
  unitPrice: number; // cents
  effectiveDate?: Date;
}

export async function getPriceBooks() {
  const books = await prisma.priceBook.findMany({
    include: {
      entries: {
        orderBy: { effectiveDate: 'desc' },
        include: { product: true },
      },
      customer: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  return { success: true, books };
}

export async function createPriceBook(data: CreatePriceBookData) {
  const book = await prisma.priceBook.create({
    data: {
      name: data.name,
      type: data.type,
      customerId: data.customerId || null,
      roleId: data.roleId || null,
      effectiveDate: data.effectiveDate || new Date(),
      isActive: data.isActive ?? true,
    },
  });
  revalidatePath('/price-books');
  return { success: true, book };
}

export async function setPriceBookActive(id: string, isActive: boolean) {
  const book = await prisma.priceBook.update({ where: { id }, data: { isActive } });
  revalidatePath('/price-books');
  return { success: true, book };
}

export async function createPriceBookEntry(data: CreatePriceBookEntryData) {
  const entry = await prisma.priceBookEntry.create({
    data: {
      priceBookId: data.priceBookId,
      productId: data.productId,
      unitPrice: data.unitPrice,
      effectiveDate: data.effectiveDate || new Date(),
    },
    include: { product: true },
  });
  revalidatePath('/price-books');
  return { success: true, entry };
}
