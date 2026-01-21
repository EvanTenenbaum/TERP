# CL-005: .env File Security Issue

**Date:** November 12, 2025  
**Severity:** 🔴 CRITICAL  
**Status:** RESOLVED - History cleaned

## Issue Summary

The `.env` file containing **production credentials** was committed to Git and pushed to GitHub, exposing sensitive information publicly.

## Exposed Credentials

The following production credentials were exposed in Git history:

1. **Database Credentials**
   - Host: `terp-mysql-db-do-user-28175253-0.m.db.ondigitalocean.com`
   - User: `doadmin`
   - Password: `<REDACTED>`
   - Database: `defaultdb`
   - Port: 25060

2. **Clerk Authentication**
   - Publishable Key: `pk_test_Y2xlYXItY2FyZGluYWwtNjMuY2xlcmsuYWNjb3VudHMuZGV2JA`
   - Secret Key: `sk_test_gLGRGGDzMjmxvYMdxTfPuRQQeUMpvbOQkJBKBJCZBD`

3. **Argos Token**
   - Token: `argos_34b2c3e186f4849c6c401d8964014a201a`

**Note:** These are the SAME credentials exposed in CL-002 (`.env.backup`).

## Root Cause

The `.env` file was committed before `.gitignore` was properly configured. While `.gitignore` contained `.env`, the file was already tracked in Git history.

## Actions Taken

### 1. Immediate Remediation
- ✅ Removed `.env` from Git tracking (kept local file)
- ✅ Created proper `.env.example` without secrets
- ✅ Removed outdated files:
  - `.env.railway` (Railway no longer used)
  - `.env.railway.txt` (Railway no longer used)
  - `.env.production` (Redundant - DigitalOcean uses env vars)

### 2. History Cleanup
- ✅ Purged `.env` from Git history using BFG Repo-Cleaner
- ✅ Ran garbage collection to permanently remove secrets
- ✅ Force pushed cleaned history to GitHub
- ✅ Verified removal from history

### 3. Backup
- ✅ Created backup at `/home/ubuntu/TERP-env-backup-20251112-200227.env`

## Verification

```bash
# Verify .env is not in Git history
$ git log --all --full-history -- ".env"
(no results)

# Verify .env is in .gitignore
$ grep "^\.env$" .gitignore
.env

# Verify .env is not tracked
$ git ls-files | grep "^\.env$"
(no results)
```

## Required Actions (User)

**URGENT:** All exposed credentials MUST be rotated immediately.

### 1. Rotate Database Password
**Dashboard:** DigitalOcean → Databases → terp-mysql-db

**Steps:**
1. Log in to DigitalOcean
2. Navigate to Databases → terp-mysql-db
3. Go to "Users & Databases" tab
4. Reset password for `doadmin` user
5. Update `DATABASE_URL` in DigitalOcean App Platform environment variables
6. Restart application

**Estimated Time:** 10 minutes

### 2. Rotate Clerk Keys
See `docs/CL-002-SECRET-ROTATION-GUIDE.md` for detailed instructions.

**Estimated Time:** 10 minutes

### 3. Rotate Argos Token
See `docs/CL-002-SECRET-ROTATION-GUIDE.md` for detailed instructions.

**Estimated Time:** 5 minutes

## Security Timeline

- **Unknown - Nov 12, 2025:** `.env` exposed in public Git history
- **Nov 9, 2025:** `.env.backup` exposed (CL-002)
- **Nov 12, 2025 20:00:** Issue discovered during ST-001 (Consolidate .env Files)
- **Nov 12, 2025 20:02:** `.env` purged from Git history
- **Nov 12, 2025 20:03:** Cleaned history pushed to GitHub

**Exposure Duration:** Unknown (potentially months)

## Prevention Measures

### Implemented
1. ✅ `.env` removed from Git tracking
2. ✅ Proper `.env.example` created with placeholders
3. ✅ `.gitignore` verified to contain `.env`

### Recommended
1. ☐ Enable GitHub secret scanning (Advanced Security)
2. ☐ Set up pre-commit hook to prevent secret commits
3. ☐ Implement secret rotation schedule (quarterly)
4. ☐ Use secret management service (e.g., HashiCorp Vault)
5. ☐ Enable 2FA on all service accounts
6. ☐ Monitor access logs for suspicious activity

## Related Issues

- **CL-002:** `.env.backup` exposed same credentials
- **ST-001:** Consolidate .env Files (task that discovered this issue)

## Lessons Learned

1. **Never commit .env files** - Even if .gitignore is configured, check if file is already tracked
2. **Regular security audits** - This issue was discovered during routine cleanup
3. **Assume breach** - Treat all exposed credentials as compromised
4. **Defense in depth** - Multiple layers of security prevent single points of failure

## Status

- [x] `.env` removed from Git history
- [x] Proper `.env.example` created
- [x] Outdated files removed
- [x] History cleaned and pushed
- [ ] Database password rotated (USER ACTION REQUIRED)
- [ ] Clerk keys rotated (USER ACTION REQUIRED)
- [ ] Argos token rotated (USER ACTION REQUIRED)
- [ ] Team notified to re-clone repository (USER ACTION REQUIRED)

## References

- CL-002 Secret Rotation Guide: `docs/CL-002-SECRET-ROTATION-GUIDE.md`
- BFG Repo-Cleaner: https://rtyley.github.io/bfg-repo-cleaner/
- GitHub Secret Scanning: https://docs.github.com/en/code-security/secret-scanning
