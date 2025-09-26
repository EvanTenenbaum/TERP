import prisma from '@/lib/prisma'
import { getCurrentUserId } from '@/lib/auth'
import { ensurePostingUnlocked } from '@/lib/system'
import { api } from '@/lib/api'
import { ok, err } from '@/lib/http'

function parseAmountCents(v: any) {
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n)) throw new Error('invalid_amount')
  return Math.round(n * 100)
}

export const POST = api<{ vendorId:string; basis:string; amount:number; notes?:string; appliedToApId?:string }>({
  roles: ['ACCOUNTING','SUPER_ADMIN'],
  postingLock: true,
  rate: { key: 'vendor-rebate', limit: 60 },
  parseJson: true,
  onError: (e) => {
    const msg = e?.message
    if (msg && msg.startsWith('invalid_')) return { code: msg, status: 400 }
    return undefined
  }
})(async ({ json }) => {
  const vendorId = String(json!.vendorId || '')
  const basis = String(json!.basis || '')
  const notes = json!.notes ? String(json!.notes) : undefined
  const appliedToApId = json!.appliedToApId ? String(json!.appliedToApId) : undefined
  if (!vendorId || !basis) return err('missing_fields', 400)

  const amount = parseAmountCents(json!.amount)
  const userId = getCurrentUserId()

  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } })
  if (!vendor) return err('vendor_not_found', 404)

  if (appliedToApId) {
    const ap = await prisma.accountsPayable.findUnique({ where: { id: appliedToApId } })
    if (!ap) return err('ap_not_found', 404)
    if (ap.vendorId !== vendorId) return err('ap_vendor_mismatch', 400)
  }

  const r = await prisma.$transaction(async (tx) => {
    const rebate = await tx.vendorRebate.create({ data: { vendorId, basis, amount, notes, appliedToApId, createdBy: userId } })
    if (appliedToApId) await tx.accountsPayable.update({ where: { id: appliedToApId }, data: { balanceRemaining: { decrement: amount } } })
    return rebate
  })

  return ok({ rebate: r })
})
