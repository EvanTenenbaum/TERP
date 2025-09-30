import prisma from '@/lib/prisma'

export async function canEmitRule(ruleId: string, entityType?: string, entityId?: string) {
  const rule = await prisma.rule.findUnique({ where: { id: ruleId } })
  if (!rule) return false
  const throttleMinutes = (rule as any).throttleMinutes ?? 60
  const windowStart = new Date(Date.now() - throttleMinutes * 60 * 1000)
  const recent = await prisma.ruleEvent.findFirst({
    where: { ruleId, entityType: entityType ?? null, entityId: entityId ?? null, createdAt: { gt: windowStart } }
  }).catch(() => null)
  return !recent
}

export async function recordRuleEvent(ruleId: string, entityType?: string, entityId?: string) {
  try {
    await prisma.ruleEvent.create({ data: { ruleId, entityType: entityType ?? null, entityId: entityId ?? null } } as any)
  } catch {}
}
