# Deployment Spec Files Guide

## The Problem

You have deployment configuration files (`current_spec.yaml`, `new_spec.yaml`, `deployment_details.json`) that contain **sensitive credentials** and were blocked by GitHub's push protection.

## The Solution

**You have TWO options:**

### Option 1: Use Template Files (Recommended)

Create **template versions** of these files without secrets, similar to how `.do/app.yaml` works:

1. **Template file** (in git) - Contains structure but uses placeholders:

   ```yaml
   envs:
     - key: DATABASE_URL
       scope: RUN_AND_BUILD_TIME
       value: ${DATABASE_URL} # Set in DO control panel
     - key: JWT_SECRET
       scope: RUN_AND_BUILD_TIME
       type: SECRET # Use DO secret manager
   ```

2. **Actual config** (local only) - Contains real values:
   ```yaml
   envs:
     - key: DATABASE_URL
       value: mysql://user:password@host/db # Real value
   ```

### Option 2: Use DigitalOcean Control Panel Only

Since you already have `.do/app.yaml` in the repo, you can:

1. Keep your deployment config in **DigitalOcean control panel**
2. Don't commit these spec files to git
3. Use `.do/app.yaml` as your source of truth (it's already there and safe)

## Current Status

**Already in Repository (Safe):**

- ✅ `.do/app.yaml` - Uses environment variables and `type: SECRET` for sensitive values

**Blocked by GitHub (Contains Secrets):**

- ❌ `current_spec.yaml` - Contains actual secrets
- ❌ `new_spec.yaml` - Contains actual secrets
- ❌ `deployment_details.json` - Contains actual secrets

## Recommended Approach

**Use `.do/app.yaml` as your deployment configuration.** It's already:

- ✅ In the repository
- ✅ Properly configured with secrets using `type: SECRET`
- ✅ Following best practices

**For the spec files:**

1. Keep them **local only** (already in `.gitignore`)
2. Use them as **reference/backup** for your deployment state
3. Don't commit them to git

## If You Need to Share Config Structure

Create template files with placeholders:

```yaml
# .do/app.template.yaml
envs:
  # Database (set in DO control panel)
  - key: DATABASE_URL
    scope: RUN_TIME
    type: SECRET

  # Auth (set in DO control panel)
  - key: JWT_SECRET
    scope: RUN_TIME
    type: SECRET
```

This way you can commit the **structure** without the **secrets**.

## Next Steps

1. ✅ Keep `.do/app.yaml` as your deployment config (already done)
2. ✅ Keep spec files in `.gitignore` (already done)
3. ⏭️ If needed, create template versions for reference
4. ⏭️ Manage actual secrets in DigitalOcean control panel

**Bottom line:** You don't need those spec files in git. Use `.do/app.yaml` for deployment configuration, and keep your actual secrets in DigitalOcean's secret manager.
