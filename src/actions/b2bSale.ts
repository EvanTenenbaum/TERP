"use server";

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export type B2BSaleType = 'outgoing' | 'incoming'
export type B2BStatus = 'DRAFT' | 'COMMITTED' | 'DEPARTED' | 'ARRIVED' | 'ACCEPTED' | 'REJECTED'

export interface B2BItemInput {
  productId: string
  unitCount: number
  unitPrice: number
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

export async function createB2BSale(input: CreateB2BSaleInput) {
  if (!input.items || input.items.length === 0) {
    return { success: false, error: 'items_required' }
  }
  try {
    const sale = await prisma.b2BSale.create({
      data: {
        type: input.type,
        sourceId: input.sourceId,
        targetId: input.targetId,
        status: 'DRAFT',
        itemList: {
          create: input.items.map((it) => ({
            productId: it.productId,
            unitCount: it.unitCount,
            unitPrice: it.unitPrice,
            varietyId: it.varietyId ?? null,
          })),
        },
        events: {
          create: [{ eventType: 'CREATED', data: { type: input.type, sourceId: input.sourceId, targetId: input.targetId } }],
        },
      },
      include: { itemList: true },
    })

    revalidatePath('/b2b/orders')
    return { success: true, sale }
  } catch (e) {
    console.error('createB2BSale error', e)
    return { success: false, error: 'failed_create_b2b' }
  }
}

export async function listSales() {
  try {
    const sales = await prisma.b2BSale.findMany({
      include: { itemList: true },
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
      include: { itemList: true },
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

async function allocateForOutgoing(tx: typeof prisma, saleId: string) {
  const sale = await tx.b2BSale.findUnique({ where: { id: saleId }, include: { itemList: true } })
  if (!sale) throw new Error('not_found')
  if (sale.type !== 'outgoing') return

  const now = new Date()
  for (const item of sale.itemList) {
    const qty = toInt(item.unitCount)
    if (qty <= 0) continue

    // If already linked to an inventory lot, just allocate against it
    if (item.inventoryId) {
      await tx.inventoryLot.update({
        where: { id: item.inventoryId },
        data: {
          quantityAllocated: { increment: qty },
          quantityAvailable: { decrement: qty },
          lastMovementDate: now,
        },
      })
      continue
    }

    // Find FIFO lot for this product with sufficient available quantity
    const batch = await tx.batch.findFirst({
      where: {
        productId: item.productId,
        inventoryLot: { quantityAvailable: { gte: qty } },
      },
      orderBy: { receivedDate: 'asc' },
      include: { inventoryLot: true },
    })

    if (!batch || !batch.inventoryLot) throw new Error('insufficient_stock')

    await tx.inventoryLot.update({
      where: { id: batch.inventoryLot.id },
      data: {
        quantityAllocated: { increment: qty },
        quantityAvailable: { decrement: qty },
        lastMovementDate: now,
      },
    })

    await tx.b2BSaleItem.update({
      where: { id: item.id },
      data: { inventoryId: batch.inventoryLot.id },
    })
  }
}

async function departForOutgoing(tx: typeof prisma, saleId: string) {
  const sale = await tx.b2BSale.findUnique({ where: { id: saleId }, include: { itemList: true } })
  if (!sale) throw new Error('not_found')
  if (sale.type !== 'outgoing') return

  const now = new Date()
  for (const item of sale.itemList) {
    const qty = toInt(item.unitCount)
    if (qty <= 0) continue

    // Ensure inventory is allocated
    let inventoryId = item.inventoryId
    if (!inventoryId) {
      const batch = await tx.batch.findFirst({
        where: { productId: item.productId, inventoryLot: { quantityAvailable: { gte: qty } } },
        orderBy: { receivedDate: 'asc' },
        include: { inventoryLot: true },
      })
      if (!batch || !batch.inventoryLot) throw new Error('insufficient_stock')
      inventoryId = batch.inventoryLot.id
      await tx.b2BSaleItem.update({ where: { id: item.id }, data: { inventoryId } })
      await tx.inventoryLot.update({
        where: { id: inventoryId },
        data: {
          quantityAllocated: { increment: qty },
          quantityAvailable: { decrement: qty },
          lastMovementDate: now,
        },
      })
    }

    // Ship: decrease on hand and allocated
    await tx.inventoryLot.update({
      where: { id: inventoryId },
      data: {
        quantityOnHand: { decrement: qty },
        quantityAllocated: { decrement: qty },
        lastMovementDate: now,
      },
    })
  }
}

async function acceptForIncoming(tx: typeof prisma, saleId: string) {
  const sale = await tx.b2BSale.findUnique({ where: { id: saleId }, include: { itemList: true } })
  if (!sale) throw new Error('not_found')
  if (sale.type !== 'incoming') return

  const now = new Date()
  let idx = 0
  for (const item of sale.itemList) {
    const qty = toInt(item.unitCount)
    if (qty <= 0) continue

    // If already created inventory for this item, skip
    if (item.inventoryId) continue

    // Create a batch and inventory lot for received goods
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
  }
}

export async function updateSaleStatus(id: string, status: B2BStatus) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.b2BSale.findUnique({ where: { id } })
      if (!current) throw new Error('not_found')
      if (current.status === status) return current

      // Side-effects per transition
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
          events: { create: [{ eventType: `STATUS_${status}`, data: { from: current.status, to: status } }] },
        },
        include: { itemList: true },
      })

      return updated
    })

    revalidatePath('/b2b/orders')
    revalidatePath(`/b2b/orders/${id}`)
    return { success: true, sale: result }
  } catch (e) {
    console.error('updateSaleStatus error', e)
    const msg = (e as Error).message === 'insufficient_stock' ? 'insufficient_stock' : 'failed_update_status'
    return { success: false, error: msg }
  }
}
