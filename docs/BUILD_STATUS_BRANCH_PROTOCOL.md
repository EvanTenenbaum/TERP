# Build Status Branch Protocol

**Last Updated:** 2025-11-25  
**Purpose:** Explain how build status tracking works and why it's on a separate branch

---

## 🎯 Overview

Build status updates are automatically pushed to a **separate `build-status` branch** instead of the `main` branch. This prevents build status commits from triggering DigitalOcean deployments and causing deployment conflicts.

---

## ❓ Why a Separate Branch?

### The Problem

Previously, build status updates were pushed directly to `main`:
- Every push to `main` triggers a DigitalOcean deployment
- Build status commits would cancel active deployments
- This caused deployment conflicts and failed deployments

### The Solution

Build status updates now go to the `build-status` branch:
- DigitalOcean only monitors the `main` branch (configured in `.do/app.yaml`)
- The `build-status` branch is not monitored, so no deployments are triggered
- Build status history is still preserved in git
- No more deployment conflicts!

---

## 📍 Where to Find Build Status

### Location
- **Branch:** `build-status`
- **File:** `.github/BUILD_STATUS.md`

### How to Check Build Status

```bash
# Method 1: View without checking out (recommended)
git fetch origin build-status 2>/dev/null || true
git show origin/build-status:.github/BUILD_STATUS.md

# Method 2: Checkout temporarily (if Method 1 doesn't work)
git checkout build-status && cat .github/BUILD_STATUS.md && git checkout main
```

### What You'll See

The build status file contains:
- Latest build status (✅ PASSED or ❌ FAILED)
- Integration test results
- E2E test results
- Database schema test results
- Database seed test results
- Commit SHA and timestamp
- Error details if tests failed

---

## 🔄 How It Works

### Automatic Process

1. **You push code to `main`**
   - Triggers GitHub Actions workflow (`.github/workflows/merge.yml`)
   - Tests run (Integration, E2E, Schema, Seed)

2. **Workflow updates build status**
   - Creates/updates `.github/BUILD_STATUS.md` with test results
   - Commits to `build-status` branch (not `main`)
   - Pushes to `origin/build-status`

3. **DigitalOcean deployment**
   - Only triggered by commits to `main`
   - Not triggered by `build-status` branch updates
   - Your deployment completes without interruption!

---

## ✅ For Agents: Quick Reference

### Before Starting Work

```bash
# Check if main branch is healthy
git show origin/build-status:.github/BUILD_STATUS.md
```

### After Pushing to Main

```bash
# Wait a few minutes for tests to complete, then check:
git fetch origin build-status
git show origin/build-status:.github/BUILD_STATUS.md
```

### If Build Fails

1. Check the build status file for error details
2. Fix the issues
3. Push fix to `main` (not `build-status`)
4. Wait for new build status update

---

## 🚨 Important Notes

### DO NOT:
- ❌ Manually push to `build-status` branch (workflow handles this)
- ❌ Try to merge `build-status` into `main` (not needed)
- ❌ Check build status from `main` branch (it's not there!)

### DO:
- ✅ Always check build status from `build-status` branch
- ✅ Use `git show origin/build-status:.github/BUILD_STATUS.md`
- ✅ Wait a few minutes after pushing before checking (tests need time to run)

---

## 🔧 Technical Details

### Workflow Configuration

The build status update is handled in `.github/workflows/merge.yml`:

```yaml
- name: Update build status on separate branch
  if: always()
  run: |
    # Checkout or create build-status branch
    # Merge latest from main
    # Update BUILD_STATUS.md
    # Push to build-status branch (not main)
```

### DigitalOcean Configuration

DigitalOcean is configured in `.do/app.yaml`:

```yaml
github:
  repo: EvanTenenbaum/TERP
  branch: main  # Only monitors main branch
  deploy_on_push: true
```

Since DigitalOcean only monitors `main`, updates to `build-status` don't trigger deployments.

---

## 📚 Related Documentation

- **Development Protocols:** `docs/DEVELOPMENT_PROTOCOLS.md` (Section on build status checking)
- **Workflow File:** `.github/workflows/merge.yml` (Build status update logic)
- **DigitalOcean Config:** `.do/app.yaml` (Deployment configuration)

---

## 🐛 Troubleshooting

### "Build status branch not available"

This means the `build-status` branch doesn't exist yet. This happens if:
- No tests have run yet (first push)
- Workflow hasn't completed yet (wait a few minutes)

**Solution:** Wait a few minutes and try again, or check GitHub Actions workflow status.

### "Cannot find build status file"

Make sure you're checking from the `build-status` branch, not `main`:

```bash
# Wrong (won't work):
cat .github/BUILD_STATUS.md  # This is on main, file doesn't exist there

# Correct:
git show origin/build-status:.github/BUILD_STATUS.md
```

---

## ✅ Summary

- **Build status is on `build-status` branch** (not `main`)
- **Check it with:** `git show origin/build-status:.github/BUILD_STATUS.md`
- **Why?** Prevents deployment conflicts
- **When?** After every push to `main`, wait a few minutes for tests to complete

