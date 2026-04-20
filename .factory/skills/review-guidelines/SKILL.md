---
name: review-guidelines
description: TERP-specific code review criteria. Auto-loaded by Factory-AI/droid-action during PR reviews. Focuses on correctness, domain invariants, and the TERP agent protocol rather than generic style.
---

# TERP Review Guidelines

Apply these checks in addition to the default Factory review rubric (bugs, security, correctness). Prioritize domain invariants and protocol compliance — TERP has paid real cost for violations of each of these rules at least once.

## 1. Domain invariants (hard gates)

- **No `any` in TypeScript.** Flag every introduced `any`, `as any`, or `@ts-ignore`. Suggest concrete types.
- **Soft deletes only.** No hard `DELETE` against business tables; look for `.delete()` or raw SQL `DELETE`. Record deletions must set a `deletedAt` / `deleted` flag instead.
- **No `vendors` table.** Use `clients` with `isSeller = true`. Any new migration, query, or type referencing a `vendors` entity is a blocker.
- **Zero TypeScript errors at commit.** If the PR diff would break `pnpm check`, say so and stop the approval.
- **Drizzle schema migrations** must be additive where possible; flag any destructive DDL without a migration plan or down-script.
- **Money, quantity, and pricing fields** must be integers (cents, grams) not floats. Flag any new `number` columns storing currency.

## 2. Protocol compliance

- **PM bundle authority.** Every substantive PR should reference a Linear ticket (e.g. `[TER-1234]` in the description or commit). If not, request one.
- **No push from agent worktree.** Comment the branch name: if it matches the agent-worktree pattern (`TERP-TER-*-*` with a timestamp suffix) and the PR was opened automatically, flag "integrator review needed" unless the description explicitly declares integrator override.
- **PM bundle edits.** Any change to `docs/agent-context/` (manifest, state, work, clients, decisions) must include a rationale and a pointer to the decision record (`decisions.ndjson`). Untraced PM mutations are blockers.
- **Legacy doc updates.** Changes to `docs/ACTIVE_SESSIONS.md`, `docs/PROJECT_CONTEXT.md`, `docs/TERP_AGENT_INSTRUCTIONS.md`, `docs/ROADMAP_AGENT_GUIDE.md`, or `product-management/START_HERE.md` should be rejected unless the PR is explicitly a legacy cleanup — the agent-context bundle is the source of truth.

## 3. Evidence expectations

- **Failing test first.** For bug fixes, the diff should contain a new or previously-red test that now passes. If not present, comment requesting it.
- **Feature changes** should include either a new test or, for UI, a visual snapshot / Argos reference / Playwright recording.
- **No coverage drop** without a written justification in the PR description.
- **No new runtime deps** without a one-paragraph justification.

## 4. Frontend specifics

- **React hooks rules** — flag hooks called conditionally, inside loops, or after early returns.
- **Query invalidation** — any mutation should invalidate or set the relevant React Query key; flag mutations that only update local state.
- **shadcn/ui components** should be preferred over ad-hoc Tailwind where a component already exists. Flag reimplementation of existing primitives.
- **Mobile-first responsive design.** Layout changes must not break mobile; flag fixed `width` without a responsive guard.

## 5. Backend / tRPC specifics

- **Zod validation on every input.** Flag router inputs typed loosely.
- **Error handling.** Routers must either throw a typed `TRPCError` or return a result type; flag bare `throw new Error(...)` where the error shape matters to the client.
- **Auth checks.** Protected routers must go through the existing auth middleware; flag any router that bypasses it.
- **BullMQ jobs** must be idempotent. Flag `retry: true` jobs without idempotency keys.

## 6. Style (advisory, not blocking)

- Prefer arrow functions for components and helpers; early returns over nested conditionals.
- One assertion per test when practical.
- Avoid barrel `index.ts` re-exports for performance unless the directory explicitly exists for public API.
- Keep comments minimal and purposeful — docstrings on exported APIs, not on obvious code.

## Comment budget

Submit at most **8 comments** per review, prioritizing domain-invariant violations (section 1) and protocol compliance (section 2) over style (section 6). If there are more issues than budget, summarize the remainder in the review body and suggest splitting the PR.

## Skipping

Skip lines in `drizzle/`, `docs/archive/`, or anything under `**/*.generated.*`. Skip vendored code under `packages/*/vendor/`.

## Linked authority

These guidelines are a compression, not a replacement, for:
- `AGENTS.md`
- `CLAUDE.md`
- `docs/agent-context/START_HERE.md` + `manifest.json`
- `/Users/evan/AGENTS.md` (personal core, referenced but not in the repo)

When any of those disagree with a point above, the repo file wins.
