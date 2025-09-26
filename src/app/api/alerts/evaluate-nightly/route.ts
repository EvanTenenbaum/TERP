import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import * as Sentry from '@sentry/nextjs'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (process.env.ENABLE_QA_CRONS !== 'true') {
    return NextResponse.json({ ok: false, error: 'disabled' }, { status: 404 })
  }
  try {
    const rules = await prisma.rule.findMany({ where: { active: true }, orderBy: { priority: 'desc' } })
    const conflicts: string[] = []

    for (const rule of rules) {
      // Evaluate minimal fields
      if (rule.field === 'ARDays') {
        const today = new Date()
        const ars = await prisma.accountsReceivable.findMany()
        for (const ar of ars) {
          const days = Math.floor((today.getTime() - new Date(ar.dueDate).getTime())/86400000)
          const target = parseInt(rule.value, 10)
          const match = evalCondition(days, rule.operator, target)
          if (match && rule.action === 'CreateTask') {
            await prisma.reminder.create({ data: { customerId: ar.customerId, dueDate: new Date(), note: `AR overdue ${days} days for ${ar.invoiceNumber}` } })
          }
        }
      }
      // Additional fields could be added here (QtyAvailable, InventoryAge, etc.)
    }

    if (conflicts.length) {
      await prisma.ruleConflict.create({ data: { ruleIds: conflicts.join(',') } })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    Sentry.captureException(e)
    return NextResponse.json({ ok: false, error: 'alerts_failed' }, { status: 500 })
  }
}

function evalCondition(actual: number, op: string, target: number): boolean {
  switch (op) {
    case '>': return actual > target
    case '>=': return actual >= target
    case '<': return actual < target
    case '<=': return actual <= target
    case '==': return actual === target
    case '!=': return actual !== target
    default: return false
  }
}
