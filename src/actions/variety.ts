'use server';

import prisma from '@/lib/prisma';

export async function listVarieties() {
  try {
    const varieties = await prisma.variety.findMany({ orderBy: { name: 'asc' } });
    return { success: true, varieties };
  } catch (e) {
    console.error('listVarieties failed', e);
    return { success: false, varieties: [] };
  }
}

export async function createVariety(input: { name: string; type: 'Hemp' | 'Indica' | 'Sativa' | 'Hybrid' | 'Ruderalis' }) {
  try {
    const variety = await prisma.variety.create({ data: input });
    return { success: true, variety };
  } catch (e) {
    console.error('createVariety failed', e);
    return { success: false, error: 'create_failed' } as const;
  }
}

export async function updateVariety(id: string, data: Partial<{ name: string; type: 'Hemp' | 'Indica' | 'Sativa' | 'Hybrid' | 'Ruderalis' }>) {
  try {
    const variety = await prisma.variety.update({ where: { id }, data });
    return { success: true, variety };
  } catch (e) {
    console.error('updateVariety failed', e);
    return { success: false, error: 'update_failed' } as const;
  }
}
