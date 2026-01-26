# How to Add Secrets to GitHub Secrets (From Anywhere)

You can add secrets to GitHub Secrets from anywhere, not just your local machine. Here are your options:

## Method 1: GitHub Actions Workflow (Recommended - Works from Anywhere)

**Best for:** Adding secrets from any device, browser, or remote location

1. Go to: https://github.com/EvanTenenbaum/TERP/actions/workflows/add-secrets.yml
2. Click **"Run workflow"**
3. Fill in the secret values in the form (they're masked in logs)
4. Click **"Run workflow"** button

**Or via GitHub CLI from anywhere:**

```bash
gh workflow run "Add Secrets to GitHub Secrets" \
  -f jwt_secret="your-jwt-secret" \
  -f clerk_secret_key="your-clerk-key" \
  -f database_url="your-db-url"
  # ... add other secrets as needed
```

## Method 2: Environment Variables + Script (Any Machine)

**Best for:** Running from a remote server or CI/CD pipeline

```bash
# Set environment variables (can be done from anywhere)
export JWT_SECRET="your-secret"
export CLERK_SECRET_KEY="your-key"
export DATABASE_URL="your-db-url"
# ... set other secrets

# Run the script
./scripts/add-secrets-remote.sh
```

The script reads from environment variables and adds them to GitHub Secrets.

## Method 3: From Local Machine (Original Method)

If you're on your local machine with the deployment files:

```bash
./scripts/add-secrets-to-github.sh
```

This reads from your local `current_spec.yaml` and `deployment_details.json` files.

## Manual Method (Via GitHub Web Interface)

1. Go to: https://github.com/EvanTenenbaum/TERP/settings/secrets/actions
2. Click "New repository secret"
3. Add each secret one by one using the values from `scripts/add-secrets-instructions.md`

## What Secrets Will Be Added

### Service Secrets (5)

- `JWT_SECRET`
- `CLERK_SECRET_KEY`
- `CLERK_PUBLISHABLE_KEY`
- `DATABASE_URL`
- `GITHUB_WEBHOOK_SECRET`

### Monitoring Secrets (3)

- `SOLARWINDS_TOKEN`
- `SENTRY_DSN`
- `VITE_SENTRY_DSN`

### Worker Secrets (5)

- `SLACK_BOT_TOKEN`
- `SLACK_APP_TOKEN`
- `GITHUB_TOKEN`
- `GEMINI_API_KEY`
- `DIGITALOCEAN_TOKEN`

**Total: 13 secrets**

## After Adding Secrets

Once secrets are added, you can:

1. **Verify they're set:**

   ```bash
   gh secret list --repo EvanTenenbaum/TERP
   ```

2. **Sync them to DigitalOcean:**
   ```bash
   gh workflow run "Set Secrets to DigitalOcean"
   ```

## Files Created

- `scripts/add-secrets-to-github.sh` - Automated script (requires `gh` CLI)
- `scripts/add-secrets-to-github.ts` - TypeScript script (requires Node.js and GitHub API token)
- `scripts/add-secrets-instructions.md` - Complete manual instructions with all secret values

All secret values are extracted from your `current_spec.yaml` and `deployment_details.json` files.

## Need Help?

See `scripts/add-secrets-instructions.md` for complete step-by-step instructions with all values.
