# TERP Agent Protocol

**Version**: 2.0 | **Updated**: 2026-03-04 | **Status**: MANDATORY

TERP is a specialized ERP for THCA wholesale cannabis operations. React 19 + Tailwind 4 + shadcn/ui frontend, tRPC API, MySQL + Drizzle ORM, BullMQ queue, deployed on DigitalOcean App Platform.

## Prime Directive

**Verification over persuasion.** Prove it works through commands and evidence. Never convince yourself something works.

## Startup Contract

Before scanning old docs or commit history for broad orientation, read `docs/agent-context/START_HERE.md`. Confirm freshness in `docs/agent-context/manifest.json`, then use `docs/agent-context/state.json` and `docs/agent-context/work.json` for machine-readable startup truth and remaining-work ordering. Treat `docs/ACTIVE_SESSIONS.md`, `docs/PROJECT_CONTEXT.md`, `docs/TERP_AGENT_INSTRUCTIONS.md`, `docs/ROADMAP_AGENT_GUIDE.md`, and `product-management/START_HERE.md` as legacy/background unless the agent-context bundle tells you otherwise.

## Commands (Run Before Every Commit)

```bash
pnpm agent:prepare   # In local worktrees, link shared TERP node_modules and verify local bins
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

## E2E / Browser Testing

All E2E tests use Playwright. The canonical reference is `docs/TESTING.md`.

```bash
# Deep business logic tests (state machines, financial integrity, edge cases)
pnpm test:e2e:deep           # @deep tagged tests — full admin access
pnpm test:e2e:deep:rbac      # @rbac tagged tests — role permission boundaries
pnpm test:e2e:deep:all       # Both: business logic first, then RBAC
pnpm qa:human:flows -- --count 40 --seed "$(date +%Y%m%d)"

# Other E2E suites
pnpm test:e2e                # All E2E tests
pnpm test:e2e:prod-smoke     # Production smoke
pnpm test:staging-critical   # Staging gate tests
pnpm qa:test:core            # Oracle-based flow tests
```

- **Deep tests** (`tests-e2e/deep/`) are the primary E2E suite for business logic verification. They test tRPC endpoints directly via `trpcQuery`/`trpcMutation` helpers.
- **Execution order**: `@deep` tests run first with admin access, `@rbac` tests run after (uses Playwright project dependencies).
- **When asked to "run E2E tests" or "run browser tests"**, use `pnpm test:e2e:deep:all` for business logic + RBAC, or `pnpm test:e2e` for everything.
- **Do NOT default to** `tests-e2e/ai-generated/` or root-level specs — these are legacy/supplementary. The `deep/` suite is the current standard.

### Running E2E in Sandboxed/Remote Environments

In sandboxed environments (e.g. Claude Code remote), standard DNS may not resolve external hosts.
The `HTTPS_PROXY`/`HTTP_PROXY` env vars route `curl` through a proxy, but Playwright needs extra setup:

1. **DNS**: If `getaddrinfo` fails, resolve via DNS-over-HTTPS and add to `/etc/hosts`:
   ```bash
   IP=$(curl -sk 'https://1.1.1.1/dns-query?name=terp-staging-yicld.ondigitalocean.app' \
     -H 'accept: application/dns-json' | python3 -c 'import sys,json; print(json.load(sys.stdin)["Answer"][0]["data"])')
   echo "$IP terp-staging-yicld.ondigitalocean.app" >> /etc/hosts
   ```
2. **TLS**: Set `NODE_TLS_REJECT_UNAUTHORIZED=0` (proxy TLS certs aren't trusted by default).
3. **Proxy**: The `playwright.config.ts` `getProxyConfig()` auto-reads `HTTPS_PROXY` for browser context.
4. **Run**:
   ```bash
   NODE_TLS_REJECT_UNAUTHORIZED=0 SKIP_E2E_SETUP=1 \
     PLAYWRIGHT_BASE_URL=https://terp-staging-yicld.ondigitalocean.app \
     npx playwright test --project=deep --reporter=list
   ```
5. **No Docker needed** when targeting staging — set `SKIP_E2E_SETUP=1` to bypass local DB setup.

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

`PR` → `main` (auto-deploy to staging) → verify → `production` (manual promote by Evan)

- As of March 28, 2026, staging tracks `main` directly
- Staging URL: `https://terp-staging-yicld.ondigitalocean.app`
- Staging tracks `main` directly, and deploy is automatic on push to `main`
- Production is a manual promotion — agents never deploy to production
- There is no staging-only sync branch or `[skip-staging-sync]` escape hatch in this mode

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
- **terp-domscribe** — Local implementation-time UI inspection using the live TERP browser runtime

Auto-use these TERP skills when the lane is clear:

- Use `architecture` for "where does this live?", auth flow questions, schema/query shape questions, and codebase orientation.
- Use `deprecated-systems` before touching legacy patterns, data-model migrations, `vendors` replacements, actor attribution, or risky old service/db code.
- Use `roadmap-management` for Linear state, issue structure, session lifecycle, estimation, or roadmap/task-status questions.
- Use `verification-protocol` when deciding the right QA gate, proving a done claim, or packaging evidence for completion.
- Use `terp-domscribe` for local UI bugs where rendered browser truth matters more than source inspection.
- Use `terp-long-run-autonomy` when the ask implies unattended execution, a multi-ticket remediation train, supervisor/worker coordination, or duplicate-sensitive parallel work.

## Audit System

Before investigating any bug, check `.claude/known-bug-patterns.md` first. Run audits via:
`/audit:full`, `/audit:schema`, `/audit:inventory`, `/audit:golden-flows`

## Essential References

| File                                                                            | Purpose                                                |
| ------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `docs/roadmaps/MASTER_ROADMAP.md`                                               | Task source of truth (backup to Linear)                |
| `docs/specs/spreadsheet-native-foundation/orders-runtime/ter-795-state.json`    | Machine-readable TER-795 row-status and build snapshot |
| `docs/specs/spreadsheet-native-foundation/orders-runtime/ACTIVE_GATE_STATUS.md` | Generated local Orders runtime gate snapshot           |
| `docs/specs/spreadsheet-native-foundation/orders-runtime/PROOF_BUDGET.md`       | Generated local advisory proof-budget snapshot         |
| `docs/ACTIVE_SESSIONS.md`                                                       | Currently active agent work                            |
| `.claude/known-bug-patterns.md`                                                 | Recurring bug catalog                                  |
| `docs/runbooks/PRODUCTION_MIGRATION_RUNBOOK.md`                                 | Prod migration procedures                              |
| `docs/TESTING.md`                                                               | Testing guide — all test commands & layers             |
