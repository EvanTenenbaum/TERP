#!/usr/bin/env python3
import sys, json, subprocess

task_id = sys.argv[1]
body = sys.argv[2]
key = sys.argv[3]

# Get UUID
r = subprocess.run(
    ["curl", "-sk", "-X", "POST", "https://api.linear.app/graphql",
     "-H", "Content-Type: application/json",
     "-H", f"Authorization: {key}",
     "--max-time", "8",
     "-d", json.dumps({"query": '{issue(id:"' + task_id + '"){id}}'})],
    capture_output=True, text=True, timeout=10
)
try:
    uuid = json.loads(r.stdout).get("data", {}).get("issue", {}).get("id", "")
except Exception:
    sys.exit(0)
if not uuid:
    sys.exit(0)

# Post comment
mutation = 'mutation { commentCreate(input: { issueId: "' + uuid + '", body: ' + json.dumps(body) + ' }) { success comment { id } } }'
r = subprocess.run(
    ["curl", "-sk", "-X", "POST", "https://api.linear.app/graphql",
     "-H", "Content-Type: application/json",
     "-H", f"Authorization: {key}",
     "--max-time", "10",
     "-d", json.dumps({"query": mutation})],
    capture_output=True, text=True, timeout=12
)
try:
    result = json.loads(r.stdout).get("data", {}).get("commentCreate", {})
    if result.get("success"):
        print(result.get("comment", {}).get("id", ""))
except Exception:
    pass
