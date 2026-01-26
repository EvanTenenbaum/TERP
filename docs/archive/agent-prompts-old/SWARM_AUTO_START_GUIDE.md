# Swarm Manual Start & Status Monitoring Guide

**Purpose:** Manual swarm agent execution with "work until" capability and status monitoring  
**Last Updated:** November 21, 2025

---

## 🚀 Manual Start Configuration

### GitHub Actions Workflow

The swarm can be started manually via GitHub Actions workflow with different execution modes.

**Workflow:** `.github/workflows/swarm-auto-start.yml` (renamed to "Swarm Manual Start")

**Execution Modes:**

1. **Auto** - Executes recommended high-priority tasks
2. **Batch** - Executes specific comma-separated task IDs
3. **Until Phase** - Works through all tasks until a specific phase is complete
4. **Until Task** - Works through all tasks until a specific task is complete

**How to trigger:**

1. Go to: https://github.com/EvanTenenbaum/TERP/actions
2. Select "Swarm Manual Start" workflow
3. Click "Run workflow"
4. Choose execution mode and provide required inputs
5. Click "Run workflow" button

**What it does:**

1. Checks swarm status for recommended tasks (if auto mode)
2. Executes tasks based on selected mode
3. Creates status report
4. Updates GitHub Actions summary

**View status:**

- Go to: https://github.com/EvanTenenbaum/TERP/actions
- Look for "Swarm Auto-Start" workflow runs

---

## 📊 Status Monitoring

### Automatic Status Updates

**Workflow:** `.github/workflows/swarm-status-monitor.yml`

**Schedule:**

- Runs every 30 minutes
- Can be triggered manually

**What it monitors:**

- Active agents and their status
- Stale agents (inactive > 4 hours)
- Pending tasks
- Recommended tasks
- Completed tasks today

**Output:**

- Status report saved to `docs/swarm-status-latest.md`
- GitHub Actions summary updated
- Optional Slack notifications (if configured)

---

## 🔧 Manual Commands

### Check Status Locally

```bash
# View status report (human-readable)
pnpm swarm:status

# View status as JSON
pnpm swarm:status:json

# View latest saved report
cat docs/swarm-status-latest.md
```

### Manual Swarm Execution

```bash
# Check what tasks are recommended
pnpm swarm status

# Auto-execute recommended tasks
pnpm swarm execute --auto

# Execute specific tasks
pnpm swarm execute --batch=BUG-002,BUG-003
```

---

## 🔔 Notifications

### Slack Integration (Optional)

To enable Slack notifications:

1. **Create Slack Webhook:**
   - Go to: https://api.slack.com/apps
   - Create new app or use existing
   - Add "Incoming Webhooks" feature
   - Create webhook URL

2. **Add to GitHub Secrets:**

   ```bash
   # Via GitHub UI:
   # Settings → Secrets and variables → Actions → New repository secret
   # Name: SLACK_WEBHOOK_URL
   # Value: [your webhook URL]
   ```

3. **Notifications will be sent:**
   - When swarm executes tasks
   - When stale agents detected
   - On workflow failures

### Email Notifications

GitHub Actions sends email notifications by default for:

- Workflow failures
- Workflow successes (if configured in repo settings)

**Configure:**

- Go to: Repository Settings → Notifications
- Enable email notifications for workflow runs

---

## 📋 Status Report Format

The status report includes:

### Summary

- Active agents count
- Stale agents count
- Completed today
- Pending tasks
- Recommended tasks

### Active Agents Table

| Task    | Session              | Branch        | Status    | Age (hrs) | Last Activity       |
| ------- | -------------------- | ------------- | --------- | --------- | ------------------- |
| BUG-003 | Session-20251121-... | agent/BUG-003 | 🟢 active | 1.2       | 2025-11-21 10:30 AM |

### Warnings

- Lists stale agents (> 4 hours inactive)
- Suggests investigation

---

## 🛠️ Local Cron Setup (Alternative)

If you prefer local execution instead of GitHub Actions:

### macOS/Linux

```bash
# Edit crontab
crontab -e

# Add these lines:
# Run swarm every 2 hours
0 */2 * * * cd /path/to/TERP && pnpm swarm execute --auto >> /tmp/swarm.log 2>&1

# Monitor status every 30 minutes
*/30 * * * * cd /path/to/TERP && pnpm swarm:status >> /tmp/swarm-status.log 2>&1
```

### Windows (Task Scheduler)

1. Open Task Scheduler
2. Create Basic Task
3. Set trigger: "Every 2 hours"
4. Action: Start a program
5. Program: `pnpm`
6. Arguments: `swarm execute --auto`
7. Start in: `C:\path\to\TERP`

---

## 🔍 Monitoring Dashboard

### View Latest Status

```bash
# View latest report
cat docs/swarm-status-latest.md

# View in browser (if you have a local server)
# Or check GitHub: docs/swarm-status-latest.md
```

### Check Active Sessions

```bash
# List active session files
ls -la docs/sessions/active/

# View aggregated sessions
cat docs/ACTIVE_SESSIONS.md
```

### Check Agent Branches

```bash
# List all agent branches
git branch -a | grep "agent/"

# View recent commits
git log --oneline --all --since="2 hours ago" | grep -i "agent\|bug-"
```

---

## 🚨 Troubleshooting

### Swarm Not Auto-Starting

**Check:**

1. GitHub Actions enabled for repository
2. Workflow file exists: `.github/workflows/swarm-auto-start.yml`
3. Workflow runs visible in Actions tab
4. No workflow errors in logs

**Fix:**

```bash
# Manually trigger workflow
# Go to: Actions → Swarm Auto-Start → Run workflow
```

### Status Monitor Not Running

**Check:**

1. Workflow exists: `.github/workflows/swarm-status-monitor.yml`
2. Workflow runs visible in Actions tab
3. Check workflow logs for errors

**Manual run:**

```bash
# Run locally
pnpm swarm:status

# Or trigger workflow manually
# Go to: Actions → Swarm Status Monitor → Run workflow
```

### Notifications Not Working

**Slack:**

1. Verify `SLACK_WEBHOOK_URL` secret is set
2. Test webhook URL manually:
   ```bash
   curl -X POST -H 'Content-type: application/json' \
     --data '{"text":"Test"}' \
     $SLACK_WEBHOOK_URL
   ```
3. Check workflow logs for notification errors

**Email:**

1. Check GitHub notification settings
2. Verify email address in GitHub account
3. Check spam folder

---

## 📈 Metrics & Analytics

### Track Progress

The status monitor tracks:

- **Active Agents:** Currently working agents
- **Stale Agents:** Inactive > 4 hours
- **Completed Today:** Tasks finished today
- **Pending Tasks:** All incomplete tasks
- **Recommended Tasks:** High-priority next tasks

### Historical Data

Status reports are saved to:

- `docs/swarm-status-latest.md` (latest)
- GitHub Actions workflow runs (historical)

---

## ⚙️ Configuration

### Adjust Auto-Start Frequency

Edit `.github/workflows/swarm-auto-start.yml`:

```yaml
schedule:
  # Change cron expression
  # Every hour: '0 * * * *'
  # Every 30 minutes: '*/30 * * * *'
  # Every 4 hours: '0 */4 * * *'
  - cron: "0 */2 * * *" # Current: every 2 hours
```

### Adjust Status Monitor Frequency

Edit `.github/workflows/swarm-status-monitor.yml`:

```yaml
schedule:
  # Change cron expression
  # Every 15 minutes: '*/15 * * * *'
  # Every hour: '0 * * * *'
  - cron: "*/30 * * * *" # Current: every 30 minutes
```

### Adjust Stale Threshold

Edit `scripts/swarm-status-monitor.ts`:

```typescript
const STALE_THRESHOLD_HOURS = 4; // Change this value
```

---

## 📝 Best Practices

1. **Monitor Regularly:**
   - Check status reports daily
   - Review stale agents weekly
   - Clean up completed sessions

2. **Review Auto-Start Results:**
   - Check GitHub Actions after each run
   - Verify tasks are executing correctly
   - Review any errors or timeouts

3. **Keep Notifications Configured:**
   - Set up Slack for real-time updates
   - Enable email for critical failures
   - Review notification settings periodically

4. **Manual Override:**
   - Use manual execution for urgent tasks
   - Disable auto-start if needed (comment out workflow)
   - Use `--batch` for specific task selection

---

## 🔗 Related Files

- **Swarm Manager:** `scripts/manager.ts`
- **Status Monitor:** `scripts/swarm-status-monitor.ts`
- **Auto-Start Workflow:** `.github/workflows/swarm-auto-start.yml`
- **Status Monitor Workflow:** `.github/workflows/swarm-status-monitor.yml`
- **Monitoring Guide:** `docs/AGENT_MONITORING_GUIDE.md`
- **Latest Status:** `docs/swarm-status-latest.md`

---

**Last Updated:** November 21, 2025
