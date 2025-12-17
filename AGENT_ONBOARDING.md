# TERP Agent Onboarding

Welcome! This document outlines essential information for Claude Code agents working on the TERP codebase.

## Overview

TERP is a [brief description of project]. This project is configured with:

- ✅ Automatic deployment to Digital Ocean App Platform when code is pushed to `main`
- ✅ Zero-configuration Claude Code auto-deploy with monitoring
- ✅ Digital Ocean API integration for real-time deployment tracking

## Critical: Always Push to Main for Deployment

**When given a task to deploy code:**

1. Implement the requested changes
2. Run tests and verify everything works
3. Commit with a clear, descriptive message
4. **Push directly to `main` branch** (not a PR or feature branch)
5. The system will automatically:
   - Trigger Digital Ocean deployment
   - Monitor deployment progress
   - Detect and report any failures
   - Automatically attempt fixes if needed

### Important: Use Main Branch

- Feature branches are for exploratory work only
- **All production deployments go directly to `main`**
- Branch protection has been removed on `main` to allow direct pushes
- This is intentional - the user wants instant deployments
- No PR reviews are required for deployment

## Auto-Deploy System

### How It Works

**Automatic Deployment Monitoring (Post-Push Hook):**

When you push to `main`, deployment monitoring starts automatically via the `.husky/post-push` hook:

- **Automatic:** No manual action required - monitoring starts in the background
- **Non-blocking:** Push completes immediately, monitoring runs in background
- **Status tracking:** Results written to `.deployment-status-{commit}.log` and `.deployment-status-{commit}.result`

**Monitoring Scripts:**

- **scripts/monitor-deployment-auto.sh** - Unified deployment monitoring script
  - Discovers DigitalOcean app ID automatically
  - Polls DigitalOcean API for deployment status
  - Falls back to database and health checks if API unavailable
  - Implements smart polling (5s initially, 15s after 2 minutes)
  - Writes status to local files for quick checks
  - Runs in background via `nohup`

- **scripts/check-deployment-status.sh** - Quick status check
  - Reads local status file for a specific commit
  - Returns: success, failed, timeout, or in progress
  - Fast on-demand check without API calls

- **scripts/manage-deployment-monitors.sh** - Monitor management
  - View active monitors: `bash scripts/manage-deployment-monitors.sh status`
  - Stop specific monitor: `bash scripts/manage-deployment-monitors.sh stop [commit-sha]`
  - Cleanup stale monitors: `bash scripts/manage-deployment-monitors.sh cleanup`

### Configuration

**Important**: The system is fully automatic. You don't need to:

- ❌ Provide an app ID
- ❌ Manually configure anything
- ❌ Set up per-session
- ❌ Ask the user for information

**Already set up for you**:

- ✅ `DIGITALOCEAN_TOKEN` - Set in user's shell config (~/.bashrc, ~/.zshrc)
- ✅ App name - Read from `.do/app.yaml` (app name: "terp")
- ✅ App ID caching - Stored in `.git/config` after first discovery
- ✅ Monitoring scripts - In `scripts/` directory

## Workflow Example

````
User: "Add dark mode feature and deploy it"

You:
1. Implement dark mode feature
2. Test thoroughly (run `npm test`)
3. Commit: git commit -m "feat: add dark mode toggle to settings"
4. Push to main: git push origin main
   ↓
5. Post-push hook automatically:
   - Starts deployment monitoring in background
   - Monitors DigitalOcean API, database, and health checks
   - Writes status to `.deployment-status-{commit}.log`

6. Check deployment status:
   ```bash
   bash scripts/check-deployment-status.sh $(git rev-parse HEAD | cut -c1-7)
````

7. If deployment fails:
   - Review logs: `cat .deployment-status-*.log`
   - Fix the issue and push again
   - **DO NOT mark task complete until deployment succeeds**

User sees the feature live on production once deployment completes.

```

## Environment Variables

**DIGITALOCEAN_TOKEN** (Already configured)
- Required for deployment monitoring
- Should be set in user's shell config
- Never committed to git
- Read-only scope (can't modify infrastructure)
- Format: `dop_v1_*`

## Digital Ocean Setup

The Digital Ocean App Platform is already configured:

- **Config file**: `.do/app.yaml`
- **App name**: "terp"
- **Auto-deploy**: Enabled on push to `main`
- **Logs**: Forwarded to Papertrail (via `PAPERTRAIL_ENDPOINT`)
- **Build**: Uses the root `Dockerfile` (no Heroku buildpack)

### How Auto-Deploy Works

1. You push code to `main`
2. Digital Ocean detects the push
3. Automatically starts a new deployment:
   - Builds the app (installs deps, runs build scripts)
   - Deploys to production
   - Routes traffic to new version
4. Our monitoring scripts track progress and status

## Key Files to Know

```

/TERP
├── .do/
│ ├── app.yaml # Digital Ocean configuration (DO NOT MODIFY)
│ └── SETUP.md # Quick reference for DO setup
├── scripts/
│ ├── do-auto-discover.ts # App ID auto-discovery
│ ├── deploy-and-monitor.ts # Main deployment monitoring
│ └── validate-deployment-setup.ts # Setup validation
├── docs/
│ └── CLAUDE_AUTO_DEPLOY.md # Detailed auto-deploy documentation
├── QUICKSTART_CLAUDE_DEPLOY.md # User's quick start guide
└── AGENT_ONBOARDING.md # This file

```

## Troubleshooting

### "DIGITALOCEAN_TOKEN not set" error

The token is missing from the environment. This shouldn't happen as it's already configured in the user's shell.

**Solution**:
- The token should be in `~/.bashrc` or `~/.zshrc`
- If working in a new shell, make sure to source the config: `source ~/.bashrc`

### "App auto-discovery failed"

The script couldn't find the app on Digital Ocean.

**Possible causes**:
- Network connectivity issue (expected in isolated environments)
- App name in `.do/app.yaml` doesn't match Digital Ocean app name
- Token expired or invalid

**Solution**:
- Check network connectivity
- Verify app name in `.do/app.yaml` matches the DO console
- Verify token is valid at https://cloud.digitalocean.com/account/api/tokens

### Deployment appears stuck

The monitoring script polls every 5 seconds. If it seems stuck:
- Check Digital Ocean console directly: https://cloud.digitalocean.com/apps
- Look at the deployment logs in the DO console
- Kill the monitoring process and check DO dashboard

## What You Should NOT Do

❌ **Don't change `.do/app.yaml` accidentally** - Only edit it when intentionally updating the Docker spec, then run `doctl apps update <APP_ID> --spec .do/app.yaml`

❌ **Don't commit `DIGITALOCEAN_TOKEN`** - It should only be in shell config, never in git

❌ **Don't use feature branches for deployment** - Always push to `main` for production

❌ **Don't try to pass app ID manually** - The system auto-discovers it

❌ **Don't wait for user to provide deployment info** - You have everything you need

## What You Should Always Do

✅ **Test before committing** - Run the test suite (`npm test`) to verify changes work

✅ **Write clear commit messages** - Use conventional commit format:
```

feat: add feature name
fix: fix bug description
docs: update documentation
refactor: reorganize code
chore: dependencies, config, etc

````

✅ **Push to main for any production changes** - This triggers auto-deployment

✅ **Monitor the deployment** - Check that it completes successfully

✅ **Report status to user** - Let them know when deployment is done

## Testing Locally Before Deploy

Before pushing to main:

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build the app
npm run build

# Start locally (if you need to verify)
npm start
````

## Common Tasks

### Deploy a bug fix

```bash
# 1. Fix the bug
# 2. Test it: npm test
# 3. Commit it
git commit -m "fix: resolve login issue with email verification"
# 4. Push to main
git push origin main
# 5. System monitors deployment automatically
```

### Deploy a new feature

```bash
# 1. Implement feature
# 2. Test thoroughly: npm test
# 3. Commit
git commit -m "feat: add dark mode toggle to user preferences"
# 4. Push to main
git push origin main
# 5. Deployment and monitoring happens automatically
```

### Deploy a hotfix

```bash
# Same process, but explain urgency in commit message:
git commit -m "fix: critical security issue in password reset endpoint"
git push origin main
```

## FAQ

**Q: Will the system try to fix deployment failures automatically?**
A: Yes! If a deployment fails, the monitoring system will detect it and pass detailed error information back. You should then fix the issue and push again.

**Q: What if there's a network issue during deployment?**
A: The monitoring script has retry logic built in. It will retry up to 4 times with exponential backoff before giving up.

**Q: Do I need to tell the user about deployment progress?**
A: Yes! Provide updates as the deployment progresses. Users appreciate knowing when their changes are live.

**Q: Can I deploy to a branch other than main?**
A: No. Only `main` is configured for auto-deployment. Use feature branches for development, then merge/push to main for production.

**Q: What happens if my commit message has multiple lines?**
A: That's fine! Use the format:

```bash
git commit -m "feat: add feature name

This is a longer description of what changed and why.
Can span multiple lines.
"
```

**Q: Should I wait for all tests to pass before pushing?**
A: Absolutely. Always run `npm test` locally and verify all tests pass before pushing to main.

## Deployment Success Indicators

You'll see these messages when deployment succeeds:

```
✅ Deployment successful!
🚀 Production URL: [app-url]
```

When deployment fails, you'll see:

```
❌ Build failed: [error details]
or
❌ Deployment failed: [error details]
```

## Git Operations & Conflict Resolution

### Standard Workflow

**Merge-then-push workflow:**

```bash
# After completing work on your branch
git checkout main
git pull origin main
git merge your-branch-name --no-ff -m "Merge your-branch-name: Task description"
git push origin main
```

### Handling Push Conflicts

**If push is rejected (another agent pushed first):**

1. **Auto-resolution (recommended):**

   ```bash
   git pull --rebase origin main
   # If conflicts occur, use auto-resolution:
   bash scripts/auto-resolve-conflicts.sh
   git add .
   git rebase --continue
   git push origin main
   ```

2. **Manual resolution:**
   - Edit conflicting files (remove `<<<<<<<`, `=======`, `>>>>>>>` markers)
   - For `MASTER_ROADMAP.md` and `ACTIVE_SESSIONS.md`, prefer additive merges (keep both changes)
   - `git add <resolved-files>`
   - `git rebase --continue` or `git commit` (if in merge state)

3. **Push conflict handler:**
   ```bash
   # If push keeps failing, use the handler script
   bash scripts/handle-push-conflict.sh
   ```

**Conflict Resolution Scripts:**

- **scripts/auto-resolve-conflicts.sh** - Intelligent conflict resolution
  - Handles roadmap and session file conflicts automatically
  - Prefers additive merges (keeps both changes when possible)
  - Only runs when Git is in rebase/merge state

- **scripts/handle-push-conflict.sh** - Push retry with exponential backoff
  - Automatically pulls, resolves, and retries push
  - Retries up to 3 times with exponential backoff
  - Provides clear instructions if auto-resolution fails

See `docs/DEPLOYMENT_CONFLICT_INTEGRATION_PLAN_FINAL.md` for complete conflict resolution guide.

### Check status

```bash
git status
```

### See recent commits

```bash
git log --oneline -10
```

## 🧪 Mega QA (Comprehensive Testing)

**Run the full Mega QA suite from anywhere:**

```bash
# Clone and setup (if not already done)
git clone https://github.com/EvanTenenbaum/TERP.git
cd TERP
pnpm install

# Run the full Mega QA (E2E + property tests + contracts)
pnpm mega:qa
```

**What it runs:**

- 175 E2E Playwright tests (auth, navigation, CRUD, security, a11y, perf)
- 231 property-based tests (business logic invariants)
- 5 contract tests (API schema validation)

**Quick commands:**

```bash
pnpm mega:qa           # Full suite (~10-15 min)
pnpm mega:qa:quick     # Quick run (~3 min)
pnpm test:property     # Property tests only (~2s)
```

**Report location:** `qa-results/mega-qa/latest/bundle.json`

**Full documentation:** See `MEGA_QA.md` in project root.

---

## Support

If something doesn't work:

1. Check the error message carefully
2. Verify the deployment in the DO console: https://cloud.digitalocean.com/apps
3. Look at deployment logs for detailed error information
4. Check DIGITALOCEAN_TOKEN is set in shell config
5. Verify `.do/app.yaml` hasn't been modified
6. Ask the user to check their GitHub and Digital Ocean settings

## Additional Resources

- **Detailed auto-deploy guide**: `docs/CLAUDE_AUTO_DEPLOY.md`
- **Digital Ocean setup reference**: `.do/SETUP.md`
- **User's quick start**: `QUICKSTART_CLAUDE_DEPLOY.md`
- **Digital Ocean console**: https://cloud.digitalocean.com/apps
- **Project structure**: Check the README.md in the root directory

---

**Last Updated**: November 12, 2025

This document is kept up-to-date as the deployment system evolves. Always refer to this file as the source of truth for deployment procedures.
