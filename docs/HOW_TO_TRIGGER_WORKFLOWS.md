# How to Trigger Workflows Manually

All the secret-related workflows use `workflow_dispatch`, which means they can be **manually triggered** from GitHub's web interface or via GitHub CLI.

## Method 1: Via GitHub Web Interface (Easiest)

### Adding Secrets Workflow

1. **Go to the workflow page:**
   ```
   https://github.com/EvanTenenbaum/TERP/actions/workflows/add-secrets.yml
   ```

2. **Click "Run workflow" button** (on the right side)

3. **Fill in the secret values** in the form fields.

   **⚠️ IMPORTANT:** Secret values are stored in your local files:
   - `current_spec.yaml` - Contains service secrets
   - `deployment_details.json` - Contains all secrets (service + worker)
   
   Extract values from these files, or use the helper script:
   ```bash
   # View all secrets ready to copy
   cat docs/WORKFLOW_SECRET_VALUES.md  # (This file is local only, not in git)
   ```
   
   **Field names to fill:**
   - `jwt_secret` - JWT secret for authentication
   - `clerk_secret_key` - Clerk authentication secret key
   - `clerk_publishable_key` - Clerk publishable key
   - `database_url` - MySQL database connection string
   - `github_webhook_secret` - GitHub webhook verification secret
   - `solarwinds_token` - Solarwinds monitoring token
   - `sentry_dsn` - Sentry error tracking DSN
   - `vite_sentry_dsn` - Sentry DSN for frontend
   - `slack_bot_token` - Slack bot token
   - `slack_app_token` - Slack app token
   - `github_token` - GitHub personal access token
   - `gemini_api_key` - Google Gemini API key
   - `digitalocean_token` - DigitalOcean API token

4. **Click "Run workflow"** button at the bottom

5. **Watch it run** - secrets will be added permanently to GitHub Secrets

### Bootstrap Secrets Workflow

1. **Go to the workflow page:**
   ```
   https://github.com/EvanTenenbaum/TERP/actions/workflows/bootstrap-secrets.yml
   ```

2. **Click "Run workflow" button**

3. **Type "BOOTSTRAP"** in the confirmation field

4. **Click "Run workflow"**

   This workflow will automatically read from `deployment_details.json` if available, or you'll need to provide values manually.

## Method 2: Via GitHub CLI (From Command Line)

### Adding Secrets

```bash
# Extract values from local files first, then run:
gh workflow run "Add Secrets to GitHub Secrets" \
  -f jwt_secret="<value from current_spec.yaml or deployment_details.json>" \
  -f clerk_secret_key="<value from files>" \
  -f clerk_publishable_key="<value from files>" \
  -f database_url="<value from files>" \
  # ... fill in all other secrets
```

**Or use the script that extracts values automatically:**
```bash
# Reads from local files and adds secrets
./scripts/add-secrets-to-github.sh
```

### Bootstrap Secrets

```bash
gh workflow run "Bootstrap GitHub Secrets (One-Time Setup)" \
  -f confirm_bootstrap="BOOTSTRAP"
```

## What Happens After Triggering

1. **Workflow runs** on GitHub's servers
2. **Secrets are added** to GitHub Secrets (permanent storage)
3. **You can verify** at: https://github.com/EvanTenenbaum/TERP/settings/secrets/actions
4. **Agents can now use them** via `${{ secrets.SECRET_NAME }}`

## Viewing Workflow Runs

After triggering, you can watch the workflow run:

1. Go to: https://github.com/EvanTenenbaum/TERP/actions
2. Click on the workflow run
3. See real-time progress
4. Check logs for any errors

## Troubleshooting

### "Run workflow" button not visible?

- Make sure you're logged into GitHub
- Make sure you have write access to the repository
- Try refreshing the page

### Workflow fails?

- Check the workflow logs for errors
- Make sure you filled in all required fields
- Verify the secrets don't contain invalid characters

### Secrets not appearing?

- Wait a few seconds after workflow completes
- Refresh the secrets page
- Check workflow logs for errors

---

**Remember:** `workflow_dispatch` means you can trigger these workflows **manually, anytime** - they don't run automatically. Perfect for one-time setup!

