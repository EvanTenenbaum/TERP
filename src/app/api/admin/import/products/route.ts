import { api } from '@/lib/api';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const Input = z.object({
  csv: z.string().min(1), // raw CSV string
  dryRun: z.boolean().default(true),
});

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
  const required = ['sku','name','defaultUnitPriceCents','abcClass'];
  const errors: string[] = [];
  const ops: any[] = [];
  for (const [i, r] of rows.entries()) {
    for (const f of required) if (!(f in r)) errors.push(`row ${i+1}: missing ${f}`);
    const cents = parseInt(r.defaultUnitPriceCents, 10);
    if (!Number.isFinite(cents) || cents < 0) errors.push(`row ${i+1}: invalid defaultUnitPriceCents`);
    const abc = String(r.abcClass || '').toUpperCase();
    if (!['A','B','C'].includes(abc)) errors.push(`row ${i+1}: invalid abcClass`);
    ops.push({ sku: r.sku, name: r.name, defaultUnitPriceCents: cents, abcClass: abc as any });
  }
  if (errors.length) return { ok: false, errors };
  if (!dryRun) {
    for (const p of ops) {
      await prisma.product.upsert({ where: { sku: p.sku }, create: p, update: { name: p.name, defaultUnitPriceCents: p.defaultUnitPriceCents, abcClass: p.abcClass } });
    }
  }
  return { ok: true, count: ops.length, dryRun };
}, ['SUPER_ADMIN','ACCOUNTING']);
