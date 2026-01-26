# TERP Commander Slack Bot - Autonomous Fix System

## Overview

The autonomous fix system (`scripts/fix-slack-bot-autonomous.ts`) is a comprehensive diagnostic and repair tool that:

1. **Diagnoses** all potential issues with the Slack bot setup
2. **Fixes** common problems automatically
3. **Verifies** fixes with health checks and tests
4. **Deploys** to DigitalOcean automatically

## Quick Start

### Run the Autonomous Fix System

```bash
pnpm slack-bot:fix
```

That's it! The script will:

- ✅ Diagnose all issues
- ✅ Apply fixes automatically
- ✅ Verify with tests
- ✅ Deploy to DigitalOcean

## What It Does

### Phase 1: Comprehensive Diagnostics

The system checks:

1. **Environment Variables**
   - `SLACK_BOT_TOKEN` (required, format: `xoxb-*`)
   - `SLACK_APP_TOKEN` (optional, format: `xapp-*`)
   - `GITHUB_TOKEN` (optional, format: `ghp_*`)

2. **Dockerfile Analysis**
   - Base image presence
   - pnpm installation method
   - Memory optimizations
   - Layer caching efficiency
   - Patches directory handling

3. **Dependencies**
   - Required packages in `package.json`
   - `pnpm-lock.yaml` existence
   - `patches/` directory existence

4. **DigitalOcean Configuration**
   - Worker instance size (must be >= 1GB)
   - Dockerfile path configuration
   - Environment variables in app spec

### Phase 2: Automated Fixes

The system automatically fixes:

- ✅ **Dockerfile Issues**
  - Adds corepack for pnpm
  - Adds memory optimizations
  - Optimizes layer caching
  - Ensures patches are copied correctly

- ✅ **App Spec Issues**
  - Updates instance size from 0.5GB to 1GB
  - Verifies worker configuration

### Phase 3: Verification

- Runs health check (`pnpm slack-bot:health`)
- Runs test suite (`pnpm test:slack-bot`)
- Reports pass/fail status

### Phase 4: Deployment

- Finds TERP app in DigitalOcean
- Updates app spec with fixes
- Triggers new deployment

## Usage Examples

### Basic Usage

```bash
# Run the full autonomous fix process
pnpm slack-bot:fix
```

### Manual Steps (if needed)

If you prefer to run steps manually:

```bash
# 1. Health check
pnpm slack-bot:health

# 2. Run tests
pnpm test:slack-bot

# 3. Fix manually (if needed)
# Edit Dockerfile.bot or new_spec.yaml

# 4. Deploy manually
doctl apps update <APP_ID> --spec new_spec.yaml
```

## What Gets Fixed

### Common Issues Automatically Resolved

1. **Docker Build Failures**
   - Missing corepack setup
   - Missing memory limits
   - Incorrect pnpm installation
   - Missing patches directory

2. **Resource Exhaustion**
   - Instance size too small (0.5GB → 1GB)
   - Missing memory optimizations

3. **Configuration Issues**
   - Missing environment variables
   - Incorrect Dockerfile path
   - Missing worker configuration

## Output Example

```
============================================================
🤖 TERP Commander Slack Bot - Autonomous Fix System
============================================================

ℹ️ Starting comprehensive diagnostics...

🔍 Phase 1: Diagnosing Environment...
🔍 Diagnosing Dockerfile...
🔍 Diagnosing Dependencies...
🔍 Diagnosing DigitalOcean Configuration...

📊 Diagnostic Results:

⚠️ Found 2 warnings:
  - Dockerfile not copying patches directory: Add COPY patches/ ./patches/ before pnpm install
  - Worker instance size too small (0.5GB): Change to apps-s-1vcpu-1gb

============================================================
🔧 Applying automated fixes...
============================================================

🔧 Fixing Dockerfile...
✅ Fixed Dockerfile.bot
🔧 Fixing App Spec...
✅ Updated instance size to 1GB
✅ Fixed app spec

Applied 2 fixes

============================================================
🧪 Verifying fixes...
============================================================

🧪 Running Health Check...
✅ Health check passed
🧪 Running Test Suite...
✅ All tests passed

============================================================
🚀 Deploying to DigitalOcean...
============================================================

📦 Found app ID: 1fd40be5-b9af-4e71-ab1d-3af0864a7da4
✅ App spec updated
✅ Deployment initiated!

============================================================
📊 Final Summary
============================================================
Issues Found: 2 (0 critical, 2 warnings)
Fixes Applied: 2
Health Check: ✅ Passed
Tests: ✅ Passed
============================================================

🎉 Bot is ready! All checks passed.
```

## Troubleshooting

### Script Fails to Run

**Issue:** `pnpm: command not found`

**Solution:**

```bash
npm install -g pnpm
# or
npm install
npx tsx scripts/fix-slack-bot-autonomous.ts
```

### Health Check Fails

**Issue:** Missing environment variables

**Solution:**

```bash
# Set required variables
export SLACK_BOT_TOKEN="xoxb-your-token"
export SLACK_APP_TOKEN="xapp-your-token"
export GITHUB_TOKEN="ghp_your-token"

# Run health check
pnpm slack-bot:health
```

### Deployment Fails

**Issue:** `doctl` not found

**Solution:**

```bash
# Install doctl
# macOS: brew install doctl
# Linux: See https://docs.digitalocean.com/reference/doctl/how-to/install/

# Authenticate
doctl auth init
```

### Tests Fail

**Issue:** Test suite has errors

**Solution:**

```bash
# Run tests with verbose output
pnpm test:slack-bot --reporter=verbose

# Check specific test
pnpm test:slack-bot -t "Environment Variable Validation"
```

## Integration with CI/CD

Add to your CI/CD pipeline:

```yaml
- name: Fix and Deploy Slack Bot
  run: pnpm slack-bot:fix
  env:
    SLACK_BOT_TOKEN: ${{ secrets.SLACK_BOT_TOKEN }}
    SLACK_APP_TOKEN: ${{ secrets.SLACK_APP_TOKEN }}
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    DIGITALOCEAN_ACCESS_TOKEN: ${{ secrets.DIGITALOCEAN_ACCESS_TOKEN }}
```

## Best Practices

1. **Run before deployment:** Always run `pnpm slack-bot:fix` before manual deployments
2. **Check output:** Review diagnostic results to understand what was fixed
3. **Monitor deployment:** After fix, monitor the deployment status
4. **Keep environment variables secure:** Never commit tokens to git
5. **Update tests:** When adding new features, update the test suite

## Related Files

- `scripts/fix-slack-bot-autonomous.ts` - Main fix script
- `scripts/slack-bot-health-check.ts` - Health check script
- `scripts/slack-bot.test.ts` - Test suite
- `Dockerfile.bot` - Docker configuration
- `new_spec.yaml` - DigitalOcean app spec
- `docs/SLACK_BOT_QA_GUIDE.md` - QA testing guide

## Next Steps

After running the fix system:

1. **Monitor deployment:**

   ```bash
   doctl apps list-deployments <APP_ID>
   ```

2. **Test in Slack:**
   - Send `status` message
   - Send `execute` message
   - Verify responses

3. **Check logs:**
   ```bash
   doctl apps logs <APP_ID> --type=worker
   ```

## Support

If the autonomous fix system doesn't resolve your issue:

1. Check the diagnostic output for specific issues
2. Review `docs/SLACK_BOT_QA_GUIDE.md` for manual troubleshooting
3. Check DigitalOcean app logs for deployment errors
4. Verify all environment variables are set correctly
