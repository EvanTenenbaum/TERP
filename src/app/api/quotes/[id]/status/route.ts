import prisma from '@/lib/prisma'
import * as Sentry from '@sentry/nextjs'
import { api } from '@/lib/api'
import { ok, err } from '@/lib/http'

export const PUT = api<{ status: 'DRAFT'|'SENT'|'ACCEPTED'|'EXPIRED'|'CANCELLED' }>({
  roles: ['SUPER_ADMIN','SALES'],
  postingLock: true,
  rate: { key: 'quotes-status', limit: 120 },
  parseJson: true,
})(async ({ json, params }) => {
  const { status: newStatus } = json || ({} as any)
  if (!['DRAFT','SENT','ACCEPTED','EXPIRED','CANCELLED'].includes(newStatus as any)) return err('invalid_status', 400)
  try {
    const quote = await prisma.salesQuote.update({ where: { id: params!.id }, data: { status: newStatus } })
    return ok({ quote })
  } catch (errAny) {
    Sentry.captureException(errAny)
    return err('failed', 500)
  }
})
