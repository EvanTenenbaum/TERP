# Agent Pre-Flight Check Template

> Use this template at the start of any agent prompt to ensure environment readiness.

## Pre-Flight Checks

**CRITICAL:** Run these checks BEFORE starting any work. If any check fails, STOP and report the issue.

```bash
# 1. Clone the repository (use gh to ensure proper remote setup)
gh repo clone EvanTenenbaum/TERP ~/TERP
cd ~/TERP

# 2. Verify git remote is configured correctly
git remote -v
# Expected output:
# origin  https://github.com/EvanTenenbaum/TERP.git (fetch)
# origin  https://github.com/EvanTenenbaum/TERP.git (push)

# If remote is missing or incorrect:
git remote remove origin 2>/dev/null
git remote add origin https://github.com/EvanTenenbaum/TERP.git

# 3. Pull latest changes
git checkout main
git pull origin main

# 4. Install dependencies
pnpm install

# 5. Verify TypeScript compiles (MUST be 0 errors)
pnpm check
# If errors > 0, DO NOT proceed. Report the error count.

# 6. Verify the app builds
pnpm build
# If build fails, DO NOT proceed. Report the error.

# 7. Create your feature branch
git checkout -b <wave>/<feature-name>
```

## Self-Diagnosis

If pre-flight checks fail, try these fixes:

### TypeScript Errors
```bash
# Ensure you have the latest code
git fetch origin
git reset --hard origin/main
pnpm install
pnpm check
```

### Build Failures
```bash
# Clear caches
rm -rf node_modules/.vite
rm -rf dist
pnpm build
```

### Git Issues
```bash
# Reset remote configuration
git remote remove origin
git remote add origin https://github.com/EvanTenenbaum/TERP.git
git fetch origin
```

### Dependency Issues
```bash
# Clean install
rm -rf node_modules
rm pnpm-lock.yaml
pnpm install
```

## Reporting Issues

If pre-flight checks fail after trying self-diagnosis, report:

1. **Which check failed** (step number and command)
2. **Error output** (full error message)
3. **Environment state** (output of `git status`, `node -v`, `pnpm -v`)

Do NOT attempt to work around pre-flight failures. The main branch MUST be in a working state before any agent work begins.
