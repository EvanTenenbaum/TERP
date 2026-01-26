# Simple Secrets Setup Guide

## The Simplest Way (Just Do This)

**Yes, you can absolutely just add them manually!** That's the easiest way.

### Step 1: Go to GitHub Secrets

1. Go to: **https://github.com/EvanTenenbaum/TERP/settings/secrets/actions**
2. Click **"New repository secret"** button
3. Add each secret one by one

### Step 2: Add These Secrets

Copy the values from your local `current_spec.yaml` or `deployment_details.json` files:

**Service Secrets (5):**

- Name: `JWT_SECRET` → Value: (from your files)
- Name: `CLERK_SECRET_KEY` → Value: (from your files)
- Name: `CLERK_PUBLISHABLE_KEY` → Value: (from your files)
- Name: `DATABASE_URL` → Value: (from your files)
- Name: `WEBHOOK_SECRET` → Value: (from your files, was GITHUB_WEBHOOK_SECRET)

  **Note:** GitHub Secrets can't start with "github", so use `WEBHOOK_SECRET` instead of `GITHUB_WEBHOOK_SECRET`

**Monitoring Secrets (3):**

- Name: `SOLARWINDS_TOKEN` → Value: (from your files)
- Name: `SENTRY_DSN` → Value: (from your files)
- Name: `VITE_SENTRY_DSN` → Value: (from your files)

**Worker Secrets (5):**

- Name: `SLACK_BOT_TOKEN` → Value: (from your files)
- Name: `SLACK_APP_TOKEN` → Value: (from your files)
- Name: `GITHUB_TOKEN` → Value: (from your files)
- Name: `GEMINI_API_KEY` → Value: (from your files)
- Name: `DIGITALOCEAN_TOKEN` → Value: (from your files)

### Step 3: Done!

Once you add them manually:

- ✅ They're **permanently stored** in GitHub Secrets
- ✅ All agents can access them via `${{ secrets.SECRET_NAME }}`
- ✅ They work everywhere - no need to add them again
- ✅ They're secure - encrypted by GitHub

## That's It!

You don't need:

- ❌ Complex workflows
- ❌ Scripts
- ❌ Automation

Just **manually add them once** in the GitHub web interface, and you're done!

## How Agents Use Them

Once secrets are stored, agents use them like this in workflows:

```yaml
env:
  JWT_SECRET: ${{ secrets.JWT_SECRET }}
  DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

That's it. Simple!

## When to Use the Automated Methods

The workflows and scripts I created are only useful if:

- You want to automate updating secrets frequently
- You're adding secrets from a remote machine
- You want to script the process

**But for one-time setup? Just do it manually - it's faster and simpler!**
