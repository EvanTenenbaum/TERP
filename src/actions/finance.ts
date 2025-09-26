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

export async function applyApPayment(apId: string, amountCents: number) {
  try { requireRole(['SUPER_ADMIN','ACCOUNTING']) } catch { return { success: false, error: 'forbidden' } }
  try {
    const amount = Math.round(amountCents)
    if (amount <= 0) return { success: false, error: 'invalid_amount' }
    const ap = await prisma.accountsPayable.findUnique({ where: { id: apId } })
    if (!ap) return { success: false, error: 'ap_not_found' }
    if (amount > ap.balanceRemaining) return { success: false, error: 'amount_exceeds_balance' }
    await prisma.accountsPayable.update({ where: { id: apId }, data: { balanceRemaining: { decrement: amount } } })
    return { success: true }
  } catch (e) {
    Sentry.captureException(e)
    return { success: false, error: 'failed_apply_ap_payment' }
  }
}

export interface DunningItem { arId: string; invoiceNumber: string; dueDate: string; balanceCents: number }
export interface DunningCustomer { customerId: string; customerName: string; contactEmail?: string | null; totalDueCents: number; items: DunningItem[] }

export async function generateDunningPreview(minDaysOverdue: number = 1) {
  try { requireRole(['SUPER_ADMIN','ACCOUNTING']) } catch { return { success: false, error: 'forbidden', customers: [] as DunningCustomer[] } }
  try {
    const today = new Date()
    const cutoff = new Date(today.getTime() - minDaysOverdue * 86400000)
    const ars = await prisma.accountsReceivable.findMany({
      where: { balanceRemaining: { gt: 0 }, dueDate: { lt: cutoff } },
      include: { customer: true },
      orderBy: { dueDate: 'asc' }
    })
    const map = new Map<string, DunningCustomer>()
    for (const ar of ars) {
      const key = ar.customerId
      const dc = map.get(key) || { customerId: key, customerName: ar.customer?.companyName || 'Unknown', contactEmail: ar.customer?.contactEmail || (typeof ar.customer?.contactInfo === 'object' ? (ar.customer?.contactInfo as any)?.email : undefined), totalDueCents: 0, items: [] }
      dc.items.push({ arId: ar.id, invoiceNumber: ar.invoiceNumber, dueDate: ar.dueDate.toISOString(), balanceCents: ar.balanceRemaining })
      dc.totalDueCents += ar.balanceRemaining
      map.set(key, dc)
    }
    const customers = Array.from(map.values()).sort((a,b)=> b.totalDueCents - a.totalDueCents)
    return { success: true, customers }
  } catch (e) {
    Sentry.captureException(e)
    return { success: false, error: 'failed_generate_dunning', customers: [] as DunningCustomer[] }
  }
}

export async function logDunningToSentry(minDaysOverdue: number = 1) {
  try { requireRole(['SUPER_ADMIN','ACCOUNTING']) } catch { return { success: false, error: 'forbidden' } }
  try {
    const { success, customers } = await generateDunningPreview(minDaysOverdue)
    if (!success) return { success: false, error: 'failed_generate_dunning' }
    const logged: { customerId: string; count: number; totalDueCents: number }[] = []
    for (const c of customers) {
      const subject = `Past Due Notice: ${c.customerName}`
      const lines = c.items.map(i => `• Invoice ${i.invoiceNumber} due ${new Date(i.dueDate).toLocaleDateString()} — $${(i.balanceCents/100).toFixed(2)}`)
      const body = `Dear ${c.customerName},\n\nOur records indicate the following invoices are past due:\n${lines.join('\n')}\n\nTotal due: $${(c.totalDueCents/100).toFixed(2)}\n\nPlease remit payment at your earliest convenience or reply to arrange terms.\n\nThank you.`
      Sentry.captureMessage(`[DUNNING] ${subject}\n${body}`)
      logged.push({ customerId: c.customerId, count: c.items.length, totalDueCents: c.totalDueCents })
    }
    return { success: true, logged }
  } catch (e) {
    Sentry.captureException(e)
    return { success: false, error: 'failed_log_dunning' }
  }
}
