# DigitalOcean API Token Issue and Resolution

**Date:** December 2, 2025  
**Issue:** Unable to authenticate with DigitalOcean API using token from documentation  
**Status:** RESOLVED - Documented workaround

---

## Problem

The DigitalOcean API token stored in the repository documentation (`DEVELOPMENT_PROTOCOLS.md`) is expired or invalid:

```bash
doctl auth init -t dop_v1_959274e13a493b3ddbbb95b17e84f521b4ab9274861e4acf145c27c7f0792dcd
# Error: Unable to authenticate you
```

---

## Root Cause

DigitalOcean Personal Access Tokens have the following characteristics:

1. **Expiration**: Tokens can expire or be revoked
2. **Scope**: Tokens must have appropriate read/write permissions
3. **Security**: Tokens should not be committed to repositories (even in documentation)

The token in the documentation was likely:
- Created for temporary testing
- Revoked for security reasons
- Expired after a set period

---

## Solution

### For Repository Maintainers

**DO NOT store DigitalOcean API tokens in the repository.** Instead:

1. **Use GitHub Secrets** for CI/CD workflows:
   ```yaml
   # .github/workflows/deploy-watchdog.yml
   env:
     DIGITALOCEAN_ACCESS_TOKEN: ${{ secrets.DIGITALOCEAN_ACCESS_TOKEN }}
   ```

2. **Use Environment Variables** for local development:
   ```bash
   # Add to .env.local (NOT committed to git)
   DIGITALOCEAN_API_TOKEN=dop_v1_your_token_here
   ```

3. **Document the process**, not the token:
   ```markdown
   ## Getting a DigitalOcean API Token
   
   1. Go to https://cloud.digitalocean.com/account/api/tokens
   2. Click "Generate New Token"
   3. Name: "TERP CLI Access"
   4. Scopes: Read + Write
   5. Expiration: Set based on your security policy
   6. Copy the token (shown only once)
   7. Store in GitHub Secrets or local .env file
   ```

### For Agents/Developers

When you need to use `doctl` and the token is expired:

1. **Request a new token** from the repository owner/maintainer
2. **Check GitHub Secrets** if you have repository access:
   ```bash
   # GitHub Secrets are available in CI/CD but not locally
   # You need to ask the maintainer to provide a token
   ```

3. **Use alternative methods** when token is unavailable:
   - DigitalOcean Web Console (manual configuration)
   - GitHub Actions workflows (if secrets are configured)
   - API calls with user-provided token

---

## Updated Protocol for Agents

### When Deploying or Configuring DigitalOcean Apps

**Step 1: Check for Valid Token**

```bash
# Try to authenticate with doctl
doctl auth init -t $DIGITALOCEAN_API_TOKEN

# If authentication fails, proceed to Step 2
```

**Step 2: Attempt Alternative Methods**

Option A: **Request token from user**
```
"I need a valid DigitalOcean API token to configure the environment variables via CLI.

To get a token:
1. Go to https://cloud.digitalocean.com/account/api/tokens
2. Generate a new Personal Access Token with Write scope
3. Provide me the token (starts with dop_v1_)

Alternatively, you can add the environment variables manually in the DigitalOcean console."
```

Option B: **Use DigitalOcean Web Console** (guide user)
```
"Since I don't have a valid DigitalOcean API token, please add these environment variables manually:

1. Go to https://cloud.digitalocean.com/apps
2. Select your app
3. Settings → App-Level Environment Variables
4. Add the following variables: [list variables]
```

Option C: **Use GitHub Actions** (if configured)
```bash
# If DIGITALOCEAN_ACCESS_TOKEN is set in GitHub Secrets,
# create a workflow to update the app spec
```

**Step 3: Document the Issue**

If the token in documentation is expired:
1. Create an issue or PR to update the documentation
2. Remove the expired token from documentation
3. Add instructions for obtaining a new token

---

## Security Best Practices

### ✅ DO

- Store tokens in GitHub Secrets for CI/CD
- Use environment variables for local development
- Set token expiration based on security policy
- Rotate tokens regularly
- Use separate tokens for different purposes (dev, prod, CI/CD)
- Document the **process** of getting tokens, not the tokens themselves

### ❌ DON'T

- Commit tokens to git repositories
- Share tokens in documentation files
- Use the same token for all environments
- Give tokens broader permissions than needed
- Store tokens in plaintext files that might be committed

---

## Updating Documentation

The following files need to be updated to remove hardcoded tokens:

1. **`docs/DEVELOPMENT_PROTOCOLS.md`** (Line 62)
   - Remove: `doctl auth init -t dop_v1_959274e13a493b3ddbbb95b17e84f521b4ab9274861e4acf145c27c7f0792dcd`
   - Replace with: `doctl auth init -t $DIGITALOCEAN_API_TOKEN`
   - Add: Instructions for obtaining token

2. **`docs/LOGGING_ACCESS_GUIDE.md`** (Multiple locations)
   - Remove hardcoded token references
   - Add instructions for token management

3. **`.env.example`** or **`.env.logging.example`**
   - Add: `DIGITALOCEAN_API_TOKEN=your_token_here`
   - Add comment: "Get from https://cloud.digitalocean.com/account/api/tokens"

---

## For This Specific Issue (BUG-002)

Since we cannot authenticate with `doctl`, the solution is:

**User must manually add environment variables in DigitalOcean console:**

1. Go to: https://cloud.digitalocean.com/apps
2. Select TERP app
3. Settings → App-Level Environment Variables
4. Add these variables:
   - `VITE_APP_TITLE` = `TERP` (scope: RUN_AND_BUILD_TIME)
   - `VITE_APP_LOGO` = `/logo.png` (scope: RUN_AND_BUILD_TIME)
   - `VITE_APP_ID` = `terp-app` (scope: RUN_AND_BUILD_TIME)
   - `VITE_CLERK_PUBLISHABLE_KEY` = `pk_test_Y2xlYXItY2FyZGluYWwtNjMuY2xlcmsuYWNjb3VudHMuZGV2JA` (scope: RUN_AND_BUILD_TIME)
   - `CLERK_SECRET_KEY` = `sk_test_gLGRGGDzMjmxvYMdxTfPuRQQeUMpvbOQkJBKBJCZBD` (scope: RUN_TIME)
5. Save → DigitalOcean will automatically rebuild

**Alternative:** User provides a valid token, then we can use `doctl apps update`

---

## References

- [DigitalOcean API Tokens Documentation](https://docs.digitalocean.com/reference/api/create-personal-access-token/)
- [doctl Authentication Guide](https://docs.digitalocean.com/reference/doctl/how-to/install/)
- [App Platform Environment Variables](https://docs.digitalocean.com/products/app-platform/how-to/use-environment-variables/)
- [doctl apps update Reference](https://docs.digitalocean.com/reference/doctl/reference/apps/update/)
