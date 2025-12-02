# Auto Deploy Monitor & Self-Heal System

**Version**: 1.0  
**Last Updated**: 2025-12-02  
**Status**: Production Ready

---

## Overview

The Auto Deploy Monitor & Self-Heal system automatically monitors DigitalOcean deployments and attempts to fix failures without human intervention.

### Key Features

✅ **Automatic Monitoring** - Starts after every push to main
✅ **Intelligent Analysis** - Identifies common deployment issues
✅ **Self-Healing** - Attempts automatic fixes (up to 3 times)
✅ **Loop Prevention** - Stops if same error repeats
✅ **GitHub Integration** - Creates issues on failure
✅ **Non-Blocking** - Runs in background, doesn't block workflow

---

## How It Works

```
Push to main
    ↓
Post-push hook triggers
    ↓
Auto-heal script starts (background)
    ↓
Monitor deployment
    ↓
Deployment succeeds? → ✅ Done
    ↓ No
Analyze failure logs
    ↓
Identify error type
    ↓
Attempt automatic fix
    ↓
Commit & push fix
    ↓
Monitor new deployment
    ↓
Repeat (max 3 attempts)
    ↓
All attempts failed? → ❌ Create GitHub issue
```

---

## Components

### 1. Auto-Heal Script

**Location**: `scripts/auto-deploy-heal.sh`

**Features**:
- Monitors deployment with timeout (10 min per attempt)
- Analyzes build and deploy logs
- Identifies error types
- Applies automatic fixes
- Commits and pushes fixes
- Tracks attempts to prevent loops

**Error Types Detected**:
- TypeScript errors
- Missing dependencies
- Out of memory
- Database connection issues
- Missing environment variables
- Port conflicts
- Unknown errors

### 2. Post-Push Hook

**Location**: `.husky/post-push`

**Behavior**:
- Triggers on push to `main` branch only
- Starts auto-heal script in background
- Non-blocking (you can continue working)
- Creates status file for monitoring

### 3. GitHub Action

**Location**: `.github/workflows/auto-deploy-monitor.yml`

**Features**:
- Runs on every push to main
- Monitors deployment from GitHub
- Creates issues on failure
- Comments on commits with status
- Provides detailed failure reports

### 4. Kiro Hook

**Location**: `.kiro/hooks/auto-deploy-monitor.json`

**Behavior**:
- Triggers when agent completes work involving deployment
- Sends message to start monitoring
- Provides instructions for manual intervention if needed

---

## Safety Features

### Loop Prevention

1. **Max Attempts**: 3 attempts maximum
2. **Error Tracking**: Stops if same error repeats 2+ times
3. **Timeout**: 10 minutes per attempt
4. **Manual Override**: Can be stopped with `kill <PID>`

### What Gets Fixed Automatically

✅ **Can Auto-Fix**:
- Missing dependencies (reinstall)
- Lockfile issues (update lockfile)
- Port conflicts (retry)
- Transient network issues (retry)

❌ **Requires Manual Fix**:
- TypeScript errors (code issues)
- Memory issues (need bigger instance)
- Database connection (config issue)
- Missing env vars (need to set in DO)
- Unknown errors (need investigation)

---

## Usage

### Automatic (Recommended)

Just push to main - the system handles everything:

```bash
git push origin main
# Auto-heal starts automatically in background
```

### Manual Trigger

If you want to run manually:

```bash
# Run auto-heal script
./scripts/auto-deploy-heal.sh

# Or trigger GitHub Action
gh workflow run auto-deploy-monitor.yml
```

### Monitor Progress

```bash
# Find the status file
ls -lt .deployment-status-*.log | head -1

# Watch in real-time
tail -f .deployment-status-<commit>.log

# Check if monitoring is running
ps aux | grep auto-deploy-heal
```

### Stop Monitoring

```bash
# Find the PID
cat .deployment-monitor-<commit>.pid

# Kill the process
kill <PID>
```

---

## Configuration

### Adjust Safety Limits

Edit `scripts/auto-deploy-heal.sh`:

```bash
MAX_ATTEMPTS=3          # Max fix attempts
TIMEOUT_MINUTES=10      # Timeout per attempt
ERROR_COUNT=2           # Stop if same error repeats this many times
```

### Disable Auto-Heal

To disable auto-heal but keep monitoring:

```bash
# Rename the script
mv scripts/auto-deploy-heal.sh scripts/auto-deploy-heal.sh.disabled

# Post-push hook will fall back to basic monitoring
```

### Enable/Disable GitHub Action

Edit `.github/workflows/auto-deploy-monitor.yml`:

```yaml
# Comment out the 'on' section to disable
# on:
#   push:
#     branches:
#       - main
```

---

## Troubleshooting

### Auto-Heal Not Starting

**Check**:
```bash
# Verify script exists and is executable
ls -la scripts/auto-deploy-heal.sh
# Should show: -rwxr-xr-x

# Make executable if needed
chmod +x scripts/auto-deploy-heal.sh
```

### Deployment Still Failing

**Check logs**:
```bash
# View auto-heal logs
cat .deployment-status-<commit>.log

# View DigitalOcean logs
./scripts/terp-logs.sh build
./scripts/terp-logs.sh deploy
```

**Common issues**:
1. **Same error repeating**: Auto-heal stopped to prevent loop
2. **Timeout**: Deployment taking > 10 minutes
3. **Manual fix needed**: Error type requires human intervention

### GitHub Action Not Running

**Check**:
```bash
# Verify workflow file exists
ls -la .github/workflows/auto-deploy-monitor.yml

# Check GitHub Actions tab
# https://github.com/EvanTenenbaum/TERP/actions

# Verify DIGITALOCEAN_TOKEN secret is set
# Settings > Secrets and variables > Actions
```

### Multiple Monitors Running

**Clean up**:
```bash
# Kill all monitoring processes
pkill -f auto-deploy-heal

# Remove status files
rm -f .deployment-status-*.log
rm -f .deployment-monitor-*.pid
rm -f .deployment-monitor-*.lock
```

---

## Examples

### Successful Auto-Heal

```
🚀 Starting automated deployment monitoring and self-healing...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Monitoring deployment for commit: abc1234

🔍 Attempt 1/3: Monitoring deployment...
❌ Deployment failed on attempt 1

🔬 Analyzing deployment failure...
❌ Missing dependency detected

🔧 Attempting automatic fix for: missing_dependency
🔨 Reinstalling dependencies...
✅ Fix applied successfully
🔄 Committing and pushing fix...
✅ Fix pushed - waiting for new deployment...

🔍 Attempt 2/3: Monitoring deployment...
✅ Deployment successful!

🎉 Deployment completed successfully on attempt 2
📍 Commit: abc1234
🌐 URL: https://terp-app-b9s35.ondigitalocean.app
```

### Failed Auto-Heal (Manual Intervention Needed)

```
🚀 Starting automated deployment monitoring and self-healing...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Monitoring deployment for commit: def5678

🔍 Attempt 1/3: Monitoring deployment...
❌ Deployment failed on attempt 1

🔬 Analyzing deployment failure...
❌ TypeScript errors detected

🔧 Attempting automatic fix for: typescript
❌ Build failed - TypeScript errors require manual fix

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ DEPLOYMENT FAILED AFTER 1 ATTEMPTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 Recommended Actions:
  1. Review logs above for specific error
  2. Fix TypeScript errors in code
  3. Run: pnpm typecheck
  4. Commit fix and push again
```

---

## Best Practices

### DO ✅

- Let auto-heal run automatically
- Monitor status file for progress
- Review GitHub issues created on failure
- Fix issues identified by auto-heal
- Test locally before pushing

### DON'T ❌

- Don't increase MAX_ATTEMPTS beyond 5 (risk of loops)
- Don't disable loop prevention
- Don't ignore repeated failures
- Don't push without testing if auto-heal failed
- Don't manually edit deployment while auto-heal is running

---

## Integration with Agents

### For Implementation Agents

After pushing code:

```bash
# Auto-heal starts automatically
git push origin main

# Monitor progress
tail -f .deployment-status-*.log

# If it fails after 3 attempts, check logs and fix manually
```

### For Roadmap Manager

When assigning deployment tasks:

```markdown
**Deployment Verification**:
- [ ] Push to main
- [ ] Auto-heal monitors deployment
- [ ] Verify deployment succeeds (check status file)
- [ ] If auto-heal fails, investigate and fix
- [ ] Only mark task complete after successful deployment
```

---

## Metrics

Track auto-heal effectiveness:

```bash
# Count successful auto-heals
grep "Deployment completed successfully on attempt [2-3]" .deployment-status-*.log | wc -l

# Count failures
grep "DEPLOYMENT FAILED AFTER" .deployment-status-*.log | wc -l

# Most common error types
grep "Analyzing deployment failure" .deployment-status-*.log -A 1
```

---

## Future Enhancements

Potential improvements:

- [ ] Machine learning to predict failure types
- [ ] Automatic rollback on critical failures
- [ ] Slack/Discord notifications
- [ ] Deployment health scoring
- [ ] Automatic performance regression detection
- [ ] Integration with Sentry for error tracking
- [ ] Automatic database migration rollback

---

## Support

**Issues**: Create GitHub issue with `auto-heal` label
**Logs**: Check `.deployment-status-*.log` files
**Status**: Check GitHub Actions tab
**Manual**: Run `./scripts/auto-deploy-heal.sh` directly

---

**The auto-heal system is production-ready and will significantly reduce deployment failures and manual intervention time.**
