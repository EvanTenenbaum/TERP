import prisma from '@/lib/prisma'
import * as Sentry from '@sentry/nextjs'
import { invalidateInventorySummaryCache } from '@/lib/inventoryCache'

export async function runSelfHeal() {
  const fixes: string[] = []
  const errors: string[] = []
  // Fix InventoryLot availability mismatches
  const lots = await prisma.inventoryLot.findMany()
  for (const lot of lots) {
    const expected = Math.max(0, lot.quantityOnHand - lot.quantityAllocated)
    if (expected !== lot.quantityAvailable) {
      await prisma.inventoryLot.update({ where: { id: lot.id }, data: { quantityAvailable: expected, lastMovementDate: new Date() } })
      fixes.push(`lot:${lot.id}:quantityAvailable ${lot.quantityAvailable}→${expected}`)
    }
  }

  // Detect duplicate batches via groupBy
  try {
    const groups: any[] = await (prisma as any).batch.groupBy({
      by: ['productId','vendorId','lotNumber'],
      _count: { _all: true },
      having: { _count: { _all: { gt: 1 } } },
    })
    for (const g of groups) {
      errors.push(`duplicate_batch:${g.productId}:${g.vendorId}:${g.lotNumber}:${g._count?._all ?? 0}`)
    }
  } catch (e) {
    Sentry.captureException(e)
  }

  // Release expired reservations
  const exps = await prisma.reservation.findMany({ where: { releasedAt: null, expiresAt: { lt: new Date() } } })
  for (const r of exps) {
    const lot = await prisma.inventoryLot.findFirst({ where: { batchId: r.batchId! } })
    if (lot) {
      await prisma.inventoryLot.update({ where: { id: lot.id }, data: { quantityAllocated: { decrement: r.qty }, quantityAvailable: { increment: r.qty }, lastMovementDate: new Date() } })
      await prisma.reservation.update({ where: { id: r.id }, data: { releasedAt: new Date() } })
      fixes.push(`reservation:${r.id}:released`)
    }
  }

  // Normalize small negative balances on AR/AP (<=1 cent)
  const ars = await prisma.accountsReceivable.findMany({ where: { balanceRemaining: { lt: 0 } } })
  for (const ar of ars) {
    if (ar.balanceRemaining >= -1) {
      await prisma.accountsReceivable.update({ where: { id: ar.id }, data: { balanceRemaining: 0 } })
      fixes.push(`ar:${ar.id}:balanceRemaining ${ar.balanceRemaining}→0`)
    } else {
      errors.push(`ar:${ar.id}:negative_balance:${ar.balanceRemaining}`)
    }
  }
  const aps = await prisma.accountsPayable.findMany({ where: { balanceRemaining: { lt: 0 } } })
  for (const ap of aps) {
    if (ap.balanceRemaining >= -1) {
      await prisma.accountsPayable.update({ where: { id: ap.id }, data: { balanceRemaining: 0 } })
      fixes.push(`ap:${ap.id}:balanceRemaining ${ap.balanceRemaining}→0`)
    } else {
      errors.push(`ap:${ap.id}:negative_balance:${ap.balanceRemaining}`)
    }
  }

  // Engage posting lock if too many errors
  if (errors.length > 10) {
    await prisma.systemStatus.upsert({
      where: { id: 'singleton' },
      update: { postingLocked: true, lastReason: `QA errors: ${errors.length}` },
      create: { id: 'singleton', postingLocked: true, lastReason: `QA errors: ${errors.length}` },
    })
    Sentry.captureMessage(`[QA] Posting locked due to ${errors.length} unresolved errors`)
  } else {
    await prisma.systemStatus.upsert({
      where: { id: 'singleton' },
      update: { postingLocked: false, lastReason: null },
      create: { id: 'singleton', postingLocked: false },
    })
  }

  // Inventory quantities may have changed; refresh cache
  invalidateInventorySummaryCache()

  return { fixes, errors, postingLocked: errors.length > 10 }
}
