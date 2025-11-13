# CL-002: Secret Rotation Guide

**Date:** November 12, 2025
**Status:** URGENT - Secrets exposed in Git history since Nov 9, 2025

## Exposed Secrets

The following secrets were found in `.env.backup` (commit 59d9355):

1. **Clerk Secret Key**: `sk_test_gLGRGGDzMjmxvYMdxTfPuRQQeUMpvbOQkJBKBJCZBD`
2. **Clerk Publishable Key**: `pk_test_Y2xlYXItY2FyZGluYWwtNjMuY2xlcmsuYWNjb3VudHMuZGV2JA`
3. **Argos Token**: `argos_34b2c3e186f4849c6c401d8964014a201a`

## Actions Completed

- [x] Removed `.env.backup` from current commit
- [x] Purged `.env.backup` from Git history using BFG Repo-Cleaner
- [x] Ran garbage collection to permanently remove secrets
- [x] Verified removal from history
- [ ] Force push to GitHub (requires user approval)
- [ ] Rotate Clerk keys
- [ ] Rotate Argos token
- [ ] Update production environment variables
- [ ] Notify team to re-clone repository

## Secret Rotation Instructions

### 1. Rotate Clerk Keys

**Dashboard:** https://dashboard.clerk.com/

**Steps:**

1. Log in to Clerk dashboard
2. Navigate to API Keys section
3. Generate new Secret Key
4. Generate new Publishable Key
5. Update DigitalOcean environment variables:
   - `CLERK_SECRET_KEY` → new secret key
   - `VITE_CLERK_PUBLISHABLE_KEY` → new publishable key
6. Revoke old keys in Clerk dashboard
7. Restart application to pick up new keys

**Estimated Time:** 10 minutes

### 2. Rotate Argos Token

**Dashboard:** https://argos-ci.com/

**Steps:**

1. Log in to Argos dashboard
2. Navigate to Settings → Tokens
3. Revoke token: `argos_34b2c3e186f4849c6c401d8964014a201a`
4. Generate new token
5. Update DigitalOcean environment variable:
   - `ARGOS_TOKEN` → new token
6. Update GitHub Actions secrets if used in CI/CD

**Estimated Time:** 5 minutes

### 3. Force Push to GitHub

**⚠️ WARNING:** This will rewrite Git history. All team members must re-clone the repository.

```bash
cd /home/ubuntu/TERP
git push --force origin main
```

### 4. Update Production Environment

After rotating secrets:

1. Update all environment variables in DigitalOcean App Platform
2. Trigger a new deployment
3. Verify application still works
4. Monitor logs for authentication errors

### 5. Notify Team

Send message to all team members:

> **URGENT: Repository history rewritten**
>
> We've purged exposed secrets from Git history. Please:
>
> 1. Delete your local TERP repository
> 2. Re-clone from GitHub: `git clone https://github.com/EvanTenenbaum/TERP.git`
> 3. Do NOT try to push from old clones
>
> All secrets have been rotated. Contact Evan if you have issues.

## Verification Checklist

After rotation:

- [ ] Application starts successfully
- [ ] Users can log in (Clerk working)
- [ ] Argos CI/CD pipeline works
- [ ] No authentication errors in logs
- [ ] All team members have re-cloned repository

## Security Notes

- These secrets were publicly exposed for 3 days (Nov 9-12, 2025)
- Assume secrets were compromised
- Monitor for unusual activity in Clerk and Argos dashboards
- Consider enabling 2FA on all service accounts
- Review access logs for suspicious activity

## Prevention

To prevent future secret exposure:

1. Never commit `.env*` files (already in `.gitignore`)
2. Use `git-secrets` or similar pre-commit hooks
3. Regularly audit Git history for secrets
4. Use secret scanning tools (GitHub Advanced Security)
5. Rotate secrets quarterly as best practice
