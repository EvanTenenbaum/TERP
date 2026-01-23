# TERP Agent Protocol (Claude)

> **For Claude Code and Claude.ai Projects**
> This file is read automatically by Claude Code. Copy to Claude Project instructions for web/mobile consistency.
> Last updated: 2025-01-23

---

## Quick Start

Before any work, read the canonical protocols in order:

1. `.kiro/steering/00-core-identity.md`
2. `.kiro/steering/06-architecture-guide.md`
3. `.kiro/steering/08-adaptive-qa-protocol.md`
4. `.kiro/steering/01-development-standards.md`
5. `.kiro/steering/03-agent-coordination.md`
6. `.kiro/steering/99-pre-commit-checklist.md`

If external agent: `.kiro/steering/05-external-agent-handoff.md`

See also: `UNIVERSAL_AGENT_RULES.md` for the full protocol index.

---

## Prime Directive

**Verification over persuasion.** No change is correct until proven correct through deterministic checks. Never claim success without evidence.

---

## Risk-Based Autonomy

### SAFE Mode (Fast Lane)
**When:** Isolated changes, single module, no auth/money/inventory, easily reversible

**Required:**
- Targeted tests + typecheck before finishing
- Small commits with clear messages

### STRICT Mode (Default)
**When:** Shared components, business logic, state transitions, API contracts, DB queries, UI flows

**Required:**
- Explore → Plan → Execute → Verify cycle
- Write/extend tests for expected behavior
- Full verification loop before declaring done

### RED Mode (Critical Path)
**When:** Auth/RBAC, payments/accounting, inventory valuation, purchase/sales posting, migrations, background jobs

**Required:**
- Regression tests + adversarial tests
- End-to-end verification
- Risk register + rollback plan

---

## Verification Commands

```bash
pnpm check        # Type check
pnpm lint         # Lint
pnpm test         # Unit tests
pnpm build        # Build
pnpm test:e2e     # E2E (when UI/flows change)
```

If a command cannot run: mark **UNSURE**, provide exact verification steps.

---

## Definition of Done

A change is **DONE** only when:

1. Tests added/updated (or explicit justification)
2. Lint passes
3. Typecheck passes
4. Unit/integration tests pass
5. Build passes
6. E2E passes when UI/business workflow changed
7. No TODOs, stubs, or placeholders blocking use
8. Commit message: what changed + what verified

---

## Prohibited Behavior

Never:
- Claim success without verification evidence
- Skip tests because "it should be fine"
- Introduce TODO/stub logic without flagging
- Silently change business logic
- Modify tests to match broken behavior
- Edit files another agent is working on
- Rewrite unrelated modules

---

## TERP Critical Paths (Always RED Mode)

- **Inventory:** FIFO costing, lot tracking, stock mutations, transfers
- **Accounting:** Journal entries, account balances, period close, financial reports
- **Auth:** Permission checks, role assignments, sessions, audit trails
- **Orders:** State transitions, payment recording, shipments, credit/debit adjustments

---

## Output Template (Required for Completions)

```
## Summary
[1-2 sentences]

## Changes
- [file]: [what changed]

## Verification
- lint: [pass/fail/skipped]
- typecheck: [pass/fail/skipped]
- tests: [pass/fail/skipped]
- build: [pass/fail/skipped]
- e2e: [pass/fail/N/A]

## Tests Added/Updated
- [path]: [what it tests]

## Risks
- [potential issues]

## Rollback
- [what to revert if needed]
```

---

## Working with Evan

- **Prefer explanations over jargon** - Evan learns fast but isn't an engineer
- **Avoid terminal-heavy solutions** - Find alternatives when possible
- **Self-QA everything** - You are the QA team
- **Flag uncertainty explicitly** - "UNSURE: [aspect] - here's how to verify"
- **Reference repo docs** - Check `/docs/specs/` before implementing

---

## Tech Stack

React 19, Tailwind CSS 4, shadcn/ui + Radix, Drizzle ORM, MySQL, tRPC, BullMQ

---

## Session Management

Before starting work:
1. Check `docs/ACTIVE_SESSIONS.md` for conflicts
2. Register your session
3. Don't edit files another agent is working on

After completing work:
1. Update roadmap status in `docs/roadmaps/MASTER_ROADMAP.md`
2. Archive session to `docs/sessions/completed/`
3. Verify deployment with `./scripts/watch