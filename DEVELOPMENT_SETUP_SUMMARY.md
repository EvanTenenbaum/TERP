# 🚀 Development Environment Setup - Executive Summary

**Created**: 2025-12-03  
**Status**: Ready to Implement

---

## What We Built

A **cloud-based development environment** that lets you iterate quickly without deploying to production every time, while ensuring dev-prod parity.

---

## The Solution

### Two Environments

1. **Development** (new)
   - Branch: `develop`
   - URL: `terp-dev-app.ondigitalocean.app` (to be created)
   - Deploy time: 3-5 minutes
   - Purpose: Fast iteration and testing

2. **Production** (existing)
   - Branch: `main`
   - URL: `terp-app-b9s35.ondigitalocean.app`
   - Deploy time: 5-10 minutes
   - Purpose: Live users

### Key Benefits

✅ **Fast iteration**: 3-5 min deploys vs 5-10 min  
✅ **Safe testing**: Separate database, can't break production  
✅ **Work anywhere**: Cloud-based, no local setup needed  
✅ **AI collaboration**: Agents push to develop, you test immediately  
✅ **Dev-prod parity**: Same infrastructure, same build process  
✅ **Cost effective**: ~$25/month for dev environment

---

## How to Set It Up

### Step 1: Run Setup Script (5 minutes)

```bash
./scripts/setup-dev-environment.sh
```

This creates:

- Development app spec (`.do/app-development.yaml`)
- Helper scripts for dev workflow
- `develop` branch

### Step 2: Create Development Database (2 minutes)

```bash
doctl databases create terp-dev-mysql \
  --engine mysql \
  --version 8 \
  --size db-s-1vcpu-1gb \
  --region nyc3
```

Get connection string:

```bash
doctl databases connection terp-dev-mysql
```

### Step 3: Configure Development App (5 minutes)

Edit `.do/app-development.yaml`:

- Add your GitHub repo
- Add dev database URL
- Add Clerk test keys (get from Clerk dashboard)

### Step 4: Deploy Development App (2 minutes)

```bash
doctl apps create --spec .do/app-development.yaml
```

Get the app ID:

```bash
doctl apps list | grep terp-dev-app
```

### Step 5: Save App IDs (1 minute)

```bash
echo 'PROD_APP_ID=1fd40be5-b9af-4e71-ab1d-3af0864a7da4' > .env.app-ids
echo 'DEV_APP_ID=<your-dev-app-id>' >> .env.app-ids
```

**Total setup time: ~15 minutes**

---

## How to Use It

### Daily Workflow

```bash
# 1. Work on develop branch
git checkout develop
git pull origin develop

# 2. Make changes
# ... edit code ...

# 3. Deploy to dev (quick script)
./scripts/deploy-to-dev.sh

# 4. Test on dev site (from any device)
# Open: https://terp-dev-app.ondigitalocean.app

# 5. When ready, promote to production
./scripts/promote-to-production.sh
```

### Quick Commands

```bash
# Check status of both environments
./scripts/dev-status.sh

# Watch dev deployment
./scripts/watch-deploy.sh --dev

# Watch prod deployment
./scripts/watch-deploy.sh --prod
```

---

## For AI Agents

Agents now work on `develop` branch:

```bash
git checkout develop
git pull origin develop

# Make changes
# ... implement feature ...

git add .
git commit -m "feat: implement feature"
git push origin develop

# Auto-deploys to dev site
# You test on your phone/tablet/laptop
# When approved, you promote to production
```

---

## Cost Breakdown

| Item            | Monthly Cost |
| --------------- | ------------ |
| Production App  | ~$25         |
| Production DB   | ~$25         |
| Development App | ~$12         |
| Development DB  | ~$13         |
| **Total**       | **~$75**     |

**Additional cost**: ~$25/month  
**Time saved**: Hours per week  
**Risk reduced**: Massive (no more production bugs during testing)

---

## Documentation Created

1. **`docs/DEV_ENVIRONMENT_SETUP.md`** - Complete setup guide (10 phases)
2. **`docs/DEV_WORKFLOW_QUICK_START.md`** - Daily workflow reference
3. **`docs/DEV_WORKFLOW_DIAGRAM.md`** - Visual diagrams and comparisons
4. **`scripts/setup-dev-environment.sh`** - Automated setup script
5. **`scripts/deploy-to-dev.sh`** - Quick deploy to development
6. **`scripts/promote-to-production.sh`** - Promote to production
7. **`scripts/dev-status.sh`** - Check both environments
8. **`scripts/sync-env-vars.sh`** - Sync environment variables

---

## What This Solves

### Before (Current State)

- Every change deploys to production
- 5-10 minute wait per iteration
- Risk of breaking live site
- Users see bugs during testing
- Can't iterate quickly

### After (New State)

- Changes deploy to dev first
- 3-5 minute wait per iteration
- Zero risk to production
- Users never see bugs
- Fast iteration loop

---

## Timeline Comparison

**Old workflow:**

```
Change → 10 min → Bug → Change → 10 min → Bug → Change → 10 min → ✅
Total: 30 minutes for 3 iterations
```

**New workflow:**

```
Change → 3 min → Bug → Change → 3 min → Bug → Change → 3 min → ✅ → Promote → 10 min
Total: 19 minutes + safer
```

**Savings: 37% faster + zero production risk**

---

## Next Steps

### Immediate (Today)

1. Run `./scripts/setup-dev-environment.sh`
2. Create development database
3. Configure `.do/app-development.yaml`
4. Deploy development app
5. Test the workflow

### This Week

1. Migrate all development to `develop` branch
2. Train AI agents on new workflow
3. Update any automation to use new branches

### Ongoing

1. Always work on `develop` first
2. Test on dev site before promoting
3. Only merge to `main` when verified
4. Monitor costs and optimize if needed

---

## Questions?

- **Setup guide**: `docs/DEV_ENVIRONMENT_SETUP.md`
- **Quick start**: `docs/DEV_WORKFLOW_QUICK_START.md`
- **Visual guide**: `docs/DEV_WORKFLOW_DIAGRAM.md`

---

## Why This Works for You

✅ **No local dependency** - Everything runs in the cloud  
✅ **Work from anywhere** - Phone, laptop, tablet, any device  
✅ **AI collaboration** - Agents push, you test immediately  
✅ **Dev-prod parity** - Same infrastructure, no surprises  
✅ **Fast iteration** - 3-5 min vs 5-10 min  
✅ **Safe testing** - Can't break production  
✅ **Easy rollback** - Just revert the commit

---

**This is the professional way to develop. You'll wonder how you lived without it.** 🚀
