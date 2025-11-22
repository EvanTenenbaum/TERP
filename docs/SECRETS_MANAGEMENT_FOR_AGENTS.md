# Secrets Management for Agents

## Overview

This document explains how agents working on this project can access deployment configuration and secrets from anywhere, not just locally.

## The Problem

- Agents need access to deployment configuration files
- Agents may be working outside of local machines
- Secrets cannot be committed to git (blocked by GitHub)
- Secrets need to be accessible programmatically

## The Solution

### Three-Tier Approach

1. **Configuration Structure** (in Git) - `.do/app.spec.yaml`
   - Contains deployment configuration structure
   - Uses placeholders like `{{SECRET:JWT_SECRET}}`
   - Safe to commit and accessible to all agents

2. **Secrets Storage** (GitHub Secrets)
   - Actual secret values stored in GitHub Secrets
   - Encrypted and secure
   - Accessible via GitHub API or GitHub Actions

3. **Application** (DigitalOcean Control Panel)
   - Secrets synced to DigitalOcean App Platform
   - Used by the actual application at runtime

## For Agents: How to Access Secrets

### Option 1: Read Configuration Structure (Recommended)

The configuration structure is in git and accessible everywhere:

```bash
# Read the deployment configuration
cat .do/app.spec.yaml
```

This shows the structure with placeholders like `{{SECRET:JWT_SECRET}}`.

### Option 2: Use GitHub Secrets API

Agents can fetch secrets from GitHub Secrets:

```bash
# Using GitHub CLI (requires authentication)
gh secret list
gh secret get JWT_SECRET

# Or use GitHub Actions workflow
gh workflow run "Set Secrets to DigitalOcean"
```

### Option 3: Use the Helper Script

```bash
# Script that helps fetch and apply secrets
tsx scripts/fetch-and-set-secrets.ts
```

## Current Setup

### Files in Repository (Safe)

- ✅ `.do/app.spec.yaml` - Deployment configuration with placeholders
- ✅ `.do/app.yaml` - DigitalOcean App Platform config (uses `type: SECRET`)
- ✅ `scripts/fetch-and-set-secrets.ts` - Helper script for agents
- ✅ `.github/workflows/set-secrets.yml` - GitHub Actions workflow

### Files NOT in Repository (Contain Actual Secrets)

- ❌ `current_spec.yaml` - Local backup with actual secrets
- ❌ `new_spec.yaml` - Local backup with actual secrets
- ❌ `deployment_details.json` - Local backup with actual secrets

These files are in `.gitignore` and should stay local.

## Setting Up Secrets

### For Project Owners

1. **Store secrets in GitHub Secrets:**
   - Go to: Repository Settings > Secrets and variables > Actions
   - Add secrets: `JWT_SECRET`, `CLERK_SECRET_KEY`, etc.

2. **Sync to DigitalOcean:**
   - Run the GitHub Actions workflow: "Set Secrets to DigitalOcean"
   - Or manually set in DigitalOcean Control Panel

### For Agents

1. **Read configuration:**
   ```bash
   cat .do/app.spec.yaml
   ```

2. **If you need to update secrets:**
   - Use GitHub Actions workflow (recommended)
   - Or ask project owner to update GitHub Secrets

3. **For deployment:**
   - Configuration structure is in `.do/app.spec.yaml`
   - Actual secrets are set in DigitalOcean Control Panel
   - Secrets are synced automatically via GitHub Actions

## GitHub Actions Workflow

The workflow `.github/workflows/set-secrets.yml` automatically:

1. Reads secrets from GitHub Secrets
2. Sets them in DigitalOcean App Platform
3. Can be triggered manually or runs daily

**Manual trigger:**
```bash
gh workflow run "Set Secrets to DigitalOcean"
```

**Specific secret:**
```bash
gh workflow run "Set Secrets to DigitalOcean" -f secret_name=JWT_SECRET
```

## Security Best Practices

1. ✅ **Configuration structure** in git (safe)
2. ✅ **Secrets** in GitHub Secrets (encrypted)
3. ✅ **Secrets** synced to DigitalOcean (encrypted)
4. ❌ **Never** commit actual secrets to git

## Troubleshooting

### Agent can't access secrets

**Problem:** Agent doesn't have access to GitHub Secrets

**Solution:**
- Read configuration from `.do/app.spec.yaml` (safe, no secrets)
- Ask project owner to set secrets in DigitalOcean Control Panel
- Or use GitHub Actions workflow (automated)

### Secrets not syncing

**Problem:** Secrets in GitHub Secrets not appearing in DigitalOcean

**Solution:**
```bash
# Manually trigger sync
gh workflow run "Set Secrets to DigitalOcean"
```

### Need to update configuration

**Problem:** Need to change deployment configuration

**Solution:**
1. Edit `.do/app.spec.yaml` (structure)
2. For secret values, update GitHub Secrets
3. Run sync workflow

## Quick Reference

```bash
# Read deployment configuration (safe, in git)
cat .do/app.spec.yaml

# List secrets in GitHub Secrets (requires auth)
gh secret list

# Sync secrets to DigitalOcean (requires workflow)
gh workflow run "Set Secrets to DigitalOcean"

# Check DigitalOcean app configuration
doctl apps spec get APP_ID
```

---

**Bottom line:** Configuration structure is in git (accessible everywhere), actual secrets are in GitHub Secrets (accessible via API/Actions), and agents can read the structure and use GitHub Actions to apply secrets.

