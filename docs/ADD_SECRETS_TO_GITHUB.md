# How to Add Secrets to GitHub Secrets

I've created scripts and instructions to add your deployment secrets to GitHub Secrets. Here are your options:

## Quick Method (If you have GitHub CLI)

If you have `gh` CLI installed and authenticated, just run:

```bash
./scripts/add-secrets-to-github.sh
```

This will automatically add all 13 secrets to GitHub Secrets.

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

