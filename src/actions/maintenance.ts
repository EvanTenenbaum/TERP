"use server";

import prisma from '@/lib/prisma'
import * as Sentry from '@sentry/nextjs'
import { requireRole } from '@/lib/auth'

// Recompute quantityAvailable and clamp negatives for all lots
export async function reconcileInventory() {
  try { requireRole(['SUPER_ADMIN']) } catch { return { success: false, error: 'forbidden' } }
  try {
    const lots = await prisma.inventoryLot.findMany({ select: { id: true, quantityOnHand: true, quantityAllocated: true } })
    for (const lot of lots) {
      const available = Math.max(0, lot.quantityOnHand - lot.quantityAllocated)
      await prisma.inventoryLot.update({ where: { id: lot.id }, data: { quantityAvailable: available } })
    }
    return { success: true }
  } catch (e) {
    Sentry.captureException(e)
    return { success: false, error: 'failed_reconcile_inventory' }
  }
}

// Ensure AR balances equal amount - sum(applied)
export async function reconcileAR() {
  try { requireRole(['SUPER_ADMIN','ACCOUNTING']) } catch { return { success: false, error: 'forbidden' } }
  try {
    const ars = await prisma.accountsReceivable.findMany({ select: { id: true, amount: true } })
    for (const ar of ars) {
      const apps = await prisma.paymentApplication.findMany({ where: { arId: ar.id }, select: { appliedAmount: true } })
      const applied = apps.reduce((s, a)=> s + a.appliedAmount, 0)
      const balance = Math.max(0, ar.amount - applied)
      await prisma.accountsReceivable.update({ where: { id: ar.id }, data: { balanceRemaining: balance } })
    }
    return { success: true }
  } catch (e) {
    Sentry.captureException(e)
    return { success: false, error: 'failed_reconcile_ar' }
  }
}
