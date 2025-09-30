import { api } from '@/lib/api'
import { ok, err } from '@/lib/http'
import prisma from '@/lib/prisma'

export const GET = api({ roles: ['SUPER_ADMIN','ACCOUNTING','SALES','READ_ONLY'] })(async () => {
  const products = await prisma.product.findMany({ where: { isActive: true }, select: { id: true, sku: true, name: true }, orderBy: { sku: 'asc' } })
  return ok({ products })
})

import { ProductCreate } from '@/lib/schemas/product'

export const POST = api<{ sku:string; name:string; category:string; unit?:string; defaultPrice?:number }>({ roles: ['SUPER_ADMIN','ACCOUNTING'], postingLock: true, rate: { key: 'products-create', limit: 60 }, parseJson: true, bodySchema: ProductCreate })(async ({ json }) => {
  try {
    const sku = json!.sku.trim()
    const name = json!.name.trim()
    const category = json!.category.trim()
    const unit = (json!.unit ?? 'each').trim()
    const defaultPrice = Math.round(((json!.defaultPrice ?? 0) as number) * 100)

    const product = await prisma.product.create({
      data: {
        sku: sku.slice(0,64),
        name: name.slice(0,128),
        category: category.slice(0,64),
        unit: unit.slice(0,32),
        defaultPrice,
        isActive: true
      }
    })
    return ok({ product })
  } catch (e: any) {
    const msg = e?.code === 'P2002' ? 'duplicate_sku' : 'server_error'
    return err(msg, 500)
  }
})

export const PATCH = api<{ id:string; isActive:boolean }>({ roles: ['SUPER_ADMIN','ACCOUNTING'], postingLock: true, rate: { key: 'products-update', limit: 60 }, parseJson: true })(async ({ json }) => {
  const id = String(json!.id||'')
  const isActive = Boolean(json!.isActive)
  if (!id) return err('invalid_input', 400)
  const product = await prisma.product.update({ where: { id }, data: { isActive } })
  return ok({ product })
})
