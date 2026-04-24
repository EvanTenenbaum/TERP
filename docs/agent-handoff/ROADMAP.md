# TERP Universal Agent Handoff — Atomic Implementation Roadmap
> **Version:** 1.0 | **Created:** 2026-04-19 | **Status:** READY TO EXECUTE
> **Owner:** Evan Tenenbaum | **Executor:** Hermes + Claude Code (Opus 4.7) on Mac Mini

---

## Objective

Any agent (Claude Web, Claude Code, Codex CLI, OpenHands, or anything future) picks up TERP work immediately without a deep dive. Enforced by git + CI — not markdown honor system.

## Guiding Principle

> If an agent can bypass it by ignoring a markdown file, it doesn't count as enforcement.

Real enforcement lives at: **git hooks → CI → branch protection**. Context delivery is separate from enforcement.

---

## Known Facts Going In

| Fact | Status |
|------|--------|
| `context:refresh` has no automated trigger | ❌ Honor system only |
| `context:refresh` returns 0 Linear issues | ❌ Query bug (21-day filter + global sort misses TERP issues) |
| Linear API key works | ✅ Confirmed live |
| Linear team: "Terpcorp" (id: d88bb32f-ea0a-4809-aac1-fde6ec81bad3) | ✅ Confirmed |
| `start-task.sh` validates against MASTER_ROADMAP.md, not Linear | ❌ Wrong source of truth |
| `complete-task.sh` runs full test suite (30-60min) | ❌ Blocks handoff |
| `03-agent-coordination.md` is empty | ❌ Spec never written |
| `05-external-agent-handoff.md` is empty | ❌ Spec never written |
| Lock file uses `touch` not `mkdir` (non-atomic) | ❌ Race condition possible |
| Branch protection on `main` — unknown | ⚠️ Needs verification |
| `--no-verify` bypass possible | ⚠️ CI must be independent backstop |
| `.git/persistent-pm/` exists with fresh data | ✅ Secondary state store available |

---

## Phases Overview

```
PHASE 0: Foundation      — Spec + diagnose (no code changes to harness)
PHASE 1: Fix Linear      — Get context:refresh returning real data
PHASE 2: Repair Harness  — Fix start/complete-task, atomicity, fast path
PHASE 3: Spec Files      — Write the two empty steering files
PHASE 4: Git Enforcement — Hooks + branch protection + CI
PHASE 5: Context Delivery — Linear comments, handoff.json, web agent support
PHASE 6: Convenience     — BOOT.sh / DONE.sh wrappers (last, not first)
PHASE 7: OpenHands       — Execution runtime standing up
PHASE 8: E2E Validation  — Full cross-tool handoff test
```

---

## PHASE 0 — Foundation
**Goal:** Verify environment, check branch protection, document current baseline.  
**Time estimate:** 30 min  
**Validation:** All facts confirmed, no surprises when phases begin.

### T-001: Verify GitHub branch protection on main
- **Action:** `gh api repos/EvanTenenbaum/TERP/branches/main/protection`
- **Success:** Confirm whether PRs are required, CI is required, direct push is blocked
- **If unprotected:** Document — will be fixed in Phase 4 before hooks go in
- **QA:** Output protection status to `docs/agent-handoff/baseline.md`

### T-002: Snapshot current harness state
- **Action:** Record current behavior of start-task.sh, complete-task.sh, and context:refresh
- **Document in `docs/agent-handoff/baseline.md`:**
  - What start-task.sh does today (MASTER_ROADMAP.md validation flow)
  - What complete-task.sh does today (full test suite)
  - What context:refresh does today (returns 0 issues)
  - What hooks exist today (pre-commit pattern checks only)
- **Success:** Baseline document committed so we can compare before/after
- **QA:** `git log --oneline -1` shows baseline commit

### T-003: Verify .git/persistent-pm contents
- **Action:** Read `.git/persistent-pm/current/state.json` and `START_HERE.md`
- **Determine:** Is this a parallel PM state system? Who writes to it? Is it trustworthy?
- **Decision:** Use it, replace it, or ignore it — documented in baseline.md
- **QA:** Decision recorded in baseline.md

---

## PHASE 1 — Fix Linear Integration
**Goal:** `pnpm context:refresh` returns real TERP issues.  
**Time estimate:** 45 min  
**Validation:** After fix, `state.json` contains >0 issues with correct TERP identifiers.

### T-004: Fix Linear query to scope to Terpcorp team
- **File:** `scripts/agent-context/generate-agent-context.mjs`
- **Problem:** `issues(first: N, orderBy: updatedAt, filter: { updatedAt: { gte: $updatedAfter } })` queries all workspace issues globally. The Terpcorp team issues haven't been touched in 10 days, so with a busy workspace they fall off the window.
- **Fix:** Add team filter to the GraphQL query:
  ```graphql
  issues(
    first: $issueCount,
    orderBy: updatedAt,
    filter: {
      team: { id: { eq: "d88bb32f-ea0a-4809-aac1-fde6ec81bad3" } }
    }
  )
  ```
- **Remove** the `updatedAfter` filter entirely — we want all active TERP issues, not just recently touched ones
- **Also fix:** `projects` query — scope to team as well
- **Success:** `pnpm context:refresh` returns TER-xxxx identifiers in state.json
- **QA:** `cat docs/agent-context/state.json | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d['tracker']['issues']), 'issues')"` returns > 0

### T-005: Add graceful degradation to context:refresh
- **File:** `scripts/agent-context/generate-agent-context.mjs`
- **Problem:** If Linear is down or rate-limited, refresh hard-fails. Agents can't boot.
- **Fix:** Wrap Linear call in try/catch — on failure, use last-known state.json with `freshness.status = "degraded"` and a clear warning. Never hard-exit on Linear failure.
- **Success:** Simulated Linear failure (`LINEAR_API_KEY=invalid pnpm context:refresh`) produces a warning + stale state, not a crash
- **QA:** Run with bad key, verify exit code 0 and warning message in output

### T-006: Extend lookback window and add state filter
- **File:** `scripts/agent-context/generate-agent-context.mjs`
- **Change:** Increase `linearLookbackDays` from 21 to 90 for issue query, remove date filter (team scope is enough)
- **Add:** Filter issues to exclude `completed` and `cancelled` states only — include everything else (backlog, todo, in progress, blocked)
- **Success:** state.json contains backlog + active TERP issues, not just recently-updated ones
- **QA:** Count of issues in state.json > 20

---

## PHASE 2 — Repair the Existing Harness
**Goal:** start-task and complete-task are reliable, atomic, and validate against Linear.  
**Time estimate:** 2 hours  
**Validation:** Each script tested with edge cases before Phase 3 begins.

### T-007: Fix lock file atomicity in start-task.sh
- **File:** `scripts/start-task.sh`
- **Problem:** `touch $LOCK_FILE` is not atomic — two processes can both pass the check.
- **Fix:**
  ```bash
  # Replace:
  if [ -e "$LOCK_FILE" ]; then error_exit "..."; fi
  touch "$LOCK_FILE"
  
  # With:
  if ! mkdir "$LOCK_FILE" 2>/dev/null; then
    # Check if lock is stale (PID no longer running)
    LOCK_PID=$(cat "$LOCK_FILE/pid" 2>/dev/null)
    if [ -n "$LOCK_PID" ] && ! kill -0 "$LOCK_PID" 2>/dev/null; then
      echo "⚠️  Removing stale lock from PID $LOCK_PID"
      rm -rf "$LOCK_FILE"
      mkdir "$LOCK_FILE"
    else
      error_exit "Another start-task process is running (PID: $LOCK_PID)"
    fi
  fi
  echo $$ > "$LOCK_FILE/pid"
  ```
- **Also fix:** complete-task.sh lock file with same pattern
- **QA:** Run two concurrent `pnpm start-task TER-TEST` — exactly one succeeds

### T-008: Add resume-session detection to start-task.sh
- **File:** `scripts/start-task.sh`
- **Problem:** If task is already `[~]` (in progress), start-task hard-fails. But "resume" is the primary use case.
- **Fix:** Before the "task already in progress" error, check if a session file exists for this task:
  ```bash
  if [ "$TASK_STATUS" == "[~]" ]; then
    # Look for existing session file
    EXISTING_SESSION=$(grep -rl "Task ID.*${TASK_ID}" "$SESSION_DIR"/ 2>/dev/null | head -1)
    if [ -n "$EXISTING_SESSION" ]; then
      echo "🔄 Resuming existing session for ${TASK_ID}"
      echo "📄 Session file: $EXISTING_SESSION"
      cat "$EXISTING_SESSION"
      # Switch to existing branch
      EXISTING_BRANCH=$(grep "Branch:" "$EXISTING_SESSION" | sed 's/.*`//;s/`.*//')
      git checkout "$EXISTING_BRANCH" 2>/dev/null || true
      rm -rf "$LOCK_FILE"
      exit 0
    else
      error_exit "Task ${TASK_ID} is in progress but no session file found. Run force-close-session.sh to recover."
    fi
  fi
  ```
- **QA:** Start a task, then run start-task again for same task — get resume output, not error

### T-009: Replace MASTER_ROADMAP.md validation with Linear API
- **File:** `scripts/start-task.sh`
- **Problem:** Tasks validated against MASTER_ROADMAP.md, but Linear is source of truth. These drift.
- **Fix:** Replace the grep-based validation with a Linear API call:
  ```bash
  LINEAR_KEY=$(grep ANTHROPIC_API_KEY ~/.codex/.env | head -1 | cut -d= -f2 || true)
  LINEAR_KEY=$(grep LINEAR_API_KEY ~/.codex/.env | cut -d= -f2)
  
  ISSUE_DATA=$(curl -s -X POST https://api.linear.app/graphql \
    -H "Content-Type: application/json" \
    -H "Authorization: $LINEAR_KEY" \
    --max-time 10 \
    -d "{\"query\":\"{issue(id:\\\"$TASK_ID\\\"){id title state{name type}}}\"}" 2>/dev/null)
  
  ISSUE_STATE=$(echo "$ISSUE_DATA" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['issue']['state']['type'])" 2>/dev/null)
  
  if [ -z "$ISSUE_STATE" ]; then
    error_exit "Task $TASK_ID not found in Linear or API unreachable. Use --adhoc for untracked work."
  fi
  if [ "$ISSUE_STATE" = "completed" ] || [ "$ISSUE_STATE" = "cancelled" ]; then
    error_exit "Task $TASK_ID is $ISSUE_STATE in Linear. Cannot start."
  fi
  ```
- **Fallback:** If Linear is unreachable, fall back to MASTER_ROADMAP.md with a warning
- **QA:** `pnpm start-task TER-1073` (completed task) → error. `pnpm start-task TER-XXXX` (active task) → success.

### T-010: Split complete-task.sh into fast and full paths
- **File:** `scripts/complete-task-fast.sh` (new) + `scripts/complete-task.sh` (modified)
- **Problem:** Full test suite takes 30-60min, blocking handoff.
- **New file `complete-task-fast.sh`:**
  - Runs: `pnpm check` (tsc, ~30s) + `pnpm lint` (~30s)
  - Does NOT run: `pnpm test`, `pnpm build`
  - Used by: git hooks, DONE.sh
  - Hard fails on tsc or lint errors
- **Modify `complete-task.sh`:**
  - Add `--fast` flag that calls fast path only
  - Default (no flag): full suite as today
  - Add comment: "Full suite runs in CI — use --fast for local handoff"
- **QA:** `pnpm complete-task-fast` completes in < 3 minutes on a clean branch

### T-011: Add force-close-session.sh recovery script
- **File:** `scripts/force-close-session.sh` (new)
- **Purpose:** Recover from crashed agent leaving session in `[~]` state
- **Behavior:**
  - Requires: task ID + reason (mandatory)
  - Moves session file to `docs/sessions/abandoned/` with ABANDONED status + reason + timestamp
  - Updates ACTIVE_SESSIONS.md
  - Does NOT run test suite
  - Appends to `docs/agent-handoff/audit.log`: timestamp, task, reason, who ran it
- **QA:** Create a stuck session manually, run force-close, verify session archived and audit log updated

### T-012: Add session-reaper.sh (TTL-based auto-abandon)
- **File:** `scripts/session-reaper.sh` (new)
- **Purpose:** Auto-clean sessions where agent crashed and nobody ran force-close
- **Behavior:**
  - Finds all sessions in `docs/sessions/active/` with last commit on their branch > 4 hours ago
  - Checks if branch still exists
  - If branch gone OR no recent commits: archives as ABANDONED, posts to audit log
  - Does NOT touch sessions with recent commits (agent may be working)
- **Wire to:** cron on Mac Mini (`0 * * * * cd /path/to/repo && pnpm session:reap`)
- **QA:** Create a stale session (fake old timestamp), run reaper, verify auto-archived

---

## PHASE 3 — Write the Spec Files
**Goal:** Populate the two empty steering files with real protocol.  
**Time estimate:** 1.5 hours  
**Validation:** Files reviewed by adversarial QA before Phase 4 begins.

### T-013: Write `03-agent-coordination.md`
- **File:** `.kiro/steering/03-agent-coordination.md`
- **Must define:**
  - Session lifecycle state machine: `PENDING → ACTIVE → PAUSED → COMPLETE | FAILED | ABANDONED`
  - Session ownership model (which agent/tool holds a session, how it's recorded)
  - Heartbeat contract (commit = heartbeat; no commit in 4h = stale)
  - Conflict resolution (two agents claim same task — first to mkdir lock wins)
  - Break-glass protocol (`HOTFIX=1` — what it skips, what it must still record)
  - Race condition handling (the mkdir lock pattern)
  - What "resume" means vs "start" — how any agent distinguishes them
- **Format:** Kiro steering file format (YAML frontmatter with `inclusion: always`)
- **QA:** Adversarial review by delegate_task subagent before committing

### T-014: Write `05-external-agent-handoff.md`  
- **File:** `.kiro/steering/05-external-agent-handoff.md`
- **Must define:**
  - Handoff state JSON schema (all fields, types, required vs optional)
  - Minimum viable handoff (what's the least a next agent needs)
  - Atomic write contract (temp file + rename pattern)
  - The Linear comment format (what gets posted for web agents)
  - How a web-based agent (Claude Web) reads current state: Linear task → comments → handoff
  - What to do on corrupt/missing handoff state
  - Agent identity recording (which tool/model/version wrote this session)
- **Format:** Kiro steering file format (YAML frontmatter with `inclusion: always`)  
- **QA:** Adversarial review by delegate_task subagent before committing

### T-015: Update UNIVERSAL_AGENT_RULES.md
- **File:** `UNIVERSAL_AGENT_RULES.md`
- **Change:** Update references to 03 and 05 to reflect they are now populated
- **Add:** Section explaining that enforcement is at git layer, not markdown layer
- **Add:** Web agent protocol (read Linear task comments)
- **QA:** Read-through — no broken references, no contradictions with CLAUDE.md

---

## PHASE 4 — Real Enforcement
**Goal:** Git + CI enforce session protocol regardless of tool used.  
**Time estimate:** 2 hours  
**Validation:** Attempting to commit without a session fails. Attempting to push a cancelled task fails. CI blocks PRs with no session file.

### T-016: Enable GitHub branch protection on main
- **Action:** GitHub repo settings (not code)
- **Settings:**
  - Require pull request before merging: ON
  - Require status checks to pass: ON (add CI job names after T-019)
  - Require branches to be up to date: ON
  - Restrict direct pushes: ON
- **QA:** Attempt `git push origin main` from a local branch → rejected

### T-017: Update pre-commit hook — session file validation
- **File:** `.husky/pre-commit`
- **Add after existing security checks:**
  ```bash
  # Session file validation
  CURRENT_BRANCH=$(git branch --show-current)
  
  # Skip for main, staging, production branches
  if [[ "$CURRENT_BRANCH" =~ ^(main|staging|production)$ ]]; then
    exit 0
  fi
  
  # Skip for HOTFIX mode
  if [ "$HOTFIX" = "1" ]; then
    echo "⚠️  HOTFIX mode — skipping session check. Recording bypass..."
    echo "$(date -u) | HOTFIX bypass | branch: $CURRENT_BRANCH | user: $(git config user.email)" >> docs/agent-handoff/audit.log
    git add docs/agent-handoff/audit.log 2>/dev/null || true
    exit 0
  fi
  
  # Check session file exists for this branch
  SESSION_EXISTS=$(find docs/sessions/active/ -name "*.md" -exec grep -l "Branch:.*\`$CURRENT_BRANCH\`" {} \; 2>/dev/null | head -1)
  
  if [ -z "$SESSION_EXISTS" ]; then
    echo "❌ No session file found for branch: $CURRENT_BRANCH"
    echo "   Run: pnpm start-task <TASK-ID>  to create a session"
    echo "   Or:  pnpm start-task --adhoc 'description'  for untracked work"
    echo "   Emergency: HOTFIX=1 git commit ... (recorded in audit log)"
    exit 1
  fi
  ```
- **QA:** Create a branch, attempt commit without session file → blocked with clear error

### T-018: Add pre-push hook — Linear task state validation
- **File:** `.husky/pre-push` (new)
- **Content:**
  ```bash
  #!/usr/bin/env sh
  CURRENT_BRANCH=$(git branch --show-current)
  
  # Extract task ID from branch name (agent/TER-XXXX-... or claude/TER-XXXX-...)
  TASK_ID=$(echo "$CURRENT_BRANCH" | grep -oP 'TER-[0-9]+' | head -1)
  
  # Skip if no task ID in branch name
  [ -z "$TASK_ID" ] && exit 0
  # Skip main/staging/production
  [[ "$CURRENT_BRANCH" =~ ^(main|staging|production)$ ]] && exit 0
  
  LINEAR_KEY=$(grep LINEAR_API_KEY ~/.codex/.env 2>/dev/null | cut -d= -f2)
  [ -z "$LINEAR_KEY" ] && exit 0  # Skip if no key (CI handles this)
  
  ISSUE_STATE=$(curl -s -X POST https://api.linear.app/graphql \
    -H "Content-Type: application/json" \
    -H "Authorization: $LINEAR_KEY" \
    --max-time 8 \
    -d "{\"query\":\"{issue(id:\\\"$TASK_ID\\\"){state{type}}}\"}" 2>/dev/null \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['issue']['state']['type'])" 2>/dev/null)
  
  if [ "$ISSUE_STATE" = "completed" ] || [ "$ISSUE_STATE" = "cancelled" ]; then
    echo "❌ Cannot push: Linear task $TASK_ID is $ISSUE_STATE"
    echo "   If this is intentional, use: HOTFIX=1 git push"
    exit 1
  fi
  ```
- **QA:** Push branch for a completed Linear task → blocked

### T-019: Add GitHub Actions CI job — session lifecycle validation
- **File:** `.github/workflows/session-validation.yml` (new)
- **Triggers:** `pull_request` (opened, synchronized, reopened)
- **Jobs:**
  1. `validate-session-file`: Check PR branch has a session file in `docs/sessions/active/`
  2. `validate-no-verify-bypass`: Check commit messages for `--no-verify` markers (git log can't detect this, but we can check if commit was made on a branch without session file)
  3. `check-linear-task`: Fetch Linear task state — warn (not fail) if task is completed/cancelled
- **QA:** Open a PR from a branch with no session file → CI fails with clear message

---

## PHASE 5 — Context Delivery
**Goal:** Any agent, including Claude Web, can read current state from Linear.  
**Time estimate:** 2 hours  
**Validation:** Open any active TERP Linear task — see current agent handoff state in comments.

### T-020: Define and implement handoff.json schema
- **File:** `docs/agent-handoff/handoff.json` (new, committed to repo)
- **Schema:**
  ```json
  {
    "schemaVersion": 1,
    "sessionId": "string",
    "taskId": "string (TER-XXXX)",
    "agentTool": "string (claude-code|codex-cli|openhands|claude-web|unknown)",
    "agentModel": "string",
    "startedAt": "ISO8601",
    "lastActivityAt": "ISO8601",
    "status": "ACTIVE|PAUSED|COMPLETE|FAILED|ABANDONED",
    "branch": "string",
    "headSha": "string",
    "whatWasDone": ["string"],
    "whatIsNext": ["string"],
    "doNotTouch": ["string (file paths)"],
    "blockers": ["string"],
    "linearCommentId": "string|null"
  }
  ```
- **Write pattern:** Always write to `handoff.json.tmp` then `mv` to `handoff.json` (atomic)
- **Validate on read:** Schema check — if invalid, treat as missing (don't crash)
- **QA:** Write a handoff.json, validate schema, corrupt it, verify reader falls back gracefully

### T-021: Wire handoff.json write into start-task.sh
- **File:** `scripts/start-task.sh`
- **Add at end of successful start:** Write handoff.json with status ACTIVE, whatIsNext from Linear task description
- **QA:** Run start-task, verify handoff.json written with correct fields

### T-022: Wire handoff.json write into complete-task-fast.sh
- **File:** `scripts/complete-task-fast.sh`
- **Add at end:** Update handoff.json status to COMPLETE, populate whatWasDone from recent commit messages
- **QA:** Run complete-task-fast, verify handoff.json updated to COMPLETE

### T-023: Post Linear comments on session start/end
- **Files:** `scripts/start-task.sh`, `scripts/complete-task-fast.sh`
- **On start:** Post comment to Linear task:
  ```
  🤖 Agent session started
  Tool: claude-code (Opus 4.7)
  Branch: agent/TER-XXXX-20260419-abc123
  Context: [link to handoff.json in GitHub]
  Next: [task description from Linear]
  ```
- **On complete:** Post comment:
  ```
  ✅ Session complete
  Done: [list from whatWasDone]
  PR: [gh pr view --json url]
  Next suggested: [next Linear task]
  ```
- **QA:** Run start-task, open Linear task in browser, see comment within 30 seconds

### T-024: Wire context:refresh into pre-push hook
- **File:** `.husky/pre-push`
- **Add:** Run `pnpm context:refresh` before Linear state check (silent, best-effort)
- **Rationale:** Ensures state.json is always fresh when a push happens — the most natural enforcement point
- **QA:** Make a push, verify state.json `generatedAt` updates to within seconds of push time

### T-025: Update CLAUDE.md to describe real system
- **File:** `CLAUDE.md`
- **Replace** honor-system language ("please run start-task") with factual enforcement description
- **Add:** Web agent protocol — read Linear task comments for current handoff state
- **Add:** "Enforcement is at git layer — hooks will block commits without a valid session"
- **QA:** Read CLAUDE.md — no instructions that rely on agent goodwill, all enforcement is described accurately

---

## PHASE 6 — Convenience Layer
**Goal:** CLI agents can start/resume/complete in one command.  
**Time estimate:** 1 hour  
**Validation:** Any CLI agent can run BOOT.sh and be oriented in < 30 seconds.

### T-026: Write BOOT.sh
- **File:** `BOOT.sh` (repo root)
- **Behavior:**
  ```bash
  #!/usr/bin/env bash
  # BOOT.sh — Agent orientation helper (not enforcement — git hooks do that)
  # Usage: ./BOOT.sh [task-id]
  
  set -e
  TASK_ID="$1"
  
  # 1. Refresh context (best-effort)
  echo "🔄 Refreshing context..."
  pnpm context:refresh 2>/dev/null || echo "⚠️  Context refresh failed — using last known state"
  
  # 2. Branch/state consistency check
  CURRENT_BRANCH=$(git branch --show-current)
  STATE_BRANCH=$(python3 -c "import json; print(json.load(open('docs/agent-context/state.json'))['git']['branch'])" 2>/dev/null)
  if [ "$CURRENT_BRANCH" != "$STATE_BRANCH" ]; then
    echo "⚠️  Branch mismatch: you are on '$CURRENT_BRANCH' but state.json says '$STATE_BRANCH'"
  fi
  
  # 3. Show current handoff state
  if [ -f "docs/agent-handoff/handoff.json" ]; then
    python3 -c "
  import json
  d = json.load(open('docs/agent-handoff/handoff.json'))
  print(f'📋 Last session: {d[\"taskId\"]} | {d[\"status\"]} | {d[\"agentTool\"]}')
  print(f'   Branch: {d[\"branch\"]}')
  if d.get('whatWasDone'): print('   Done: ' + '; '.join(d['whatWasDone'][:2]))
  if d.get('whatIsNext'): print('   Next: ' + '; '.join(d['whatIsNext'][:2]))
  if d.get('doNotTouch'): print('   ⚠️  Do not touch: ' + ', '.join(d['doNotTouch'][:3]))
  "
  fi
  
  # 4. Start or resume task if provided
  if [ -n "$TASK_ID" ]; then
    pnpm start-task "$TASK_ID"
  else
    echo ""
    echo "📌 No task ID provided. To start work:"
    echo "   ./BOOT.sh TER-XXXX    — start or resume a task"
    echo "   pnpm context:refresh  — refresh Linear state"
    echo "   cat docs/agent-context/START_HERE.md  — full orientation"
  fi
  
  echo ""
  echo "ℹ️  Enforcement note: git hooks will block commits without a valid session."
  echo "   This script is a helper — not the enforcement mechanism."
  ```
- **QA:** Run `./BOOT.sh` with no args — get orientation in < 10 seconds. Run with a task ID — get resume or start.

### T-027: Write DONE.sh
- **File:** `DONE.sh` (repo root)
- **Behavior:**
  - Detects current branch and session
  - Runs `complete-task-fast.sh` (tsc + lint)
  - If fast check passes: updates handoff.json, posts Linear comment, outputs PR command
  - If fast check fails: shows exactly what's broken, does NOT post to Linear, does NOT archive session
  - On success: outputs `gh pr create` command with pre-filled title from task
- **QA:** Run on clean branch → session closed, Linear updated, PR command shown. Run with tsc error → clear error, no state change.

---

## PHASE 7 — OpenHands Runtime
**Goal:** OpenHands running on Mac Mini, aware of session protocol.  
**Time estimate:** 3 hours  
**Validation:** OpenHands picks up a task started by Claude Code and continues correctly.

### T-028: Install OpenHands on Mac Mini (Docker)
- **Requirements:** Docker (via Colima qemu — not vz, see known pitfalls)
- **Command:**
  ```bash
  docker pull docker.all-hands.dev/all-hands-ai/openhands:latest
  ```
- **Configure:** Anthropic API key (Opus 4.7), TERP repo mount, port 3000
- **QA:** OpenHands UI accessible at `http://100.71.65.30:3000`

### T-029: Configure OpenHands agent startup
- **Create:** `.openhands/config.toml` in TERP repo
- **Wire:** Agent startup runs `./BOOT.sh` before any task
- **Wire:** Agent completion runs `./DONE.sh` before exiting
- **QA:** Assign OpenHands a task via UI — it runs BOOT.sh automatically

### T-030: Expose OpenHands via Tailscale Funnel
- **Command:** `/Applications/Tailscale.app/Contents/MacOS/Tailscale funnel --bg 3000`
- **Result:** `https://evans-mac-mini.tailbe55dd.ts.net/` → OpenHands UI
- **QA:** Access OpenHands from phone browser, assign a task

---

## PHASE 8 — End-to-End Validation
**Goal:** Prove the full handoff chain works across 3 different tools.  
**Time estimate:** 2 hours  
**This is the acceptance test for the entire initiative.**

### T-031: Cross-tool handoff test (Claude Code → OpenHands → Claude Web)
- **Scenario:**
  1. Pick a real TERP task (a small, safe one — docs or test addition)
  2. Start via Claude Code: `./BOOT.sh TER-XXXX`
  3. Make one commit, then close session mid-task: write handoff.json with `PAUSED` status
  4. Open task in Linear — verify handoff comment is visible with branch + what's done
  5. Start via OpenHands: runs BOOT.sh, reads handoff.json, resumes from correct state
  6. Make one more commit, run `./DONE.sh`
  7. Open task in Linear — verify completion comment with PR link
  8. Open Claude Web (claude.ai) — read Linear task — verify it can orient from comments alone
- **Pass criteria:** Step 8 succeeds without Claude Web needing to read the codebase

### T-032: Adversarial bypass test
- **Scenario 1:** Attempt `git commit --no-verify` — succeeds locally but CI fails on PR → pass
- **Scenario 2:** Attempt direct push to main → rejected by branch protection → pass
- **Scenario 3:** Start a task, crash mid-session (kill the process), wait 4h (or mock the timestamp), run session reaper → session auto-archived → pass
- **Scenario 4:** Two concurrent BOOT.sh invocations for same task → exactly one succeeds → pass

### T-033: Document the final architecture
- **File:** `docs/agent-handoff/ARCHITECTURE.md`
- **Contents:**
  - How enforcement works (diagram: agent → git hook → CI → merge)
  - How context delivery works (diagram: start-task → handoff.json → Linear comment → any agent)
  - Session lifecycle state machine (final version)
  - Break-glass protocol
  - Recovery runbook (stale sessions, corrupt handoff, missing session files)
  - What each tool needs to do (Claude Code, Codex CLI, OpenHands, Claude Web)
- **QA:** New engineer reads only this file + CLAUDE.md and can participate in the system

---

## Sequencing & Dependencies

```
T-001, T-002, T-003   ← Phase 0, all parallel, must finish before Phase 1

T-004, T-005, T-006   ← Phase 1, sequential (004 before 006), must finish before T-009

T-007                 ← Phase 2, independent, can start anytime
T-008                 ← Phase 2, depends on T-007
T-009                 ← Phase 2, depends on T-004 (Linear fix)
T-010                 ← Phase 2, independent
T-011, T-012          ← Phase 2, independent, can run parallel

T-013, T-014, T-015   ← Phase 3, sequential (013 before 015), adversarial QA each before commit

T-016                 ← Phase 4, first (GitHub settings, no code)
T-017                 ← Phase 4, depends on T-008 (session file exists)
T-018                 ← Phase 4, depends on T-009 (Linear validation)
T-019                 ← Phase 4, depends on T-017 + T-018

T-020                 ← Phase 5, before T-021/T-022/T-023
T-021, T-022          ← Phase 5, parallel after T-020
T-023                 ← Phase 5, depends on T-021 + T-022
T-024                 ← Phase 5, depends on T-004 (Linear fix)
T-025                 ← Phase 5, depends on T-013 + T-014 (spec files written)

T-026, T-027          ← Phase 6, depends on T-008 + T-010 + T-020 all complete

T-028, T-029, T-030   ← Phase 7, sequential, depends on Phase 6 complete

T-031, T-032, T-033   ← Phase 8, T-031 + T-032 parallel, T-033 after both
```

---

## QA Gates Between Phases

| Gate | Before Phase | Criteria |
|------|-------------|----------|
| **G0** | Phase 1 | Baseline documented, branch protection status known |
| **G1** | Phase 2 | context:refresh returns >20 TERP issues with TER-identifiers |
| **G2** | Phase 3 | start-task, complete-task-fast, force-close, session-reaper all tested with edge cases |
| **G3** | Phase 4 | Spec files adversarially QA'd and committed |
| **G4** | Phase 5 | Commit without session file is blocked. Push for cancelled task is blocked. |
| **G5** | Phase 6 | Linear task shows handoff comment within 30s of session start |
| **G6** | Phase 7 | BOOT.sh + DONE.sh tested across all 3 CLI tools (Claude Code, Codex, direct bash) |
| **G7** | Phase 8 | OpenHands picks up a task, T-031 cross-tool test passes |

---

## What This Will Never Solve (Explicit Non-Goals)

- **`--no-verify` cannot be prevented locally** — CI is the backstop, not prevention. Accepted.
- **Simultaneous web agents** — if two people give Claude Web the same task at once, conflict isn't detectable until push. Linear comment system reduces, doesn't eliminate.
- **Test suite performance** — full suite still runs in CI. If CI is slow, PRs queue. Separate initiative.
- **Secret management** — LINEAR_API_KEY and ANTHROPIC_API_KEY in `~/.codex/.env` is fine for local dev. CI uses GitHub secrets. Out of scope here.

---

## Estimated Total Timeline

| Phase | Tasks | Est. Time |
|-------|-------|-----------|
| 0 Foundation | 3 | 30 min |
| 1 Linear fix | 3 | 45 min |
| 2 Harness repair | 6 | 2 hr |
| 3 Spec files | 3 | 1.5 hr |
| 4 Enforcement | 4 | 2 hr |
| 5 Context delivery | 6 | 2 hr |
| 6 Convenience | 2 | 1 hr |
| 7 OpenHands | 3 | 3 hr |
| 8 Validation | 3 | 2 hr |
| **Total** | **33 tasks** | **~15 hours** |

Realistically with agent execution: 2-3 working sessions on the Mac Mini.
