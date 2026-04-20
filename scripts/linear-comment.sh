#!/usr/bin/env bash
# linear-comment.sh — Post a comment to a Linear task
# Usage: bash scripts/linear-comment.sh <TASK_ID> "<COMMENT_BODY>"
# Returns the comment ID on stdout, empty on failure. Fails silently.
# Requires: scripts/lib/linear_post_comment.py

TASK_ID="${1:-}"
COMMENT_BODY="${2:-}"
[ -z "$TASK_ID" ] || [ -z "$COMMENT_BODY" ] && exit 0

LINEAR_KEY=$(grep "LINEAR_API_KEY" ~/.codex/.env 2>/dev/null | cut -d= -f2 | tr -d "\r" || true)
[ -z "$LINEAR_KEY" ] && exit 0

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
HELPER="${SCRIPT_DIR}/lib/linear_post_comment.py"

if [ ! -f "$HELPER" ]; then
  exit 0
fi

python3 "$HELPER" "$TASK_ID" "$COMMENT_BODY" "$LINEAR_KEY" 2>/dev/null || true
