import { api } from '@/lib/api';
export const dynamic = 'force-dynamic';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const Input = z.object({ csv: z.string().min(1), dryRun: z.boolean().default(true) });

function parseCsv(text: string): any[] {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = lines.slice(1).map(line => {
    const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    const obj: any = {};
    headers.forEach((h, i) => obj[h] = cols[i]);
    return obj;
  });
  return rows;
}

export const POST = api(Input, async ({ csv, dryRun }) => {
  const rows = parseCsv(csv);
  const required = ['scope','sku','unitPriceCents'];
  const errors: string[] = [];
  const ops: any[] = [];
  for (const [i, r] of rows.entries()) {
    for (const f of required) if (!(f in r)) errors.push(`row ${i+1}: missing ${f}`);
    const cents = parseInt(r.unitPriceCents, 10);
    if (!Number.isFinite(cents) || cents < 0) errors.push(`row ${i+1}: invalid unitPriceCents`);
    const scope = String(r.scope || '').toUpperCase();
    if (!['GLOBAL','ROLE','CUSTOMER'].includes(scope)) errors.push(`row ${i+1}: invalid scope`);
    ops.push({ scope, sku: r.sku, unitPriceCents: cents, role: r.role || null, customerCode: r.customerCode || null });
  }
  if (errors.length) return { ok: false, errors };
  if (!dryRun) {
    for (const p of ops) {
      const product = await prisma.product.findUnique({ where: { sku: p.sku } });
      if (!product) throw new Error(`Product not found for sku ${p.sku}`);
      if (p.scope === 'GLOBAL') {
        await prisma.priceBookEntry.upsert({
          where: { productId_scope_customerId_role: { productId: product.id, scope: 'GLOBAL', customerId: null, role: null } } as any,
          create: { productId: product.id, scope: 'GLOBAL', unitPriceCents: p.unitPriceCents },
          update: { unitPriceCents: p.unitPriceCents },
        });
      } else if (p.scope === 'ROLE') {
        await prisma.priceBookEntry.upsert({
          where: { productId_scope_customerId_role: { productId: product.id, scope: 'ROLE', customerId: null, role: p.role } } as any,
          create: { productId: product.id, scope: 'ROLE', role: p.role, unitPriceCents: p.unitPriceCents },
          update: { unitPriceCents: p.unitPriceCents },
        });
      } else if (p.scope === 'CUSTOMER') {
        const cust = await prisma.customer.findUnique({ where: { code: p.customerCode! } });
        if (!cust) throw new Error(`Customer not found ${p.customerCode}`);
        await prisma.priceBookEntry.upsert({
          where: { productId_scope_customerId_role: { productId: product.id, scope: 'CUSTOMER', customerId: cust.id, role: null } } as any,
          create: { productId: product.id, scope: 'CUSTOMER', customerId: cust.id, unitPriceCents: p.unitPriceCents },
          update: { unitPriceCents: p.unitPriceCents },
        });
      }
    }
  }
  return { ok: true, count: ops.length, dryRun };
}, ['SUPER_ADMIN','ACCOUNTING','SALES']);
