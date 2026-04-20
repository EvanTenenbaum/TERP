#!/bin/bash
# TERP Session Reaper v1.0
# Auto-archives abandoned sessions (no commit in 4h, branch gone or stale).
# Run via cron: 0 * * * * cd /path/to/repo && bash scripts/session-reaper.sh
# Safe to run repeatedly — idempotent.

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo '.')"
cd "$REPO_ROOT"

SESSION_DIR="docs/sessions/active"
ABANDONED_DIR="docs/sessions/abandoned"
AUDIT_LOG="docs/agent-handoff/audit.log"
STALE_HOURS=4

mkdir -p "$ABANDONED_DIR" "docs/agent-handoff"

NOW=$(date +%s)
ABANDONED_COUNT=0

for SESSION_FILE in "$SESSION_DIR"/*.md; do
  [ -f "$SESSION_FILE" ] || continue

  SESSION_NAME=$(basename "$SESSION_FILE")

  # Extract branch from session file
  BRANCH=$(grep 'Branch:' "$SESSION_FILE" | sed "s/.*\`//;s/\`.*//" | tr -d ' ' | head -1 || true)
  [ -z "$BRANCH" ] && continue

  # Check if branch still exists
  BRANCH_EXISTS=$(git show-ref --verify --quiet "refs/remotes/origin/${BRANCH}" 2>/dev/null && echo yes || echo no)
  if [ "$BRANCH_EXISTS" = 'no' ]; then
    REASON="branch no longer exists on remote"
  else
    # Get last commit time on branch
    LAST_COMMIT_TIME=$(git log "origin/${BRANCH}" --format='%ct' -1 2>/dev/null || echo 0)
    HOURS_SINCE=$(( (NOW - LAST_COMMIT_TIME) / 3600 ))
    if [ "$HOURS_SINCE" -lt "$STALE_HOURS" ]; then
      continue  # Active — skip
    fi
    REASON="no commit activity for ${HOURS_SINCE}h (threshold: ${STALE_HOURS}h)"
  fi

  # Archive it
  cat >> "$SESSION_FILE" << EOF

## Reaper Record
- **Auto-archived by:** session-reaper.sh
- **Archived at:** $(date -u +"%Y-%m-%d %H:%M:%S UTC")
- **Reason:** ${REASON}
EOF

  sed -i '' 's/🟡 In Progress/🔴 ABANDONED (auto-reaped)/' "$SESSION_FILE" 2>/dev/null || \
  sed -i 's/🟡 In Progress/🔴 ABANDONED (auto-reaped)/' "$SESSION_FILE"

  mv "$SESSION_FILE" "$ABANDONED_DIR/reaped-${SESSION_NAME}"

  # Reset roadmap status so task can be restarted
  TASK_ID=$(grep 'Task ID:' "$ABANDONED_DIR/reaped-${SESSION_NAME}" 2>/dev/null | grep -oP 'TER-[0-9]+' | head -1 || true)
  MASTER_ROADMAP="docs/roadmaps/MASTER_ROADMAP.md"
  if [ -n "$TASK_ID" ] && [ -f "$MASTER_ROADMAP" ]; then
    sed -i '' "s/\(${TASK_ID}.*\)\[~\]/\1[ ]/" "$MASTER_ROADMAP" 2>/dev/null || \
    sed -i "s/\(${TASK_ID}.*\)\[~\]/\1[ ]/" "$MASTER_ROADMAP"
  fi

  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) | REAPED | ${SESSION_NAME} | branch: ${BRANCH} | reason: ${REASON}" >> "$AUDIT_LOG"

  ABANDONED_COUNT=$((ABANDONED_COUNT + 1))
done

if [ "$ABANDONED_COUNT" -gt 0 ]; then
  echo "[session-reaper] Archived ${ABANDONED_COUNT} abandoned session(s). See ${AUDIT_LOG}."
else
  echo "[session-reaper] No stale sessions found."
fi
