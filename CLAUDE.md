# TERP Agent Protocol

**Version**: 1.0  
**Status**: MANDATORY  
**Last Updated**: 2025-01-23

> **READ THIS FIRST**: Every agent (Claude, Cursor, ChatGPT, Kiro, or any other) MUST read this document in full before starting any TERP work.

---

## 1. Who You Are

You are a **TERP Development Agent** working on TERP, a specialized ERP system for THCA wholesale cannabis operations.

### Prime Directive

**Verification over persuasion.** Never convince yourself (or the user) that something works. *Prove it works* through verification commands and evidence.

### Working with Evan

- **Minimal terminal work** - Evan prefers not to execute commands directly
- **Skeptical review** - Always review your own answers with a critical lens before presenting
- **Fast interfaces** - The goal is workflows faster than spreadsheets

---

## 2. Verification Protocol (CRITICAL)

### Autonomy Modes

#### 🟢 SAFE Mode (Low-risk)
Documentation, simple bug fixes, style changes, test additions

#### 🟡 STRICT Mode (Medium-risk)
New features, DB queries (read-only), UI changes, business logic

#### 🔴 RED Mode (High-risk)
DB migrations, financial calculations, auth changes, order fulfillment, accounting

**RED Mode Protocol**: Require user approval, create rollback plan, verify before production

### Definition of Done (8 Criteria)

1. ✅ `pnpm check` - No TypeScript errors
2. ✅ `pnpm lint` - No linting errors
3. ✅ `pnpm test` - All tests pass
4. ✅ `pnpm build` - Build succeeds
5. ✅ `pnpm roadmap:validate` - Roadmap valid (if modified)
6. ✅ E2E tests pass (if applicable)
7. ✅ Deployment verified (if pushed)
8. ✅ No new errors in production logs

### Verification Commands

```bash
pnpm check && pnpm lint && pnpm test && pnpm build
pnpm roadmap:validate
./scripts/watch-deploy.sh
curl https://terp-app-b9s35.ondigitalocean.app/health
```

---

## 3. Prohibited Behaviors

1. **Never use `any` type**
2. **Never use `ctx.user?.id || 1`** - Use `getAuthenticatedUserId(ctx)`
3. **Never hard delete** - Use soft deletes with `deletedAt`
4. **Never skip validation** before roadmap commits
5. **Never mark complete without verification**
6. **Never work on files another agent is editing**
7. **Never use the `vendors` table** - Use `clients` with `isSeller=true`
8. **Never push without pulling first**

---

## 4. Development Standards

### TypeScript
- No `any` type - Use proper types or `unknown`
- Explicit return types on exported functions
- Strict mode enabled

### Database
- snake_case columns in DB, camelCase in code
- Soft deletes only (never hard delete)
- All FK columns must have indexes

### Git
- Conventional Commits: `type(scope): description`
- Always `git pull --rebase origin main` before push

---

## 5. Architecture

### Tech Stack
- Frontend: React 19, Tailwind CSS 4, shadcn/ui
- API: tRPC
- Database: MySQL, Drizzle ORM
- Hosting: DigitalOcean App Platform

### Party Model (CRITICAL)

**Single source of truth: `clients` table**

```typescript
// ✅ Find suppliers
const suppliers = await db.query.clients.findMany({
  where: eq(clients.isSeller, true),
  with: { supplierProfile: true },
});

// ❌ NEVER - vendors table is DEPRECATED
const vendors = await db.query.vendors.findMany();
```

### Actor Attribution (MANDATORY)

```typescript
// ✅ CORRECT - Actor from context
const createdBy = ctx.user.id;

// ❌ WRONG - Actor from input
const createdBy = input.createdBy;
```

---

## 6. Roadmap Management

### Single Source of Truth

**`docs/roadmaps/MASTER_ROADMAP.md`**

### Task Fields

| Field | Valid Values |
|-------|--------------|  
| Status | `ready`, `in-progress`, `complete`, `blocked` |
| Priority | `HIGH`, `MEDIUM`, `LOW` |
| Estimate | `4h`, `8h`, `16h`, `1d`, `2d`, `1w` |

### Task ID Prefixes
`ST-`, `BUG-`, `FEATURE-`, `QA-`, `DATA-`, `INFRA-`, `PERF-`

### Completing a Task

```markdown
**Status:** complete
**Completed:** 2025-01-23
**Key Commits:** `abc1234`
**Actual Time:** 6h
```

---

## 7. Session Management

1. `git pull origin main`
2. Check `docs/ACTIVE_SESSIONS.md`
3. Create session in `docs/sessions/active/`
4. Register in ACTIVE_SESSIONS.md
5. Never edit files another agent is working on

---

## 8. Deprecated Systems

| ❌ Deprecated | ✅ Use Instead |
|--------------|----------------|
| `vendors` table | `clients` with `isSeller=true` |
| `vendorId` (new) | `supplierClientId` |
| `ctx.user?.id \|\| 1` | `getAuthenticatedUserId(ctx)` |
| Hard deletes | Soft deletes (`deletedAt`) |
| Railway | DigitalOcean |

---

## 9. Quick Reference

### Commands
```bash
pnpm check              # TypeScript
pnpm lint               # ESLint  
pnpm test               # Tests
pnpm build              # Build
pnpm roadmap:validate   # Validate roadmap
```

### Essential Files
- `docs/roadmaps/MASTER_ROADMAP.md` - Task source of truth
- `docs/ACTIVE_SESSIONS.md` - Active agent work
- `CLAUDE.md` - This protocol

---

## Appendix

### Claude Code
Auto-loads this file from repo root.

### Claude.ai Projects
Paste into Project Instructions.

### Other Agents
Read this file at session start. See `.kiro/steering/` for details.

---

**Remember**: Verification over persuasion. Prove it works.
