import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import * as Sentry from '@sentry/nextjs'

export const dynamic = 'force-dynamic'

export async function GET() {
  const fixes: string[] = []
  const errors: string[] = []
  try {
    // Fix InventoryLot availability mismatches
    const lots = await prisma.inventoryLot.findMany()
    for (const lot of lots) {
      const expected = Math.max(0, lot.quantityOnHand - lot.quantityAllocated)
      if (expected !== lot.quantityAvailable) {
        await prisma.inventoryLot.update({ where: { id: lot.id }, data: { quantityAvailable: expected, lastMovementDate: new Date() } })
        fixes.push(`lot:${lot.id}:quantityAvailable ${lot.quantityAvailable}→${expected}`)
      }
    }

    // Detect duplicate batches by (productId,vendorId,lotNumber)
    const dups = await prisma.$queryRaw<{productid:string,vendorid:string,lotnumber:string,count:bigint}[]>`
      SELECT product_id as productId, vendor_id as vendorId, lot_number as lotNumber, COUNT(*)::bigint as count
      FROM batches
      GROUP BY product_id, vendor_id, lot_number
      HAVING COUNT(*) > 1
    `
    for (const d of dups) {
      errors.push(`duplicate_batch:${d.productid}:${d.vendorid}:${d.lotnumber}:${String(d.count)}`)
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

    return NextResponse.json({ ok: true, fixes, errors, postingLocked: errors.length > 10 })
  } catch (e) {
    Sentry.captureException(e)
    return NextResponse.json({ ok: false, error: 'self_heal_failed' }, { status: 500 })
  }
}
