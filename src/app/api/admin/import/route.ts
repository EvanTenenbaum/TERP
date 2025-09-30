import { api } from '@/lib/api'
import prisma from '@/lib/prisma'
import { ok, err } from '@/lib/http'
import { ImportBody } from '@/lib/schemas/import'

function toInt(v: any): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  if (!isFinite(n)) return null
  return Math.round(n)
}

async function importProducts(rows: any[], apply: boolean) {
  const out: any[] = []
  await prisma.$transaction(async (tx) => {
    for (const r of rows) {
      const sku = String(r.sku || '').trim()
      const name = String(r.name || r.product || '').trim()
      const category = r.category ? String(r.category) : undefined
      const price = toInt(r.defaultPriceCents ?? r.defaultPrice)
      if (!sku || !name) { out.push({ key: sku || name, status: 'error', reason: 'missing_fields' }); continue }
      const existing = await tx.product.findUnique({ where: { sku } })
      const data: any = { name, category: category ?? (existing?.category ?? 'Uncategorized') }
      if (price !== null) data.defaultPrice = price
      if (existing) {
        out.push({ key: sku, status: 'update', diff: data })
        if (apply) await tx.product.update({ where: { sku }, data })
      } else {
        out.push({ key: sku, status: 'create', diff: data })
        if (apply) await tx.product.create({ data: { sku, ...data, isActive: true } as any })
      }
    }
  })
  return out
}

async function importCustomers(rows: any[], apply: boolean) {
  const out: any[] = []
  await prisma.$transaction(async (tx) => {
    for (const r of rows) {
      const id = r.id ? String(r.id) : null
      const companyName = String(r.companyName || r.name || '').trim()
      const credit = toInt(r.creditLimitCents ?? r.creditLimit)
      if (!id && !companyName) { out.push({ key: id || companyName, status: 'error', reason: 'missing_fields' }); continue }
      if (id) {
        const existing = await tx.customer.findUnique({ where: { id } })
        if (!existing) { out.push({ key: id, status: 'error', reason: 'not_found' }); continue }
        const data: any = {}
        if (companyName) data.companyName = companyName
        if (credit !== null) data.creditLimit = credit
        out.push({ key: id, status: 'update', diff: data })
        if (apply) await tx.customer.update({ where: { id }, data })
      } else {
        const data: any = { companyName }
        if (credit !== null) data.creditLimit = credit
        out.push({ key: companyName, status: 'create', diff: data })
        if (apply) await tx.customer.create({ data: { ...data, contactInfo: {} } })
      }
    }
  })
  return out
}

async function importPriceBook(rows: any[], apply: boolean) {
  const out: any[] = []
  await prisma.$transaction(async (tx) => {
    for (const r of rows) {
      const bookName = String(r.book || r.priceBook || '').trim()
      const sku = String(r.sku || '').trim()
      const unit = toInt(r.unitPriceCents ?? r.unitPrice)
      if (!bookName || !sku || unit === null) { out.push({ key: sku || bookName, status: 'error', reason: 'missing_fields' }); continue }
      const product = await tx.product.findUnique({ where: { sku } })
      if (!product) { out.push({ key: sku, status: 'error', reason: 'product_not_found' }); continue }
      let book = await tx.priceBook.findFirst({ where: { name: bookName } })
      if (!book) {
        book = await tx.priceBook.create({ data: { name: bookName, type: 'GLOBAL', effectiveDate: new Date(), isActive: true } as any })
      }
      const existing = await tx.priceBookEntry.findFirst({ where: { priceBookId: book.id, productId: product.id } })
      const data = { unitPrice: unit, effectiveDate: new Date() }
      if (existing) {
        out.push({ key: `${bookName}:${sku}`, status: 'update', diff: data })
        if (apply) await tx.priceBookEntry.update({ where: { id: existing.id }, data })
      } else {
        out.push({ key: `${bookName}:${sku}`, status: 'create', diff: data })
        if (apply) await tx.priceBookEntry.create({ data: { priceBookId: book.id, productId: product.id, ...data } })
      }
    }
  })
  return out
}

export const POST = api({
  roles: ['SUPER_ADMIN','ACCOUNTING'],
  parseJson: true,
  bodySchema: ImportBody,
  rate: { key: 'admin-import', limit: 30 }
})(async ({ json }) => {
  const type = json!.type as 'products'|'customers'|'pricebook'
  const dry = Boolean(json!.dryRun)
  const rows = Array.isArray(json!.rows) ? json!.rows : []
  if (!rows.length) return err('no_rows', 400)
  const apply = !dry

  if (type === 'products') {
    const res = await importProducts(rows, apply)
    return ok({ data: { dryRun: dry, type, results: res } })
  }
  if (type === 'customers') {
    const res = await importCustomers(rows, apply)
    return ok({ data: { dryRun: dry, type, results: res } })
  }
  const res = await importPriceBook(rows, apply)
  return ok({ data: { dryRun: dry, type, results: res } })
})
