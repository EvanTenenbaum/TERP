import prisma from '@/lib/prisma';

export async function evaluateSpec(spec: any) {
  const entity = spec?.query?.entity;
  const agg = spec?.agg;
  const field = spec?.field;

  if (entity === 'Invoice') {
    if (agg === 'sum' && field === 'balanceCents') {
      const rows = await prisma.invoice.findMany({ select: { balanceCents: true } });
      return { kpi: rows.reduce((a: number, r: any)=> a + (r.balanceCents||0), 0) };
    }
    if (agg === 'count') {
      const c = await prisma.invoice.count();
      return { kpi: c };
    }
  }

  if (entity === 'Order') {
    if (agg === 'sum' && field === 'revenueCents') {
      const rows = await prisma.orderItem.findMany({ select: { unitPriceCents: true, quantity: true } as any });
      const sum = rows.reduce((a:number, r:any)=> a + (r.unitPriceCents||0) * (r.quantity||0), 0);
      return { kpi: sum };
    }
  }

  if (entity === 'Payment') {
    if (agg === 'sum' && field === 'amountCents') {
      const rows = await prisma.payment.findMany({ select: { amountCents: true } as any });
      const sum = rows.reduce((a:number, r:any)=> a + (r.amountCents||0), 0);
      return { kpi: sum };
    }
  }

  if (entity === 'APInvoice') {
    if (agg === 'sum' && field === 'balanceCents') {
      const rows = await prisma.vendorInvoice.findMany({ select: { balanceCents: true } });
      return { kpi: rows.reduce((a: number, r: any)=> a + (r.balanceCents||0), 0) };
    }
  }

  return { data: [] };
}
