import prisma from '@/lib/prisma'
import { api } from '@/lib/api'
import { ok, err } from '@/lib/http'

export const PATCH = api<{ name?:string; parentId?:string | null; isActive?:boolean }>({ roles: ['SUPER_ADMIN'], postingLock: true, rate: { key: 'categories-update', limit: 60 }, parseJson: true })(async ({ json, params }) => {
  const { name, parentId, isActive } = json || ({} as any)
  const data: any = {}
  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) return err('invalid_name', 400)
    data.name = name.trim()
  }
  if (parentId !== undefined) {
    if (parentId !== null && typeof parentId !== 'string') return err('invalid_parent', 400)
    data.parentId = parentId ? String(parentId) : null
  }
  if (isActive !== undefined) {
    if (typeof isActive !== 'boolean') return err('invalid_isActive', 400)
    data.isActive = isActive
  }
  if (Object.keys(data).length === 0) return err('no_fields', 400)
  const category = await prisma.productCategory.update({ where: { id: params!.id }, data })
  return ok({ category })
})

export const DELETE = api({ roles: ['SUPER_ADMIN'], postingLock: true, rate: { key: 'categories-delete', limit: 60 } })(async ({ params }) => {
  await prisma.productCategory.delete({ where: { id: params!.id } })
  return ok()
})
