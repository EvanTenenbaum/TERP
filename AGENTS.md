# TERP — Agent Development Guide

> **For AI Coding Agents:** Read this before making changes. For Claude Code agents, `CLAUDE.md` loads automatically — this file provides supplementary onboarding context for all agent types.

---

## Project Overview

**TERP** is a production ERP system for THCA wholesale cannabis operations. Full-stack TypeScript with 80+ API endpoints, 20+ database tables, and mobile-first responsive design.

**Key policies:** Zero TypeScript errors. Soft deletes only. No `any` types. No `vendors` table (use `clients` with `isSeller=true`).

---

## Tech Stack

| Layer           | Technology                                          |
| --------------- | --------------------------------------------------- |
| Frontend        | React 19, Vite 7, Tailwind CSS 4, shadcn/ui + Radix |
| State           | React Query + tRPC, React Hook Form + Zod           |
| Routing         | Wouter                                              |
| API             | tRPC v11, Express, superjson                        |
| Database        | MySQL 8.0, Drizzle ORM                              |
| Queue           | BullMQ                                              |
| Auth            | Custom JWT (HTTP-only cookies)                      |
| Testing         | Vitest 4 (unit), Playwright (E2E), Argos (visual)   |
| Logging         | Pino (structured)                                   |
| Hosting         | DigitalOcean App Platform                           |
| CI/CD           | GitHub Actions                                      |
| Package Manager | pnpm 10.4.1                                         |

---

## Essential Commands

```bash
# Development
pnpm agent:prepare   # In local worktrees, link shared TERP node_modules and verify local bins
pnpm install          # Install dependencies
pnpm dev              # Start dev server (tsx watch)
pnpm build            # Production build
pnpm start            # Start production server

# Verification (run ALL before every commit)
pnpm check            # TypeScript
pnpm lint             # ESLint
pnpm test             # Unit tests (Vitest)
pnpm build            # Build verification

# Testing
pnpm test:watch       # Watch mode
pnpm test:coverage    # With coverage
pnpm test:e2e         # Playwright E2E
pnpm qa:human:flows -- --count 40 --seed "$(date +%Y%m%d)"   # Seeded confused-human packet for live browser QA

# Database
pnpm db:push          # Generate and run migrations
pnpm seed             # Seed database
pnpm seed:light       # Minimal seed
pnpm seed:full        # Comprehensive seed
```

## Stress Command Contract

- Phrase mapping: **`run stress testing`** means run:
  - `pnpm qa:stress --env=staging --profile=peak`
- Fast confidence variant:
  - `pnpm qa:stress --env=staging --profile=smoke`
- Preflight-only gate:
  - `pnpm qa:stress:preflight --env=staging`
- Stress runs are strict **NO_REPAIR** runs. Do not auto-install or auto-fix infrastructure during execution.

---

## Project Structure

```
TERP/
├── client/src/               # Frontend React app
│   ├── components/           # UI components (shadcn/ui in ui/)
│   ├── pages/                # Route pages
│   ├── hooks/                # Custom React hooks
│   ├── lib/                  # Utilities
│   ├── contexts/             # React contexts
│   └── types/                # TypeScript definitions
├── server/                   # Backend tRPC API
│   ├── _core/                # Core: trpc, context, auth, env
│   ├── routers/              # 80+ tRPC routers
│   ├── services/             # Business logic (new code here)
│   └── db/schema/            # Drizzle schema files
├── drizzle/                  # Schema + migrations
│   ├── schema.ts             # Main MySQL schema
│   └── migrations/           # SQL migration files
├── shared/                   # Shared types and utilities
├── tests-e2e/                # Playwright E2E tests
├── scripts/                  # Automation scripts
└── docs/                     # Documentation
```

---

## Code Conventions

### TypeScript

- **Strict mode** — zero errors enforced
- Components: PascalCase. Hooks: `use` prefix. Utilities: camelCase
- Import aliases: `@/*` → `client/src/*`, `@shared/*` → `shared/*`
- Type exports: `export type User = typeof users.$inferSelect`

### React

- Functional components with hooks only
- React Query for server state, `useState`/`useReducer` for local
- Mobile-first — test at 320px minimum

### Database

- Table/column names: camelCase (match surrounding conventions)
- Soft deletes: all tables have `deletedAt`
- All tables have `createdAt` and `updatedAt`
- `mysqlEnum` first arg MUST match DB column name

### tRPC

- One router per domain/feature
- `protectedProcedure` for authenticated, `adminProcedure` for admin
- All inputs validated with Zod
- Errors via `TRPCError`

### Git

- Conventional Commits: `type(scope): description`
- Types: feat, fix, docs, style, refactor, perf, test, chore
- Always `git pull --rebase origin main` before push

---

## Deployment

**Workflow:** `PR` → `main` (auto-deploy to staging) → verify → `production` (manual)

- As of March 28, 2026, staging tracks `main` directly and auto-deploys when code is pushed to `main`
- **Staging URL:** `https://terp-staging-yicld.ondigitalocean.app`
- Production promotion is manual (Evan only)
- There is no staging-only sync branch or `[skip-staging-sync]` escape hatch in this mode

```bash
# Check deployment status
bash scripts/check-deployment-status.sh $(git rev-parse HEAD | cut -c1-7)
```

---

## Database Access

Database credentials are stored in environment variables, not in source code. See `.env` files or DigitalOcean App Platform settings for connection strings.

- **Staging DB**: Used for all development and testing
- **Production DB**: DO NOT USE unless explicitly instructed for a hotfix
- **SSL**: Always required (`ssl-mode=REQUIRED`)

For production migrations, use temporary App Platform job components — never direct connections. See `docs/runbooks/PRODUCTION_MIGRATION_RUNBOOK.md`.

---

## QA & Verification

Use the **terp-qa** skill (see `docs/skills/terp-qa/SKILL.md`) for comprehensive verification:

1. **Requirements Coverage** — Map acceptance criteria to evidence
2. **Functional Validation** — Run checks, verify UX flows in browser
3. **Blast Radius Review** — List affected modules, run targeted regressions
4. **Adversarial Review** — Try failure paths and edge cases

Task completion requires: commit SHA, PR link, verification outputs, blast radius summary, and browser evidence for UI changes.

---

## Security Rules

- **Actor attribution**: Always use `getAuthenticatedUserId(ctx)`, never `input.createdBy`
- **No `any` types** — use proper types or `unknown`
- **Soft deletes only** — never `db.delete()`
- **No `vendors` table** — use `clients` with `isSeller=true`
- **Never commit `.env` files**
- **Sensitive files** (require explicit approval to modify): `.do/app.yaml`, `Dockerfile`, `drizzle/migrations/`

---

## Parallel Work

- For the Orders runtime initiative, if `pnpm status:orders-runtime:all` has been run recently, use `docs/specs/spreadsheet-native-foundation/orders-runtime/ACTIVE_GATE_STATUS.md` and `PROOF_BUDGET.md` as local generated summaries before `docs/ACTIVE_SESSIONS.md`
- For repeated `TER-795` row verdicts, build truth, packet paths, and next move, use `docs/specs/spreadsheet-native-foundation/orders-runtime/ter-795-state.json` as the machine-readable source of truth before the generated summaries
- Treat `ACTIVE_GATE_STATUS.md`, `PROOF_BUDGET.md`, and `adversarial-review-context.*` as generated views from that state file; the synced gate doc, issue manifest, execution metrics, and Linear remain authoritative for broader gate and tracker status
- Treat `docs/ACTIVE_SESSIONS.md` as a legacy global view, not the source of truth for the active Orders runtime gate
- Never edit files another agent is working on
- Use `git worktree` for parallel branches
- Push frequently after each phase

---

## Roadmap

**Linear** is the source of truth: https://linear.app/terpcorp

| Entity                     | ID                                     |
| -------------------------- | -------------------------------------- |
| Team: Terpcorp             | `d88bb32f-ea0a-4809-aac1-fde6ec81bad3` |
| Project: Golden Flows Beta | `79882db1-0cac-448b-b73c-5dd9307c85c8` |

GitHub backup: `docs/roadmaps/GOLDEN_FLOWS_BETA_ROADMAP.md`

---

## Key Documents

| Document                | Location                                                                                                   |
| ----------------------- | ---------------------------------------------------------------------------------------------------------- |
| Agent protocol (Claude) | `CLAUDE.md`                                                                                                |
| Known bug patterns      | `.claude/known-bug-patterns.md`                                                                            |
| Production migrations   | `docs/runbooks/PRODUCTION_MIGRATION_RUNBOOK.md`                                                            |
| QA verification skill   | `docs/skills/terp-qa/SKILL.md`                                                                             |
| TER-795 state           | `docs/specs/spreadsheet-native-foundation/orders-runtime/ter-795-state.json`                               |
| Orders runtime status   | `docs/specs/spreadsheet-native-foundation/orders-runtime/ACTIVE_GATE_STATUS.md` (generated local snapshot) |
| Orders proof budget     | `docs/specs/spreadsheet-native-foundation/orders-runtime/PROOF_BUDGET.md` (generated advisory snapshot)    |
| Active sessions         | `docs/ACTIVE_SESSIONS.md`                                                                                  |
| Master roadmap          | `docs/roadmaps/MASTER_ROADMAP.md`                                                                          |

<!-- BEGIN BEADS INTEGRATION -->

## Issue Tracking with bd (beads)

**IMPORTANT**: This project uses **bd (beads)** for ALL issue tracking. Do NOT use markdown TODOs, task lists, or other tracking methods.

### Why bd?

- Dependency-aware: Track blockers and relationships between issues
- Git-friendly: Dolt-powered version control with native sync
- Agent-optimized: JSON output, ready work detection, discovered-from links
- Prevents duplicate tracking systems and confusion

### Quick Start

**Check for ready work:**

```bash
bd ready --json
```

**Create new issues:**

```bash
bd create "Issue title" --description="Detailed context" -t bug|feature|task -p 0-4 --json
bd create "Issue title" --description="What this issue is about" -p 1 --deps discovered-from:bd-123 --json
```

**Claim and update:**

```bash
bd update <id> --claim --json
bd update bd-42 --priority 1 --json
```

**Complete work:**

```bash
bd close bd-42 --reason "Completed" --json
```

### Issue Types

- `bug` - Something broken
- `feature` - New functionality
- `task` - Work item (tests, docs, refactoring)
- `epic` - Large feature with subtasks
- `chore` - Maintenance (dependencies, tooling)

### Priorities

- `0` - Critical (security, data loss, broken builds)
- `1` - High (major features, important bugs)
- `2` - Medium (default, nice-to-have)
- `3` - Low (polish, optimization)
- `4` - Backlog (future ideas)

### Workflow for AI Agents

1. **Check ready work**: `bd ready` shows unblocked issues
2. **Claim your task atomically**: `bd update <id> --claim`
3. **Work on it**: Implement, test, document
4. **Discover new work?** Create linked issue:
   - `bd create "Found bug" --description="Details about what was found" -p 1 --deps discovered-from:<parent-id>`
5. **Complete**: `bd close <id> --reason "Done"`

### Auto-Sync

bd automatically syncs via Dolt:

- Each write auto-commits to Dolt history
- Use `bd dolt push`/`bd dolt pull` for remote sync
- No manual export/import needed!

### Important Rules

- ✅ Use bd for ALL task tracking
- ✅ Always use `--json` flag for programmatic use
- ✅ Link discovered work with `discovered-from` dependencies
- ✅ Check `bd ready` before asking "what should I work on?"
- ❌ Do NOT create markdown TODO lists
- ❌ Do NOT use external issue trackers
- ❌ Do NOT duplicate tracking systems

For more details, see README.md and docs/QUICKSTART.md.

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**

- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds

<!-- END BEADS INTEGRATION -->
