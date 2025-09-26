import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth'

export type RuleField = 'InventoryAge' | 'QtyAvailable' | 'ARDays' | 'SalesVolume'
export type RuleOperator = '>' | '<' | '>=' | '<=' | '==' | '!='
export type RuleAction = 'Alert' | 'Flag' | 'CreateTask'

export interface CreateRuleInput {
  field: RuleField
  operator: RuleOperator
  value: string
  action: RuleAction
  priority?: number
}

export async function listRules() {
  const rules = await prisma.rule.findMany({ orderBy: [{ active: 'desc' }, { priority: 'desc' }, { createdAt: 'desc' }] })
  return { success: true, rules }
}

export async function createRule(input: CreateRuleInput) {
  requireRole(['SUPER_ADMIN','ACCOUNTING'])
  const rule = await prisma.rule.create({ data: { field: input.field, operator: input.operator, value: input.value, action: input.action, priority: input.priority ?? 0, active: true } })
  revalidatePath('/alerts')
  return { success: true, rule }
}

export async function setRuleActive(id: string, active: boolean) {
  requireRole(['SUPER_ADMIN','ACCOUNTING'])
  const rule = await prisma.rule.update({ where: { id }, data: { active } })
  revalidatePath('/alerts')
  return { success: true, rule }
}

export async function deleteRule(id: string) {
  requireRole(['SUPER_ADMIN'])
  await prisma.rule.delete({ where: { id } })
  revalidatePath('/alerts')
  return { success: true }
}
