import { api } from '@/lib/api'
import prisma from '@/lib/prisma'
import { ok, err } from '@/lib/http'
import { getCurrentUserId } from '@/lib/auth'

export const POST = api({ roles: ['SUPER_ADMIN','ACCOUNTING','SALES'], rate: { key: 'report-duplicate', limit: 30 } })(async ({ params }) => {
  const id = params?.id as string
  const src = await prisma.reportDefinition.findUnique({ where: { id } })
  if (!src) return err('not_found', 404)
  const dup = await prisma.reportDefinition.create({ data: {
    ownerUserId: getCurrentUserId(),
    name: `${src.name} (Copy)`,
    description: src.description,
    domain: src.domain as any,
    spec: src.spec as any,
    presentation: src.presentation as any,
    visibility: 'PRIVATE'
  } as any })
  return ok({ data: { id: dup.id } })
})
