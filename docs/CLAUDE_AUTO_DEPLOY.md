# Claude Code Auto-Deploy with Monitoring

This guide explains how to set up Claude Code to automatically deploy to production and monitor deployment status.

## Overview

When configured, Claude Code can:
1. ✅ Push directly to `main` branch
2. ✅ Automatically trigger Digital Ocean deployment
3. ✅ Monitor deployment progress in real-time
4. ✅ Detect deployment failures automatically
5. ✅ Fix issues and redeploy until successful

## Prerequisites

- Digital Ocean App Platform app (already configured in `.do/app.yaml`)
- GitHub repository with push access
- Digital Ocean API token with read access

## Setup Instructions

### 1. Remove GitHub Branch Protection

To allow direct pushes to `main`:

1. Go to: `https://github.com/EvanTenenbaum/TERP/settings/branches`
2. Find the `main` branch protection rule
3. Click **Delete** or **Edit** and disable "Require a pull request before merging"

> ⚠️ **Note**: This removes the PR requirement. If you want to keep branch protection for other users, you can add yourself as an exception instead.

### 2. Get Your Digital Ocean App ID

**Option A - From URL:**
1. Go to: https://cloud.digitalocean.com/apps
2. Click on the **terp** app
3. Copy the ID from the URL: `https://cloud.digitalocean.com/apps/{APP_ID}/...`

**Option B - Using doctl CLI:**
```bash
doctl apps list
```

Look for the "terp" app and copy its ID.

### 3. Configure App ID

Edit `.do/config.json` and replace `YOUR_DO_APP_ID_HERE` with your actual app ID:

```json
{
  "appId": "abc123-your-actual-app-id",
  "appName": "terp",
  "region": "nyc",
  "primaryBranch": "main",
  "monitoringEnabled": true
}
```

### 4. Set Up Digital Ocean API Token

**Create an API token:**
1. Go to: https://cloud.digitalocean.com/account/api/tokens
2. Click **Generate New Token**
3. Name: `Claude Code Deployment Monitor`
4. Scopes: **Read** (Claude only needs read access to monitor)
5. Click **Generate Token**
6. **Copy the token** (you'll only see it once!)

**Configure the token:**

**Option A - User-level config (Recommended):**

Create or edit `~/.config/claude-code/config.json`:
```json
{
  "environment": {
    "DIGITALOCEAN_TOKEN": "dop_v1_your_token_here"
  }
}
```

**Option B - Environment variable:**
```bash
export DIGITALOCEAN_TOKEN="dop_v1_your_token_here"
```

Add this to your `~/.bashrc`, `~/.zshrc`, or shell config file.

### 5. Test the Setup

Test deployment monitoring:

```bash
# Test that the token works
tsx scripts/monitor-deployment.ts $(cat .do/config.json | grep appId | cut -d'"' -f4)
```

If everything is configured correctly, you'll see the status of your latest deployment.

## How It Works

### The Workflow

When you give Claude Code a task:

```
You: "Add a new feature to show user statistics on the dashboard"
```

Claude Code will:

1. **Implement the feature** - Write code, run tests, ensure quality
2. **Commit changes** - Create a descriptive commit message
3. **Push to main** - Push directly to `main` branch (triggers DO deploy)
4. **Monitor deployment** - Watch Digital Ocean deployment progress
5. **Check for errors** - If deployment fails, analyze the logs
6. **Fix and redeploy** - Automatically fix issues and push again
7. **Verify success** - Confirm deployment is live and healthy

### Monitoring Details

The monitoring script:
- Polls Digital Ocean API every 5 seconds
- Shows deployment phase: Pending → Building → Deploying → Active
- Reports progress: "5/10 steps completed"
- Captures and displays error messages
- Returns success/failure status

### Error Handling

If a deployment fails, Claude Code will:
1. **Read the error logs** from the failed deployment
2. **Analyze the issue** (build errors, dependency issues, config problems)
3. **Fix the code** based on the error
4. **Commit and push** the fix to main
5. **Monitor the new deployment**
6. **Repeat** until deployment succeeds

## Usage Examples

### Example 1: Simple Feature

```
You: "Add a dark mode toggle to the settings page and deploy it"

Claude:
✅ Implemented dark mode toggle
✅ Updated styles and state management
✅ Committed changes
✅ Pushed to main
⏳ Waiting for Digital Ocean deployment...
✅ Deployment started: abc123
🔨 Building... (3/7 steps)
🚀 Deploying... (6/7 steps)
✅ Deployment successful!
🌐 Live at: https://terp.com
```

### Example 2: Deployment Failure and Auto-Fix

```
You: "Update the database schema and deploy"

Claude:
✅ Updated schema
✅ Committed changes
✅ Pushed to main
⏳ Waiting for deployment...
🔨 Building... (2/5 steps)
❌ Build failed: "Module 'drizzle-kit' not found"

Analyzing error... Missing dev dependency in production build.

✅ Fixed: Moved drizzle-kit to dependencies
✅ Committed fix
✅ Pushed to main
⏳ Waiting for deployment...
🔨 Building... (5/5 steps)
✅ Deployment successful!
```

## Scripts Reference

### `scripts/monitor-deployment.ts`

Monitors a single deployment by ID:

```bash
tsx scripts/monitor-deployment.ts <app-id> [deployment-id]
```

- If `deployment-id` is omitted, monitors the latest deployment
- Polls every 5 seconds
- Exits with code 0 on success, 1 on failure

### `scripts/deploy-and-monitor.ts`

Complete workflow script:

```bash
tsx scripts/deploy-and-monitor.ts
```

- Waits for a new deployment to be triggered (after push)
- Automatically finds the new deployment
- Monitors it to completion
- Reports detailed progress

## Troubleshooting

### "DIGITALOCEAN_TOKEN environment variable is required"

The API token isn't set. Follow step 4 above.

### "Please set your Digital Ocean App ID in .do/config.json"

Edit `.do/config.json` and add your app ID from step 2.

### "API request failed with status 401"

Your Digital Ocean token is invalid or expired. Generate a new one.

### "Timeout waiting for deployment to start"

Digital Ocean didn't start a deployment after the push. Check:
1. Push was successful: `git log origin/main`
2. Digital Ocean app is connected to the repo
3. `deploy_on_push: true` is set in `.do/app.yaml` (it is)

### Deployment monitoring shows old deployment

Wait 10-30 seconds after pushing. DO takes a moment to trigger the deployment.

## Security Notes

- The `DIGITALOCEAN_TOKEN` only needs **read** access
- Claude Code cannot modify your Digital Ocean infrastructure
- The token is stored locally and never committed to the repo
- `.do/config.json` contains only the app ID (not sensitive)

## Disabling Auto-Deploy

To disable auto-deploy and return to PR workflow:

1. Re-enable GitHub branch protection on `main`
2. Claude Code will automatically create PRs instead of pushing to main

The monitoring scripts will still work for manual deployments.

## Additional Resources

- [Digital Ocean App Platform API Docs](https://docs.digitalocean.com/reference/api/api-reference/#tag/Apps)
- [DO App Spec Reference](https://docs.digitalocean.com/products/app-platform/reference/app-spec/)
- [Papertrail Log Forwarding Setup](.do/README.md)

## Questions?

If you encounter issues:
1. Check this guide carefully
2. Verify all configuration steps
3. Test the monitoring script manually
4. Check Digital Ocean console for app status
