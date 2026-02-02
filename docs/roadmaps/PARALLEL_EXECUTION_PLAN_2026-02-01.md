# Parallel Execution Plan - Feb 1, 2026 (Revised)

**Created:** 2026-02-01
**Revised:** 2026-02-01 (QA review - trimmed scope to verified issues only)
**Purpose:** Fix verified security issues while continuing roadmap execution
**Strategy:** Lean execution - only verified issues, schema-first for actor tracking

---

## QA Review Summary

Original plan had 35 tasks. After verification:

- **4 confirmed critical issues** (Wave 1)
- **1 confirmed soft delete issue** (Wave 2)
- **~30 false positives** - tables lack `createdBy` columns, need schema migration first

---

## Wave 1: Verified Critical Fixes (Est: 2-3h)

| Track | Task    | Description                                 | Verified? | Est |
| ----- | ------- | ------------------------------------------- | --------- | --- |
| 1A    | SEC-042 | Fix `createdBy: 1` in orderService.ts:86    | ✅ YES    | 1h  |
| 1B    | SEC-048 | Remove password from qaAuth.ts:374 response | ✅ YES    | 30m |
| 1C    | SEC-041 | Delete \*.backup files + add to .gitignore  | ✅ YES    | 30m |
| 1D    | SEC-040 | Fix liveShopping.ts:1324 payload→data       | ✅ YES    | 30m |

**Wave 1 Deliverables:**

- [ ] orderService.ts accepts `actorId` parameter instead of hardcoded 1
- [ ] qaAuth.ts `/api/qa-auth/roles` response has no `password` field
- [ ] No `.backup*` files in `server/routers/`
- [ ] `.gitignore` includes `*.backup*` patterns
- [ ] liveShopping.ts:1324 uses `data:` not `payload:`

**Verification:**

```bash
pnpm check && pnpm lint && pnpm test
grep "createdBy: 1" server/services/orderService.ts  # Should be empty
grep "password:" server/_core/qaAuth.ts | grep -v "//"  # Should not be in response
ls server/routers/*.backup* 2>/dev/null  # Should be empty
grep "payload:" server/routers/liveShopping.ts  # Should be empty
```

---

## Wave 2: Verified Soft Delete + Schema Audit (Est: 2h)

| Track | Task      | Description                                              | Verified? | Est |
| ----- | --------- | -------------------------------------------------------- | --------- | --- |
| 2A    | ST-059B-4 | Fix freeformNotesDb.ts hard delete (table HAS deletedAt) | ✅ YES    | 30m |
| 2B    | AUDIT-001 | Audit which tables have deletedAt column                 | Research  | 1h  |
| 2C    | AUDIT-002 | Audit which tables have createdBy column                 | Research  | 1h  |

**Wave 2 Purpose:** Before attempting more fixes, verify schema supports them.

**AUDIT-001 Output:** List of tables with `deletedAt` → can convert to soft delete
**AUDIT-002 Output:** List of tables with `createdBy` → can add actor tracking

---

## Wave 3: Architectural Hardening (Est: 4h)

Based on root cause analysis, prevent future issues:

| Track | Task          | Description                                             | Est |
| ----- | ------------- | ------------------------------------------------------- | --- |
| 3A    | ARCH-SEC-001  | Create `auditedProcedure` with mandatory actorId in ctx | 2h  |
| 3B    | INFRA-SEC-001 | Add hard delete detection to pre-commit hook            | 1h  |
| 3C    | SEC-049       | Remove FORCE_QA_AUTH bypass (security backdoor)         | 30m |
| 3D    | DOCS-002      | Document actor attribution pattern in CLAUDE.md         | 30m |

**ARCH-SEC-001 Pattern:**

```typescript
// server/_core/trpc.ts - Add new procedure type
export const auditedProcedure = protectedProcedure.use(
  async ({ ctx, next }) => {
    const actorId = getAuthenticatedUserId(ctx);
    return next({
      ctx: { ...ctx, actorId }, // Always available, TypeScript enforced
    });
  }
);

// Usage in routers - makes missing actor a compile error
export const myRouter = router({
  create: auditedProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // ctx.actorId is guaranteed to exist
      await db.insert(table).values({ ...input, createdBy: ctx.actorId });
    }),
});
```

**INFRA-SEC-001 Pattern:**

```bash
# .husky/pre-commit addition
echo "Checking for hard delete patterns..."
if grep -rn "db\.delete(" --include="*.ts" server/ | grep -v "\.test\.ts" | grep -v "// ALLOWED"; then
  echo "❌ Hard delete found. Use soft delete or add '// ALLOWED: reason' comment"
  exit 1
fi
```

---

## Wave 4: Roadmap Continuation (Est: 8h)

Run in parallel with Wave 3 (no dependencies):

| Track | Task          | Description                              | Est | Source         |
| ----- | ------------- | ---------------------------------------- | --- | -------------- |
| 4A    | BUG-107       | Fix fallback user ID in salesSheetsDb.ts | 1h  | MASTER_ROADMAP |
| 4B    | BUG-108       | Fix stale Vite HMR cache clearing        | 2h  | MASTER_ROADMAP |
| 4C    | TEST-INFRA-07 | Fix tRPC mock missing useUtils           | 2h  | MASTER_ROADMAP |
| 4D    | INFRA-017     | Migration architecture research          | 4h  | MASTER_ROADMAP |

---

## Wave 5: Schema-Dependent Fixes (AFTER Audit)

**Only proceed after Wave 2 audits complete.**

Based on audit results, create tasks for:

1. Tables WITH `createdBy` → Add actor tracking to routers
2. Tables WITHOUT `createdBy` → Schema migration first, then router updates
3. Tables WITH `deletedAt` → Convert hard deletes to soft deletes
4. Tables WITHOUT `deletedAt` → Schema migration first, then convert

---

## Execution Schedule

```
Wave 1 (Critical Security)     ──→ 2-3h
    │
    └──→ Wave 2 (Audit + 1 Fix) ──→ 2h
              │
              ├──→ Wave 3 (Architecture) ──→ 4h
              │         │
              └──→ Wave 4 (Roadmap) ──→ 8h (parallel with Wave 3)
                        │
                        └──→ Wave 5 (Schema-Dependent) ──→ TBD based on audit
```

**Total Verified Work:** ~16h (vs 48h original estimate)

---

## Success Criteria

**Wave 1 Complete When:**

- [ ] `pnpm check && pnpm test` passes
- [ ] No hardcoded user IDs in orderService.ts
- [ ] No password in qaAuth.ts API response
- [ ] No backup files in server/routers/
- [ ] SSE events use consistent `data:` field

**Wave 3 Complete When:**

- [ ] `auditedProcedure` exists and is documented
- [ ] Pre-commit hook catches `db.delete()` patterns
- [ ] FORCE_QA_AUTH removed from codebase
- [ ] CLAUDE.md updated with actor attribution section

---

## Launch Command

**Start Wave 1 now:**

```
4 parallel agents:
- 1A: SEC-042 (orderService.ts)
- 1B: SEC-048 (qaAuth.ts)
- 1C: SEC-041 (backup files + gitignore)
- 1D: SEC-040 (liveShopping.ts)
```
