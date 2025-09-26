"use server";

import prisma from '@/lib/prisma'
import * as Sentry from '@sentry/nextjs'
import { requireRole } from '@/lib/auth'

export async function getAccountsReceivable() {
  try {
    const rows = await prisma.accountsReceivable.findMany({
      include: { customer: true, paymentApplications: { include: { payment: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return { success: true, rows }
  } catch (e) {
    Sentry.captureException(e)
    return { success: false, rows: [] }
  }
}

export async function getAccountsPayable() {
  try {
    const rows = await prisma.accountsPayable.findMany({ include: { vendor: true }, orderBy: { createdAt: 'desc' } })
    return { success: true, rows }
  } catch (e) {
    Sentry.captureException(e)
    return { success: false, rows: [] }
  }
}

export async function getPayments() {
  try {
    const rows = await prisma.payment.findMany({ include: { customer: true, paymentApplications: { include: { ar: true } } }, orderBy: { createdAt: 'desc' } })
    return { success: true, rows }
  } catch (e) {
    Sentry.captureException(e)
    return { success: false, rows: [] }
  }
}

export async function getARAging() {
  try {
    const ars = await prisma.accountsReceivable.findMany({ include: { customer: true } })
    const today = new Date()
    const buckets = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 } as Record<string, number>
    const perCustomer: Record<string, { name: string, buckets: Record<string, number> }> = {}
    for (const ar of ars) {
      const days = Math.floor((today.getTime() - new Date(ar.invoiceDate).getTime()) / 86400000)
      const key = days <= 30 ? '0-30' : days <= 60 ? '31-60' : days <= 90 ? '61-90' : '90+'
      buckets[key] += ar.balanceRemaining
      const cid = ar.customerId
      if (!perCustomer[cid]) perCustomer[cid] = { name: ar.customer?.companyName || 'Unknown', buckets: { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 } }
      perCustomer[cid].buckets[key] += ar.balanceRemaining
    }
    return { success: true, summary: buckets, perCustomer }
  } catch (e) {
    Sentry.captureException(e)
    return { success: false, summary: { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 }, perCustomer: {} }
  }
}

export async function createPayment(customerId: string, amountCents: number, paymentMethod: string, referenceNumber?: string) {
  try { requireRole(['SUPER_ADMIN','ACCOUNTING']) } catch { return { success: false, error: 'forbidden' } }
  try {
    const p = await prisma.payment.create({ data: { customerId, amount: Math.round(amountCents), paymentMethod, referenceNumber } })
    return { success: true, payment: p }
  } catch (e) {
    Sentry.captureException(e)
    return { success: false, error: 'failed_create_payment' }
  }
}

export async function applyPayment(paymentId: string, arId: string, appliedAmountCents: number) {
  try { requireRole(['SUPER_ADMIN','ACCOUNTING']) } catch { return { success: false, error: 'forbidden' } }
  try {
    const result = await prisma.$transaction(async (tx) => {
      const ar = await tx.accountsReceivable.findUnique({ where: { id: arId } })
      if (!ar) throw new Error('ar_not_found')
      const amount = Math.round(appliedAmountCents)
      if (amount <= 0 || amount > ar.balanceRemaining) throw new Error('invalid_amount')

      const app = await tx.paymentApplication.create({ data: { paymentId, arId, appliedAmount: amount, applicationDate: new Date() } })
      await tx.accountsReceivable.update({ where: { id: arId }, data: { balanceRemaining: { decrement: amount } } })
      return app
    })
    return { success: true, application: result }
  } catch (e) {
    Sentry.captureException(e)
    return { success: false, error: 'failed_apply_payment' }
  }
}
