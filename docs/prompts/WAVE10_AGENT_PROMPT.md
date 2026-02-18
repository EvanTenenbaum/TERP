# Wave 10 Agent Launch Prompt

## Wave: 10 — Infrastructure & Edge Cases

## Tasks: TER-93, TER-261, TER-262, TER-263, TER-264

---

## Tasks Overview

| Task    | Title                                     | Mode   | Key Files                                                      |
| ------- | ----------------------------------------- | ------ | -------------------------------------------------------------- |
| TER-93  | Deployment health check / deploy parity   | SAFE   | `server/routers/health.ts`, `server/_core/healthCheck.ts`      |
| TER-261 | Data cleanup: 5 LIVE batches with bad qty | RED    | `scripts/migrations/`, `drizzle/schema.ts`                     |
| TER-262 | vendorPayables.create SELECT error        | STRICT | `drizzle/schema.ts:7340`, `server/services/payablesService.ts` |
| TER-263 | storage.createZone INSERT failure         | STRICT | `drizzle/schema-storage.ts`, `server/routers/storage.ts`       |
| TER-264 | tags.create duplicate-check SELECT error  | STRICT | `drizzle/schema.ts:521`, `server/routers/tags.ts`              |

## Execution Order

1. **TER-262 + TER-263 + TER-264** (parallel) — All are mysqlEnum / column naming bugs. No file overlap.
2. **TER-93** — Verification task, independent of all others.
3. **TER-261** — Data cleanup script. Can be written in parallel but requires RED mode approval before execution.

## Key Pattern: mysqlEnum Naming (CRITICAL)

Three of the five tasks (TER-262, TER-263, TER-264) likely involve the same root cause — the first argument to `mysqlEnum()` must match the **actual database column name**, not the enum type name. Read `CLAUDE.md` section on this before starting.

## Verification Protocol

For EACH task, before marking complete:

```bash
pnpm check    # TypeScript
pnpm lint     # ESLint — 0 new errors in modified files
pnpm test     # All tests pass
pnpm build    # Build succeeds
```
