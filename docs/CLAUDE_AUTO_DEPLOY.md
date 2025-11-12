# Claude Code Auto-Deploy with Monitoring

**Zero-configuration automatic deployment monitoring. Set up once, works forever.**

## Overview

Once configured (one-time 2-minute setup), Claude Code can:
- ✅ Push directly to `main` branch
- ✅ Automatically trigger Digital Ocean deployment
- ✅ Monitor deployment progress in real-time
- ✅ Detect deployment failures automatically
- ✅ Fix issues and redeploy until successful
- ✅ **Works across all sessions forever** - no repeated setup

## One-Time Setup (2 minutes)

### Step 1: Remove GitHub Branch Protection

Allow direct pushes to `main`:

1. Go to: https://github.com/EvanTenenbaum/TERP/settings/branches
2. Find the `main` branch protection rule
3. Click **Delete** (or edit to allow direct pushes)

### Step 2: Set Up Digital Ocean Token

**Get your token:**
1. Go to: https://cloud.digitalocean.com/account/api/tokens
2. Click **Generate New Token**
3. Name: `Claude Code Monitor`
4. Scopes: **READ only** (Claude only needs read access)
5. Click **Generate Token**
6. **Copy the token** (shown only once!)

**Add to your shell config:**

```bash
# Add this line to ~/.bashrc, ~/.zshrc, or equivalent:
export DIGITALOCEAN_TOKEN="dop_v1_your_token_here"
```

**Quick command:**
```bash
echo 'export DIGITALOCEAN_TOKEN="dop_v1_YOUR_TOKEN"' >> ~/.bashrc
source ~/.bashrc  # or restart terminal
```

**That's it!** Everything else is automatic.

### Verify Setup

```bash
# Check token is set
echo $DIGITALOCEAN_TOKEN

# Run auto-discovery (finds your app automatically)
tsx scripts/do-auto-discover.ts

# Validate everything
tsx scripts/validate-deployment-setup.ts
```

You should see:
```
✅ DIGITALOCEAN_TOKEN is set
✅ Digital Ocean app auto-discovery works
✅ App ID cached: abc123...
🎉 All systems ready for auto-deploy with monitoring!
```

## How It Works

### The Magic

No manual configuration needed:
- **App ID?** Auto-discovered from your app name in `.do/app.yaml`
- **Caching?** Stored in git config (persists with repo)
- **New sessions?** Everything just works
- **Weeks later?** Still works

### The Workflow

Give Claude any deployment task:

```
You: "Add user analytics to dashboard and deploy it"

Claude:
✅ Implement user analytics
✅ Run tests and verify
✅ Commit changes
✅ Push to main
🔍 Discovering Digital Ocean app...
✅ Found cached app ID: abc123...
⏳ Waiting for deployment...
✅ New deployment detected: xyz789
🔨 Building... (3/7 steps completed)
🚀 Deploying... (6/7 steps completed)
✅ Deployment successful!
```

### Auto-Fix on Failure

If deployment fails, Claude automatically:

```
❌ Build failed: Module 'drizzle-kit' not found

🔍 Analyzing error...
✅ Fixed: Moved drizzle-kit to dependencies
✅ Committed fix
✅ Pushed to main
⏳ Monitoring new deployment...
✅ Deployment successful!
```

No intervention needed.

## Usage Examples

### Deploy a Feature
```
"Add dark mode toggle and deploy to production"
```

### Fix and Deploy
```
"The login button is broken, fix it and deploy"
```

### Update and Deploy
```
"Update the pricing page with new tiers and deploy"
```

### Just Deploy Current Changes
```
"Deploy the current changes to production"
```

Claude handles:
- Implementation (if needed)
- Testing
- Committing
- Pushing to main
- Monitoring deployment
- Auto-fixing failures
- Redeploying until success

## Scripts Reference

### `scripts/do-auto-discover.ts`
Auto-discovers app ID by name from `.do/app.yaml`
- Queries Digital Ocean API
- Finds app by name
- Caches result in git config
- Returns app ID

```bash
tsx scripts/do-auto-discover.ts [app-name]
```

### `scripts/deploy-and-monitor.ts`
Complete deployment workflow
- Auto-discovers app ID
- Waits for deployment to start
- Monitors progress
- Reports results

```bash
tsx scripts/deploy-and-monitor.ts
```

### `scripts/monitor-deployment.ts`
Monitor a specific deployment

```bash
tsx scripts/monitor-deployment.ts <app-id> [deployment-id]
```

### `scripts/setup-do-token.ts`
Interactive setup guide for DIGITALOCEAN_TOKEN

```bash
tsx scripts/setup-do-token.ts
```

### `scripts/validate-deployment-setup.ts`
Validate entire setup is ready

```bash
tsx scripts/validate-deployment-setup.ts
```

## Architecture

### Auto-Discovery Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Claude Code starts deployment                               │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ Check git config for cached app ID                          │
├─────────────────────────────────────────────────────────────┤
│ Hit? → Use cached ID (fast!)                                │
│ Miss? → Continue to discovery                               │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ Read app name from .do/app.yaml                             │
│ (name: terp)                                                │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ Query Digital Ocean API                                     │
│ GET /v2/apps → find app with matching name                  │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ Cache app ID in git config                                  │
│ git config --local digitalocean.appid <id>                  │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ Monitor deployment using app ID                             │
│ Poll API, report progress, detect failures                  │
└─────────────────────────────────────────────────────────────┘
```

### Caching Persistence

```
git config --local digitalocean.appid      # Cached app ID
git config --local digitalocean.appname    # App name
git config --local digitalocean.cached-at  # Timestamp
```

Stored in `.git/config` (not committed, persists with repo clone)

### Session Persistence

**First session:**
```
User: "Deploy feature X"
→ Auto-discover app (takes ~2 seconds)
→ Cache in git config
→ Monitor deployment
```

**All future sessions (even months later):**
```
User: "Deploy feature Y"
→ Use cached app ID (instant!)
→ Monitor deployment
```

No re-configuration. No questions. Just works.

## Troubleshooting

### "DIGITALOCEAN_TOKEN environment variable is required"

The token isn't set. Run:
```bash
tsx scripts/setup-do-token.ts
```

Follow the instructions to add it to your shell config.

### "App not found in your Digital Ocean account"

Possible causes:
1. App name in `.do/app.yaml` doesn't match DO app name
2. Token doesn't have access to this app
3. App doesn't exist

Verify:
- Check https://cloud.digitalocean.com/apps for your app
- Ensure app name matches `.do/app.yaml`

### "API request failed with status 401"

Your token is invalid or expired. Generate a new one:
1. Go to: https://cloud.digitalocean.com/account/api/tokens
2. Revoke the old token
3. Generate a new one
4. Update your shell config

### "Timeout waiting for deployment to start"

Digital Ocean didn't trigger a deployment. Check:
1. Push was successful: `git log origin/main`
2. App is connected to GitHub repo
3. `deploy_on_push: true` in `.do/app.yaml` (it is)
4. Branch is correct (should be `main`)

### Clear cached app ID

If you need to re-discover (e.g., app was recreated):
```bash
git config --local --unset digitalocean.appid
git config --local --unset digitalocean.appname
git config --local --unset digitalocean.cached-at
```

Next run will re-discover automatically.

## Security

**Token Scope:**
- **READ only** - Claude cannot modify your infrastructure
- Can only view deployments and logs
- Cannot create, update, or delete resources

**Token Storage:**
- Stored in your shell config (`~/.bashrc`, `~/.zshrc`)
- Not committed to git
- Not shared with anyone

**App ID:**
- Not sensitive (just an identifier)
- Cached in `.git/config` (local only)
- Can be shared safely

## Advanced Usage

### Manual Monitoring

Monitor the latest deployment:
```bash
tsx scripts/monitor-deployment.ts $(tsx scripts/do-auto-discover.ts)
```

### Custom App Name

Override auto-detected app name:
```bash
tsx scripts/do-auto-discover.ts my-custom-app-name
```

### CI/CD Integration

Use in GitHub Actions or other CI:
```yaml
- name: Monitor Deployment
  env:
    DIGITALOCEAN_TOKEN: ${{ secrets.DIGITALOCEAN_TOKEN }}
  run: tsx scripts/deploy-and-monitor.ts
```

## Disabling Auto-Deploy

To return to PR-based workflow:

1. Re-enable GitHub branch protection on `main`
2. Claude Code will automatically switch to creating PRs

Monitoring scripts still work for manual deployments.

## FAQ

**Q: Do I need to set this up again if I clone the repo on another machine?**
A: Yes, but only the `DIGITALOCEAN_TOKEN` in your shell config. The app ID will be auto-discovered on first use.

**Q: What if my app name changes?**
A: Clear the cached app ID (see Troubleshooting), and it will re-discover automatically.

**Q: Can I use this for multiple apps?**
A: Yes! Each repo auto-discovers its own app based on `.do/app.yaml`.

**Q: Does this work with staging environments?**
A: Yes! Change the `branch` in `.do/app.yaml` to point to your staging branch.

**Q: How much does the DO API token cost?**
A: API access is free. You only pay for your app resources.

**Q: What if I forget to set up the token?**
A: Claude will detect it's missing and show clear setup instructions.

## Additional Resources

- [Digital Ocean App Platform API](https://docs.digitalocean.com/reference/api/api-reference/#tag/Apps)
- [DO App Spec Reference](https://docs.digitalocean.com/products/app-platform/reference/app-spec/)
- [Papertrail Log Forwarding](.do/README.md)
- [One-Time Setup Script](../scripts/setup-do-token.ts)
- [Validation Script](../scripts/validate-deployment-setup.ts)
