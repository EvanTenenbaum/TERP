"use server";

import prisma from '@/lib/prisma';
import * as Sentry from '@sentry/nextjs'
import { requireRole } from '@/lib/auth'
import { revalidatePath } from 'next/cache';

export type B2BSaleType = 'outgoing' | 'incoming'
export type B2BStatus = 'DRAFT' | 'COMMITTED' | 'DEPARTED' | 'ARRIVED' | 'ACCEPTED' | 'REJECTED'

export interface B2BItemInput {
  productId: string
  unitCount: number
  unitPrice: number // cents
  varietyId?: string | null
}

export interface CreateB2BSaleInput {
  type: B2BSaleType
  sourceId: string
  targetId: string
  items: B2BItemInput[]
}

function toInt(n: number) {
  if (typeof n !== 'number' || !isFinite(n)) return 0
  return Math.round(n)
}

function actorMeta() {
  return { actor: 'system' }
}

export async function createB2BSale(input: CreateB2BSaleInput) {
  try { requireRole(['SUPER_ADMIN','SALES']) } catch (e) { return { success: false, error: 'forbidden' } }
  if (!input.items || input.items.length === 0) {
    return { success: false, error: 'items_required' }
  }
  const normalizedItems = input.items.map(i=> ({
    productId: i.productId,
    unitCount: toInt(i.unitCount),
    unitPrice: Math.max(0, toInt(i.unitPrice)),
    varietyId: i.varietyId ?? null,
  })).filter(i=> i.productId && i.unitCount > 0)
  if (normalizedItems.length === 0) {
    return { success: false, error: 'invalid_items' }
  }
  try {
    const sale = await prisma.b2BSale.create({
      data: {
        type: input.type,
        sourceId: input.sourceId,
        targetId: input.targetId,
        status: 'DRAFT',
        itemList: {
          create: normalizedItems,
        },
        events: {
          create: [{ eventType: 'CREATED', data: { ...actorMeta(), type: input.type, sourceId: input.sourceId, targetId: input.targetId } }],
        },
      },
      include: { itemList: true },
    })

    revalidatePath('/b2b/orders')
    return { success: true, sale }
  } catch (e) {
    console.error('createB2BSale error', e)
    Sentry.captureException(e)
    return { success: false, error: 'failed_create_b2b' }
  }
}

export async function listSales() {
  try {
    const sales = await prisma.b2BSale.findMany({
      include: { itemList: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return { success: true, sales }
  } catch (e) {
    console.error('listSales error', e)
    return { success: false, sales: [] }
  }
}

export async function getSale(id: string) {
  try {
    const sale = await prisma.b2BSale.findUnique({
      where: { id },
      include: { itemList: { include: { product: true, inventory: { include: { batch: true } } } } },
    })
    if (!sale) return { success: false, error: 'not_found' }
    return { success: true, sale }
  } catch (e) {
    console.error('getSale error', e)
    return { success: false, error: 'failed_get' }
  }
}

export async function listSaleEvents(b2bSaleId: string) {
  try {
    const events = await prisma.eventLog.findMany({
      where: { b2bSaleId },
      orderBy: { createdAt: 'asc' },
    })
    return { success: true, events }
  } catch (e) {
    console.error('listSaleEvents error', e)
    return { success: false, events: [] }
  }
}



async function allocateForOutgoing(tx: any, saleId: string) {
  const sale = await tx.b2BSale.findUnique({ where: { id: saleId }, include: { itemList: true } })
  if (!sale) throw new Error('not_found')
  if (sale.type !== 'outgoing') return

  const enrichedEvents: any[] = []

  for (const item of sale.itemList) {
    const qty = toInt(item.unitCount)
    if (qty <= 0) continue

    if (item.inventoryId) {
      const { allocateFromSpecificLot } = await import('@/lib/inventoryAllocator')
      const alloc = await allocateFromSpecificLot(tx as any, item.inventoryId, qty)
      enrichedEvents.push({ eventType: 'ALLOCATED', data: { ...actorMeta(), itemId: item.id, allocations: [alloc] } })
      continue
    }

    const { allocateFIFOByProduct } = await import('@/lib/inventoryAllocator')
    const allocations = await allocateFIFOByProduct(tx as any, item.productId, qty)

    if (allocations.length === 0) throw new Error('insufficient_stock')

    // Split item across lots if needed
    const [first, ...rest] = allocations
    await tx.b2BSaleItem.update({ where: { id: item.id }, data: { inventoryId: first.lotId, unitCount: first.qty } })
    for (const a of rest) {
      await tx.b2BSaleItem.create({
        data: {
          b2bSaleId: sale.id,
          productId: item.productId,
          varietyId: item.varietyId,
          unitCount: a.qty,
          unitPrice: item.unitPrice,
          inventoryId: a.lotId,
        },
      })
    }
    enrichedEvents.push({ eventType: 'ALLOCATED', data: { ...actorMeta(), itemId: item.id, allocations } })
  }

  if (enrichedEvents.length > 0) {
    await tx.eventLog.createMany({
      data: enrichedEvents.map((e) => ({ b2bSaleId: sale.id, eventType: e.eventType, data: e.data })),
    })
  }
}

async function departForOutgoing(tx: any, saleId: string) {
  const sale = await tx.b2BSale.findUnique({ where: { id: saleId }, include: { itemList: true } })
  if (!sale) throw new Error('not_found')
  if (sale.type !== 'outgoing') return

  const shipEvents: any[] = []

  for (const item of sale.itemList) {
    const qty = toInt(item.unitCount)
    if (qty <= 0) continue

    let inventoryId = item.inventoryId
    if (!inventoryId) {
      const { allocateFIFOByProduct } = await import('@/lib/inventoryAllocator')
      const allocs = await allocateFIFOByProduct(tx as any, item.productId, qty)
      const [first, ...rest] = allocs
      await tx.b2BSaleItem.update({ where: { id: item.id }, data: { inventoryId: first.lotId, unitCount: first.qty } })
      for (const a of rest) {
        await tx.b2BSaleItem.create({
          data: {
            b2bSaleId: sale.id,
            productId: item.productId,
            varietyId: item.varietyId,
            unitCount: a.qty,
            unitPrice: item.unitPrice,
            inventoryId: a.lotId,
          },
        })
      }
      inventoryId = first.lotId
      shipEvents.push({ eventType: 'ALLOCATE_ON_DEPART', data: { ...actorMeta(), itemId: item.id, allocations: allocs } })
    }

    const now = new Date()
    const { shipAllocated } = await import('@/lib/inventoryAllocator')
    await shipAllocated(tx as any, inventoryId, qty)

    const lot = await tx.inventoryLot.findUnique({ where: { id: inventoryId }, select: { batchId: true } })
    const { getActiveBatchCostDb } = await import('@/lib/cogs')
    const active = lot?.batchId ? await getActiveBatchCostDb(tx as any, lot.batchId, now) : null
    const unitCost: number | null = active?.unitCost ?? null

    shipEvents.push({ eventType: 'DEPARTED_ITEM', data: { ...actorMeta(), itemId: item.id, inventoryId, qty, unitCost } })
  }

  if (shipEvents.length > 0) {
    await tx.eventLog.createMany({ data: shipEvents.map((e) => ({ b2bSaleId: sale.id, eventType: e.eventType, data: e.data })) })
  }
}

async function acceptForIncoming(tx: any, saleId: string) {
  const sale = await tx.b2BSale.findUnique({ where: { id: saleId }, include: { itemList: true } })
  if (!sale) throw new Error('not_found')
  if (sale.type !== 'incoming') return

  const now = new Date()
  let idx = 0
  const receiveEvents: any[] = []

  for (const item of sale.itemList) {
    const qty = toInt(item.unitCount)
    if (qty <= 0) continue

    if (item.inventoryId) continue

    const lotNumber = `B2B-${sale.id}-${++idx}`
    const batch = await tx.batch.create({
      data: {
        productId: item.productId,
        vendorId: sale.sourceId,
        lotNumber,
        receivedDate: now,
        quantityReceived: qty,
        quantityAvailable: qty,
        batchCosts: {
          create: {
            effectiveFrom: now,
            unitCost: toInt(item.unitPrice),
          },
        },
      },
    })

    const inventory = await tx.inventoryLot.create({
      data: {
        batchId: batch.id,
        quantityOnHand: qty,
        quantityAllocated: 0,
        quantityAvailable: qty,
        lastMovementDate: now,
        varietyId: item.varietyId || undefined,
      },
    })

    await tx.b2BSaleItem.update({ where: { id: item.id }, data: { inventoryId: inventory.id } })
    receiveEvents.push({ eventType: 'RECEIVED_ITEM', data: { ...actorMeta(), itemId: item.id, batchId: batch.id, inventoryId: inventory.id, qty, unitCost: toInt(item.unitPrice) } })
  }

  if (receiveEvents.length > 0) {
    await tx.eventLog.createMany({ data: receiveEvents.map((e) => ({ b2bSaleId: sale.id, eventType: e.eventType, data: e.data })) })
  }
}

export async function updateSaleStatus(id: string, status: B2BStatus) {
  try { requireRole(['SUPER_ADMIN','SALES']) } catch (e) { return { success: false, error: 'forbidden' } }
  try {
    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.b2BSale.findUnique({ where: { id } })
      if (!current) throw new Error('not_found')
      if (current.status === status) return current

      if (status === 'COMMITTED') {
        await allocateForOutgoing(tx, id)
      }
      if (status === 'DEPARTED') {
        await departForOutgoing(tx, id)
      }
      if (status === 'ACCEPTED') {
        await acceptForIncoming(tx, id)
      }

      const updated = await tx.b2BSale.update({
        where: { id },
        data: {
          status,
          departAt: status === 'DEPARTED' ? new Date() : current.departAt,
          arriveAt: status === 'ARRIVED' || status === 'ACCEPTED' ? new Date() : current.arriveAt,
          events: { create: [{ eventType: `STATUS_${status}`, data: { ...actorMeta(), from: current.status, to: status } }] },
        },
        include: { itemList: true },
      })

      if (status === 'DEPARTED' && updated.type === 'outgoing') {
        const total = updated.itemList.reduce((s, it)=> s + toInt(it.unitPrice)*toInt(it.unitCount), 0)
        const arCount = await tx.accountsReceivable.count()
        const invoiceNumber = `B2B-AR-${new Date().getFullYear()}-${String(arCount + 1).padStart(5,'0')}`
        const invoiceDate = new Date()
        const dueDate = new Date(invoiceDate.getTime() + 30*24*60*60*1000)
        await tx.accountsReceivable.create({
          data: {
            customerId: updated.targetId,
            orderId: null,
            invoiceNumber,
            invoiceDate,
            dueDate,
            amount: total,
            balanceRemaining: total,
          },
        })
        await tx.eventLog.create({ data: { b2bSaleId: updated.id, eventType: 'AR_CREATED', data: { ...actorMeta(), invoiceNumber, total } } })
      }

      if (status === 'ACCEPTED' && updated.type === 'incoming') {
        const total = updated.itemList.reduce((s, it)=> s + toInt(it.unitPrice)*toInt(it.unitCount), 0)
        const apCount = await tx.accountsPayable.count()
        const invoiceNumber = `B2B-AP-${new Date().getFullYear()}-${String(apCount + 1).padStart(5,'0')}`
        const invoiceDate = new Date()
        const dueDate = new Date(invoiceDate.getTime() + 30*24*60*60*1000)
        await tx.accountsPayable.create({
          data: {
            vendorId: updated.sourceId,
            invoiceNumber,
            invoiceDate,
            dueDate,
            amount: total,
            balanceRemaining: total,
          },
        })
        await tx.eventLog.create({ data: { b2bSaleId: updated.id, eventType: 'AP_CREATED', data: { ...actorMeta(), invoiceNumber, total } } })
      }

      return updated
    })

    revalidatePath('/b2b/orders')
    revalidatePath(`/b2b/orders/${id}`)
    return { success: true, sale: result }
  } catch (e) {
    console.error('updateSaleStatus error', e)
    Sentry.captureException(e)
    const msg = (e as Error).message === 'insufficient_stock' || (e as Error).message === 'insufficient_allocated' ? (e as Error).message : 'failed_update_status'
    return { success: false, error: msg }
  }
}
