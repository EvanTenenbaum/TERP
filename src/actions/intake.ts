'use server'

import prisma from '@/lib/prisma'
import * as Sentry from '@sentry/nextjs'
import { requireRole } from '@/lib/auth'
import { ensurePostingUnlocked } from '@/lib/system'
import { normalizeFlowerProductName } from '@/lib/normalization'

export interface IntakeData {
  retailName: string
  standardStrainName?: string
  category: string
  subcategory?: string
  productType?: string
  unit: string
  unitSize?: string
  defaultPriceCents: number
  vendorCode: string
  vendorCompany?: string
  terms: 'COD' | 'NET' | 'CONSIGNMENT'
  netDays?: number
  dateReceived: Date
  lotNumber: string
  quantity: number
  unitCostCents: number
  notes?: string
  metadata?: Record<string, any>
}

export async function createProductIntake(data: IntakeData) {
  try { requireRole(['SUPER_ADMIN','ACCOUNTING']) } catch { return { success: false, error: 'forbidden' } }
  try { await ensurePostingUnlocked(['SUPER_ADMIN','ACCOUNTING']) } catch { return { success: false, error: 'posting_locked' } }
  try {
    const qty = Math.round(Number(data.quantity))
    const cost = Math.round(Number(data.unitCostCents))
    const price = Math.round(Number(data.defaultPriceCents))
    if (!Number.isFinite(qty) || qty <= 0) return { success: false, error: 'invalid_quantity' }
    if (!Number.isFinite(cost) || cost < 0) return { success: false, error: 'invalid_cost' }
    if (!Number.isFinite(price) || price < 0) return { success: false, error: 'invalid_price' }

    const vendor = await prisma.vendor.upsert({
      where: { vendorCode: data.vendorCode },
      update: { companyName: data.vendorCompany || data.vendorCode },
      create: { vendorCode: data.vendorCode, companyName: data.vendorCompany || data.vendorCode, contactInfo: {} },
    })

    const normalizedName = normalizeFlowerProductName(vendor.vendorCode, data.standardStrainName || data.retailName) || `${vendor.vendorCode} · ${data.retailName}`
    const product = await prisma.product.create({
      data: {
        name: normalizedName.slice(0,128),
        sku: `${vendor.vendorCode}-${Date.now().toString(36)}`.slice(0,64),
        category: data.category,
        unit: data.unit,
        defaultPrice: price,
        retailName: data.retailName,
        standardStrainName: data.standardStrainName || data.retailName,
        customerFacingName: normalizedName.slice(0,128),
      }
    })

    const batch = await prisma.batch.create({
      data: {
        productId: product.id,
        vendorId: vendor.id,
        lotNumber: data.lotNumber.slice(0,64),
        receivedDate: new Date(data.dateReceived),
        quantityReceived: qty,
        quantityAvailable: qty,
        isConsignment: data.terms === 'CONSIGNMENT',
        batchCosts: { create: { effectiveFrom: new Date(data.dateReceived), unitCost: cost } },
      },
      include: { product: true, vendor: true }
    })

    await prisma.inventoryLot.create({ data: { batchId: batch.id, quantityOnHand: qty, quantityAllocated: 0, quantityAvailable: qty, lastMovementDate: new Date() } })

    if (data.terms === 'NET') {
      const days = Math.round(Number(data.netDays || 30))
      const invNumber = `AP-${new Date().getFullYear()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`
      const invoiceDate = new Date(data.dateReceived)
      const dueDate = new Date(invoiceDate.getTime() + days*86400000)
      await prisma.accountsPayable.create({ data: { vendorId: vendor.id, invoiceNumber: invNumber, invoiceDate, dueDate, terms: `Net ${days}`, amount: qty * cost, balanceRemaining: qty * cost } })
    }

    return { success: true, product, batch }
  } catch (e) {
    Sentry.captureException(e)
    return { success: false, error: 'intake_failed' }
  }
}
