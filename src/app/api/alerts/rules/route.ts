import { api } from '@/lib/api'
import prisma from '@/lib/prisma'
import { ok, err } from '@/lib/http'

export const GET = api({ roles: ['SUPER_ADMIN','ACCOUNTING','READ_ONLY'] })(async () => {
  const rules = await prisma.rule.findMany({ orderBy: [{ active: 'desc' }, { priority: 'desc' }, { createdAt: 'desc' }] })
  return ok({ rules })
})

export const POST = api<{ field:string; operator:string; value:string; action:string; priority?:number }>({ roles: ['SUPER_ADMIN','ACCOUNTING'], parseJson: true })(async ({ json }) => {
  const { field, operator, value, action } = json || ({} as any)
  const priority = Number((json as any)?.priority ?? 0) || 0
  if (!field || !operator || value == null || !action) return err('invalid_input', 400)
  const rule = await prisma.rule.create({ data: { field, operator, value, action, priority, active: true } })
  return ok({ rule })
})

export const PATCH = api<{ id:string; active:boolean }>({ roles: ['SUPER_ADMIN','ACCOUNTING'], parseJson: true })(async ({ json }) => {
  const id = String((json as any)?.id || '')
  if (!id) return err('invalid_input', 400)
  const active = Boolean((json as any)?.active)
  const rule = await prisma.rule.update({ where: { id }, data: { active } })
  return ok({ rule })
})

export const DELETE = api<{ id:string }>({ roles: ['SUPER_ADMIN'], parseJson: true })(async ({ json }) => {
  const id = String((json as any)?.id || '')
  if (!id) return err('invalid_input', 400)
  await prisma.rule.delete({ where: { id } })
  return ok({})
})
