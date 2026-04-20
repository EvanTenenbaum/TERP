# TERP Universal Agent Handoff — Architecture

> **One-line summary:** Guarantees any AI agent (Claude Code, Codex CLI, OpenHands, Claude Web, or future tools) can pick up TERP work immediately — with enforcement via git hooks + CI, not markdown honor system.

---

## Architecture Diagram

```
┌──────────────┐
│  Any Agent   │  (Claude Code / Codex CLI / OpenHands / Claude Web)
└──────┬───────┘
       │  ./BOOT.sh [TER-NNNN]          ← orientation + context refresh (helper, not enforcement)
       ▼
┌──────────────────────────────────┐
│  scripts/start-task.sh TER-NNNN │  acquires /tmp/start-task.lock
└──────────────────┬───────────────┘
                   │  creates:
                   ├─▶ docs/sessions/active/<SESSION_ID>.md    ← session file
                   ├─▶ docs/agent-handoff/handoff.json         ← status=ACTIVE
                   ├─▶ Linear comment "🤖 Agent session started"
                   └─▶ git push → branch TER-NNNN/<desc>
                   │
       ╔═══════════╧══════════╗
       ║   Agent does work    ║
       ╚═══════════╤══════════╝
                   │
       ▼
┌──────────────┐
│   DONE.sh    │  runs fast verification (tsc + lint via complete-task-fast.sh)
└──────┬───────┘
       │  updates:
       ├─▶ docs/agent-handoff/handoff.json         ← status=COMPLETE
       ├─▶ Linear comment "✅ Session closed"
       └─▶ git push → shows: gh pr create ...
       │
       ▼
┌────────────────────────────────────────┐
│  PR opened → CI: session-validation   │  checks docs/sessions/active/ for branch match
└────────────────────────────────────────┘
       │  PASS → merge allowed
       │  FAIL → PR blocked, comment posted
       ▼
┌──────────────────┐
│  Merge to main   │  merge.yml: integration tests + build verification
└──────────────────┘
```

---

## Enforcement Layers

| Layer | What Enforces It | What It Blocks |
|---|---|---|
| **pre-commit** | `.husky/pre-commit` | Commits with fallback user-ID patterns, exposed secrets, `any` casts on auth types |
| **commit-msg** | `.husky/commit-msg` | Non-conventional-commit message format (must match `type(scope): desc`) |
| **pre-push** | `.husky/pre-push` | Pushes to cancelled or completed Linear tasks; prompts to validate task state via Linear API |
| **CI: session-validation** | `.github/workflows/session-validation.yml` | PRs with no matching `docs/sessions/active/` file for the branch |
| **CI: pre-merge** | `.github/workflows/pre-merge.yml` | PRs that fail TypeScript, lint, or schema checks |
| **CI: merge** | `.github/workflows/merge.yml` | Broken integration tests after merge to main |
| **Branch protection** | GitHub settings (main/staging) | Direct pushes; requires PR + CI green before merge |

> **Important:** `--no-verify` bypasses all Husky hooks. CI is the independent backstop that cannot be bypassed without repo admin access.

---

## Session Lifecycle

```
PENDING  ──(start-task.sh)──▶  ACTIVE  ──(DONE.sh)──▶  COMPLETE
                                  │
                                  └──(session-reaper.sh, 4h stale)──▶  ABANDONED
                                  │
                                  └──(force-close-session.sh)──▶  ABANDONED (manual)
```

| State | Where Recorded | Meaning |
|---|---|---|
| `PENDING` | MASTER_ROADMAP.md `[ ]` | Task exists, no session started |
| `ACTIVE` | Session file exists + `[~]` in roadmap + `handoff.json status=ACTIVE` | Agent actively working |
| `COMPLETE` | Session file closed + `handoff.json status=COMPLETE` + Linear comment | Work done, PR opened |
| `ABANDONED` | Moved to `docs/sessions/abandoned/` + audit.log entry | Session dead (no activity 4h or manual force-close) |

---

## Key Scripts

| Script | Purpose | When to Run |
|---|---|---|
| `BOOT.sh [TER-NNNN]` | Agent orientation: refresh context, show last handoff, optionally start task | First thing any agent runs |
| `scripts/start-task.sh TER-NNNN` | Creates session file, handoff.json, Linear comment, branch; acquires lock | Beginning of every task |
| `scripts/complete-task-fast.sh` | Runs `tsc` + lint only (~2 min); called by DONE.sh and pre-push | Automated — do not call manually |
| `DONE.sh` | Closes session: fast verify, update handoff.json, Linear comment, shows PR command | End of every work session |
| `scripts/handoff-write.sh` | Atomic writer for handoff.json (source + call `write_handoff`) | Called by start-task.sh and DONE.sh |
| `scripts/linear-comment.sh TER-NNNN "msg"` | Posts a comment to Linear issue | Called by start-task.sh and DONE.sh |
| `scripts/force-close-session.sh TER-NNNN "reason"` | Archives a stuck ACTIVE session to ABANDONED | Manual recovery only |
| `scripts/session-reaper.sh` | Auto-archives sessions with no commit in 4h or dead branch | Cron: `0 * * * *` |
| `scripts/validate-sessions.js` | Checks active session files for staleness and schema validity | CI and pre-push |

---

## Key Files

| File Path | Purpose | Who Writes It |
|---|---|---|
| `docs/agent-handoff/handoff.json` | Machine-readable current session state (task, status, what done/next, blockers) | `scripts/handoff-write.sh` (via start-task.sh + DONE.sh) |
| `docs/agent-handoff/audit.log` | Append-only log of every handoff.json write event | `scripts/handoff-write.sh` |
| `docs/agent-handoff/ARCHITECTURE.md` | This file — human+agent reference for the whole system | Human/agent (docs) |
| `docs/sessions/active/<SESSION_ID>.md` | Per-session progress log and checklist | `scripts/start-task.sh` creates; agent appends |
| `docs/sessions/abandoned/<SESSION_ID>.md` | Abandoned session record with reason | `scripts/force-close-session.sh` / `session-reaper.sh` |
| `docs/sessions/completed/<SESSION_ID>.md` | Completed session archive | `scripts/complete-task-fast.sh` (on full close) |
| `docs/ACTIVE_SESSIONS.md` | Human-readable summary of in-flight sessions | `scripts/start-task.sh` |
| `docs/agent-context/state.json` | Current project state snapshot (branch, last commit, etc.) | `pnpm context:refresh` |
| `docs/agent-context/START_HERE.md` | Full project orientation for new agents | Maintained manually |
| `docs/roadmaps/MASTER_ROADMAP.md` | Source of truth for task status (`[ ]`/`[~]`/`[x]`) | `scripts/start-task.sh` (marks `[~]`); human (marks `[x]`) |
| `/tmp/start-task.lock` | Directory-based mutex preventing concurrent start-task runs | `scripts/start-task.sh` (auto-cleaned) |

---

## Web Agent Protocol

Claude Web (or any browser-based agent) **cannot run shell commands** and has no repo access. The operator must manually supply context at session start.

**Minimum viable handoff to Claude Web:**

1. Open `docs/agent-handoff/handoff.json` and paste the full JSON into the chat.
2. Optionally paste `docs/agent-context/START_HERE.md` for project orientation.
3. Tell the agent the task ID and what you want done.

The agent's output must be applied manually (copy-paste code, run commits from a terminal). Web agents **cannot** run `start-task.sh` or `DONE.sh` — the human operator must do that.

> **Handoff.json schema fields to highlight:**
> - `status` — ACTIVE or COMPLETE
> - `whatWasDone` — last agent's completed items
> - `whatIsNext` — next items to tackle
> - `doNotTouch` — files/areas the previous agent flagged as fragile
> - `blockers` — unresolved issues

---

## Break-Glass (HOTFIX Protocol)

For production emergencies that cannot wait for a session:

```bash
export HOTFIX=1                     # Disables pre-push Linear state check
git commit -m "hotfix: <desc>"      # commit-msg hook still applies
git push origin hotfix/<desc>       # CI session-validation skips hotfix/ branches
```

> Create a retrospective Linear task within 24h. Hotfix bypasses are logged in `docs/agent-handoff/audit.log`.

---

## Recovery Runbook

### Stale session stuck in `[~]` state

```bash
bash scripts/force-close-session.sh TER-NNNN "agent crashed mid-execution"
```

Moves session file to `docs/sessions/abandoned/`, updates audit.log, resets roadmap marker.

### Corrupt or invalid handoff.json

```bash
mv docs/agent-handoff/handoff.json docs/agent-handoff/handoff.json.corrupt-$(date +%Y%m%dT%H%M%S)
```

Then re-run `scripts/start-task.sh TER-NNNN` or manually call `handoff-write.sh` to regenerate.

### Lock stuck at /tmp/start-task.lock

```bash
rm -rf /tmp/start-task.lock
```

Only do this if you're certain no `start-task.sh` process is currently running (check with `ps aux | grep start-task`).

### Session reaper not running (cron dead)

```bash
bash scripts/session-reaper.sh
```

Safe to run manually — idempotent. Add to crontab: `0 * * * * cd /path/to/repo && bash scripts/session-reaper.sh`.

---

## What This Does NOT Solve

| Limitation | Details |
|---|---|
| **`--no-verify` bypass** | Any agent that passes `--no-verify` to `git commit` or `git push` skips all Husky hooks. CI is the only backstop. Repo admin can restrict force-push but cannot block `--no-verify` locally. |
| **Simultaneous web agents** | Two Claude Web sessions working on the same task have no coordination mechanism. There is no locking for non-CLI agents. |
| **Test suite speed** | Full `pnpm test` takes 30–60 minutes. DONE.sh deliberately skips it (tsc + lint only). CI runs the full suite on PR open — there is a window where broken tests reach the PR. |
| **Linear API availability** | pre-push task-state validation and Linear comment posting both depend on `LINEAR_API_KEY` being set and the Linear API being reachable. Silent failures are logged but not blocking. |
| **Context refresh accuracy** | `pnpm context:refresh` uses a 21-day filter that may miss older TERP issues. BOOT.sh runs it best-effort; stale context will not block any operation. |
