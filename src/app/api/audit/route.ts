import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { api } from '@/lib/api'
import { ok } from '@/lib/http'

export const GET = api({ roles: ['SUPER_ADMIN','ACCOUNTING','READ_ONLY'] })(async ({ req }) => {
  const { searchParams } = new URL(req.url)
  const entityType = searchParams.get('entityType') || undefined
  const entityId = searchParams.get('entityId') || undefined
  const limit = Number(searchParams.get('limit') || '50')

  const [transfers, writeoffs, settlements, rebates, overrides] = await Promise.all([
    prisma.inventoryTransfer.findMany({ where: entityType==='product' && entityId ? { productId: entityId } : undefined, orderBy:{ createdAt:'desc' }, take: limit }),
    prisma.writeOffLedger.findMany({ where: entityType==='lot' && entityId ? { lotId: entityId } : undefined, orderBy:{ createdAt:'desc' }, take: limit }),
    prisma.vendorSettlement.findMany({ where: entityType==='vendor' && entityId ? { vendorId: entityId } : undefined, orderBy:{ createdAt:'desc' }, take: limit }),
    prisma.vendorRebate.findMany({ where: entityType==='vendor' && entityId ? { vendorId: entityId } : undefined, orderBy:{ createdAt:'desc' }, take: limit }),
    prisma.overrideAudit.findMany({ where: entityType==='order' && entityId ? { orderId: entityId } : entityType==='quote' && entityId ? { quoteId: entityId } : undefined, orderBy:{ timestamp:'desc' }, take: limit }),
  ])

  const items: any[] = []
  for (const t of transfers) items.push({ when: t.createdAt, type: 'inventory.transfer', summary: `Transfer ${t.quantity} ${t.sourceLotId} → ${t.destLotId || '-'} for ${t.productId}` })
  for (const w of writeoffs) items.push({ when: w.createdAt, type: 'inventory.writeoff', summary: `Write-off ${w.qty} from lot ${w.lotId} (${w.reason})` })
  for (const s of settlements) items.push({ when: s.createdAt, type: 'ap.settlement', summary: `Vendor settlement ${s.amount} for ${s.vendorId}` })
  for (const r of rebates) items.push({ when: r.createdAt, type: 'ap.rebate', summary: `Vendor rebate ${r.amount} for ${r.vendorId}` })
  for (const o of overrides) items.push({ when: o.timestamp, type: 'override', summary: `Override ${o.oldPrice}→${o.newPrice} (${o.reason})` })

  items.sort((a,b)=> new Date(b.when).getTime() - new Date(a.when).getTime())
  return ok({ data: items.slice(0, limit) })
})
