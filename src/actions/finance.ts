"use server";
import prisma from '@/lib/prisma'
import * as Sentry from '@sentry/nextjs'
import { requireRole } from '@/lib/auth'
import { ensurePostingUnlocked } from '@/lib/system'

export async function getAccountsReceivable() {
  try {
    await requireRole(['ACCOUNTING','SUPER_ADMIN','READ_ONLY'] as any)
    const rows = await prisma.accountsReceivable.findMany({
      orderBy: { dueDate: 'asc' },
      include: { customer: { include: { party: true } } },
    })
    return { success: true, rows }
  } catch (e) {
    Sentry.captureException(e)
    return { success: false, rows: [] as any[] }
  }
}

export async function getARAging() {
  try {
    await requireRole(['ACCOUNTING','SUPER_ADMIN','READ_ONLY'] as any)
    const rows = await prisma.accountsReceivable.findMany({
      where: { balanceRemaining: { gt: 0 } },
      select: { id: true, dueDate: true, balanceRemaining: true },
    })
    const now = new Date()
    const diffDays = (a: Date, b: Date) => Math.floor((a.getTime() - b.getTime()) / (1000*60*60*24))
    const summary = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 } as Record<string, number>
    for (const r of rows) {
      const days = diffDays(now, r.dueDate)
      if (days <= 30) summary['0-30'] += r.balanceRemaining
      else if (days <= 60) summary['31-60'] += r.balanceRemaining
      else if (days <= 90) summary['61-90'] += r.balanceRemaining
      else summary['90+'] += r.balanceRemaining
    }
    return { success: true, summary }
  } catch (e) {
    Sentry.captureException(e)
    return { success: false, summary: { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 } }
  }
}

export async function getAccountsPayable() {
  try {
    await requireRole(['ACCOUNTING','SUPER_ADMIN','READ_ONLY'] as any)
    const rows = await prisma.accountsPayable.findMany({
      orderBy: { dueDate: 'asc' },
      include: { vendor: { include: { party: true } } },
    })
    return { success: true, rows }
  } catch (e) {
    Sentry.captureException(e)
    return { success: false, rows: [] as any[] }
  }
}

export async function applyApPayment(apId: string, amountCents: number) {
  try {
    await requireRole(['ACCOUNTING','SUPER_ADMIN'] as any)
    await ensurePostingUnlocked()
    const ap = await prisma.accountsPayable.findUnique({ where: { id: apId }, select: { balanceRemaining: true } })
    if (!ap) throw new Error('ap_not_found')
    const apply = Math.max(0, Math.min(amountCents, ap.balanceRemaining))
    if (apply <= 0) return { success: true, appliedCents: 0 }
    await prisma.accountsPayable.update({ where: { id: apId }, data: { balanceRemaining: { decrement: apply } } })
    return { success: true, appliedCents: apply }
  } catch (e) {
    Sentry.captureException(e)
    return { success: false, error: 'failed_apply_ap_payment' }
  }
}

export async function getPayments() {
  try {
    await requireRole(['ACCOUNTING','SUPER_ADMIN','READ_ONLY'] as any)
    const rows = await prisma.payment.findMany({
      orderBy: { paymentDate: 'desc' },
      include: { customer: { include: { party: true } }, paymentApplications: true },
    })
    return { success: true, rows }
  } catch (e) {
    Sentry.captureException(e)
    return { success: false, rows: [] as any[] }
  }
}

export async function createPayment(customerId: string, amountCents: number, method: string, referenceNumber?: string) {
  try {
    await requireRole(['ACCOUNTING','SUPER_ADMIN'] as any)
    await ensurePostingUnlocked()
    if (!customerId || amountCents <= 0) throw new Error('invalid_input')
    const payment = await prisma.payment.create({ data: { customerId, amount: amountCents, paymentMethod: method, referenceNumber: referenceNumber ?? null, paymentDate: new Date() } })
    return { success: true, payment }
  } catch (e) {
    Sentry.captureException(e)
    return { success: false, error: 'failed_create_payment' }
  }
}

export async function applyPayment(paymentId: string, arId: string, appliedAmountCents: number) {
  try {
    await requireRole(['ACCOUNTING','SUPER_ADMIN'] as any)
    await ensurePostingUnlocked()
    const ar = await prisma.accountsReceivable.findUnique({ where: { id: arId }, select: { balanceRemaining: true } })
    if (!ar) throw new Error('ar_not_found')
    const apply = Math.max(0, Math.min(appliedAmountCents, ar.balanceRemaining))
    if (apply <= 0) return { success: true, appliedCents: 0 }
    await prisma.$transaction(async (tx)=>{
      await tx.paymentApplication.create({ data: { paymentId, arId, appliedAmount: apply, applicationDate: new Date() } })
      await tx.accountsReceivable.update({ where: { id: arId }, data: { balanceRemaining: { decrement: apply } } })
    })
    return { success: true, appliedCents: apply }
  } catch (e) {
    Sentry.captureException(e)
    return { success: false, error: 'failed_apply_payment' }
  }
}

export async function applyPaymentFIFO(customerId: string, amountCents: number, method='ach', reference?: string) {
  await requireRole(['ACCOUNTING','SUPER_ADMIN'] as any)
  await ensurePostingUnlocked()
  if (amountCents <= 0) throw new Error('invalid_amount')

  return await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({ data: { customerId, amount: amountCents, paymentMethod: method, referenceNumber: reference ?? null, paymentDate: new Date() } })
    let remaining = amountCents
    const invoices = await tx.accountsReceivable.findMany({ where: { customerId, balanceRemaining: { gt: 0 } }, orderBy: { createdAt: 'asc' }, select: { id: true, balanceRemaining: true } })
    for (const inv of invoices) {
      if (remaining <= 0) break
      const pay = Math.min(remaining, inv.balanceRemaining)
      if (pay > 0) {
        await tx.paymentApplication.create({ data: { paymentId: payment.id, arId: inv.id, appliedAmount: pay, applicationDate: new Date() } })
        await tx.accountsReceivable.update({ where: { id: inv.id }, data: { balanceRemaining: { decrement: pay } } })
        remaining -= pay
      }
    }
    if (remaining > 0) {
      await tx.customerCredit.create({ data: { customerId, amountCents: remaining, balanceCents: remaining, sourcePaymentId: payment.id } })
    }
    return { success: true, paymentId: payment.id, overpayCents: remaining }
  })
}

export async function applyPaymentToOpenInvoicesFIFO(paymentId: string) {
  try {
    await requireRole(['ACCOUNTING','SUPER_ADMIN'] as any)
    await ensurePostingUnlocked()
    const payment = await prisma.payment.findUnique({ where: { id: paymentId }, include: { paymentApplications: true } })
    if (!payment) throw new Error('payment_not_found')
    const applied = payment.paymentApplications.reduce((s, a)=> s + a.appliedAmount, 0)
    let remaining = Math.max(0, payment.amount - applied)
    if (remaining <= 0) return { success: true, appliedCents: 0 }
    await prisma.$transaction(async (tx)=>{
      const invoices = await tx.accountsReceivable.findMany({ where: { customerId: payment.customerId, balanceRemaining: { gt: 0 } }, orderBy: { createdAt: 'asc' }, select: { id: true, balanceRemaining: true } })
      for (const inv of invoices) {
        if (remaining <= 0) break
        const pay = Math.min(remaining, inv.balanceRemaining)
        if (pay > 0) {
          await tx.paymentApplication.create({ data: { paymentId: payment.id, arId: inv.id, appliedAmount: pay, applicationDate: new Date() } })
          await tx.accountsReceivable.update({ where: { id: inv.id }, data: { balanceRemaining: { decrement: pay } } })
          remaining -= pay
        }
      }
      if (remaining > 0) {
        await tx.customerCredit.create({ data: { customerId: payment.customerId, amountCents: remaining, balanceCents: remaining, sourcePaymentId: payment.id } })
      }
    })
    return { success: true }
  } catch (e) {
    Sentry.captureException(e)
    return { success: false, error: 'failed_apply_fifo_existing_payment' }
  }
}

export async function generateDunningPreview(minDaysOverdue: number) {
  try {
    await requireRole(['ACCOUNTING','SUPER_ADMIN','READ_ONLY'] as any)
    const now = new Date()
    const rows = await prisma.accountsReceivable.findMany({
      where: { balanceRemaining: { gt: 0 } },
      include: { customer: { include: { party: true } } },
    })
    const isOver = (due: Date) => Math.floor((now.getTime() - due.getTime())/(1000*60*60*24)) >= minDaysOverdue
    const overdue = rows.filter(r=> isOver(r.dueDate))
    const byCustomer = new Map<string, { customerId: string; customerName: string; totalDueCents: number; items: { arId: string; invoiceNumber: string; dueDate: Date; balanceCents: number }[] }>()
    for (const r of overdue) {
      const key = r.customerId
      const entry = byCustomer.get(key) || { customerId: key, customerName: r.customer?.party?.name || r.customer?.companyName || 'Customer', totalDueCents: 0, items: [] }
      entry.totalDueCents += r.balanceRemaining
      entry.items.push({ arId: r.id, invoiceNumber: r.invoiceNumber, dueDate: r.dueDate, balanceCents: r.balanceRemaining })
      byCustomer.set(key, entry)
    }
    return { success: true, customers: Array.from(byCustomer.values()).sort((a,b)=> b.totalDueCents - a.totalDueCents) }
  } catch (e) {
    Sentry.captureException(e)
    return { success: false, customers: [] as any[] }
  }
}

export async function logDunningToSentry(minDaysOverdue: number) {
  try {
    const { success, customers } = await generateDunningPreview(minDaysOverdue)
    if (!success || customers.length === 0) return { success: true, logged: 0 }
    let count = 0
    for (const c of customers) {
      Sentry.captureMessage(`[DUNNING] Overdue notices for ${c.customerName}`, { level: 'info', extra: { customerId: c.customerId, totalDueCents: c.totalDueCents, items: c.items } } as any)
      count++
    }
    return { success: true, logged: count }
  } catch (e) {
    Sentry.captureException(e)
    return { success: false, error: 'failed_log_dunning' }
  }
}
