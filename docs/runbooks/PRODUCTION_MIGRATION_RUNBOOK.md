# Production Migration Runbook: DigitalOcean Managed Infrastructure

**Last Updated**: 2026-02-18
**Source**: TER-235 deployment experience

---

## 1. Direct Database Access from External Environments Is Unreliable

The Manus sandbox (and any ephemeral CI/CD environment) cannot reliably connect to a DigitalOcean Managed MySQL database. The outbound IP address rotates unpredictably across multiple IPs. Even after adding IPs to the database firewall:

- Firewall rule propagation takes 2-5 minutes on DigitalOcean
- By the time the rule propagates, the outbound IP may have changed
- TCP connections succeed at the socket level (port 25060 is open), but the MySQL handshake is rejected by the firewall layer -- so `telnet` works but `mysql` does not

**Bottom line**: Do not waste time trying to connect directly. Use the job-based approach below.

---

## 2. The Proven Pattern: Temporary App Platform Job Components

The correct way to run one-off scripts (migrations, backfills, data fixes) against a DigitalOcean Managed Database is to add a **temporary job component** to the App Platform app spec.

Jobs run inside the VPC and have direct database access through the `${db-component-name.DATABASE_URL}` binding.

### How it works:

1. Call `apps-update` via the DigitalOcean MCP with a modified app spec that includes a `jobs` array
2. The job builds from the same Dockerfile and repo as the web service
3. It runs your script via the `run_command` field
4. After the job succeeds, update the spec again to **remove the job** so it doesn't re-run on future deployments

---

## 3. Critical MCP Tool Quirks

### Parameter naming is inconsistent across tools:

| Tool | ID Parameter Name |
|------|-------------------|
| `apps-get-deployment-status` | `AppID` |
| `apps-update` | `app_id` (nested inside `update.app_id`) |
| `apps-get-logs` | `AppID` |
| `db-cluster-update-firewall-rules` | `id` |
| `db-cluster-list` | `{}` (no params) |

Always run `manus-mcp-cli tool get <tool-name> --server digitalocean` to check exact parameter names before calling a tool.

### The `apps-update` payload structure is deeply nested:

```json
{
  "update": {
    "app_id": "...",
    "request": {
      "spec": { "...full app spec..." }
    }
  }
}
```

**You must include the entire app spec** (services, databases, ingress, region) -- not just the changes. Omitting a section (like `databases`) will cause the update to remove that component.

---

## 4. Auto-Rollback Behavior

If a job exits with a non-zero code, DigitalOcean automatically **rolls back the entire deployment** -- including the web service -- to the previous working state. This means:

- The web service reverts to the old code
- The job's `run_command` reverts to whatever it was in the previous spec
- You must fix the script, push to `main`, and trigger a new deployment

This is actually a safety feature, but it can be confusing if you don't expect it. Always verify your scripts will exit cleanly before deploying them as jobs.

---

## 5. Chained Commands in `run_command` Are Unreliable

When using `&&` to chain two scripts (`script1.ts && script2.ts`), only the first script's output appeared in deploy logs. The job reported success (exit code 0), but the second script's output was absent.

**Recommendation**: Run each script as a separate job deployment. It takes an extra build cycle (~5 minutes) but gives you clear, isolated logs and failure signals.

---

## 6. `deploy_on_push` Interaction with Jobs

If the web service has `deploy_on_push: true` (which TERP does), every push to `main` triggers a new deployment. If a job component is still in the spec, it will re-run on every push.

**Always clean up the job immediately after it succeeds.**

---

## 7. Log Retrieval

Job logs are available via `apps-get-logs` with `LogType: "DEPLOY"` and the specific Component name. The MCP returns a pre-signed S3 URL to the log file. Runtime logs (`LogType: "RUN"`) are for long-running services, not jobs.

---

## 8. Database Firewall Management

The firewall rules use a `type` field that can be `app`, `ip_addr`, `droplet`, or `tag`. For production, the safest configuration is:

```json
{"type": "app", "value": "<app-id>"}
```

This allows only the App Platform app to connect. If you add IP addresses for debugging, **always restore to app-only access afterward**.

---

## 9. Deployment Timing

Typical deployment cycle for TERP on DigitalOcean App Platform:

| Phase | Duration |
|-------|----------|
| Build (Docker) | 4-5 minutes |
| Deploy (health check) | 3-5 minutes |
| Job execution | 1-2 minutes |
| **Total** | **8-12 minutes** |

The health check has `initial_delay_seconds: 120` configured, which accounts for most of the deploy phase duration.

---

## Quick Reference: Running a Migration

```bash
# 1. Get current app spec
doctl apps get <app-id> --format json > /tmp/current-spec.json

# 2. Add job to spec (see Section 2)
# 3. Deploy via apps-update
# 4. Monitor: apps-get-logs with LogType: "DEPLOY"
# 5. Verify: curl https://terp-app-b9s35.ondigitalocean.app/api/health
# 6. Clean up: Remove job from spec, re-deploy
# 7. Restore firewall: app-only access
```
