import prisma from '@/lib/prisma'

export type DiscountRuleRow = { type: 'PERCENT' | 'FIXED'; value: number; exclusive: boolean }

export async function applicableDiscounts(params: { productId: string; category?: string | null; customerId?: string | null; at?: Date }) {
  const at = params.at ?? new Date()
  const where: any = {
    active: true,
    OR: [
      { scope: 'PRODUCT', productId: params.productId },
      { scope: 'CATEGORY', category: params.category || '' },
      { scope: 'CUSTOMER', customerId: params.customerId || '' },
    ],
  }
  const rules = await prisma.discountRule.findMany({ where }).catch(() => [] as any[])
  return rules.filter((r: any) => (!r.effectiveFrom || r.effectiveFrom <= at) && (!r.effectiveTo || r.effectiveTo >= at))
    .map((r: any) => ({ type: String(r.type).toUpperCase() as 'PERCENT'|'FIXED', value: Number(r.value), exclusive: Boolean(r.exclusive) }))
}

export function applyDiscounts(unitPriceCents: number, rules: DiscountRuleRow[]) {
  if (!rules.length) return unitPriceCents
  const exclusive = rules.find(r => r.exclusive)
  if (exclusive) return applyOne(unitPriceCents, exclusive)
  let price = unitPriceCents
  for (const r of rules) price = applyOne(price, r)
  return Math.max(price, 0)
}

function applyOne(price: number, r: DiscountRuleRow) {
  if (r.type === 'FIXED') return Math.max(price - r.value, 0)
  if (r.type === 'PERCENT') return Math.floor(price * (1 - r.value / 10000))
  return price
}
