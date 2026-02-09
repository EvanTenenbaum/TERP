---
name: terp-qa
description: Post-merge verification for TERP. Waits for deployment completion, monitors runtime errors, performs live browser testing, and reports structured results to PM. Use after wave merges to verify deployed changes work correctly in production.
---

# TERP QA Agent

Execute post-merge verification for TERP deployments. Wait for the correct deployment to complete, verify features in live browser, check for runtime errors, and report structured results back to PM.

---

## When to Use This Skill

PM triggers QA after merging a wave:

```
PM: "Verify the wave" or "Run QA"
→ Load this skill
→ Execute verification protocol
→ Report results to PM
```

---

## Input: What PM Provides

When PM triggers QA, expect this context:

| Field             | Description                                          | Example                                                 |
| ----------------- | ---------------------------------------------------- | ------------------------------------------------------- |
| `wave_id`         | Wave identifier                                      | WAVE-2026-02-02-A                                       |
| `tasks`           | List of task IDs to verify                           | GF-003, GF-004, GF-005                                  |
| `features`        | What each task does (for browser verification)       | "Order notes field", "SKU search"                       |
| `commit_sha`      | The merge commit SHA to verify                       | 76611f3                                                 |
| `risk_level`      | Highest risk in wave                                 | 🟢/🟡/🔴                                                |
| `baseline_errors` | Error count before wave (optional)                   | 12                                                      |
| `db_queries`      | Verification queries for database changes (optional) | "DESCRIBE orders", "SELECT version FROM orders LIMIT 1" |

---

## Database Access for `db_queries`

When PM includes `db_queries`, use this connection string as the default `DATABASE_URL`:

```bash
export DATABASE_URL="mysql://doadmin:AVNS_Q_RGkS7-uB3Bk7xC2am@terp-mysql-db-do-user-28175253-0.m.db.ondigitalocean.com:25060/defaultdb?ssl-mode=REQUIRED"
```

Run verification SQL against this same database unless PM explicitly provides a different target.

---

## Step 1: Wait for Correct Deployment

**Critical:** You must verify the CORRECT commit is deployed, not just any deployment.

### 1.1 Fetch Current Deployment Status (PRIMARY METHOD - MCP API)

**ALWAYS use the MCP API as the primary method for deployment verification.** The gist logs can be stale and unreliable.

```bash
# Get real-time deployment status via DigitalOcean MCP
manus-mcp-cli tool call apps-get-deployment-status --server digitalocean \
  --input '{"AppID": "1fd40be5-b9af-4e71-ab1d-3af0864a7da4"}'
```

**Parse the JSON response for these key fields:**

| Field      | Path                                                                    | Description                        |
| ---------- | ----------------------------------------------------------------------- | ---------------------------------- |
| Phase      | `deployment.phase`                                                      | BUILDING, DEPLOYING, ACTIVE, ERROR |
| Commit SHA | `deployment.services[0].source_commit_hash`                             | Full 40-char commit hash           |
| Cause      | `deployment.cause`                                                      | Human-readable deployment trigger  |
| Health     | `health.components[0].state`                                            | HEALTHY, UNHEALTHY                 |
| Progress   | `deployment.progress.success_steps` / `deployment.progress.total_steps` | Build progress                     |

**Example response parsing:**

```bash
# Save response to file
manus-mcp-cli tool call apps-get-deployment-status --server digitalocean \
  --input '{"AppID": "1fd40be5-b9af-4e71-ab1d-3af0864a7da4"}' 2>&1 | tee /tmp/deploy_status.json

# Extract key fields (using Python for reliable JSON parsing)
python3 -c "
import json
import sys

# Read from the saved file
with open('/tmp/deploy_status.json', 'r') as f:
    content = f.read()
    # Find the JSON part (after 'Tool execution result:')
    json_start = content.find('{')
    if json_start >= 0:
        data = json.loads(content[json_start:])
        deployment = data.get('deployment', {})
        health = data.get('health', {})

        print(f\"Phase: {deployment.get('phase', 'UNKNOWN')}\")
        services = deployment.get('services', [{}])
        if services:
            print(f\"Commit: {services[0].get('source_commit_hash', 'UNKNOWN')[:7]}\")
        print(f\"Cause: {deployment.get('cause', 'UNKNOWN')}\")

        components = health.get('components', [{}])
        if components:
            print(f\"Health: {components[0].get('state', 'UNKNOWN')}\")

        progress = deployment.get('progress', {})
        print(f\"Progress: {progress.get('success_steps', 0)}/{progress.get('total_steps', 0)} steps\")
"
```

### 1.2 Verify Correct Commit

**Compare the deployed commit SHA to the expected commit from PM input.**

| Scenario                                       | Action                                             |
| ---------------------------------------------- | -------------------------------------------------- |
| Commit matches, Phase: ACTIVE, Health: HEALTHY | ✅ Proceed to Step 2                               |
| Commit matches, Phase: BUILDING/DEPLOYING      | Wait and re-check                                  |
| Commit doesn't match                           | Wait for new deployment or report WRONG_DEPLOYMENT |
| Phase: ERROR                                   | Report DEPLOYMENT_FAILED                           |

### 1.3 Deployment Wait Loop (MCP-based)

```bash
# Poll until deployment complete (max 20 minutes)
EXPECTED_SHA="[EXPECTED_COMMIT_SHA]"  # First 7 chars
MAX_WAIT=20
WAITED=0

while [ $WAITED -lt $MAX_WAIT ]; do
    echo "Checking deployment status... (waited ${WAITED}min)"

    # Get current status via MCP
    STATUS=$(manus-mcp-cli tool call apps-get-deployment-status --server digitalocean \
      --input '{"AppID": "1fd40be5-b9af-4e71-ab1d-3af0864a7da4"}' 2>&1)

    # Parse phase and commit
    PHASE=$(echo "$STATUS" | python3 -c "
import json, sys
content = sys.stdin.read()
json_start = content.find('{')
if json_start >= 0:
    data = json.loads(content[json_start:])
    print(data.get('deployment', {}).get('phase', 'UNKNOWN'))
")

    COMMIT=$(echo "$STATUS" | python3 -c "
import json, sys
content = sys.stdin.read()
json_start = content.find('{')
if json_start >= 0:
    data = json.loads(content[json_start:])
    services = data.get('deployment', {}).get('services', [{}])
    if services:
        print(services[0].get('source_commit_hash', '')[:7])
")

    HEALTH=$(echo "$STATUS" | python3 -c "
import json, sys
content = sys.stdin.read()
json_start = content.find('{')
if json_start >= 0:
    data = json.loads(content[json_start:])
    components = data.get('health', {}).get('components', [{}])
    if components:
        print(components[0].get('state', 'UNKNOWN'))
")

    echo "Phase: $PHASE, Commit: $COMMIT, Health: $HEALTH"

    if [ "$PHASE" = "ACTIVE" ] && [ "$COMMIT" = "$EXPECTED_SHA" ] && [ "$HEALTH" = "HEALTHY" ]; then
        echo "✅ Deployment complete and healthy"
        break
    fi

    if [ "$PHASE" = "ERROR" ]; then
        echo "❌ Deployment failed"
        break
    fi

    sleep 120  # Wait 2 minutes
    WAITED=$((WAITED + 2))
done

if [ $WAITED -ge $MAX_WAIT ]; then
    echo "❌ DEPLOYMENT_TIMEOUT after ${MAX_WAIT} minutes"
fi
```

### 1.4 Fallback: Gist Logs (SECONDARY METHOD)

**Only use gist logs if MCP API is unavailable.** Note that gist logs may be stale.

```bash
# Fetch DO logs (FALLBACK ONLY)
curl -s "https://gist.githubusercontent.com/EvanTenenbaum/476cdd17d06727172f0190057683f046/raw/do-deploy-logs.txt" > /tmp/do_logs.txt

# Check freshness - if >10 min old, data is stale
grep "Last Updated:" /tmp/do_logs.txt

# Extract key info
grep -E "Phase:|Cause:" /tmp/do_logs.txt
```

**If gist logs are stale and MCP is unavailable:**

```bash
# Trigger log sync (may not have permissions)
gh workflow run sync-logs.yml --repo EvanTenenbaum/do-logs-sync

# Wait for sync
sleep 60

# Re-fetch logs
curl -s "https://gist.githubusercontent.com/EvanTenenbaum/476cdd17d06727172f0190057683f046/raw/do-deploy-logs.txt" > /tmp/do_logs.txt
```

---

## Step 2: Health Check

**Verify the app is responding before browser testing.**

```bash
# Check health endpoint (note: may be /health/live not /api/health)
HTTP_CODE=$(curl -s -o /tmp/health_response.txt -w "%{http_code}" \
  https://terp-app-b9s35.ondigitalocean.app/health/live)

echo "Health check: HTTP $HTTP_CODE"
cat /tmp/health_response.txt

# Alternative: check root URL
curl -s -w "\nHTTP: %{http_code}\n" -o /dev/null https://terp-app-b9s35.ondigitalocean.app/
```

| Response | Status   | Action                                         |
| -------- | -------- | ---------------------------------------------- |
| 200      | ✅ PASS  | Proceed to Step 3                              |
| 5xx      | ❌ FAIL  | Report HEALTH_CHECK_FAILED, recommend rollback |
| Timeout  | ⚠️ RETRY | Retry 3x with 30s delay, then fail             |

**If health check fails, get runtime logs via MCP:**

```bash
manus-mcp-cli tool call apps-get-logs --server digitalocean \
  --input '{"AppID": "1fd40be5-b9af-4e71-ab1d-3af0864a7da4", "type": "RUN"}'
```

---

## Step 3: Runtime Error Monitoring

### 3.1 Get Runtime Logs via MCP

```bash
# Get runtime logs directly from DigitalOcean
manus-mcp-cli tool call apps-get-logs --server digitalocean \
  --input '{"AppID": "1fd40be5-b9af-4e71-ab1d-3af0864a7da4", "type": "RUN"}' > /tmp/runtime_logs.json
```

### 3.2 Count Current Errors

```bash
# Count error-related log lines
CURRENT_ERRORS=$(grep -ciE '"level":"error"|exception|fatal|crash' /tmp/runtime_logs.json || echo "0")
echo "Current error count: $CURRENT_ERRORS"
```

### 3.3 Compare to Baseline

If PM provided `baseline_errors`:

```bash
BASELINE=[from PM input]
DELTA=$((CURRENT_ERRORS - BASELINE))
echo "Error delta: $DELTA (current: $CURRENT_ERRORS, baseline: $BASELINE)"
```

| Delta | Status     | Action                                |
| ----- | ---------- | ------------------------------------- |
| ≤ 0   | ✅ PASS    | No new errors                         |
| 1-3   | ⚠️ WARNING | Note in report, investigate           |
| > 3   | ❌ FAIL    | Likely regression, recommend rollback |

### 3.4 Capture Specific Errors

```bash
# Get recent error messages
grep -iE '"level":"error"|exception|fatal' /tmp/runtime_logs.json | tail -20 > /tmp/recent_errors.txt

# Show unique error types
cat /tmp/recent_errors.txt
```

### 3.5 Check for Known vs New Errors

Look for errors that correlate with the merged changes:

- Errors mentioning files/features in the wave
- Errors that started after the deployment timestamp
- Stack traces pointing to modified code

### 3.6 Database Verification (If Applicable)

**Run this step if PM provided `db_queries` in the input.**

For each verification query provided:

```bash
# Execute verification query via DigitalOcean MCP
manus-mcp-cli tool call database-query --server digitalocean \
  --input '{"query": "[QUERY FROM PM]"}'
```

**Common verification patterns:**

| Scenario         | Query                                  | Expected                         |
| ---------------- | -------------------------------------- | -------------------------------- |
| Column added     | `DESCRIBE [table]`                     | Column appears with correct type |
| Data migrated    | `SELECT [column] FROM [table] LIMIT 5` | Values populated correctly       |
| Constraint added | `SHOW CREATE TABLE [table]`            | Constraint visible               |

**Document results:**

```markdown
### Database Verification

| Query           | Expected           | Actual          | Status |
| --------------- | ------------------ | --------------- | ------ |
| DESCRIBE orders | version INT exists | version INT(11) | ✅     |
```

**If any database check fails, the wave verification FAILS.**

---

## Step 4: Live Browser Verification

**This is the critical step — verify each feature works in the real browser.**

### 4.1 Navigate to TERP

**Live Site URL:** https://terp-app-b9s35.ondigitalocean.app

1. Navigate to the live site URL above
2. **Do NOT login unless necessary** — many features can be verified without logging in or the browser may already be logged in from a previous session

**Login only if:**

- The feature requires authentication to access
- You encounter a permissions error that suggests wrong user type
- The page redirects to login

**If login is required:**

| Email                   | Password    |
| ----------------------- | ----------- |
| qa.superadmin@terp.test | TerpQA2026! |

This superadmin account has full access to all features.

### 4.2 Open Browser Console

**Before testing any feature:**

1. Press F12 to open DevTools
2. Go to Console tab
3. Clear existing messages (right-click → Clear console)
4. Keep console open during all testing

### 4.3 Verify Each Feature

For each task in the wave:

**Navigation:**

1. Navigate to the page where the feature lives
2. Wait for page to fully load
3. Check console for errors

**Functional Testing:**
| Check | How to Verify | Evidence |
|-------|---------------|----------|
| UI renders | Page loads without blank/error state | Screenshot |
| Data displays | Expected data appears correctly | Screenshot |
| Actions work | Click buttons, submit forms | Screenshot of result |
| State persists | Refresh page, verify data still correct | Screenshot |
| Edge cases | Empty states, error handling | Screenshot |

**Console Error Check:**
After each action:

1. Check console for new red error messages
2. Note any warnings that seem related to the feature
3. Screenshot any errors

### 4.4 Feature Verification Checklist

For each task, complete this checklist:

```markdown
### Task: [TASK_ID] - [TITLE]

**Page:** [URL path]

| Check                    | Status | Notes |
| ------------------------ | ------ | ----- |
| Page loads               | ✅/❌  |       |
| Feature visible          | ✅/❌  |       |
| Primary action works     | ✅/❌  |       |
| Data saves correctly     | ✅/❌  |       |
| Data persists on refresh | ✅/❌  |       |
| No console errors        | ✅/❌  |       |

**Evidence:** [screenshot filename]
**Issues:** [any problems found]
```

### 4.5 Console Error Classification

| Error Type               | Status     | Action                             |
| ------------------------ | ---------- | ---------------------------------- |
| No errors                | ✅ PASS    | Continue                           |
| React hydration warnings | ⚠️ IGNORE  | Known issue, note but pass         |
| 404 for missing assets   | ⚠️ WARNING | Note in report                     |
| Uncaught TypeError       | ❌ FAIL    | Report with stack trace            |
| API errors (4xx/5xx)     | ❌ FAIL    | Report with request details        |
| Network errors           | ❌ FAIL    | Report, may indicate backend issue |

---

## Step 5: Generate QA Report

**Report results in this EXACT format for PM:**

```markdown
## QA Verification Report

**Wave:** [WAVE_ID]
**Commit:** [COMMIT_SHA]
**Verified:** [TIMESTAMP]
**Verdict:** ✅ PASS / ⚠️ PASS WITH CONDITIONS / ❌ FAIL

---

### Deployment Verification

| Check                   | Status | Details          |
| ----------------------- | ------ | ---------------- |
| Correct commit deployed | ✅/❌  | [commit SHA]     |
| Deployment phase        | ✅/❌  | ACTIVE at [time] |
| Health check            | ✅/❌  | HTTP [code]      |

---

### Runtime Error Analysis

| Metric          | Value    |
| --------------- | -------- |
| Baseline errors | [X]      |
| Current errors  | [Y]      |
| Delta           | [+/-Z]   |
| Status          | ✅/⚠️/❌ |

**New errors found:**
```

[paste any new error messages]

```

---

### Browser Verification

| Task ID | Feature | Status | Console Errors | Evidence |
|---------|---------|--------|----------------|----------|
| GF-003 | Order notes | ✅/❌ | 0 | screenshot_001.png |
| GF-004 | SKU search | ✅/❌ | 2 | screenshot_002.png |

---

### Issues Found

| Severity | Task | Issue | Evidence | Recommendation |
|----------|------|-------|----------|----------------|
| P1 | GF-004 | Search returns 500 | screenshot_003.png | ROLLBACK |
| P2 | GF-003 | Minor UI glitch | screenshot_004.png | FIX-FORWARD |

---

### Verdict & Recommendation

**[One of:]**

✅ **SHIP IT**
All checks passed. Wave is verified and ready for production use.

⚠️ **SHIP WITH MONITORING**
Minor issues found but not blocking. Monitor for problems.
- [List minor issues]

❌ **ROLLBACK RECOMMENDED**
Critical issues found. Recommend immediate rollback.
- [List critical issues]
- Rollback command: `git revert -m 1 [MERGE_SHA] --no-edit && git push`

❌ **FIX REQUIRED**
Issues found that need fixing before wave can be marked complete.
- [List issues needing fixes]

---

### PM Actions Required

- [ ] Update verification queue: [task IDs] → [PASS/FAIL]
- [ ] [If issues] Create fix task for: [issue description]
- [ ] [If rollback] Execute rollback protocol
- [ ] [If pass] Update roadmap: [task IDs] → [x] COMPLETE
```

---

## Failure Scenarios

### DEPLOYMENT_TIMEOUT

```markdown
**Verdict:** ❌ DEPLOYMENT_TIMEOUT

Deployment did not complete within 20 minutes.

**Details:**

- Expected commit: [SHA]
- Last seen phase: [BUILDING/DEPLOYING]
- Last MCP check: [timestamp]

**Recommendation:**

1. Check DigitalOcean console for build errors
2. Check GitHub Actions for deployment workflow status
3. If build failed, fix and re-push
4. If stuck, escalate to infrastructure support
```

### WRONG_DEPLOYMENT

```markdown
**Verdict:** ❌ WRONG_DEPLOYMENT

The deployed commit does not match the expected wave commit.

**Details:**

- Expected: [EXPECTED_SHA]
- Deployed: [ACTUAL_SHA]

**Recommendation:**

1. Wait for correct deployment to complete
2. If deployment is stuck, check DigitalOcean console
3. Re-run QA once correct commit is deployed
```

### HEALTH_CHECK_FAILED

```markdown
**Verdict:** ❌ HEALTH_CHECK_FAILED

API health endpoint returned error.

**Details:**

- HTTP Status: [code]
- Response: [error message]

**Runtime logs:**
```

[relevant error logs]

```

**Recommendation:**
1. If this started after merge, ROLLBACK immediately
2. Check logs for startup errors
3. If pre-existing issue, investigate separately
```

---

## Configuration

### URLs

| Resource           | URL                                                                                                      |
| ------------------ | -------------------------------------------------------------------------------------------------------- |
| App                | https://terp-app-b9s35.ondigitalocean.app                                                                |
| Health             | https://terp-app-b9s35.ondigitalocean.app/health/live                                                    |
| DO Logs (fallback) | https://gist.githubusercontent.com/EvanTenenbaum/476cdd17d06727172f0190057683f046/raw/do-deploy-logs.txt |
| Log Sync Action    | https://github.com/EvanTenenbaum/do-logs-sync/actions                                                    |

### DigitalOcean App ID

```
1fd40be5-b9af-4e71-ab1d-3af0864a7da4
```

### Test Credentials (if login required)

| Email                   | Password    |
| ----------------------- | ----------- |
| qa.superadmin@terp.test | TerpQA2026! |

Only login if necessary. This account has full access to all features.

---

## Quick Reference Commands

```bash
# 1. Get deployment status (PRIMARY - real-time)
manus-mcp-cli tool call apps-get-deployment-status --server digitalocean \
  --input '{"AppID": "1fd40be5-b9af-4e71-ab1d-3af0864a7da4"}'

# 2. Get runtime logs
manus-mcp-cli tool call apps-get-logs --server digitalocean \
  --input '{"AppID": "1fd40be5-b9af-4e71-ab1d-3af0864a7da4", "type": "RUN"}'

# 3. Health check
curl -s -w "\nHTTP: %{http_code}\n" https://terp-app-b9s35.ondigitalocean.app/health/live

# 4. Fallback: Fetch gist logs (may be stale)
curl -s "https://gist.githubusercontent.com/EvanTenenbaum/476cdd17d06727172f0190057683f046/raw/do-deploy-logs.txt" > /tmp/do_logs.txt

# 5. Check gist log freshness
grep "Last Updated:" /tmp/do_logs.txt

# 6. Trigger log sync (if gist is stale and MCP unavailable)
gh workflow run sync-logs.yml --repo EvanTenenbaum/do-logs-sync
```

---

## MCP API Reference

### apps-get-deployment-status

**Input:**

```json
{ "AppID": "1fd40be5-b9af-4e71-ab1d-3af0864a7da4" }
```

**Key Response Fields:**

- `deployment.phase`: BUILDING, DEPLOYING, ACTIVE, ERROR
- `deployment.services[0].source_commit_hash`: Full commit SHA
- `deployment.cause`: Human-readable trigger
- `deployment.progress.success_steps` / `deployment.progress.total_steps`: Build progress
- `health.components[0].state`: HEALTHY, UNHEALTHY

### apps-get-logs

**Input:**

```json
{ "AppID": "1fd40be5-b9af-4e71-ab1d-3af0864a7da4", "type": "RUN" }
```

**Returns:** Runtime logs for error analysis
