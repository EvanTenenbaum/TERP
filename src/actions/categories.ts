import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth'

export async function listCategories() {
  const cats = await prisma.productCategory.findMany({ orderBy: [{ parentId: 'asc' }, { name: 'asc' }] })
  return { success: true, categories: cats }
}

export async function createCategory(name: string, parentId?: string) {
  requireRole(['SUPER_ADMIN'])
  const cat = await prisma.productCategory.create({ data: { name, parentId: parentId || null } })
  revalidatePath('/inventory/categories')
  return { success: true, category: cat }
}

export async function updateCategory(id: string, name: string, parentId?: string, isActive?: boolean) {
  requireRole(['SUPER_ADMIN'])
  const cat = await prisma.productCategory.update({ where: { id }, data: { name, parentId: parentId || null, isActive: isActive ?? true } })
  revalidatePath('/inventory/categories')
  return { success: true, category: cat }
}

export async function deleteCategory(id: string) {
  requireRole(['SUPER_ADMIN'])
  await prisma.productCategory.delete({ where: { id } })
  revalidatePath('/inventory/categories')
  return { success: true }
}
