---
inclusion: always
description: Handoff state format and protocol for cross-agent, cross-tool task continuity in TERP.
---

# External Agent Handoff Protocol

> ⚠️ **IMPLEMENTATION STATUS**: `docs/agent-handoff/handoff.json` is written by tasks T-021 through T-023 (not yet landed). Until those tasks ship, agents must use `docs/sessions/active/Session-*.md` and Linear task comments for handoff context. This document describes the TARGET STATE.

This document defines the canonical handoff state format so any agent — Claude Code, Codex CLI, OpenHands, Claude Web, Hermes, or a future tool — can immediately pick up where the last agent left off.

---

## 1. Files and Locations

| File | Purpose | Gitignored? |
|------|---------|-------------|
| `docs/agent-handoff/handoff.json` | Live handoff state — canonical current state [TARGET] | No |
| `docs/agent-handoff/.handoff.json.tmp` | Atomic write staging — SAME directory as target | No |
| `docs/agent-handoff/audit.log` | Append-only event log | **Yes** |
| `docs/sessions/active/Session-*.md` | Live session markdown files (CURRENT source of truth) | No |
| `docs/agent-context/START_HERE.md` | Human-readable context snapshot, refreshed on push | No |
| `docs/agent-context/state.json` | Machine-readable project state, refreshed on push | No |
| `CLAUDE.md` | Primary startup doc — read before this file | No |

---

## 2. Handoff State JSON Schema [TARGET]

> This schema is implemented by T-021 (start-task.sh) and T-022 (complete-task-fast.sh). Until those tasks ship, `handoff.json` will not exist.

```json
{
  "schemaVersion": 1,
  "sessionId": "20260420-a3f9c12b",
  "taskId": "TER-1073",
  "agentTool": "claude-code",
  "agentModel": "claude-opus-4-7",
  "startedAt": "2026-04-20T01:00:00Z",
  "lastActivityAt": "2026-04-20T02:15:00Z",
  "status": "COMPLETE",
  "branch": "cc/TER-1073-20260420-a3f9c12b",
  "headSha": "d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3",
  "sessionFilePath": "docs/sessions/active/Session-20260420-a3f9c12b.md",
  "whatWasDone": [
    "Added portable cuts feature to SalesOrderSurface",
    "Wired ClientCommitContextCard into order creator",
    "All unit tests passing"
  ],
  "whatIsNext": [
    "Integration test with staging DB",
    "Update API documentation"
  ],
  "doNotTouch": [],
  "blockers": [],
  "linearCommentId": "comment-abc123"
}
```

### Field Definitions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `schemaVersion` | integer | ✅ | Always `1`. Increment only with breaking change. |
| `sessionId` | string | ✅ | Format: `YYYYMMDD-<8hex>`. Must match the session file name. |
| `taskId` | string | ✅ | Linear task ID, format `TER-NNNN`. |
| `agentTool` | enum | ✅ | One of: `claude-code`, `codex-cli`, `codex-mac`, `openhands`, `claude-web`, `claude-mac`, `hermes`, `unknown`. |
| `agentModel` | string | ✅ | Model name (e.g. `claude-opus-4-7`, `gpt-5.4`) or `unknown`. |
| `startedAt` | ISO8601 | ✅ | Set once at session start. Never overwritten. |
| `lastActivityAt` | ISO8601 | ✅ | Updated on every write. |
| `status` | enum | ✅ | `ACTIVE`, `PAUSED`, `COMPLETE`, `FAILED`, `ABANDONED`. |
| `branch` | string | ✅ | Working branch name. |
| `headSha` | string | ✅ | Full 40-char git SHA at time of write. |
| `sessionFilePath` | string | ✅ | Path to the session markdown file: `docs/sessions/active/Session-<SESSION_ID>.md`. |
| `whatWasDone` | string[] | ✅ | Work completed this session. Max 5 items, each max 100 chars. |
| `whatIsNext` | string[] | ✅ | Remaining work. Max 5 items. First item = highest priority. |
| `doNotTouch` | string[] | ✅ | Files in mid-refactor. Respect until you understand why. Empty array if none. |
| `blockers` | string[] | ✅ | What is blocking progress. Empty array if none. |
| `linearCommentId` | string | optional | Linear comment ID if a comment has been posted (T-023). Omit if not yet posted. |

---

## 3. Atomic Write Contract [TARGET]

**Always write to the same directory as the target** to guarantee POSIX rename atomicity:

```bash
# Step 1: Write to temp file in SAME directory
python3 -c "import json; print(json.dumps(payload, indent=2))" > docs/agent-handoff/.handoff.json.tmp

# Step 2: Validate JSON before promoting
python3 -c 'import json,sys; json.load(sys.stdin)' < docs/agent-handoff/.handoff.json.tmp \
  || { echo "ERROR: JSON validation failed — aborting write" >&2; exit 1; }

# Step 3: Atomic rename (same filesystem = POSIX atomic)
mv docs/agent-handoff/.handoff.json.tmp docs/agent-handoff/handoff.json
```

The temp file MUST be in `docs/agent-handoff/` (same directory as target). Writing to `/tmp/` and then moving across filesystems is NOT atomic.

---

## 4. Read / Fallback Contract

### Happy Path [TARGET — after T-021 ships]

1. `handoff.json` exists and parses as valid JSON.
2. Check `schemaVersion == 1`. If not, treat as cold start.
3. Check `headSha` against `git rev-parse HEAD`. If they differ, you are on an unexpected commit — investigate before making changes.
4. Respect `doNotTouch` — do not edit these files until you understand why they are listed.
5. Start with `whatIsNext[0]` as your first priority.

### Current Path (before T-021 ships)

1. Check `docs/sessions/active/` for a session file: `grep -rl "Task ID.*TER-<N>" docs/sessions/active/`
2. Read the session file for context (progress log, branch name, notes).
3. Read `docs/agent-context/START_HERE.md` and `state.json` for project state.
4. Check the Linear task comments for any web-agent direction.

### Fallback: Invalid / Missing

Do NOT crash. Treat as cold start:
- Print warning to stderr: `WARN: handoff.json missing or invalid — cold start`
- Read CLAUDE.md, AGENTS.md, docs/agent-context/START_HERE.md
- Find the Linear task and read its description
- Run `scripts/start-task.sh TER-<N>` to create a fresh session

### Corruption Handling

If `handoff.json` fails JSON parsing:
```bash
TIMESTAMP=$(date +%Y%m%dT%H%M%S)
mv docs/agent-handoff/handoff.json docs/agent-handoff/handoff.json.corrupt-${TIMESTAMP}
echo "WARN: Corrupted handoff.json archived to handoff.json.corrupt-${TIMESTAMP}" >&2
```

Never delete a corrupted file. Archive it. Proceed as cold start.

---

## 5. Minimum Viable Handoff

If reading only the most critical fields before starting work:

| Field | Why it matters |
|-------|----------------|
| `taskId` | What you're working on |
| `branch` | Check out this branch: `git checkout <branch>` |
| `headSha` | Verify with `git rev-parse HEAD` — if different, you're on wrong state |
| `whatWasDone[-3:]` | What was just finished (don't redo it) |
| `whatIsNext[0]` | Your first action |
| `doNotTouch` | Files to avoid until you read why |
| `blockers` | What stopped the last agent — address these first |
| `sessionFilePath` | Full session markdown for deeper context |

---

## 6. Web Agent Protocol (Claude Web / claude.ai)

**Web agents have no filesystem access.** They cannot run scripts, read local files, or make git commits.

### How Web Agents Get Context

The **operator must manually provide context** to a web agent. Web agents cannot autonomously read Linear or GitHub. Before starting a web agent session, the operator must:

1. Copy the content of `docs/agent-handoff/handoff.json` (or the session markdown file) into the agent's context window
2. OR copy the relevant Linear comment (once T-023 ships) into the agent's first message
3. OR paste the output of `pnpm context:refresh && cat docs/agent-context/START_HERE.md`

### What Web Agents CAN Do

- Read code pasted into their context
- Review GitHub PRs via public URLs
- Write analysis, specs, and direction
- Produce instructions for CLI agents to execute

### What Web Agents CANNOT Do

- Run `scripts/start-task.sh` or any bash script
- Access `docs/agent-handoff/handoff.json` directly
- Make git commits or push branches

### Web Agent Output Format

When a web agent produces direction for CLI agents, it should post to Linear in this format:

```
🌐 Web agent review — TER-NNNN

Context read: [describe what was provided]

Analysis:
- [findings]

Instructions for next CLI agent:
1. [numbered, actionable steps]

Do not touch until resolved:
- path/to/file — reason (if any)
```

---

## 7. Session Start Write [TARGET — T-021]

When `scripts/start-task.sh` writes initial `handoff.json`:
- `status`: `ACTIVE`
- `whatWasDone`: `[]`
- `whatIsNext`: populated from Linear task description if available
- `doNotTouch`: `[]`
- `blockers`: `[]`
- `linearCommentId`: omitted (T-023 not yet run)

## 8. Session End Write [TARGET — T-022]

When `scripts/complete-task-fast.sh` updates `handoff.json`:
- `status`: `COMPLETE`
- `whatWasDone`: populated from last 5 commit messages: `git log main..HEAD --oneline --no-merges | head -5`
- `doNotTouch`: `[]` (cleared on successful completion)
- `blockers`: `[]` (cleared on successful completion)

For failed sessions: set `status: FAILED`, keep `doNotTouch` and `blockers` populated.

---

## 9. Agent Identity Detection

Priority order for `agentTool`:
1. `AGENT_PREFIX` env var (most reliable — set explicitly before calling start-task.sh)
2. `CLAUDE_CODE` env var → `claude-code`
3. `OPENHANDS_SESSION` env var → `openhands`
4. Default → `unknown`

Priority order for `agentModel`:
1. `AGENT_MODEL` env var
2. `ANTHROPIC_MODEL` env var
3. `OPENAI_MODEL` env var
4. Default → `unknown`

Set these before calling `scripts/start-task.sh`:
```bash
export AGENT_PREFIX=cc
export AGENT_MODEL=claude-opus-4-7
bash scripts/start-task.sh TER-1073
```

---

## 10. Reading Context on Session Start

Required read order:

1. `CLAUDE.md` — primary orientation
2. `AGENTS.md` — supplementary
3. `docs/agent-handoff/handoff.json` — previous session state (§4)
4. `docs/agent-context/START_HERE.md` — project state as of last push
5. `docs/agent-context/state.json` — machine-readable state
6. Linear task at `https://linear.app/terpcorp/issue/<taskId>/` — authoritative task description

---

## Quick Reference

```
START SESSION
  export AGENT_PREFIX=cc AGENT_MODEL=claude-opus-4-7
  bash scripts/start-task.sh TER-NNNN
  Read: handoff.json (if exists) → docs/sessions/active/Session-*.md
  Check: headSha matches `git rev-parse HEAD`
  Respect: doNotTouch before editing any file

DURING SESSION
  Commit every ~2h to signal liveness (heartbeat)
  Update doNotTouch if you start a mid-refactor

END SESSION (success)
  bash scripts/complete-task-fast.sh
  # or: bash scripts/complete-task.sh (full suite)

END SESSION (failure/pause)
  Update session file with what was done and blockers
  Commit the update
  Leave doNotTouch populated if applicable

RECOVER CRASHED SESSION
  bash scripts/force-close-session.sh TER-NNNN "reason"
  # Resets roadmap [~] to [ ] so task can be restarted

WEB AGENT
  Operator must provide context manually (paste handoff.json or START_HERE.md)
  Web agents cannot run scripts or access filesystem
  Web agents produce Linear comments with instructions for CLI agents
```
