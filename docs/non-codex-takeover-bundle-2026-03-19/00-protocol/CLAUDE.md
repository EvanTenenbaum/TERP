# TERP Agent Protocol

**Version**: 2.0 | **Updated**: 2026-03-04 | **Status**: MANDATORY

TERP is a specialized ERP for THCA wholesale cannabis operations. React 19 + Tailwind 4 + shadcn/ui frontend, tRPC API, MySQL + Drizzle ORM, BullMQ queue, deployed on DigitalOcean App Platform.

## Prime Directive

**Verification over persuasion.** Prove it works through commands and evidence. Never convince yourself something works.

## Commands (Run Before Every Commit)

```bash
pnpm check          # TypeScript (zero errors policy)
pnpm lint           # ESLint
pnpm test           # Unit tests (Vitest)
pnpm build          # Production build
```

## Stress Command Contract

- Phrase mapping: **`run stress testing`** means:
  - `pnpm qa:stress --env=staging --profile=peak`
- Smoke gate:
  - `pnpm qa:stress --env=staging --profile=smoke`
- Preflight-only gate:
  - `pnpm qa:stress:preflight --env=staging`
- Stress runs are strict **NO_REPAIR** runs: no automatic infrastructure repair during test execution.

## Forbidden Patterns (CI-Enforced)

```typescript
ctx.user?.id || 1          // BLOCKED — use getAuthenticatedUserId(ctx)
ctx.user?.id ?? 1          // BLOCKED — use getAuthenticatedUserId(ctx)
input.createdBy            // BLOCKED — never trust client-provided actor
input.userId               // BLOCKED — never trust client-provided actor
: any                      // BLOCKED — use proper types or unknown
db.delete(                 // FLAGGED — use soft deletes with deletedAt
db.query.vendors           // BLOCKED — use clients with isSeller=true
```

## Party Model (Critical)

All business entities live in `clients` table. Suppliers: `isSeller=true` + `supplier_profiles`. Customers: `isBuyer=true`. The `vendors` table is **DEPRECATED** — never use it.

## Actor Attribution

All mutations MUST use `getAuthenticatedUserId(ctx)` — never `input.createdBy`, never `ctx.user?.id || 1`.

## Database Conventions

- **Soft deletes only** — add `deletedAt`, never hard delete
- **Column naming** — match surrounding table (mostly camelCase, some legacy snake_case)
- **mysqlEnum** — first argument MUST match the DB column name, not the TypeScript variable name
- **Migrations** — Drizzle Kit only, never manual SQL

## Git

- **Commits**: `type(scope): description` — types: feat, fix, docs, style, refactor, perf, test, chore
- **Branches**: feature branches, PR to main
- **Always**: `git pull --rebase origin main` before push

## Deployment

`PR` → `main` → `staging` (auto-deploy) → verify → `production` (manual promote by Evan)

- Staging URL: `https://terp-staging-yicld.ondigitalocean.app`
- Staging deploy is automatic on push to `main`
- Production is a manual promotion — agents never deploy to production
- Add `[skip-staging-sync]` to commit message to merge docs without triggering deploy

## Autonomy Modes

- **SAFE** (green): Docs, style, test additions — standard verification
- **STRICT** (yellow): Features, UI, business logic — full verification each step
- **RED**: Auth, accounting, migrations, inventory valuation — requires Evan's approval + rollback plan

## Key Directories

```
client/src/components/    # UI components (shadcn/ui)
client/src/pages/         # Route pages
server/routers/           # tRPC routers (80+)
server/services/          # Business logic (new code here)
server/db/schema/         # Drizzle schema files
server/*Db.ts             # Legacy data access (don't extend)
```

## Working with Evan

- Minimal terminal work — Evan prefers not to execute commands directly
- No jargon without explanation
- Fast interfaces — faster than spreadsheets, not "glorified spreadsheets"

## Parallel Work

- Use `isolation: worktree` for parallel subagents
- For 5+ independent file changes, consider `/batch`
- For the Orders runtime initiative, if `pnpm status:orders-runtime:all` has been run recently, use `docs/specs/spreadsheet-native-foundation/orders-runtime/ACTIVE_GATE_STATUS.md` and `PROOF_BUDGET.md` as local generated summaries before `docs/ACTIVE_SESSIONS.md`
- For repeated `TER-795` row verdicts, build truth, packet paths, and next move, use `docs/specs/spreadsheet-native-foundation/orders-runtime/ter-795-state.json` as the machine-readable source of truth before the generated summaries
- Treat `ACTIVE_GATE_STATUS.md`, `PROOF_BUDGET.md`, and `adversarial-review-context.*` as generated views from that state file; the synced gate doc, issue manifest, execution metrics, and Linear remain authoritative for broader gate and tracker status
- Treat `docs/ACTIVE_SESSIONS.md` as a legacy global view, not the live Orders runtime gate snapshot
- Never edit files another agent is working on

## Skills & Deep Protocols

Domain knowledge is loaded on demand via `.claude/skills/`. Key skills:

- **verification-protocol** — Full 12-criteria DoD, V4 QA gate, output template
- **architecture** — Full tech stack, auth flow, query patterns, key files
- **roadmap-management** — Linear integration, task IDs, estimation, session lifecycle
- **deprecated-systems** — Migration status, replacement patterns, pre-work checklist

## Audit System

Before investigating any bug, check `.claude/known-bug-patterns.md` first. Run audits via:
`/audit:full`, `/audit:schema`, `/audit:inventory`, `/audit:golden-flows`

## Essential References

| File                                            | Purpose                                    |
| ----------------------------------------------- | ------------------------------------------ |
| `docs/roadmaps/MASTER_ROADMAP.md`               | Task source of truth (backup to Linear)    |
| `docs/specs/spreadsheet-native-foundation/orders-runtime/ter-795-state.json` | Machine-readable TER-795 row-status and build snapshot |
| `docs/specs/spreadsheet-native-foundation/orders-runtime/ACTIVE_GATE_STATUS.md` | Generated local Orders runtime gate snapshot |
| `docs/specs/spreadsheet-native-foundation/orders-runtime/PROOF_BUDGET.md` | Generated local advisory proof-budget snapshot |
| `docs/ACTIVE_SESSIONS.md`                       | Currently active agent work                |
| `.claude/known-bug-patterns.md`                 | Recurring bug catalog                      |
| `docs/runbooks/PRODUCTION_MIGRATION_RUNBOOK.md` | Prod migration procedures                  |
| `docs/TESTING.md`                               | Testing guide — all test commands & layers |
