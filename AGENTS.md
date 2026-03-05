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

**Workflow:** `PR` → `main` → `staging` (auto) → verify → `production` (manual)

- Staging auto-deploys when code is pushed to `main`
- **Staging URL:** `https://terp-staging-yicld.ondigitalocean.app`
- Production promotion is manual (Evan only)
- To skip staging deploy, add `[skip-staging-sync]` to commit message

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

- Check `docs/ACTIVE_SESSIONS.md` before starting
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

| Document                | Location                                        |
| ----------------------- | ----------------------------------------------- |
| Agent protocol (Claude) | `CLAUDE.md`                                     |
| Known bug patterns      | `.claude/known-bug-patterns.md`                 |
| Production migrations   | `docs/runbooks/PRODUCTION_MIGRATION_RUNBOOK.md` |
| QA verification skill   | `docs/skills/terp-qa/SKILL.md`                  |
| Active sessions         | `docs/ACTIVE_SESSIONS.md`                       |
| Master roadmap          | `docs/roadmaps/MASTER_ROADMAP.md`               |
