import prisma from '@/lib/prisma'
import { api } from '@/lib/api'
import { ok, err } from '@/lib/http'

export const PATCH = api<{ archived: boolean }>({
  roles: ['SUPER_ADMIN'],
  postingLock: true,
  rate: { key: 'attachments-archive', limit: 60 },
  parseJson: true,
})(async ({ json, params }) => {
  const archived = !!json!.archived
  const id = params?.id || ''
  if (!id) return err('bad_request', 400)
  const att = await prisma.attachment.update({ where: { id }, data: { archived } })
  return ok({ attachment: att })
})
