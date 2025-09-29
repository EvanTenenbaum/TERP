'use server'

import prisma from '@/lib/prisma'

export type ActivityItem = {
  ts: string
  type: 'ORDER' | 'AR_INVOICE' | 'AR_PAYMENT' | 'AP_INVOICE' | 'AP_PAYMENT' | 'SETTLEMENT' | 'CONSIGNMENT' | 'NOTE'
  refId?: string
  label: string
  amountCents?: number
}

export type ClientProfile = {
  party: { id: string; name: string; isActive: boolean; isCustomer: boolean; isVendor: boolean }
  customer?: {
    id: string
    creditLimitCents?: number | null
    paymentTerms?: string | null
    arOpenCents: number
    arStats: { openCount: number; avgDaysLate: number | null }
    ordersRecent: Array<{ id: string; orderDate: string; status: string; totalCents: number }>
    priceBooksCount: number
  }
  vendor?: {
    id: string
    apOpenCents: number
    apNextDue?: string | null
    consignOnHand: Array<{ productId: string; sku?: string | null; name: string; qty: number; estValueCents: number; days: number }>
    settlementsRecent: Array<{ id: string; periodStart: string; periodEnd: string; amountCents: number }>
  }
  quick: {
    lastActivityAt?: string
    topProductsBought?: Array<{ productId: string; name: string; totalCents: number }>
    topProductsSupplied?: Array<{ productId: string; name: string; totalCents: number }>
    arOpenCents: number
    apOpenCents: number
    consignValueCents: number
  }
  activity: ActivityItem[]
}

export async function getClientProfile(partyId: string): Promise<ClientProfile> {
  const party = await prisma.party.findUnique({
    where: { id: partyId },
    include: {
      customers: { select: { id: true, creditLimit: true, paymentTerms: true, isActive: true } },
      vendors:   { select: { id: true, isActive: true } },
    },
  })
  if (!party) throw new Error('Party not found')

  const customerId = party.customers?.[0]?.id ?? null
  const vendorId   = party.vendors?.[0]?.id ?? null

  // ---------------- Customer / AR ----------------
  let customer: ClientProfile['customer'] | undefined
  let arOpenCents = 0
  let arOpenCount = 0
  let avgDaysLate: number | null = null
  let ordersRecent: ClientProfile['customer']['ordersRecent'] = []
  let priceBooksCount = 0

  if (customerId) {
    const [openAr, arAll, recentOrders, priceBooks] = await Promise.all([
      prisma.accountsReceivable.findMany({
        where: { customerId, balanceRemaining: { gt: 0 } },
        select: { balanceRemaining: true, dueDate: true },
      }),
      prisma.accountsReceivable.findMany({
        where: { customerId },
        select: { dueDate: true, balanceRemaining: true },
        orderBy: { dueDate: 'asc' },
      }),
      prisma.order.findMany({
        where: { customerId },
        take: 5,
        orderBy: { orderDate: 'desc' },
        select: { id: true, orderDate: true, status: true, totalAmount: true },
      }),
      prisma.priceBook.count({ where: { customerId } }).catch(() => 0),
    ])

    arOpenCents = openAr.reduce((a, r) => a + (r.balanceRemaining ?? 0), 0)
    arOpenCount = openAr.length

    if (arAll.length) {
      const now = new Date()
      const lates = arAll
        .filter((r) => (r.balanceRemaining ?? 0) > 0)
        .map((r) => {
          const due = r.dueDate ? new Date(r.dueDate) : null
          if (!due) return 0
          const diff = Math.floor((+now - +due) / 86_400_000)
          return diff > 0 ? diff : 0
        })
        .filter((d) => d > 0)
      avgDaysLate = lates.length ? Math.round(lates.reduce((a, b) => a + b, 0) / lates.length) : 0
    }

    ordersRecent = recentOrders.map((o) => ({
      id: o.id,
      orderDate: o.orderDate?.toISOString() ?? '',
      status: o.status,
      totalCents: o.totalAmount ?? 0,
    }))

    priceBooksCount = priceBooks

    customer = {
      id: customerId,
      creditLimitCents: party.customers?.[0]?.creditLimit ?? null,
      paymentTerms: party.customers?.[0]?.paymentTerms ?? null,
      arOpenCents,
      arStats: { openCount: arOpenCount, avgDaysLate },
      ordersRecent,
      priceBooksCount,
    }
  }

  // ---------------- Vendor / AP / Consignment ----------------
  let vendor: ClientProfile['vendor'] | undefined
  let apOpenCents = 0
  let apNextDue: string | null = null
  let consignOnHand: ClientProfile['vendor']['consignOnHand'] = []
  let settlementsRecent: ClientProfile['vendor']['settlementsRecent'] = []

  if (vendorId) {
    const [openAp, recentSettlements] = await Promise.all([
      prisma.accountsPayable.findMany({
        where: { vendorId, balanceRemaining: { gt: 0 } },
        orderBy: { dueDate: 'asc' },
        select: { balanceRemaining: true, dueDate: true },
      }),
      prisma.vendorSettlement.findMany({
        where: { vendorId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, periodStart: true, periodEnd: true, amount: true },
      }),
    ])

    apOpenCents = openAp.reduce((a, r) => a + (r.balanceRemaining ?? 0), 0)
    apNextDue = openAp[0]?.dueDate?.toISOString() ?? null

    const consignBatches = await prisma.batch.findMany({
      where: { vendorId, isConsignment: true },
      select: {
        productId: true,
        product: { select: { name: true, sku: true } },
        quantityAvailable: true,
        createdAt: true,
      },
    })

    consignOnHand = consignBatches.map((b) => {
      const days = Math.max(0, Math.floor((Date.now() - +b.createdAt) / 86_400_000))
      const estValueCents = 0 // integrate BatchCost if available
      return {
        productId: b.productId,
        sku: b.product?.sku ?? null,
        name: b.product?.name ?? 'Product',
        qty: b.quantityAvailable ?? 0,
        estValueCents,
        days,
      }
    })

    settlementsRecent = recentSettlements.map((s) => ({
      id: s.id,
      periodStart: s.periodStart?.toISOString() ?? '',
      periodEnd: s.periodEnd?.toISOString() ?? '',
      amountCents: s.amount ?? 0,
    }))

    vendor = { id: vendorId, apOpenCents, apNextDue, consignOnHand, settlementsRecent }
  }

  // ---------------- Activity ----------------
  const acts: ActivityItem[] = []
  if (customerId) {
    const [orders, ar, arp] = await Promise.all([
      prisma.order.findMany({
        where: { customerId },
        orderBy: { orderDate: 'desc' },
        take: 10,
        select: { id: true, orderDate: true, totalAmount: true, status: true },
      }),
      prisma.accountsReceivable.findMany({
        where: { customerId },
        orderBy: { invoiceDate: 'desc' },
        take: 10,
        select: { id: true, invoiceDate: true, amount: true },
      }),
      prisma.payment.findMany({
        where: { customerId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, createdAt: true, amount: true },
      }),
    ])
    orders.forEach((o) => acts.push({ ts: o.orderDate?.toISOString() ?? '', type: 'ORDER', refId: o.id, label: `Order ${o.id} (${o.status})`, amountCents: o.totalAmount ?? 0 }))
    ar.forEach((i) => acts.push({ ts: i.invoiceDate?.toISOString() ?? '', type: 'AR_INVOICE', refId: i.id, label: `AR Invoice ${i.id}`, amountCents: i.amount ?? 0 }))
    arp.forEach((p) => acts.push({ ts: p.createdAt?.toISOString() ?? '', type: 'AR_PAYMENT', refId: p.id, label: `AR Payment ${p.id}`, amountCents: p.amount ?? 0 }))
  }
  if (vendorId) {
    const [ap, settlements, vnotes] = await Promise.all([
      prisma.accountsPayable.findMany({
        where: { vendorId },
        orderBy: { invoiceDate: 'desc' },
        take: 10,
        select: { id: true, invoiceDate: true, amount: true },
      }),
      prisma.vendorSettlement.findMany({
        where: { vendorId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, createdAt: true, amount: true },
      }),
      prisma.crmNote.findMany({
        where: { vendorId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, createdAt: true, noteType: true },
      }),
    ])
    ap.forEach((i) => acts.push({ ts: i.invoiceDate?.toISOString() ?? '', type: 'AP_INVOICE', refId: i.id, label: `AP Invoice ${i.id}`, amountCents: i.amount ?? 0 }))
    settlements.forEach((s) => acts.push({ ts: s.createdAt?.toISOString() ?? '', type: 'SETTLEMENT', refId: s.id, label: `Vendor Settlement ${s.id}`, amountCents: s.amount ?? 0 }))
    vnotes.forEach((n) => acts.push({ ts: n.createdAt?.toISOString() ?? '', type: 'NOTE', refId: n.id, label: `Note (${n.noteType})` }))
  }
  acts.sort((a, b) => (a.ts > b.ts ? -1 : 1))
  const lastActivityAt = acts[0]?.ts

  const consignValueCents = consignOnHand.reduce((a, c) => a + c.estValueCents, 0)

  return {
    party: {
      id: party.id,
      name: party.name,
      isActive: party.isActive ?? true,
      isCustomer: !!customerId,
      isVendor: !!vendorId,
    },
    customer,
    vendor,
    quick: {
      lastActivityAt,
      topProductsBought: [],
      topProductsSupplied: [],
      arOpenCents,
      apOpenCents,
      consignValueCents,
    },
    activity: acts.slice(0, 50),
  }
}
