#!/usr/bin/env bash
# handoff-write.sh — Atomic handoff.json writer
# Usage: source this file, then call write_handoff with variables set
# Required env: TASK_ID, SESSION_ID, STATUS, BRANCH, WHAT_DONE, WHAT_NEXT, DO_NOT_TOUCH, BLOCKERS
# Optional env: AGENT_TOOL, AGENT_MODEL, STARTED_AT, LINEAR_COMMENT_ID

write_handoff() {
  local HANDOFF_DIR="docs/agent-handoff"
  local HANDOFF_TMP="${HANDOFF_DIR}/.handoff.json.tmp"
  local HANDOFF_PATH="${HANDOFF_DIR}/handoff.json"

  mkdir -p "$HANDOFF_DIR"

  local AGENT_TOOL_VAL="${AGENT_TOOL:-unknown}"
  local AGENT_MODEL_VAL="${AGENT_MODEL:-unknown}"
  local NOW_ISO
  NOW_ISO=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  local HEAD_SHA
  HEAD_SHA=$(git rev-parse HEAD 2>/dev/null || echo 'unknown')
  local STARTED_AT_VAL="${STARTED_AT:-$NOW_ISO}"

  # Detect agent tool from env if not set
  if [ "$AGENT_TOOL_VAL" = 'unknown' ]; then
    if [ -n "${AGENT_PREFIX:-}" ]; then
      case "$AGENT_PREFIX" in
        cc) AGENT_TOOL_VAL='claude-code' ;;
        codex) AGENT_TOOL_VAL='codex-cli' ;;
        oh) AGENT_TOOL_VAL='openhands' ;;
        ha) AGENT_TOOL_VAL='hermes' ;;
        *) AGENT_TOOL_VAL='unknown' ;;
      esac
    fi
  fi

  # Detect model from env
  if [ "$AGENT_MODEL_VAL" = 'unknown' ]; then
    AGENT_MODEL_VAL="${AGENT_MODEL:-${ANTHROPIC_MODEL:-${OPENAI_MODEL:-unknown}}}"
  fi

  # Build JSON arrays from pipe-separated strings
  local DONE_JSON NEXT_JSON DNT_JSON BLOCK_JSON
  DONE_JSON=$(echo "${WHAT_DONE:-}" | python3 -c "
import sys, json
lines = [l.strip() for l in sys.stdin.read().split('|') if l.strip()]
print(json.dumps(lines[:5]))
")
  NEXT_JSON=$(echo "${WHAT_NEXT:-}" | python3 -c "
import sys, json
lines = [l.strip() for l in sys.stdin.read().split('|') if l.strip()]
print(json.dumps(lines[:5]))
")
  DNT_JSON=$(echo "${DO_NOT_TOUCH:-}" | python3 -c "
import sys, json
lines = [l.strip() for l in sys.stdin.read().split('|') if l.strip()]
print(json.dumps(lines))
")
  BLOCK_JSON=$(echo "${BLOCKERS:-}" | python3 -c "
import sys, json
lines = [l.strip() for l in sys.stdin.read().split('|') if l.strip()]
print(json.dumps(lines))
")

  local SESSION_FILE_PATH
  SESSION_FILE_PATH=$(grep -rl "Task ID.*${TASK_ID}" docs/sessions/active/ 2>/dev/null | head -1 || echo '')

  # Write to temp file (same directory = atomic mv)
  python3 - << PYEOF
import json
payload = {
    "schemaVersion": 1,
    "sessionId": "${SESSION_ID}",
    "taskId": "${TASK_ID}",
    "agentTool": "${AGENT_TOOL_VAL}",
    "agentModel": "${AGENT_MODEL_VAL}",
    "startedAt": "${STARTED_AT_VAL}",
    "lastActivityAt": "${NOW_ISO}",
    "status": "${STATUS}",
    "branch": "${BRANCH}",
    "headSha": "${HEAD_SHA}",
    "sessionFilePath": "${SESSION_FILE_PATH}",
    "whatWasDone": ${DONE_JSON},
    "whatIsNext": ${NEXT_JSON},
    "doNotTouch": ${DNT_JSON},
    "blockers": ${BLOCK_JSON},
}
with open("${HANDOFF_TMP}", "w") as f:
    json.dump(payload, f, indent=2)
print("OK")
PYEOF

  # Validate JSON
  python3 -c 'import json,sys; json.load(sys.stdin)' < "$HANDOFF_TMP" || {
    echo "ERROR: handoff JSON validation failed — aborting write" >&2
    rm -f "$HANDOFF_TMP"
    return 1
  }

  # Atomic rename
  mv "$HANDOFF_TMP" "$HANDOFF_PATH"

  # Append to audit log
  echo "{\"ts\":\"${NOW_ISO}\",\"event\":\"WRITE\",\"sessionId\":\"${SESSION_ID}\",\"status\":\"${STATUS}\",\"agentTool\":\"${AGENT_TOOL_VAL}\",\"taskId\":\"${TASK_ID}\"}" >> "${HANDOFF_DIR}/audit.log"
}
