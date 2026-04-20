#!/usr/bin/env bash
# linear-comment.sh — Post a comment to a Linear task
# Usage: bash scripts/linear-comment.sh <TASK_ID> <COMMENT_BODY>
# Returns the comment ID on stdout, empty string on failure
# Fails silently — never blocks agent workflow

TASK_ID="${1:-}"
COMMENT_BODY="${2:-}"

if [ -z "$TASK_ID" ] || [ -z "$COMMENT_BODY" ]; then
  exit 0
fi

LINEAR_KEY=$(grep 'LINEAR_API_KEY' ~/.codex/.env 2>/dev/null | cut -d= -f2 | tr -d '\r' || true)
if [ -z "$LINEAR_KEY" ]; then
  exit 0
fi

# Get the Linear internal ID for the issue (needed for comment mutation)
ISSUE_UUID=$(curl -s -X POST https://api.linear.app/graphql \
  -H 'Content-Type: application/json' \
  -H "Authorization: $LINEAR_KEY" \
  --max-time 8 \
  -d "{\"query\":\"{issue(id:\\\"${TASK_ID}\\\"){id}}\"}"\
  2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('issue',{}).get('id',''))" 2>/dev/null || echo '')

if [ -z "$ISSUE_UUID" ]; then
  exit 0
fi

# Escape the comment body for JSON
ESCAPED_BODY=$(python3 -c "import json,sys; print(json.dumps(sys.argv[1]))" "$COMMENT_BODY" 2>/dev/null || echo '""')

# Post comment
COMMENT_ID=$(curl -s -X POST https://api.linear.app/graphql \
  -H 'Content-Type: application/json' \
  -H "Authorization: $LINEAR_KEY" \
  --max-time 10 \
  -d "{\"query\":\"mutation { commentCreate(input: { issueId: \\\"${ISSUE_UUID}\\\", body: ${ESCAPED_BODY} }) { success comment { id } } }\"}" \
  2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); c=d.get('data',{}).get('commentCreate',{}); print(c.get('comment',{}).get('id','') if c.get('success') else '')" 2>/dev/null || echo '')

echo "$COMMENT_ID"
