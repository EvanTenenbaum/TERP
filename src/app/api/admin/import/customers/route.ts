import { api } from '@/lib/api';
export const dynamic = 'force-dynamic';
import { z } from 'zod';
import prisma from '@/lib/prisma';

const Input = z.object({ csv: z.string().min(1), dryRun: z.boolean().default(true) });

function parseCsv(text: string): any[] {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const headers = lines[0]!.split(',').map(h => h.trim());
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
  const required = ['code','name','termsDays'];
  const errors: string[] = [];
  const ops: any[] = [];
  for (const [i, r] of rows.entries()) {
    for (const f of required) if (!(f in r)) errors.push(`row ${i+1}: missing ${f}`);
    const terms = parseInt(r.termsDays, 10);
    if (!Number.isFinite(terms) || terms < 0) errors.push(`row ${i+1}: invalid termsDays`);
    ops.push({ code: r.code, name: r.name, termsDays: terms });
  }
  if (errors.length) return { ok: false, errors };
  if (!dryRun) {
    for (const c of ops) {
      await prisma.customer.upsert({ where: { code: c.code }, create: c, update: { name: c.name, termsDays: c.termsDays } });
    }
  }
  return { ok: true, count: ops.length, dryRun };
}, ['SUPER_ADMIN','ACCOUNTING']);
