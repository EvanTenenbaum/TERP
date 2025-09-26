import prisma from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { api } from '@/lib/api'
import { ok, err } from '@/lib/http'

export const GET = api({})(async () => {
  const categories = await prisma.productCategory.findMany({ orderBy: [{ parentId: 'asc' }, { name: 'asc' }] })
  return ok({ categories })
})

export const POST = api<{ name:string; parentId?:string | null }>({ roles: ['SUPER_ADMIN'], parseJson: true })(async ({ json }) => {
  const nm = typeof json!.name === 'string' ? json!.name.trim() : ''
  const parentId = json!.parentId
  if (!nm) return err('invalid_input', 400)
  if (parentId !== undefined && parentId !== null && typeof parentId !== 'string') return err('invalid_parent', 400)
  const category = await prisma.productCategory.create({ data: { name: nm, parentId: parentId ? String(parentId) : null } })
  return ok({ category })
})
