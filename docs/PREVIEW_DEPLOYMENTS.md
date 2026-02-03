# Preview Deployments

This document describes how automatic preview deployments work for the TERP project.

## Overview

Every pull request to `main` automatically gets a preview deployment on DigitalOcean App Platform. This allows QA testing of changes before merging.

## How It Works

### On PR Open/Update

1. GitHub Actions triggers `.github/workflows/preview-deploy.yml`
2. The `digitalocean/app_action` creates a unique preview app for the PR
3. A comment is posted on the PR with the live preview URL
4. The preview updates automatically when new commits are pushed

### On PR Close/Merge

1. GitHub Actions triggers `.github/workflows/preview-cleanup.yml`
2. The preview app is automatically deleted
3. The PR comment is updated to reflect cleanup status

## Preview App Naming

Preview apps are automatically named using the pattern:

```
terp-pr-{PR_NUMBER}
```

For example, PR #380 would create an app named `terp-pr-380`.

## Configuration

### Required Secret

The following secret must be configured in the GitHub repository:

| Secret Name                 | Description                                                               |
| --------------------------- | ------------------------------------------------------------------------- |
| `DIGITALOCEAN_ACCESS_TOKEN` | DigitalOcean Personal Access Token with read/write access to App Platform |

### Setting Up the Secret

1. Go to [DigitalOcean API Tokens](https://cloud.digitalocean.com/account/api/tokens)
2. Click "Generate New Token"
3. Name it `github-actions-terp` (or similar)
4. Select **Read** and **Write** scopes
5. Copy the token
6. Go to GitHub repo → Settings → Secrets and variables → Actions
7. Click "New repository secret"
8. Name: `DIGITALOCEAN_ACCESS_TOKEN`
9. Value: Paste the token
10. Click "Add secret"

## Preview App Spec Modifications

When deployed as a preview, the app spec is automatically modified:

- **Name**: Changed to `terp-pr-{PR_NUMBER}`
- **Branch**: Changed to the PR's source branch
- **Domains**: Removed (uses default DO domain)
- **Alerts**: Removed (to avoid notification spam)
- **Database**: Uses the same production database (be careful with migrations!)

## Database Considerations

⚠️ **Important**: Preview apps connect to the **same production database** as the main app.

### Safe Practices

- Preview deployments should NOT run destructive migrations
- Test data changes should be reversible
- Use feature flags for new features that require schema changes

### For Schema Changes

1. Create the migration in a separate PR first
2. Merge the migration PR to main
3. Then create the feature PR that uses the new schema

## Costs

Preview apps incur DigitalOcean charges while running:

- Instance: `apps-d-1vcpu-2gb` (~$12/month prorated)
- Apps are automatically deleted when PRs are closed
- Dependabot PRs skip preview deployment to save costs

## Troubleshooting

### Preview Deployment Failed

Check the GitHub Actions logs for details:

1. Go to the PR → Checks tab
2. Click on "Deploy Preview"
3. Review build and deploy logs

Common issues:

- **Build failure**: TypeScript errors, missing dependencies
- **Deploy failure**: Health check timeout, environment variable issues

### Preview Not Updating

If the preview doesn't update after pushing:

1. Check if the workflow is running (Actions tab)
2. Verify the `DIGITALOCEAN_ACCESS_TOKEN` secret is valid
3. Check DigitalOcean App Platform for any quota limits

### Manual Cleanup

If a preview app wasn't automatically deleted:

```bash
# List all apps
doctl apps list

# Delete by app ID
doctl apps delete <app-id>
```

Or use the DigitalOcean control panel to manually delete the app.

## Related Files

- `.github/workflows/preview-deploy.yml` - Deploy workflow
- `.github/workflows/preview-cleanup.yml` - Cleanup workflow
- `.do/app.yaml` - Base app specification
