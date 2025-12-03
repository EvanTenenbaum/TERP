# Development Workflow Quick Start

**TL;DR**: Work on `develop` branch, test on dev site, promote to `main` for production.

---

## Daily Workflow

### 1. Start Working

```bash
# Switch to develop branch
git checkout develop
git pull origin develop

# Make your changes
# ... edit code ...
```

### 2. Deploy to Development

```bash
# Quick deploy (runs checks, commits, pushes)
./scripts/deploy-to-dev.sh

# Or manually:
git add .
git commit -m "feat: your change"
git push origin develop
```

**Result**: Auto-deploys to https://terp-dev-app.ondigitalocean.app in ~3-5 minutes

### 3. Test on Dev Site

```bash
# Watch deployment
./scripts/watch-deploy.sh --dev

# Check status
./scripts/dev-status.sh

# View logs
doctl apps logs $DEV_APP_ID --type run --follow
```

### 4. Promote to Production

```bash
# When ready for production
./scripts/promote-to-production.sh

# Or manually:
git checkout main
git merge develop
git push origin main
```

**Result**: Auto-deploys to production in ~5-10 minutes

---

## Environment URLs

| Environment     | URL                                       | Branch    | Database |
| --------------- | ----------------------------------------- | --------- | -------- |
| **Development** | https://terp-dev-app.ondigitalocean.app   | `develop` | Dev DB   |
| **Production**  | https://terp-app-b9s35.ondigitalocean.app | `main`    | Prod DB  |

---

## Common Commands

```bash
# Check status of both environments
./scripts/dev-status.sh

# Watch development deployment
./scripts/watch-deploy.sh --dev

# Watch production deployment
./scripts/watch-deploy.sh --prod

# Sync environment variables
./scripts/sync-env-vars.sh development
./scripts/sync-env-vars.sh production

# Quick deploy to dev
./scripts/deploy-to-dev.sh

# Promote to production
./scripts/promote-to-production.sh
```

---

## AI Agent Workflow

Agents should work on `develop` branch:

```bash
# 1. Pull latest
git checkout develop
git pull origin develop

# 2. Make changes
# ... implement feature ...

# 3. Push to develop
git add .
git commit -m "feat(TASK-ID): implement feature"
git push origin develop

# 4. Auto-deploys to dev site
# 5. User tests on dev site
# 6. User promotes to production when ready
```

---

## Troubleshooting

### "Which environment am I on?"

```bash
git branch --show-current
# develop = development
# main = production
```

### "Dev and prod are out of sync"

```bash
# Sync develop with main
git checkout develop
git merge main
git push origin develop
```

### "Need to rollback"

```bash
# Rollback development
git checkout develop
git revert HEAD
git push origin develop

# Rollback production
git checkout main
git revert HEAD
git push origin main
```

### "Deployment failed"

```bash
# Check logs
doctl apps logs $DEV_APP_ID --type build --tail 100

# Common fixes:
# - TypeScript errors: pnpm typecheck
# - Linting errors: pnpm lint
# - Test failures: pnpm test
# - Missing env vars: ./scripts/sync-env-vars.sh development
```

---

## Benefits

✅ **Fast iteration**: Test changes in 3-5 minutes  
✅ **Safe testing**: Can't break production  
✅ **Work anywhere**: Cloud-based, no local setup  
✅ **AI collaboration**: Agents push, you test immediately  
✅ **Easy rollback**: Just revert the commit

---

## Setup (One-time)

If you haven't set up the development environment yet:

```bash
# Run setup script
./scripts/setup-dev-environment.sh

# Follow the prompts to:
# 1. Create development database
# 2. Deploy development app
# 3. Configure environment variables
```

See `docs/DEV_ENVIRONMENT_SETUP.md` for detailed setup instructions.

---

**Questions?** Check `docs/DEV_ENVIRONMENT_SETUP.md` for full documentation.
