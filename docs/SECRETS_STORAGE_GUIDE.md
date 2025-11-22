# Secrets Storage Guide - Permanent Access

## Overview

Secrets in **GitHub Secrets are permanent storage**. Once you add them, they stay there forever and are accessible to all agents and workflows.

## One-Time Bootstrap Setup

To permanently store all your secrets in GitHub Secrets (so you never need to add them again):

### Option 1: Automated Bootstrap (If you have deployment_details.json locally)

1. **Push deployment_details.json temporarily** (one time only):
   ```bash
   # Add the file temporarily
   git add deployment_details.json
   git commit -m "temp: Add deployment_details.json for bootstrap"
   git push origin main
   ```

2. **Run the bootstrap workflow:**
   - Go to: https://github.com/EvanTenenbaum/TERP/actions/workflows/bootstrap-secrets.yml
   - Click "Run workflow"
   - Type "BOOTSTRAP" to confirm
   - Click "Run workflow"

3. **Remove the file from git** (optional, after bootstrap):
   ```bash
   git rm deployment_details.json
   git commit -m "chore: Remove deployment_details.json after bootstrap"
   git push origin main
   ```

### Option 2: Manual Bootstrap (Via Workflow)

1. **Go to the workflow:**
   https://github.com/EvanTenenbaum/TERP/actions/workflows/add-secrets.yml

2. **Run workflow and fill in all secrets** (one time)
   - All secrets will be permanently stored
   - You only need to do this once

### Option 3: Script Bootstrap (From Any Machine)

```bash
# Set all secrets as environment variables (one time)
export JWT_SECRET="your-secret"
export CLERK_SECRET_KEY="your-key"
export DATABASE_URL="your-db-url"
# ... set all secrets

# Run bootstrap script (adds them permanently)
./scripts/add-secrets-remote.sh
```

## After Bootstrap - Secrets Are Permanent!

Once secrets are in GitHub Secrets:
- ✅ **They're permanent** - stored forever in GitHub
- ✅ **Accessible everywhere** - all workflows and agents can use them
- ✅ **No need to re-add** - they persist across all sessions
- ✅ **Secure** - encrypted by GitHub, never exposed in logs

## How Agents Access Secrets

After secrets are permanently stored, agents access them via:

### In GitHub Actions Workflows

```yaml
env:
  JWT_SECRET: ${{ secrets.JWT_SECRET }}
  DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

### In Scripts

```bash
# Secrets are automatically available to GitHub Actions
echo "Using secret: ${{ secrets.JWT_SECRET }}"
```

## Verifying Secrets Are Stored

**Check if secrets exist:**
```bash
gh secret list --repo EvanTenenbaum/TERP
```

**Or check in GitHub:**
https://github.com/EvanTenenbaum/TERP/settings/secrets/actions

## List of All Secrets

Once bootstrapped, these secrets will be permanently available:

### Service Secrets
- `JWT_SECRET`
- `CLERK_SECRET_KEY`
- `CLERK_PUBLISHABLE_KEY`
- `DATABASE_URL`
- `GITHUB_WEBHOOK_SECRET`

### Monitoring Secrets
- `SOLARWINDS_TOKEN`
- `SENTRY_DSN`
- `VITE_SENTRY_DSN`

### Worker Secrets
- `SLACK_BOT_TOKEN`
- `SLACK_APP_TOKEN`
- `GITHUB_TOKEN`
- `GEMINI_API_KEY`
- `DIGITALOCEAN_TOKEN`
- `DIGITALOCEAN_ACCESS_TOKEN`

## Updating Secrets (If Needed)

If you need to update a secret later:

```bash
# Via GitHub CLI
echo "new-value" | gh secret set SECRET_NAME --body-file /dev/stdin --repo EvanTenenbaum/TERP

# Via GitHub Actions workflow
gh workflow run "Add Secrets to GitHub Secrets" -f secret_name="new-value"

# Via web interface
# Go to: https://github.com/EvanTenenbaum/TERP/settings/secrets/actions
# Click on secret > Update > Save
```

## For Agents

**Agents don't need to add secrets** - they're already permanently stored!

Agents just reference them in workflows:
```yaml
- name: Use secret
  env:
    MY_SECRET: ${{ secrets.JWT_SECRET }}
  run: echo "Secret is available"
```

## Troubleshooting

### "Secret not found" error

**Solution:** Run the bootstrap workflow once to add all secrets permanently.

### Secrets not syncing to DigitalOcean

**Solution:** After bootstrap, run the sync workflow:
```bash
gh workflow run "Set Secrets to DigitalOcean"
```

---

**Bottom Line:** Run the bootstrap workflow **once**, and all secrets are permanently stored in GitHub Secrets forever. No need to add them again!

