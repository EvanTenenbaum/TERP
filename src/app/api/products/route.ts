import { api } from '@/lib/api'
import { ok, err } from '@/lib/http'
import prisma from '@/lib/prisma'

export const GET = api({})(async () => {
  const products = await prisma.product.findMany({ where: { isActive: true }, select: { id: true, sku: true, name: true }, orderBy: { sku: 'asc' } })
  return ok({ products })
})

export const POST = api<{ sku:string; name:string; category:string; unit?:string; defaultPrice?:number }>({ roles: ['SUPER_ADMIN','ACCOUNTING'], rate: { key: 'products-create', limit: 60 }, parseJson: true })(async ({ json }) => {
  try {
    const sku = String(json!.sku || '').trim()
    const name = String(json!.name || '').trim()
    const category = String(json!.category || '').trim()
    const unit = String(json!.unit || '').trim() || 'each'
    const defaultPriceDollars = Number(json!.defaultPrice)
    if (!sku || !name || !category) return err('missing_fields', 400)
    const defaultPrice = Math.round((Number.isFinite(defaultPriceDollars) ? defaultPriceDollars : 0) * 100)

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
