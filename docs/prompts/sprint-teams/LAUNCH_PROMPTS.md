# Sprint Team Launch Prompts

Copy and paste the appropriate prompt to launch each Claude agent.

---

## Team A: Core Stability

```
You are Sprint Team A for the TERP parallel sprint execution.

## MANDATORY: Read These Files First (In Order)

1. `/CLAUDE.md` - Master agent protocol (READ COMPLETELY)
2. `/docs/prompts/sprint-teams/TEAM_A_CORE_STABILITY.md` - Your full task list
3. `/docs/roadmaps/PARALLEL_SPRINT_TEAMS_2026-01-25.md` - Overall strategy
4. `/docs/ACTIVE_SESSIONS.md` - Check for conflicts

## Your Mission

Fix critical stability issues: TypeScript errors, failing tests, security issues.

## Your Branch

`claude/sprint-team-a-stability`

## Your Owned Files (Only modify these)

- `server/*.ts` (core modules, EXCLUDING server/routers/*)
- `client/src/hooks/**/*.ts`
- `server/accountingHooks.ts`
- `vitest.config.ts`, `vitest.setup.ts`

## DO NOT MODIFY (Other teams own these)

- `server/routers/*.ts` (Team C)
- `client/src/pages/*.tsx` (Team B)
- `scripts/seed/**` (Team D)
- `drizzle/**` (Team D)
- `client/src/components/work-surface/**` (Team E)

## Verification (Run before EVERY commit)

```bash
pnpm check && pnpm lint && pnpm test && pnpm build
```

## Definition of Done

All 8 criteria from CLAUDE.md must pass. When complete, create PR to:
`staging/integration-sprint-2026-01` (NOT main)

## Start Now

1. Read the files listed above
2. Create session file in `/docs/sessions/active/`
3. Create your branch and start with P0 tasks
4. Work through tasks in priority order
```

---

## Team B: Frontend UX

```
You are Sprint Team B for the TERP parallel sprint execution.

## MANDATORY: Read These Files First (In Order)

1. `/CLAUDE.md` - Master agent protocol (READ COMPLETELY)
2. `/docs/prompts/sprint-teams/TEAM_B_FRONTEND_UX.md` - Your full task list
3. `/docs/roadmaps/PARALLEL_SPRINT_TEAMS_2026-01-25.md` - Overall strategy
4. `/docs/ACTIVE_SESSIONS.md` - Check for conflicts

## Your Mission

Frontend UX improvements: navigation accessibility, page implementations, UI fixes.

## Your Branch

`claude/sprint-team-b-frontend`

## Your Owned Files (Only modify these)

- `client/src/config/navigation.ts`
- `client/src/components/CommandPalette.tsx`
- `client/src/pages/*.tsx` (pages only, NOT work surfaces)
- `client/src/components/dashboard/widgets-v2/**`
- `client/src/App.tsx` (routing only)

## DO NOT MODIFY (Other teams own these)

- `server/**` (Teams A, C)
- `client/src/components/work-surface/**` (Team E)
- `scripts/seed/**` (Team D)
- `client/src/hooks/**` (Team A)

## Verification (Run before EVERY commit)

```bash
pnpm check && pnpm lint && pnpm test && pnpm build
```

## Definition of Done

All 8 criteria from CLAUDE.md must pass. When complete, create PR to:
`staging/integration-sprint-2026-01` (NOT main)

## Start Now

1. Read the files listed above
2. Create session file in `/docs/sessions/active/`
3. Create your branch and start with navigation tasks (quick wins)
4. Work through tasks in priority order
```

---

## Team C: Backend API

```
You are Sprint Team C for the TERP parallel sprint execution.

## MANDATORY: Read These Files First (In Order)

1. `/CLAUDE.md` - Master agent protocol (READ COMPLETELY)
2. `/docs/prompts/sprint-teams/TEAM_C_BACKEND_API.md` - Your full task list
3. `/docs/roadmaps/PARALLEL_SPRINT_TEAMS_2026-01-25.md` - Overall strategy
4. `/docs/ACTIVE_SESSIONS.md` - Check for conflicts

## Your Mission

Backend API implementations: router fixes, service layer, endpoint implementations.

## Your Branch

`claude/sprint-team-c-backend`

## Your Owned Files (Only modify these)

- `server/routers/*.ts`
- `server/services/*.ts` (EXCLUDING accountingHooks.ts)
- `server/*Db.ts`
- `server/services/live-shopping/**`
- `server/services/liveCatalogService.ts`

## DO NOT MODIFY (Other teams own these)

- `client/src/**` (Team B)
- `server/accountingHooks.ts` (Team A)
- `drizzle/**` (Team D)
- `scripts/seed/**` (Team D)
- `server/_core/**` (Team E)

## Verification (Run before EVERY commit)

```bash
pnpm check && pnpm lint && pnpm test && pnpm build
```

## Definition of Done

All 8 criteria from CLAUDE.md must pass. When complete, create PR to:
`staging/integration-sprint-2026-01` (NOT main)

## Start Now

1. Read the files listed above
2. Create session file in `/docs/sessions/active/`
3. Create your branch and start with P1 API tasks
4. Work through tasks in priority order
```

---

## Team D: Data & Schema

```
You are Sprint Team D for the TERP parallel sprint execution.

## MANDATORY: Read These Files First (In Order)

1. `/CLAUDE.md` - Master agent protocol (READ COMPLETELY)
2. `/docs/prompts/sprint-teams/TEAM_D_DATA_SCHEMA.md` - Your full task list
3. `/docs/roadmaps/PARALLEL_SPRINT_TEAMS_2026-01-25.md` - Overall strategy
4. `/docs/ACTIVE_SESSIONS.md` - Check for conflicts

## Your Mission

Database schema, migrations, and seed data. CRITICAL: SEC-023 (credential rotation) is your FIRST task.

## Your Branch

`claude/sprint-team-d-data`

## Your Owned Files (Only modify these)

- `drizzle/**`
- `server/db/schema.ts`
- `scripts/seed/**`
- Migration files

## DO NOT MODIFY (Other teams own these)

- `server/routers/**` (Team C)
- `client/src/**` (Team B)
- `server/accountingHooks.ts` (Team A)
- `server/_core/**` (Team E)

## CRITICAL FIRST TASK

SEC-023: Rotate exposed database credentials in `drizzle/migrations/0007_DEPLOYMENT_INSTRUCTIONS.md`
This is a P0 security blocker. Do this BEFORE any other work.

## Verification (Run before EVERY commit)

```bash
pnpm check && pnpm lint && pnpm test && pnpm build
pnpm validate:schema
```

## Definition of Done

All 8 criteria from CLAUDE.md must pass. When complete, create PR to:
`staging/integration-sprint-2026-01` (NOT main)

## Start Now

1. Read the files listed above
2. Create session file in `/docs/sessions/active/`
3. Create your branch and START WITH SEC-023 (credential rotation)
4. Then work through seeding tasks in priority order
```

---

## Team E: Integration & Work Surfaces

```
You are Sprint Team E for the TERP parallel sprint execution.

## MANDATORY: Read These Files First (In Order)

1. `/CLAUDE.md` - Master agent protocol (READ COMPLETELY)
2. `/docs/prompts/sprint-teams/TEAM_E_INTEGRATION.md` - Your full task list
3. `/docs/roadmaps/PARALLEL_SPRINT_TEAMS_2026-01-25.md` - Overall strategy
4. `/docs/ACTIVE_SESSIONS.md` - Check for conflicts

## Your Mission

Work Surfaces QA blockers, Reliability Program, final integration.

## IMPORTANT: You Start AFTER Teams A-D Complete P0 Tasks

Before starting, verify:
- `pnpm check` passes (Team A must fix TypeScript)
- `pnpm test` passes >95% (Team A must fix tests)
- Feature flags seeded (Team D must complete DATA-012)

## Your Branch

`claude/sprint-team-e-integration`

## Your Owned Files (Only modify these)

- `client/src/components/work-surface/**`
- `client/src/components/work-surface/golden-flows/**`
- `server/_core/**`
- `scripts/qa/**`
- `scripts/validation/**`

## DO NOT MODIFY (Other teams own these)

- `server/routers/**` (Team C)
- `client/src/pages/*.tsx` (Team B)
- `scripts/seed/**` (Team D)
- `drizzle/**` (Team D)

## Verification (Run before EVERY commit)

```bash
pnpm check && pnpm lint && pnpm test && pnpm build
```

## Definition of Done

All 8 criteria from CLAUDE.md must pass. When complete, create PR to:
`staging/integration-sprint-2026-01` (NOT main)

## Start Now

1. Read the files listed above
2. Verify Teams A-D P0 tasks are complete
3. Create session file in `/docs/sessions/active/`
4. Create your branch and start with WSQA-001 (payment recording)
```

---

## Integration Coordinator

```
You are the Integration Coordinator for the TERP parallel sprint execution.

## MANDATORY: Read These Files First (In Order)

1. `/CLAUDE.md` - Master agent protocol (READ COMPLETELY)
2. `/docs/prompts/sprint-teams/INTEGRATION_COORDINATOR.md` - Your full instructions
3. `/docs/roadmaps/PARALLEL_SPRINT_TEAMS_2026-01-25.md` - Overall strategy

## Your Mission

Merge all team PRs to staging, run integration tests, create release PR to main.

## IMPORTANT: You Run AFTER All 5 Teams Have Created PRs

Before starting, verify all 5 PRs exist:
```bash
gh pr list --base staging/integration-sprint-2026-01
```

Expected PRs:
- Team A: Core Stability Fixes
- Team B: Frontend UX & Navigation
- Team C: Backend & API Implementations
- Team D: Data, Schema & Seeding
- Team E: Integration & Work Surfaces

## Merge Order (CRITICAL)

1. Team D (schema/data first)
2. Team A (TypeScript fixes)
3. Team C (backend APIs)
4. Team B (frontend)
5. Team E (integration)

## Your Tasks

1. Merge PRs in order above
2. Run `pnpm check && pnpm build` after each merge
3. Resolve any conflicts
4. Run full integration tests
5. Create release PR to main
6. Verify production deployment

## Verification Commands

```bash
pnpm check && pnpm lint && pnpm test && pnpm build
pnpm test:e2e
```

## Start Now

1. Read the files listed above
2. Verify all 5 team PRs exist
3. Begin merging in order: D → A → C → B → E
4. Create release PR when all tests pass
```

---

## Quick Reference: Key Rules from CLAUDE.md

All teams must follow these rules:

### Verification Protocol (Before EVERY Commit)

```bash
pnpm check        # TypeScript - 0 errors
pnpm lint         # ESLint - 0 errors
pnpm test         # Tests - must pass
pnpm build        # Build - must succeed
```

### Prohibited Behaviors

- Never use `any` type
- Never use fallback user IDs (`ctx.user?.id || 1`)
- Never hard delete (use soft deletes with `deletedAt`)
- Never skip validation
- Never mark complete without verification
- Never work on files another agent owns
- Never push to main (only to staging)

### Party Model (Critical)

```
clients table = Single source of truth
- isSeller = true → supplier
- isBuyer = true → customer
- NEVER use deprecated `vendors` table
```

### PR Target

All PRs go to: `staging/integration-sprint-2026-01`
NOT to `main` directly.
