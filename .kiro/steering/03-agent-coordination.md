---
inclusion: always
description: Multi-agent coordination protocol for TERP — session lifecycle, conflict resolution, and handoff rules.
---

# Multi-Agent Coordination Protocol

> ⚠️ **IMPLEMENTATION STATUS**: Some sections describe TARGET STATE not yet fully implemented. Where marked `[TARGET]`, the feature is planned but not live. Agents must follow CURRENT BEHAVIOR instructions until `[TARGET]` markers are removed.

This document defines the session lifecycle, ownership model, conflict resolution rules, and handoff contract for all agents working in the TERP repository. These rules are enforced by git hooks and scripts — not by the honor system.

**Every AI agent that starts work in this repository must read this document before writing any code.**

---

## 1. Session Lifecycle State Machine

Each unit of work in TERP is tracked as a **session**. A session corresponds to exactly one Linear task (e.g., `TER-1073`). Sessions transition through the following states:

```
PENDING ──► ACTIVE ──► COMPLETE
              │
              ├──► PAUSED ──► ACTIVE (resume)
              │
              ├──► FAILED
              │
              └──► ABANDONED (reaper or force-close)
```

### State Definitions

| State | Meaning | Session File Location |
|-------|---------|----------------------|
| `PENDING` | Task queued in Linear, no session started. No lock, no branch, no session file. | None |
| `ACTIVE` | Agent acquired lock, created session file, is working on branch. | `docs/sessions/active/Session-<SESSION_ID>.md` |
| `PAUSED` | Agent suspended work intentionally (e.g. awaiting human input). | `docs/sessions/active/Session-<SESSION_ID>.md` |
| `COMPLETE` | Work finished, PR open or merged. Session archived. | `docs/sessions/completed/` |
| `FAILED` | Unrecoverable error. Session archived with reason. | `docs/sessions/completed/` |
| `ABANDONED` | Exceeded 4h heartbeat TTL or manually force-closed. | `docs/sessions/abandoned/` |

### State Transitions and Scripts

| Transition | Script |
|-----------|--------|
| `PENDING → ACTIVE` | `scripts/start-task.sh <TER-NNNN>` |
| `ACTIVE → PAUSED` | Manual: update status in session file, commit |
| `PAUSED → ACTIVE` | `scripts/start-task.sh <TER-NNNN>` (auto-detects resume) |
| `ACTIVE → COMPLETE` | `scripts/complete-task.sh` or `scripts/complete-task-fast.sh` |
| `ACTIVE → ABANDONED` | `scripts/session-reaper.sh` (cron, hourly, 4h TTL) |
| `ACTIVE → ABANDONED` | `scripts/force-close-session.sh <TER-NNNN> "<reason>"` |

**Disallowed:** `COMPLETE → *` — completed sessions are immutable. Create a new Linear task.

---

## 2. Session Ownership

Exactly one agent owns a session at a time. Ownership is established by successfully acquiring the lock (see §4) and having `scripts/start-task.sh` create the session file.

### Session Files

Session files are **markdown** files named `Session-<SESSION_ID>.md` in `docs/sessions/active/`. The SESSION_ID format is `YYYYMMDD-<8hex>` (e.g. `Session-20260420-a3f9b2c1.md`).

To find the session file for a task:
```bash
grep -rl "Task ID.*TER-1073" docs/sessions/active/
```

Session files are created and managed exclusively by `scripts/start-task.sh`. **Never create session files manually.**

### The AGENT_PREFIX Environment Variable

Set `AGENT_PREFIX` before calling `scripts/start-task.sh` to identify the tool:

| Tool | `AGENT_PREFIX` |
|------|----------------|
| Claude Code | `cc` |
| Codex CLI | `codex` |
| OpenHands | `oh` |
| Hermes Agent | `ha` |
| Unknown | `agent` (default) |

`AGENT_PREFIX` is used to name the working branch: `<AGENT_PREFIX>/TER-<N>-<SESSION_ID>`.

---

## 3. Heartbeat Contract

**A git commit = a heartbeat.** The session reaper checks the timestamp of the last commit on your branch via `git log`. No commit in 4 hours → session is eligible for auto-abandonment.

For tasks expected to take longer than 2 hours: make incremental `wip:` commits to signal liveness:
```bash
git commit -m "wip(ter): checkpoint — completed X, next Y" --no-verify
```

The reaper does not distinguish between a crashed agent and one that is thinking. Commit or be reaped.

---

## 4. Conflict Resolution

### Lock Acquisition

`scripts/start-task.sh` acquires a lock using `mkdir` (POSIX-atomic). The lock is at `/tmp/start-task.lock` (a directory, not a file). The lock is **global** — only one task can be started at a time per machine.

The lock contains `/tmp/start-task.lock/pid` with the acquiring process's PID.

**Stale lock detection:** If the lock directory exists but the PID is dead, the lock is removed and the new process proceeds.

**Contested lock:** If the PID is alive, the second process exits with:
```
ERROR: Another start-task process is running (PID: <N>). Wait for it to finish.
```

### Multi-Machine Races

The `/tmp/` lock is host-local and does not prevent two agents on *different machines* from starting the same task simultaneously. The de-facto claim mechanism is the roadmap `[~]` status pushed to GitHub: the second agent will detect `[~]` on next `git pull` and abort. There is a small race window between roadmap check and push — this is a known limitation.

### Lock Release

The lock is released (rm -rf) by: `complete-task.sh`, `complete-task-fast.sh`, `force-close-session.sh`, and `session-reaper.sh`. It is never released by hooks.

---

## 5. Break-Glass / Hotfix Protocol

For production emergencies requiring a time-critical fix:

```bash
HOTFIX=1 HOTFIX_REASON="prod: describe the emergency" git commit -m "fix(scope): fix description"
```

**HOTFIX=1 skips:** session file check, Linear task status validation, branch naming validation.

**HOTFIX=1 still enforces:** TypeScript compilation, linting, CI on push, GitHub branch protection.

**HOTFIX=1 requires:** An entry in `docs/agent-handoff/audit.log` (written automatically by the pre-commit hook when HOTFIX=1 is detected). Format:
```
[HOTFIX] timestamp=<ISO8601> branch=<branch> operator=<email> reason="<reason>"
```

After a hotfix: create a retrospective Linear task within 24h.

---

## 6. Resume Protocol

`scripts/start-task.sh` auto-detects resume:
1. Queries Linear — if task is `In Progress` (`[~]`), enters resume mode
2. Searches `docs/sessions/active/` for a session file matching the task ID
3. If found: prints the session file contents and switches to the existing branch
4. If not found: errors with recovery instructions (`scripts/force-close-session.sh`)

When resuming, **read the session file** for context before making any changes:
- What was done (progress log section)
- What branch to be on
- Any notes the prior agent left

---

## 7. Multi-Agent Conflict on the Same Branch

If a `git push` is rejected (non-fast-forward):
1. `git fetch origin`
2. `git merge origin/<branch>` — **not rebase** (rebase rewrites shared history)
3. Resolve conflicts
4. Run `pnpm check && pnpm lint`
5. `git push`

**Force push is absolutely prohibited** on session branches. It destroys another agent's commits.

---

## 8. Agent Identity Recording

Every session file created by `start-task.sh` records:
- **Agent/Branch prefix** — from `AGENT_PREFIX` env var
- **Started timestamp** — in session file header
- **Operator** — from `git config user.email`

For detailed model tracking, set `AGENT_MODEL` env var before calling `start-task.sh`. It is recorded in the audit log if `docs/agent-handoff/audit.log` exists.

---

## Quick Reference: Script → Effect

| Script | What it does |
|--------|-------------|
| `scripts/start-task.sh TER-N` | Start or resume a session. Acquires lock, creates branch and session file, validates Linear. |
| `scripts/complete-task.sh` | Close session (full test suite: tsc + lint + test + build). |
| `scripts/complete-task-fast.sh` | Close session (fast: tsc + lint only). Full suite runs in CI. |
| `scripts/force-close-session.sh TER-N "reason"` | Force-abandon a crashed session. Resets roadmap [~] to [ ]. Appends to audit.log. |
| `scripts/session-reaper.sh` | Auto-abandon stale sessions (4h TTL). Run hourly via cron. Resets roadmap [~] to [ ]. |

## Key Paths

| Path | Purpose |
|------|---------|
| `docs/sessions/active/Session-*.md` | Live session files |
| `docs/sessions/abandoned/` | Abandoned session files |
| `docs/sessions/completed/` | Completed session files |
| `docs/agent-handoff/audit.log` | Append-only audit log (gitignored) |
| `/tmp/start-task.lock/` | Global machine-local lock directory |

## Enforcement Summary

| Rule | Enforced by | Bypass |
|------|-------------|--------|
| Session file required to commit | `.husky/pre-commit` [TARGET] | `HOTFIX=1` (audit log) or `--no-verify` (CI backstop) |
| Linear task must be open | `.husky/pre-push` [TARGET] | None |
| No force push | GitHub branch protection | None |
| One active agent per machine | `/tmp/start-task.lock` | `rm -rf /tmp/start-task.lock` (manual recovery only) |
| 4-hour heartbeat TTL | `scripts/session-reaper.sh` (cron) | None |

`[TARGET]` = planned but not yet implemented in hooks. Current enforcement: CI blocks PRs from branches without session commits.
