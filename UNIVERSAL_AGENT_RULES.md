# UNIVERSAL AGENT RULES

> **Quick reference.** This file summarizes where protocols live and the non-negotiable rules. CLAUDE.md is the single source of truth for agent startup.

---

## Start Here

1. Read `CLAUDE.md` first — it is the primary startup document and overrides everything else.
2. Read `AGENTS.md` — supplementary technical context.
3. Read `docs/agent-context/START_HERE.md` — current project state.
4. Read `docs/agent-handoff/handoff.json` if it exists — previous session context.

If conflicts exist between this file and `CLAUDE.md`, **CLAUDE.md takes precedence**.

---

## Document Hierarchy

```
CLAUDE.md                          ← PRIMARY (read first)
├── .kiro/steering/                ← Detailed protocols
│   ├── 00-core-identity.md
│   ├── 03-agent-coordination.md   ← Session lifecycle, lock, resume, hotfix
│   ├── 05-external-agent-handoff.md ← Handoff state schema, web agent protocol
│   ├── 06-architecture-guide.md
│   ├── 07-deprecated-systems.md
│   ├── 08-adaptive-qa-protocol.md
│   └── ...
├── AGENTS.md                      ← Technical stack reference
└── UNIVERSAL_AGENT_RULES.md       ← This file (quick reference)
```

---

## How Enforcement Works

Enforcement is at the **git layer** — not in markdown files. Agents cannot bypass it by ignoring instructions.

| Rule | Enforced by |
|------|-------------|
| Session file required to commit | `.husky/pre-commit` |
| Linear task must be open | `.husky/pre-push` |
| CI must pass before merge | GitHub branch protection |
| No direct push to main | GitHub branch protection |
| One active agent per machine | `/tmp/start-task.lock` (atomic mkdir) |
| Stale sessions auto-abandoned | `scripts/session-reaper.sh` (hourly cron) |

---

## Starting Work (Any Agent, Any Tool)

### CLI agents (Claude Code, Codex CLI, OpenHands)
```bash
export AGENT_PREFIX=cc          # cc=claude-code, codex=codex, oh=openhands
export AGENT_MODEL=claude-opus-4-7
bash scripts/start-task.sh TER-NNNN
```

### Web agents (Claude Web / claude.ai)
Web agents cannot run scripts or access the filesystem. The operator must provide context by:
1. Pasting `handoff.json` content (if it exists) into the agent's context
2. OR pasting `docs/agent-context/START_HERE.md` content
3. OR pasting the relevant Linear task comment

See `.kiro/steering/05-external-agent-handoff.md` §6 for full web agent protocol.

---

## Finishing Work

```bash
# Fast close (tsc + lint only — full suite runs in CI)
bash scripts/complete-task-fast.sh

# Full close (tsc + lint + tests + build)
bash scripts/complete-task.sh
```

---

## Recovery

```bash
# Force-abandon a crashed session and reset roadmap
bash scripts/force-close-session.sh TER-NNNN "reason"

# View stale sessions
ls docs/sessions/active/

# Manually trigger session reaper
bash scripts/session-reaper.sh
```

---

## Break-Glass (Hotfix)

```bash
HOTFIX=1 HOTFIX_REASON="prod: describe emergency" git commit -m "fix(scope): description"
```

HOTFIX mode skips session check and branch validation but still enforces TypeScript and linting. Every hotfix is recorded in `docs/agent-handoff/audit.log` (gitignored).

---

## Non-Negotiables

- **Zero TypeScript errors** — `pnpm check` must pass before any commit
- **Soft deletes only** — use `deletedAt`, never `db.delete()`
- **Never use `vendors` table** — use `clients` with `isSeller=true`
- **Never trust client actor** — use `getAuthenticatedUserId(ctx)` always
- **No `any` types** — use proper types or `unknown`
- **Verification over persuasion** — prove it works, never just claim it works

---

## Steering Files (Read After CLAUDE.md)

| File | Purpose | When to Read |
|------|---------|-------------|
| `00-core-identity.md` | Agent identity and prime directive | Always |
| `03-agent-coordination.md` | Session lifecycle, locking, resume, hotfix | Before starting any work |
| `05-external-agent-handoff.md` | Handoff schema, web agent protocol | On session start/end |
| `06-architecture-guide.md` | System structure, auth flow, key files | Architecture questions |
| `07-deprecated-systems.md` | What NOT to use | Before touching legacy code |
| `08-adaptive-qa-protocol.md` | SAFE/STRICT/RED verification modes | Before every commit |
| `01-development-standards.md` | TypeScript, code standards | Always |
| `02-workflows.md` | Git, deployment, testing | Always |
| `99-pre-commit-checklist.md` | Final pre-commit checks | Before every commit |
