# Handoff Prompt - Continue Waves 2-R After TER-572

Use this prompt with a new AI agent:

````markdown
You are continuing TERP Waves 2-R execution in the local repo at:
`/Users/evan/spec-erp-docker/TERP/TERP-waves-2r-20260306`

Read and follow `CLAUDE.md` and the root `AGENTS.md` first. They are mandatory.

## Current Git State

- Branch: `codex/waves-2r-20260306`
- Latest implementation checkpoint before this handoff doc: `1bb186ab` (`feat(inventory): move product metadata into settings`)
- This handoff doc should be committed and pushed as the current checkpoint before transfer
- There is one untracked local directory to ignore unless you intentionally need it:
  - `.tmp/`

## Roadmap Progress

Completed and pushed:

- `TER-567` / `TASK-011` commit `0b0dc494`
- `TER-568` / `TASK-012` commit `ac55ea9a`
- `TER-569` / `TASK-013` commit `f461dba3`
- `TER-570` / `TASK-014` commit `ec70390c`
- `TER-571` / `TASK-015` commit `f15a69f5`
- `TER-572` / `TASK-016` commit `1bb186ab`

Linear state already updated:

- `TER-572` (`ed796ffa-cf85-47fb-9211-e77a1760f242`) is `Done`
- `TER-573` (`586f1783-9b0f-4341-9148-b2e6e54b41d2`) is `In Progress`
- `TER-574` (`11be20df-641e-4085-84b5-571bf4c69d4d`) is still `Todo`

## Evidence Files Already Written

- `docs/execution/2026-03-06-waves-2r/ter-571.md`
- `docs/execution/2026-03-06-waves-2r/ter-572.md`

## Important Repo Reality Already Confirmed

- `grade` is currently a batch field, not a product field.
- `batches.productId` is modeled as non-null in schema, but the batch drawer still guards missing linked-product data safely.
- Git protocol in this repo requires `git pull --rebase origin main` before every push.
- Push and Linear updates are required at regular checkpoints, not only at the end.

## RED Task Approval and Constraints

The user explicitly instructed the prior agent to implement the full self-approved Waves 2-R plan, including the RED tasks. Treat that as the written approval required to proceed.

Still follow the RED protocol exactly:

- run the pre-work audit first
- write the rollback plan before touching migration files
- generate migration SQL and review it before applying anything
- double-check against real database structures, not just Drizzle schema
- if generated SQL or live schema reality conflicts with expectations, stop and report

## Immediate Next Task

Continue with `TER-573` (`[RED] Quote Status Enum Migration`).

## TER-573 Audit State Reached Before Handoff

- Initial repo audit already confirmed `drizzle/schema.ts` currently defines:
  - `DRAFT`
  - `SENT`
  - `VIEWED`
  - `ACCEPTED`
  - `REJECTED`
  - `EXPIRED`
  - `CONVERTED`
- This means `SENT` and `CONVERTED` already exist in the current Drizzle enum, so the planned rename is not a simple one-to-one enum rename.
- A broad repo scan was started, but it was intentionally not trusted as final because generic `DRAFT` and `ACCEPTED` matches pull in many unrelated domains.
- No quote-specific `SUBMITTED` usage was confirmed before handoff.
- First live MySQL schema inspection attempt through the read-only MCP returned:
  - `Error: connect ETIMEDOUT`
- The next agent should retry live schema inspection with a smaller query or alternate path before editing migrations.

Linear ticket body requires this pre-work audit:

1. grep repo for `quoteStatus`, `DRAFT`, `SUBMITTED`, `ACCEPTED`
2. list every file referencing those enum values
3. check seeds and fixtures
4. generate but do not apply migration SQL via Drizzle
5. paste the generated SQL

Also do the extra repo/user-required audit:

- compare Drizzle enum definitions with the real MySQL schema using the available read-only MySQL MCP
- confirm whether `SENT` and `CONVERTED` already exist in both schema and DB
- confirm whether `SUBMITTED` exists anywhere real or only in stale docs/spec assumptions

## Expected TER-573 Mapping

- `DRAFT -> UNSENT`
- `SUBMITTED -> SENT`
- `ACCEPTED -> CONVERTED`

But do not assume this is clean. Audit for:

- `SENT` already existing
- `CONVERTED` already existing
- any logic that distinguishes `ACCEPTED` from `CONVERTED`
- any stale docs/tests/seeds still using `SUBMITTED`

## Suggested First Commands

Run from `/Users/evan/spec-erp-docker/TERP/TERP-waves-2r-20260306`:

```bash
git status --short
rg -n "quoteStatus|DRAFT|SUBMITTED|ACCEPTED|UNSENT|SENT|CONVERTED" drizzle server client/src test tests scripts
rg -n "DRAFT|SUBMITTED|ACCEPTED|UNSENT|SENT|CONVERTED" drizzle server client/src test tests scripts
pnpm drizzle-kit generate
```
````

Then inspect the generated migration SQL before applying anything.

Use the MySQL MCP to inspect the live schema and enum/storage reality before editing migration files.

## Required Checkpoint Behavior

Before the next commit:

- write a TER-573 execution note under `docs/execution/2026-03-06-waves-2r/`
- run the exact gate command:
  - `pnpm check && pnpm lint && pnpm test && pnpm build`
- commit with conventional format
- run `git pull --rebase origin main`
- push to `origin/codex/waves-2r-20260306`
- update Linear with status/comments and evidence

After the next push/Linear checkpoint, refresh this handoff file or create a new one so another agent can continue without re-discovery.

```

```
